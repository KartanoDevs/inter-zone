import type { Jugador, OrdenSaque, PlantillaEquipo } from './modelos';
import { asignarIndices } from './plantilla';
import { CONFIGURACION_ROLES_POR_DEFECTO } from './roles';

/**
 * La única plantilla que existe en la v1 (ver `docs/decisiones.md`, "Una plantilla global
 * por ahora"): un colocador, dos receptores, un central fijo y una sexta plaza que alterna
 * entre el segundo central y el líbero. `catalogo-sistemas.ts::cambiarPlantilla` no conoce
 * estos jugadores concretos; esta es la única pieza de la aplicación que sí.
 */
function jugador(id: string, rol: Jugador['rol']): Jugador {
  return { id, rol };
}

const ORDEN_CON_CENTRAL2: OrdenSaque = asignarIndices(
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

const ORDEN_CON_LIBERO: OrdenSaque = asignarIndices(
  [
    jugador('colocador', 'colocador'),
    jugador('receptor1', 'receptor'),
    jugador('central1', 'central'),
    jugador('opuesto', 'opuesto'),
    jugador('receptor2', 'receptor'),
    jugador('libero', 'libero'),
  ],
  CONFIGURACION_ROLES_POR_DEFECTO,
);

export const PLANTILLA_GLOBAL: Readonly<Record<'central2' | 'libero', PlantillaEquipo>> = {
  central2: { nombre: 'Equipo', ordenSaque: ORDEN_CON_CENTRAL2 },
  libero: { nombre: 'Equipo', ordenSaque: ORDEN_CON_LIBERO },
};
