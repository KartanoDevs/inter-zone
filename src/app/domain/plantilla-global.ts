import type { Jugador, OrdenSaque, PlantillaEquipo } from './modelos';
import { asignarIndices } from './plantilla';
import { CONFIGURACION_ROLES_POR_DEFECTO } from './roles';
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
function jugador(id: string, rol: Jugador['rol']): Jugador {
  return { id, rol };
}

const ORDEN_TITULARES: OrdenSaque = asignarIndices(
  [
    jugador('colocador', 'colocador'),
    jugador('receptor1', 'receptor'),
    jugador('central1', 'central'),
    jugador('opuesto', 'opuesto'),
    jugador('receptor2', 'receptor'),
    jugador('central2', 'central'),
  ],
  CONFIGURACION_ROLES_POR_DEFECTO,
);

export const PLANTILLA_GLOBAL: PlantillaEquipo = {
  nombre: 'Equipo',
  ordenSaque: ORDEN_TITULARES,
  libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion: sustitutosLiberoPorDefecto(ORDEN_TITULARES) },
};
