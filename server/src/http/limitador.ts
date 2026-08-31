import type { NextFunction, Request, Response } from 'express';

/** Límite de intentos para las rutas de credenciales (endurecimiento OWASP A04/A07): sin esto,
 * `/api/auth/entrar` acepta fuerza bruta ilimitada y, como cada intento deriva la contraseña
 * con un factor de coste, unas pocas peticiones concurrentes bastan para tumbar la API.
 *
 * Ventana fija en memoria, por IP. Solo cuenta los intentos que fallan: quien entra bien nunca
 * se topa con el límite. Se pierde al reiniciar el proceso, que aquí es aceptable — un ataque
 * que dependa de reiniciar el contenedor entre tandas ya ha perdido.
 *
 * La instancia vive dentro de `crearServidor()`, no a nivel de módulo: así cada servidor
 * efímero de los tests nace con el contador a cero. `reiniciar()` existe solo para que un test
 * pueda volver a empezar sin recrear el servidor. */

const VENTANA_MS = 15 * 60 * 1000;
const MAXIMO_FALLOS = 20;

interface Cubo {
  fallos: number;
  ventanaHasta: number;
}

export interface LimitadorDeIntentos {
  /** Middleware: corta con 429 si la IP ya agotó su cupo de fallos en la ventana actual. */
  guardia(req: Request, res: Response, next: NextFunction): void;
  /** Suma un fallo a la IP de la petición. Lo llama la ruta cuando las credenciales no valen. */
  registrarFallo(req: Request): void;
  /** Vacía el estado. Solo para tests. */
  reiniciar(): void;
}

export function crearLimitadorDeIntentos(): LimitadorDeIntentos {
  const cubos = new Map<string, Cubo>();

  function claveDe(req: Request): string {
    return req.ip ?? 'desconocida';
  }

  function cuboVigente(clave: string, ahora: number): Cubo {
    const existente = cubos.get(clave);
    if (existente && existente.ventanaHasta > ahora) {
      return existente;
    }
    const nuevo: Cubo = { fallos: 0, ventanaHasta: ahora + VENTANA_MS };
    cubos.set(clave, nuevo);
    return nuevo;
  }

  function purgar(ahora: number): void {
    for (const [clave, cubo] of cubos) {
      if (cubo.ventanaHasta <= ahora) {
        cubos.delete(clave);
      }
    }
  }

  return {
    guardia(req, res, next) {
      const ahora = Date.now();
      purgar(ahora);
      const cubo = cuboVigente(claveDe(req), ahora);
      if (cubo.fallos >= MAXIMO_FALLOS) {
        const segundos = Math.ceil((cubo.ventanaHasta - ahora) / 1000);
        res.setHeader('Retry-After', String(segundos));
        res.status(429).json({ error: 'Demasiados intentos; prueba de nuevo más tarde' });
        return;
      }
      next();
    },
    registrarFallo(req) {
      const ahora = Date.now();
      cuboVigente(claveDe(req), ahora).fallos += 1;
    },
    reiniciar() {
      cubos.clear();
    },
  };
}
