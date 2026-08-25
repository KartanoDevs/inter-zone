import { createHash, randomBytes } from 'node:crypto';

/** 30 días, renovándose en cada uso (spec 035, E10/E12). */
export const DURACION_SESION_MS = 30 * 24 * 60 * 60 * 1000;

/** El testigo que viaja en la cookie del navegador: alta entropía, nunca se guarda tal cual
 * (spec 035, E16) — solo su huella. */
export function generarTestigoSesion(): string {
  return randomBytes(32).toString('hex');
}

/** SHA-256 basta aquí: la entrada son 32 bytes aleatorios, no una contraseña adivinable — el
 * factor de coste de `scrypt` es para contraseñas de baja entropía, no para esto. */
export function huellaTestigo(testigo: string): string {
  return createHash('sha256').update(testigo).digest('hex');
}
