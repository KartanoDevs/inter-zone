/**
 * Umbral de movimiento, en píxeles de pantalla, para distinguir un toque de un arrastre (spec
 * 010) y para decidir si una pulsación larga sigue "quieta" (spec 070). Compartido entre
 * `Tablero` y `ExamenTablero` — antes solo vivía en `Tablero`.
 */
export const UMBRAL_ARRASTRE_PX = 8;

/**
 * Cuánto hay que mantener pulsada una ficha ya seleccionada, sin desplazarse más de
 * `UMBRAL_ARRASTRE_PX`, para que se abra su ajuste fino (spec 070, E1). No compite con el
 * armado del arrastre por tiempo de `Tablero` (`RETARDO_ARRASTRE_MS`, que sigue igual, E4): se
 * comprueba aparte, sobre el desplazamiento real, no sobre si el arrastre ya se armó.
 */
export const PULSACION_LARGA_MS = 600;

export function distanciaPantalla(
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number },
): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
