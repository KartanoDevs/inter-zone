import type { Jugador, OrdenSaque, PlantillaEquipo } from './modelos';
import { sustitutosLiberoPorDefecto } from './rotacion';

/**
 * La única plantilla que existe en la v1 ("Una plantilla global por ahora", ver
 * `docs/decisiones/`): seis titulares y un líbero que sustituye, en cada rotación, al
 * central que caiga en zaga en ella — el caso típico del 5-1 — aunque el reglamento permita
 * sustituir a cualquiera (spec 017, FIVB 19.3.1.1). Con este defecto el líbero juega las seis
 * rotaciones, no solo tres (spec 017 corrige el defecto de la spec 011). Es una conveniencia
 * de esta constante, no una regla del dominio: `cambiarSustitutoLibero` puede cambiarlo por
 * sistema, rotación a rotación.
 */
function jugador(id: string, rol: Jugador['rol'], indice?: 1 | 2): Jugador {
  return indice === undefined ? { id, rol } : { id, rol, indice };
}

/**
 * El índice de receptor/central se declara aquí, no se deriva (spec 018): la convención real
 * del entrenador no sale de un único recorrido del orden de saque (cuenta los receptores
 * hacia delante desde el colocador y los centrales hacia atrás), así que `plantilla.ts` ya no
 * tiene una función que lo calcule. El sufijo numérico del *id* sí coincide con la etiqueta:
 * `central1` es el central contiguo al colocador — en R1, el de P6 — y se pinta `C1`.
 */
const ORDEN_TITULARES: OrdenSaque = [
  jugador('colocador', 'colocador'), // P1 en R1 -> C
  jugador('receptor1', 'receptor', 1), // P2 -> R1
  jugador('central2', 'central', 2), // P3 -> C2
  jugador('opuesto', 'opuesto'), // P4 -> O
  jugador('receptor2', 'receptor', 2), // P5 -> R2
  jugador('central1', 'central', 1), // P6 -> C1
];

export const PLANTILLA_GLOBAL: PlantillaEquipo = {
  nombre: 'Equipo',
  ordenSaque: ORDEN_TITULARES,
  libero: {
    jugador: jugador('libero', 'libero'),
    sustitutosPorRotacion: sustitutosLiberoPorDefecto(ORDEN_TITULARES),
  },
};
