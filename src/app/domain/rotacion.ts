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

/**
 * La formación en la que el colocador ocupa Pn (Rn), sea cual sea el orden de saque (ADR 0010,
 * revertida a esta forma por la ADR 0019 tras la spec 020: la 018 la había cambiado con
 * ejemplos de rotación que resultaron llevar la numeración invertida).
 */
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
 * plantilla tenga líbero y el sustituto declarado *para esa rotación* (spec 017: el sustituto
 * se decide rotación a rotación, ya no es uno solo para las seis) caiga en zaga (P1, P5 o P6)
 * en ella, en cuyo caso juega el líbero en su lugar (FIVB 19.3.1.1). Sin sustituto declarado
 * para esa rotación (`null`), juegan los seis titulares.
 */
export function jugadoresEnPista(plantilla: PlantillaEquipo, rotacion: number): OrdenSaque {
  const posiciones = formacionEnRotacion(plantilla.ordenSaque, rotacion);
  if (!plantilla.libero) {
    return posiciones;
  }
  const { jugador: libero, sustitutosPorRotacion } = plantilla.libero;
  const sustituidoId = sustitutosPorRotacion[rotacion as 1 | 2 | 3 | 4 | 5 | 6];
  if (sustituidoId === null) {
    return posiciones;
  }
  const indiceSustituido = posiciones.findIndex((j) => j.id === sustituidoId);
  if (indiceSustituido === -1 || !INDICES_ZAGA.has(indiceSustituido)) {
    return posiciones;
  }
  return posiciones.map((j, i) => (i === indiceSustituido ? libero : j)) as unknown as OrdenSaque;
}

/**
 * El sustituto por defecto de cada rotación: el central que en ella cae en zaga (P1, P5 o P6).
 * Es una conveniencia para rellenar `sustitutosPorRotacion` al declarar una plantilla — el
 * caso típico del 5-1 (spec 017) —, no una regla que el dominio imponga: se puede cambiar
 * rotación a rotación después. Si ninguna de las dos centrales cae en zaga en alguna rotación
 * (una plantilla con las centrales sin la separación habitual), esa rotación queda en `null`:
 * el dominio no supone un sustituto donde no hay un central en zaga que lo justifique.
 */
export function sustitutosLiberoPorDefecto(orden: OrdenSaque): Record<1 | 2 | 3 | 4 | 5 | 6, string | null> {
  const resultado = {} as Record<1 | 2 | 3 | 4 | 5 | 6, string | null>;
  for (const rotacion of [1, 2, 3, 4, 5, 6] as const) {
    const posiciones = formacionEnRotacion(orden, rotacion);
    const centralEnZaga = [...INDICES_ZAGA].map((indice) => posiciones[indice]).find((j) => j.rol === 'central');
    resultado[rotacion] = centralEnZaga?.id ?? null;
  }
  return resultado;
}
