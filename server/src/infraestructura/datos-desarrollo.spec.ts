import { describe, expect, it } from 'vitest';
import { validarFormacion } from '../../../src/app/domain/validacion';
import { jugadoresEnPista } from '../../../src/app/domain/rotacion';
import { sistemasDeDesarrollo } from './datos-desarrollo';

/** Test puro, sin base de datos: garantiza que ninguna de las geometrías de los sistemas de
 * prueba enseña una falta de posición a un jugador real — sobre todo "TEST Recepción a 2" y
 * "Rotación base", cuyas coordenadas no salen de una función ya validada del dominio, sino que
 * se han escrito/copiado a mano en `datos-desarrollo.ts`. */
describe('datos-desarrollo: sistemasDeDesarrollo', () => {
  it('ningún sistema de recepción tiene una formación con falta de posición', () => {
    for (const sistema of sistemasDeDesarrollo()) {
      if (sistema.tipo !== 'recepcion') {
        continue;
      }
      for (const [rot, formacion] of Object.entries(sistema.formaciones)) {
        if (!formacion) {
          continue;
        }
        const rotacion = Number(rot) as 1 | 2 | 3 | 4 | 5 | 6;
        const posiciones = jugadoresEnPista(sistema.plantilla, rotacion);
        const resultado = validarFormacion(formacion, posiciones);
        expect(
          resultado.infracciones,
          `${sistema.nombre} (${sistema.equipoId}) R${rotacion}: ${JSON.stringify(resultado.infracciones)}`,
        ).toEqual([]);
      }
    }
  });

  it('"TEST Defensa completa" tiene las 34 variantes, sin repetir (caso, situación, bloqueadores)', () => {
    const defensaCompleta = sistemasDeDesarrollo().find(
      (s) => s.nombre === 'TEST Defensa completa',
    );
    expect(defensaCompleta?.defensas).toHaveLength(34);
    const claves = new Set(
      defensaCompleta!.defensas!.map((v) => `${v.caso}|${v.situacion}|${v.bloqueadores}`),
    );
    expect(claves.size).toBe(34);
  });

  it('los seis sistemas tienen nombre único dentro de (equipoId, tipo)', () => {
    const claves = new Set(
      sistemasDeDesarrollo().map((s) => `${s.equipoId}|${s.tipo}|${s.nombre}`),
    );
    expect(claves.size).toBe(sistemasDeDesarrollo().length);
  });
});
