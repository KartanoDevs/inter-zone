import { scryptSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { formatoLegacy, hashContrasena, necesitaRehash, verificarContrasena } from './contrasena';

/** No toca base de datos: es una unidad pura sobre `node:crypto`, pero vive aquí porque la
 * config de vitest de la raíz solo mira `src/app/domain`. */
describe('contraseña (endurecimiento OWASP A02)', () => {
  it('un hash nuevo se verifica con la misma contraseña', async () => {
    const hash = await hashContrasena('contrasena123');
    expect(await verificarContrasena('contrasena123', hash)).toBe(true);
  });

  it('un hash nuevo falla con otra contraseña', async () => {
    const hash = await hashContrasena('contrasena123');
    expect(await verificarContrasena('otra-distinta', hash)).toBe(false);
  });

  it('el formato nuevo lleva los parámetros dentro', async () => {
    const hash = await hashContrasena('loquesea');
    // scrypt$N$r$p$sal$derivada
    expect(hash).toMatch(/^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]+\$[0-9a-f]+$/);
  });

  it('un hash antiguo de dos partes (sal:derivada) se sigue verificando', async () => {
    const sal = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
    const derivada = scryptSync('vieja-clave', sal, 64);
    const hashLegacy = `${sal.toString('hex')}:${derivada.toString('hex')}`;

    expect(formatoLegacy(hashLegacy)).toBe(true);
    expect(await verificarContrasena('vieja-clave', hashLegacy)).toBe(true);
    expect(await verificarContrasena('mala', hashLegacy)).toBe(false);
  });

  it('un hash legacy necesita rehash; uno nuevo no', async () => {
    const sal = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
    const derivada = scryptSync('x', sal, 64);
    const hashLegacy = `${sal.toString('hex')}:${derivada.toString('hex')}`;

    expect(necesitaRehash(hashLegacy)).toBe(true);
    expect(necesitaRehash(await hashContrasena('x'))).toBe(false);
  });
});
