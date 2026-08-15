import type { Formacion, Jugador, Sistema, ViaAtaque } from './modelos';
import { jugadoresEnPista } from './rotacion';

function mismosJugadores(formacion: Formacion, posiciones: readonly Jugador[]): boolean {
  const idsFormacion = formacion.map((c) => c.jugador.id).sort();
  const idsPosiciones = posiciones.map((j) => j.id).sort();
  return JSON.stringify(idsFormacion) === JSON.stringify(idsPosiciones);
}

/** Guarda la defensa de una rotación contra una vía de ataque (spec 021). A diferencia de
 * `guardarFormacion`, nunca valida la posición: en defensa la validación no existe. */
export function guardarFormacionDefensa(sistema: Sistema, rotacion: number, via: ViaAtaque, formacion: Formacion): Sistema | null {
  const posiciones = jugadoresEnPista(sistema.plantilla, rotacion);
  if (!mismosJugadores(formacion, posiciones)) {
    return null;
  }
  const r = rotacion as 1 | 2 | 3 | 4 | 5 | 6;
  const defensasRotacion = { ...sistema.defensas?.[r], [via]: formacion };
  const defensas = { ...sistema.defensas, [r]: defensasRotacion };
  return { ...sistema, defensas };
}
