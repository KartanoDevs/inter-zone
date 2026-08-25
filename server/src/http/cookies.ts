import type { Request } from 'express';

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
