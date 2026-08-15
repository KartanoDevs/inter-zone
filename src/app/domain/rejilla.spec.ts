import { describe, expect, it } from 'vitest';
import type { Punto } from './modelos';
import { TAMANO_CELDA, celdaDe, centroDe } from './rejilla';

describe('celdaDe', () => {
  it('un punto dentro del campo cae en la celda de 0,5 m que lo contiene', () => {
    const punto: Punto = { x: 1.2, y: 3.7 };

    expect(celdaDe(punto)).toEqual({ columna: 2, fila: 7 });
  });

  it('el origen (red-lateral izquierda) cae en la primera celda', () => {
    expect(celdaDe({ x: 0, y: 0 })).toEqual({ columna: 0, fila: 0 });
  });

  it('E7: un punto fuera de las líneas del campo no tiene celda', () => {
    expect(celdaDe({ x: -0.1, y: 4 })).toBeNull();
    expect(celdaDe({ x: 4, y: 9 })).toBeNull();
    expect(celdaDe({ x: 9, y: 4 })).toBeNull();
    expect(celdaDe({ x: 4, y: -0.1 })).toBeNull();
  });
});

describe('centroDe', () => {
  it('el centro de una celda está a media celda de su esquina', () => {
    expect(centroDe({ columna: 2, fila: 7 })).toEqual({ x: 2 * TAMANO_CELDA + 0.25, y: 7 * TAMANO_CELDA + 0.25 });
  });
});
