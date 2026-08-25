import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const LONGITUD_SAL = 16;
const LONGITUD_CLAVE_DERIVADA = 64;

/** Deriva la contraseña con `scrypt` (factor de coste, sal propia por cuenta) — nunca se
 * guarda en claro (spec 035, E8). Formato `sal:derivada`, ambos en hexadecimal. */
export function hashContrasena(contrasena: string): string {
  const sal = randomBytes(LONGITUD_SAL);
  const derivada = scryptSync(contrasena, sal, LONGITUD_CLAVE_DERIVADA);
  return `${sal.toString('hex')}:${derivada.toString('hex')}`;
}

export function verificarContrasena(contrasena: string, hash: string): boolean {
  const [salHex, derivadaHex] = hash.split(':');
  if (!salHex || !derivadaHex) {
    return false;
  }
  const sal = Buffer.from(salHex, 'hex');
  const derivadaEsperada = Buffer.from(derivadaHex, 'hex');
  const derivada = scryptSync(contrasena, sal, derivadaEsperada.length);
  return timingSafeEqual(derivada, derivadaEsperada);
}
