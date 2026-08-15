import { describe, expect, it } from 'vitest';
import { jugadoresEnPista } from './rotacion';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from './roles';
import { PLANTILLA_GLOBAL } from './plantilla-global';

/**
 * Las seis rotaciones de un 5-1 real (spec 019, E4), verificadas etiqueta a etiqueta contra
 * ejemplos aportados por el usuario y corroboradas por `docs/voley/normas_posicion_recepcion_5_1.md`.
 * z1..z6 son las posiciones rotacionales P1..P6.
 */
const ROTACIONES_DE_REFERENCIA: Readonly<Record<number, readonly string[]>> = {
  1: ['C', 'R1', 'C2', 'O', 'R2', 'L'],
  2: ['R1', 'C2', 'O', 'R2', 'L', 'C'],
  3: ['L', 'O', 'R2', 'C1', 'C', 'R1'],
  4: ['O', 'R2', 'C1', 'C', 'R1', 'L'],
  5: ['R2', 'C1', 'C', 'R1', 'L', 'O'],
  6: ['L', 'C', 'R1', 'C2', 'O', 'R2'],
};

describe('PLANTILLA_GLOBAL — rotaciones de referencia', () => {
  for (const [rotacion, etiquetasEsperadas] of Object.entries(ROTACIONES_DE_REFERENCIA)) {
    it(`019-E4: R${rotacion} coloca a cada jugador en su Pn esperado`, () => {
      const enPista = jugadoresEnPista(PLANTILLA_GLOBAL, Number(rotacion));

      const etiquetas = enPista.map((jugador) => etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO));

      expect(etiquetas).toEqual(etiquetasEsperadas);
    });
  }
});
