import type { Celda, Punto } from './modelos';

/** El lado de una celda de la rejilla de responsabilidad, en metros (ADR 0004). */
export const TAMANO_CELDA = 0.5;

/** La celda que contiene un punto del campo propio (9×9 m), o `null` si el punto queda fuera
 * de sus líneas (spec 022, E7): la rejilla de responsabilidad no cubre la zona libre. */
export function celdaDe(punto: Punto): Celda | null {
  if (punto.x < 0 || punto.x >= 9 || punto.y < 0 || punto.y >= 9) {
    return null;
  }
  return { columna: Math.floor(punto.x / TAMANO_CELDA), fila: Math.floor(punto.y / TAMANO_CELDA) };
}

/** El centro de una celda, en metros — el punto donde se pinta su marca. */
export function centroDe(celda: Celda): Punto {
  return { x: (celda.columna + 0.5) * TAMANO_CELDA, y: (celda.fila + 0.5) * TAMANO_CELDA };
}
