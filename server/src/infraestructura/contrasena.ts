import { randomBytes, scrypt, type ScryptOptions, timingSafeEqual } from 'node:crypto';

function scryptAsync(
  contrasena: string,
  sal: Buffer,
  longitud: number,
  opciones: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(contrasena, sal, longitud, opciones, (error, derivada) => {
      if (error) {
        reject(error);
      } else {
        resolve(derivada);
      }
    });
  });
}

const LONGITUD_SAL = 16;
const LONGITUD_CLAVE_DERIVADA = 64;

/** Parámetros de coste actuales (endurecimiento OWASP A02). El mínimo que da OWASP para scrypt
 * es N=2^14, r=8, p≥5; se sube p, no N, porque p multiplica la CPU sin multiplicar la memoria
 * (≈16 MB por hash, dentro del `maxmem` por defecto de Node), lo que en un VPS pequeño es la
 * diferencia entre endurecer y quedarse sin RAM. */
const N_ACTUAL = 16384;
const R_ACTUAL = 8;
const P_ACTUAL = 5;

const PREFIJO = 'scrypt';

async function derivar(
  contrasena: string,
  sal: Buffer,
  n: number,
  r: number,
  p: number,
  longitud: number,
): Promise<Buffer> {
  // `maxmem` explícito: el coste por defecto de Node (128*N*r) se queda corto para p>1.
  return scryptAsync(contrasena, sal, longitud, { N: n, r, p, maxmem: 128 * n * r * (p + 2) });
}

/** Deriva la contraseña con `scrypt`, nunca en claro (spec 035, E8). Formato versionado
 * `scrypt$N$r$p$sal$derivada` (hex), para poder subir el coste sin invalidar los hashes ya
 * guardados. */
export async function hashContrasena(contrasena: string): Promise<string> {
  const sal = randomBytes(LONGITUD_SAL);
  const derivada = await derivar(
    contrasena,
    sal,
    N_ACTUAL,
    R_ACTUAL,
    P_ACTUAL,
    LONGITUD_CLAVE_DERIVADA,
  );
  return `${PREFIJO}$${N_ACTUAL}$${R_ACTUAL}$${P_ACTUAL}$${sal.toString('hex')}$${derivada.toString('hex')}`;
}

/** Un hash del formato viejo `sal:derivada` (dos partes hex), anterior al versionado. Se sigue
 * verificando con los parámetros por defecto de Node de entonces (N=16384, r=8, p=1), y se
 * rehashea al vuelo la próxima vez que la cuenta entra. */
export function formatoLegacy(hash: string): boolean {
  return /^[0-9a-f]+:[0-9a-f]+$/.test(hash);
}

/** `true` si el hash no está en el formato/coste actuales y conviene regenerarlo cuando se
 * tenga la contraseña en claro (al entrar). */
export function necesitaRehash(hash: string): boolean {
  return hash !== '' && !hash.startsWith(`${PREFIJO}$${N_ACTUAL}$${R_ACTUAL}$${P_ACTUAL}$`);
}

async function verificarLegacy(contrasena: string, hash: string): Promise<boolean> {
  const [salHex, derivadaHex] = hash.split(':');
  if (!salHex || !derivadaHex) {
    return false;
  }
  const sal = Buffer.from(salHex, 'hex');
  const esperada = Buffer.from(derivadaHex, 'hex');
  // Parámetros por defecto de Node de cuando se generó (p=1).
  const derivada = await derivar(contrasena, sal, 16384, 8, 1, esperada.length);
  return derivada.length === esperada.length && timingSafeEqual(derivada, esperada);
}

export async function verificarContrasena(contrasena: string, hash: string): Promise<boolean> {
  if (formatoLegacy(hash)) {
    return verificarLegacy(contrasena, hash);
  }
  const partes = hash.split('$');
  if (partes.length !== 6 || partes[0] !== PREFIJO) {
    return false;
  }
  const [, nStr, rStr, pStr, salHex, derivadaHex] = partes;
  const sal = Buffer.from(salHex as string, 'hex');
  const esperada = Buffer.from(derivadaHex as string, 'hex');
  const derivada = await derivar(
    contrasena,
    sal,
    Number(nStr),
    Number(rStr),
    Number(pStr),
    esperada.length,
  );
  return derivada.length === esperada.length && timingSafeEqual(derivada, esperada);
}
