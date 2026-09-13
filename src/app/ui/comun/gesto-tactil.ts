/**
 * Umbral de movimiento, en píxeles de pantalla, para distinguir un toque de un arrastre (spec
 * 010, extendido a `ExamenTablero` por la spec 070). Compartido entre `Tablero` y
 * `ExamenTablero` — antes solo vivía en `Tablero`.
 */
export const UMBRAL_ARRASTRE_PX = 8;

export function distanciaPantalla(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number },
): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
