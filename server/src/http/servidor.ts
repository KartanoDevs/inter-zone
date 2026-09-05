import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { crearAuthRutas } from './auth.rutas';
import { examenRutas } from './examen.rutas';
import { crearLimitadorDeIntentos, type LimitadorDeIntentos } from './limitador';
import { listaBlancaRutas } from './lista-blanca.rutas';
import { sistemasRutas } from './sistemas.rutas';
import { usuariosRutas } from './usuarios.rutas';

/** CORS mínimo (spec 034, cookies desde la spec 035): un origen permitido y configurable, sin
 * la dependencia `cors` — no hace falta más que estas cabeceras para que el navegador deje
 * llamar a la API desde el puerto de desarrollo de Angular (4200), distinto del suyo, y mande
 * la cookie de sesión. `Access-Control-Allow-Credentials` exige un origen concreto, nunca `*`
 * — ya lo era, `ORIGEN_PERMITIDO` nunca ha sido un comodín. */
function cors(req: Request, res: Response, next: NextFunction): void {
  const origen = process.env['ORIGEN_PERMITIDO'] ?? 'http://localhost:4200';
  res.setHeader('Access-Control-Allow-Origin', origen);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,If-Match');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
}

/** Cabeceras de seguridad en toda respuesta de la API (endurecimiento OWASP A05). El nginx del
 * frontend las pone en la SPA, pero sus `add_header` no se heredan a la `location /api/`, así
 * que las respuestas de la API viajaban sin ellas. `no-store` porque nada de la API debe
 * quedarse en una caché intermedia. */
function cabecerasDeSeguridad(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
}

/** Fábrica del servidor Express, sin escuchar puerto (`main.ts` lo hace, los tests de
 * integración levantan su propia instancia efímera). `/api/auth` (spec 035) da cuenta,
 * contraseña y sesión; `/api/lista-blanca` (spec 054) es solo para el admin;
 * `/api/sistemas` exige sesión para leer (endurecimiento OWASP A01) y rol al escribir (spec
 * 037); `/api/examen` (spec 056) solo exige sesión, para las insignias de la propia cuenta.
 *
 * `/api/usuarios` (spec 068) también es solo para el admin: listar cuentas y borrar una de
 * verdad.
 *
 * `limitador` se puede inyectar para que un test reinicie su estado sin recrear el servidor;
 * por defecto nace uno nuevo, con el contador a cero. */
export function crearServidor(
  limitador: LimitadorDeIntentos = crearLimitadorDeIntentos(),
): Express {
  const app = express();
  app.disable('x-powered-by');
  // Cuántos proxies de confianza hay delante (nginx del front, y NPM en el host). Por defecto
  // 0: se usa la IP del socket, nunca una cabecera falsificable. Contar saltos desde la derecha
  // es lo que impide que un cliente se invente su `X-Forwarded-For`.
  app.set('trust proxy', Number(process.env['SALTOS_PROXY'] ?? 0));
  app.use(cors);
  app.use(cabecerasDeSeguridad);
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', crearAuthRutas(limitador));
  app.use('/api', listaBlancaRutas);
  app.use('/api', usuariosRutas);
  app.use('/api', sistemasRutas);
  app.use('/api', examenRutas);

  // Express 5 reenvía los rechazos de las rutas async aquí solo; no hace falta try/catch en
  // cada una.
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}
