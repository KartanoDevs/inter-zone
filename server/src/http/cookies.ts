import type { Request } from 'express';
import * as accesoRepositorio from '../infraestructura/acceso.repositorio';

export const NOMBRE_COOKIE_SESION = 'iz_sesion';

/** Lee el testigo de sesión de la cabecera `Cookie` a mano (spec 035), mismo criterio que el
 * CORS escrito a mano en `servidor.ts` — no hace falta una dependencia para esto. Compartido
 * entre `auth.rutas.ts` y `sistemas.rutas.ts` (spec 051: validar también necesita saber quién
 * pregunta). */
export function leerTestigoSesion(req: Request): string | null {
  const cabecera = req.headers.cookie;
  if (!cabecera) {
    return null;
  }
  for (const parte of cabecera.split(';')) {
    const separador = parte.indexOf('=');
    if (separador === -1) {
      continue;
    }
    const clave = parte.slice(0, separador).trim();
    if (clave === NOMBRE_COOKIE_SESION) {
      return decodeURIComponent(parte.slice(separador + 1).trim());
    }
  }
  return null;
}

/** Quién ha entrado, a partir de la cookie de la petición (spec 037) — `null` sin sesión o con
 * una caducada, igual que `accesoRepositorio.quienSoy`. Compartido entre `sistemas.rutas.ts` y
 * `auth.rutas.ts` (spec 053: el perfil y el cambio de contraseña también necesitan saber quién
 * pregunta). */
export async function resolverSesion(req: Request): ReturnType<typeof accesoRepositorio.quienSoy> {
  const testigo = leerTestigoSesion(req);
  return testigo ? accesoRepositorio.quienSoy(testigo) : null;
}
