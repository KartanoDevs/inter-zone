import { describe, expect, it } from 'vitest';
import type { Celda, Punto } from './modelos';
import {
  TAMANO_CELDA,
  bloquePorDefecto,
  celdaDe,
  celdasDeTrazo,
  centroDe,
  rellenarContorno,
  trazoCerrado,
} from './rejilla';

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
    expect(centroDe({ columna: 2, fila: 7 })).toEqual({
      x: 2 * TAMANO_CELDA + 0.25,
      y: 7 * TAMANO_CELDA + 0.25,
    });
  });
});

describe('bloquePorDefecto', () => {
  it('024-E3: el bloque de 2×2 más cercano se inclina hacia el lado de la celda donde cae el punto', () => {
    const punto: Punto = { x: 1.2, y: 3.7 };

    expect(bloquePorDefecto(punto)).toEqual([
      { columna: 1, fila: 6 },
      { columna: 2, fila: 6 },
      { columna: 1, fila: 7 },
      { columna: 2, fila: 7 },
    ]);
  });

  it('024-E3: al otro lado de la celda, el bloque se inclina hacia el lado contrario', () => {
    const punto: Punto = { x: 1.4, y: 3.9 };

    expect(bloquePorDefecto(punto)).toEqual([
      { columna: 2, fila: 7 },
      { columna: 3, fila: 7 },
      { columna: 2, fila: 8 },
      { columna: 3, fila: 8 },
    ]);
  });

  it('024-E4: pegado a la línea lateral izquierda, el bloque se recorta a una franja de una celda de ancho', () => {
    const punto: Punto = { x: 0.1, y: 4.5 };

    expect(bloquePorDefecto(punto)).toEqual([
      { columna: 0, fila: 8 },
      { columna: 0, fila: 9 },
    ]);
  });

  it('024-E4: en la esquina del campo, el bloque se recorta a una sola celda', () => {
    const punto: Punto = { x: 0.1, y: 0.1 };

    expect(bloquePorDefecto(punto)).toEqual([{ columna: 0, fila: 0 }]);
  });

  it('024-E4: en la esquina opuesta del campo, el bloque también se recorta a una sola celda', () => {
    const punto: Punto = { x: 8.9, y: 8.9 };

    expect(bloquePorDefecto(punto)).toEqual([{ columna: 17, fila: 17 }]);
  });
});

describe('trazoCerrado', () => {
  it('024-E9: el trazo se considera cerrado si la última celda es la primera', () => {
    const trazo: Celda[] = [
      { columna: 2, fila: 2 },
      { columna: 3, fila: 2 },
      { columna: 3, fila: 3 },
      { columna: 2, fila: 2 },
    ];

    expect(trazoCerrado(trazo)).toBe(true);
  });

  it('024-E9: el trazo se considera cerrado si la última celda es vecina de la primera', () => {
    const trazo: Celda[] = [
      { columna: 2, fila: 2 },
      { columna: 4, fila: 2 },
      { columna: 4, fila: 4 },
      { columna: 3, fila: 3 },
    ];

    expect(trazoCerrado(trazo)).toBe(true);
  });

  it('024-E10: un trazo que no vuelve cerca del principio no se considera cerrado', () => {
    const trazo: Celda[] = [
      { columna: 2, fila: 2 },
      { columna: 3, fila: 2 },
      { columna: 4, fila: 2 },
    ];

    expect(trazoCerrado(trazo)).toBe(false);
  });
});

describe('rellenarContorno', () => {
  it('024-E9: rellena las celdas encerradas por un contorno cerrado', () => {
    const contorno: Celda[] = [
      { columna: 2, fila: 2 },
      { columna: 3, fila: 2 },
      { columna: 4, fila: 2 },
      { columna: 4, fila: 3 },
      { columna: 4, fila: 4 },
      { columna: 3, fila: 4 },
      { columna: 2, fila: 4 },
      { columna: 2, fila: 3 },
    ];

    const resultado = rellenarContorno(contorno);

    expect(resultado).toContainEqual({ columna: 3, fila: 3 });
    expect(resultado).toHaveLength(9);
  });

  it('024-E11: el relleno nunca produce celdas fuera de la rejilla del campo', () => {
    const contorno: Celda[] = [
      { columna: 0, fila: 2 },
      { columna: 1, fila: 2 },
      { columna: 1, fila: 4 },
      { columna: 0, fila: 4 },
    ];

    const resultado = rellenarContorno(contorno);

    expect(
      resultado.every((c) => c.columna >= 0 && c.columna <= 17 && c.fila >= 0 && c.fila <= 17),
    ).toBe(true);
  });
});

describe('celdasDeTrazo', () => {
  it('024-E9: un trazo cerrado devuelve el contorno más el interior', () => {
    const trazo: Celda[] = [
      { columna: 2, fila: 2 },
      { columna: 3, fila: 2 },
      { columna: 4, fila: 2 },
      { columna: 4, fila: 3 },
      { columna: 4, fila: 4 },
      { columna: 3, fila: 4 },
      { columna: 2, fila: 4 },
      { columna: 2, fila: 3 },
      { columna: 2, fila: 2 },
    ];

    expect(celdasDeTrazo(trazo)).toContainEqual({ columna: 3, fila: 3 });
  });

  it('024-E10: un trazo abierto devuelve solo las celdas recorridas, sin rellenar', () => {
    const trazo: Celda[] = [
      { columna: 2, fila: 2 },
      { columna: 3, fila: 2 },
      { columna: 4, fila: 2 },
    ];

    expect(celdasDeTrazo(trazo)).toEqual(trazo);
  });
});
