import type { Punto, ViaAtaque } from './modelos';

/** La vía de ataque que corresponde a dónde se suelta al rival (spec 021, E3-E6). */
export function viaDeAtaque(punto: Punto): ViaAtaque {
  if (punto.y <= -3) {
    return 'pipe';
  }
  if (punto.x < 3) {
    return 'z2';
  }
  return punto.x < 6 ? 'z3' : 'z4';
}
