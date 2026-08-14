import type { Jugador, OrdenSaque, PlantillaEquipo } from './modelos';
import { asignarIndices } from './plantilla';
import { CONFIGURACION_ROLES_POR_DEFECTO } from './roles';

/**
 * La única plantilla que existe en la v1 ("Una plantilla global por ahora", ver
 * `docs/decisiones.md`): seis titulares y un líbero que sustituye por defecto al segundo
 * central — el caso típico del 5-1 — aunque el reglamento permita sustituir a cualquiera
 * (spec 011, FIVB 19.3.1.1). "Central 2 por defecto" es una conveniencia de esta constante,
 * no una regla del dominio: `cambiarSustitutoLibero` puede cambiarlo por sistema.
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
  libero: { jugador: jugador('libero', 'libero'), sustituidoId: 'central2' },
};
