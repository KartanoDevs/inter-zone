import type { OrdenSaque, PlantillaEquipo } from './modelos';

const INDICES_ZAGA = new Set([0, 4, 5]); // P1, P5, P6

/**
 * Deriva quién ocupa cada posición P1..P6 tras `rotacion` avances desde el
 * orden de saque inicial (0 = R1). La rotación gira P2→P1→P6→P5→P4→P3→P2.
 */
export function rotar(orden: OrdenSaque, rotacion: number): OrdenSaque {
  const posiciones = orden.map((_, indice) => orden[(indice + rotacion) % 6]);
  return posiciones as unknown as OrdenSaque;
}

function indiceColocador(orden: OrdenSaque): number {
  const indice = orden.findIndex((jugador) => jugador.rol === 'colocador');
  if (indice === -1) {
    throw new Error('El orden de saque no tiene colocador');
  }
  return indice;
}

/** La formación en la que el colocador ocupa Pn (Rn), sea cual sea el orden de saque. */
export function formacionEnRotacion(orden: OrdenSaque, rotacion: number): OrdenSaque {
  const desplazamiento = (indiceColocador(orden) - (rotacion - 1) + 6) % 6;
  return rotar(orden, desplazamiento);
}

/** El número de rotación (Rn) al que pertenece una formación ya colocada en P1..P6. */
export function rotacionDe(orden: OrdenSaque): number {
  return indiceColocador(orden) + 1;
}

/**
 * Quién juega de verdad en cada posición para una rotación: los seis titulares, salvo que la
 * plantilla tenga líbero y el jugador al que sustituye caiga en zaga (P1, P5 o P6) en esa
 * rotación, en cuyo caso juega el líbero en su lugar (spec 011, FIVB 19.3.1.1).
 */
export function jugadoresEnPista(plantilla: PlantillaEquipo, rotacion: number): OrdenSaque {
  const posiciones = formacionEnRotacion(plantilla.ordenSaque, rotacion);
  if (!plantilla.libero) {
    return posiciones;
  }
  const { jugador: libero, sustituidoId } = plantilla.libero;
  const indiceSustituido = posiciones.findIndex((j) => j.id === sustituidoId);
  if (indiceSustituido === -1 || !INDICES_ZAGA.has(indiceSustituido)) {
    return posiciones;
  }
  return posiciones.map((j, i) => (i === indiceSustituido ? libero : j)) as unknown as OrdenSaque;
}
