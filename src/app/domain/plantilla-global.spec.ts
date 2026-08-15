import { describe, expect, it } from 'vitest';
import { jugadoresEnPista } from './rotacion';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from './roles';
import { PLANTILLA_GLOBAL } from './plantilla-global';

/**
 * Las seis rotaciones de un 5-1 real (spec 020, E2), verificadas etiqueta a etiqueta contra
 * ejemplos confirmados por el usuario. z1..z6 son las posiciones rotacionales P1..P6. `Rn` es
 * "el colocador ocupa Pn" (ADR 0010, reafirmada por la 0019): el colocador (C) está siempre en
 * la posición `n` de su fila.
 */
const ROTACIONES_DE_REFERENCIA: Readonly<Record<number, readonly string[]>> = {
  1: ['C', 'R1', 'C2', 'O', 'R2', 'L'],
  2: ['L', 'C', 'R1', 'C2', 'O', 'R2'],
  3: ['R2', 'C1', 'C', 'R1', 'L', 'O'],
  4: ['O', 'R2', 'C1', 'C', 'R1', 'L'],
  5: ['L', 'O', 'R2', 'C1', 'C', 'R1'],
  6: ['R1', 'C2', 'O', 'R2', 'L', 'C'],
};

describe('PLANTILLA_GLOBAL — rotaciones de referencia', () => {
  for (const [rotacion, etiquetasEsperadas] of Object.entries(ROTACIONES_DE_REFERENCIA)) {
    it(`020-E2: R${rotacion} coloca a cada jugador en su Pn esperado`, () => {
      const enPista = jugadoresEnPista(PLANTILLA_GLOBAL, Number(rotacion));

      const etiquetas = enPista.map((jugador) => etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO));

      expect(etiquetas).toEqual(etiquetasEsperadas);
    });
  }
});
