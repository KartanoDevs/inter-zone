import type { OrdenSaque } from './modelos';

/**
 * Deriva quién ocupa cada posición P1..P6 tras `rotacion` avances desde el
 * orden de saque inicial (0 = R1). La rotación gira P2→P1→P6→P5→P4→P3→P2.
 */
export function rotar(orden: OrdenSaque, rotacion: number): OrdenSaque {
  const posiciones = orden.map((_, indice) => orden[(indice + rotacion) % 6]);
  return posiciones as unknown as OrdenSaque;
}
