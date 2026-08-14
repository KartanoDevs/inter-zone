/**
 * Datos de ejemplo para la maqueta visual. NO es un sistema real: solo sirve para
 * mostrar en pantalla los estados que ya calcula el dominio (legal / al límite /
 * falta). Se construye con las mismas funciones que usará la UI de verdad
 * (`asignarIndices`, `crearSistema`, `guardarFormacion`, `formacionEnRotacion`),
 * nunca a mano.
 *
 * Roster de 7 con casilla intercambiable (docs/dominio.md §2: "el líbero sustituye a
 * un central en zona zaguera, así que el equipo tiene 7 jugadores declarados aunque
 * solo 6 estén en pista"). `OrdenSaque` es una tupla de exactamente 6, así que el
 * séptimo (central2 o líbero, nunca los dos) vive fuera de ella hasta que se coloca;
 * `ordenSaquePara()` construye la tupla de 6 según cuál de los dos esté activo. Las
 * dos variantes están verificadas con `validarPlantilla` antes de darlas por buenas.
 */
import { CONFIGURACION_ROLES_POR_DEFECTO } from '../domain/roles';
import { asignarIndices, validarPlantilla } from '../domain/plantilla';
import { formacionEnRotacion } from '../domain/rotacion';
import { crearSistema } from '../domain/catalogo-sistemas';
import { guardarFormacion } from '../domain/sistema-recepcion';
import type { Formacion, Jugador, OrdenSaque, PlantillaEquipo, Punto, Sistema } from '../domain/modelos';

export type OcupanteCasilla = 'central2' | 'libero';

function jugador(id: string, rol: Jugador['rol']): Jugador {
  return { id, rol };
}

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

for (const [nombre, orden] of [
  ['ORDEN_CON_LIBERO', ORDEN_CON_LIBERO],
  ['ORDEN_CON_CENTRAL2', ORDEN_CON_CENTRAL2],
] as const) {
  if (!validarPlantilla(orden, CONFIGURACION_ROLES_POR_DEFECTO)) {
    throw new Error(`${nombre} no es una plantilla válida`);
  }
}

/** El orden de saque de 6 según cuál de los dos ocupe la casilla intercambiable. */
export function ordenSaquePara(ocupante: OcupanteCasilla): OrdenSaque {
  return ocupante === 'libero' ? ORDEN_CON_LIBERO : ORDEN_CON_CENTRAL2;
}

/** Los 7 jugadores declarados, para el banquillo. Fuera de `OrdenSaque`, solo para etiquetas. */
export const ROSTER: readonly Jugador[] = [
  ...ORDEN_CON_LIBERO.slice(0, 5),
  ORDEN_CON_CENTRAL2[5],
  ORDEN_CON_LIBERO[5],
];

export const PLANTILLA_EJEMPLO: PlantillaEquipo = {
  nombre: 'Equipo de ejemplo',
  ordenSaque: ORDEN_CON_LIBERO,
};

type PosicionRotacional = 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6';
const ORDEN_POSICIONES: readonly PosicionRotacional[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'];

/** Formación en W: línea delantera abierta cerca de la red, línea zaguera profunda. */
const PUNTO_BASE: Readonly<Record<PosicionRotacional, Punto>> = {
  P1: { x: 7.5, y: 6.5 },
  P2: { x: 7.0, y: 3.0 },
  P3: { x: 4.5, y: 3.2 },
  P4: { x: 2.0, y: 3.0 },
  P5: { x: 1.5, y: 6.5 },
  P6: { x: 4.5, y: 6.8 },
};

/**
 * En R2, P2 se acerca 3 cm a P3 en x: sigue siendo legal, pero queda "al límite" (la
 * regla de orden lateral solo mira x). Se aleja además en profundidad (y) respecto a
 * `PUNTO_BASE` — eso no lo mira ninguna regla, es solo para que las dos fichas no
 * queden una encima de la otra en el dibujo.
 */
const PUNTO_R2: Readonly<Record<PosicionRotacional, Punto>> = { ...PUNTO_BASE, P2: { x: 4.53, y: 1.8 } };

function puntosPara(rotacion: number): Readonly<Record<PosicionRotacional, Punto>> {
  return rotacion === 2 ? PUNTO_R2 : PUNTO_BASE;
}

function formacionPara(rotacion: number): Formacion {
  const posiciones = formacionEnRotacion(ORDEN_CON_LIBERO, rotacion);
  const puntos = puntosPara(rotacion);
  return ORDEN_POSICIONES.map((posicion, indice) => ({
    jugador: posiciones[indice],
    punto: puntos[posicion],
  }));
}

/**
 * El líbero es la casilla activa en el ejemplo: como el orden de saque es el mismo en
 * las seis rotaciones, ese hueco cae en línea delantera en R3, R4 y R5 — y ahí la regla
 * del líbero (R4 del dominio) produce una falta real, no fabricada. R1, R2 y R6 quedan
 * legales; R2 se deja con un margen de 3 cm para enseñar el aviso. `guardarFormacion`
 * bloquea, como debe, las tres rotaciones con falta: por eso esta maqueta —que sí
 * necesita enseñarlas— las inserta directamente cuando esa función rechaza el guardado.
 */
function construirSistemaEjemplo(): Sistema {
  const vacio = crearSistema('sistema-ejemplo', 'Sistema de ejemplo', 'recepcion', PLANTILLA_EJEMPLO, []);
  if (!vacio) {
    throw new Error('No se pudo crear el sistema de ejemplo');
  }

  let sistema = vacio;
  for (let rotacion = 1; rotacion <= 6; rotacion++) {
    const formacion = formacionPara(rotacion);
    const guardado = guardarFormacion(sistema, rotacion, formacion);
    sistema = guardado ?? { ...sistema, formaciones: { ...sistema.formaciones, [rotacion]: formacion } };
  }
  return sistema;
}

export const SISTEMA_EJEMPLO: Sistema = construirSistemaEjemplo();
