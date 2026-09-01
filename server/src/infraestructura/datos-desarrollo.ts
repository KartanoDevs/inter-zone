import type {
  EquipoId,
  Formacion,
  Punto,
  Sistema,
  VarianteDefensa,
} from '../../../src/app/domain/modelos';
import { PLANTILLA_GLOBAL } from '../../../src/app/domain/plantilla-global';
import { sistemaPorDefecto } from '../../../src/app/domain/sistema-por-defecto';
import {
  formacionDefensaPorDefecto,
  sistemaDefensaPorDefecto,
} from '../../../src/app/domain/sistema-defensa-por-defecto';
import { situacionesDe } from '../../../src/app/domain/defensa';
import { jugadoresEnPista } from '../../../src/app/domain/rotacion';

/**
 * Juego de sistemas de prueba para el entorno de desarrollo (ADR 0045). No son reglas de
 * voleibol — por eso no viven en `src/app/domain/` — sino datos de un entorno concreto, así que
 * cuelgan de `server/`, junto a la semilla que los planta.
 */

const ROTACIONES = [1, 2, 3, 4, 5, 6] as const;
type RotacionValida = (typeof ROTACIONES)[number];

/** Coordenadas de "Rotación base" (spec 033), tal y como quedaron guardadas en el despliegue
 * local del autor — copiadas de la base de datos y redondeadas a centímetros; el original
 * guarda floats de arrastre del ratón, con precisión de milímetro irrelevante para el dominio.
 * Mismo sistema para masculino y femenino: no hay guía de referencia distinta para el femenino
 * (mismo criterio que `sistemaPorDefecto`, spec 033 E10). */
const PUNTOS_ROTACION_BASE: Readonly<Record<RotacionValida, Readonly<Record<string, Punto>>>> = {
  1: {
    central2: { x: 4.5, y: 1.53 },
    colocador: { x: 7.5, y: 6.53 },
    libero: { x: 4.6, y: 6.56 },
    opuesto: { x: 1.6, y: 1.49 },
    receptor1: { x: 7.44, y: 1.53 },
    receptor2: { x: 1.53, y: 6.5 },
  },
  2: {
    central2: { x: 1.5, y: 1.53 },
    colocador: { x: 7.57, y: 1.53 },
    libero: { x: 7.5, y: 6.56 },
    opuesto: { x: 1.56, y: 6.56 },
    receptor1: { x: 4.5, y: 1.49 },
    receptor2: { x: 4.6, y: 6.53 },
  },
  3: {
    central1: { x: 7.5, y: 1.53 },
    colocador: { x: 4.47, y: 1.49 },
    libero: { x: 1.56, y: 6.56 },
    opuesto: { x: 4.53, y: 6.63 },
    receptor1: { x: 1.43, y: 1.53 },
    receptor2: { x: 7.57, y: 6.63 },
  },
  4: {
    central1: { x: 4.53, y: 1.46 },
    colocador: { x: 1.53, y: 1.46 },
    libero: { x: 4.47, y: 6.5 },
    opuesto: { x: 7.54, y: 6.5 },
    receptor1: { x: 1.43, y: 6.5 },
    receptor2: { x: 7.47, y: 1.46 },
  },
  5: {
    central1: { x: 1.46, y: 1.46 },
    colocador: { x: 1.5, y: 6.53 },
    libero: { x: 7.47, y: 6.66 },
    opuesto: { x: 7.54, y: 1.56 },
    receptor1: { x: 4.5, y: 6.5 },
    receptor2: { x: 4.57, y: 1.46 },
  },
  6: {
    central2: { x: 7.5, y: 1.53 },
    colocador: { x: 4.6, y: 6.56 },
    libero: { x: 1.46, y: 6.53 },
    opuesto: { x: 4.53, y: 1.49 },
    receptor1: { x: 7.5, y: 6.56 },
    receptor2: { x: 1.46, y: 1.53 },
  },
};

const DESCRIPCION_ROTACION_BASE =
  'Sistema de rotación base. No se usa en competición pero establece la posición de cada jugador.';

/** "Rotación base" (spec 033): cada jugador en su posición rotacional pura, sin recepción real
 * — el punto de partida antes de diseñar un sistema de verdad. Existe ya en local para los dos
 * equipos (mismas coordenadas en ambos); se reproduce aquí tal cual para no perderla al
 * reconstruir la base de desarrollo. */
function rotacionBase(equipoId: EquipoId): Omit<Sistema, 'id'> {
  const formaciones: Partial<Record<RotacionValida, Formacion>> = {};
  for (const rotacion of ROTACIONES) {
    const puntos = PUNTOS_ROTACION_BASE[rotacion];
    formaciones[rotacion] = jugadoresEnPista(PLANTILLA_GLOBAL, rotacion).map((jugador) => ({
      jugador,
      punto: puntos[jugador.id],
    }));
  }
  return {
    nombre: 'Rotación base',
    tipo: 'recepcion',
    equipoId,
    plantilla: PLANTILLA_GLOBAL,
    formaciones,
    descripcion: DESCRIPCION_ROTACION_BASE,
    explicacionesRotacion: {},
  };
}

/** Los seis puestos P1..P6, en el mismo punto que usa `sistemaPorDefecto` para esa rotación
 * (spec 025): reutilizar esa geometría, ya validada sin faltas de posición, es lo que garantiza
 * que "Recepción a 2" —con solo dos jugadores realmente recibiendo— sigue siendo una formación
 * legal para los cuatro que quedan retirados. */
const PUNTOS_RECEPCION_A_DOS: Readonly<
  Record<RotacionValida, readonly [Punto, Punto, Punto, Punto, Punto, Punto]>
> = {
  1: [
    { x: 7.8, y: 7.6 },
    { x: 7.0, y: 4.2 },
    { x: 4.5, y: 0.8 },
    { x: 1.5, y: 0.8 },
    { x: 1.6, y: 5.6 },
    { x: 4.4, y: 6.2 },
  ],
  2: [
    { x: 7.6, y: 6.2 },
    { x: 8.0, y: 1.0 },
    { x: 5.0, y: 3.6 },
    { x: 1.4, y: 0.8 },
    { x: 1.0, y: 6.6 },
    { x: 3.0, y: 6.0 },
  ],
  3: [
    { x: 7.8, y: 5.6 },
    { x: 8.2, y: 0.8 },
    { x: 5.6, y: 0.8 },
    { x: 2.6, y: 3.6 },
    { x: 4.0, y: 6.2 },
    { x: 5.6, y: 7.4 },
  ],
  4: [
    { x: 8.2, y: 7.0 },
    { x: 7.4, y: 3.6 },
    { x: 4.2, y: 0.8 },
    { x: 0.8, y: 0.8 },
    { x: 2.0, y: 5.6 },
    { x: 5.0, y: 6.2 },
  ],
  5: [
    { x: 8.0, y: 5.8 },
    { x: 8.2, y: 0.8 },
    { x: 3.2, y: 3.6 },
    { x: 1.0, y: 0.8 },
    { x: 0.6, y: 7.6 },
    { x: 5.4, y: 6.0 },
  ],
  6: [
    { x: 7.6, y: 5.6 },
    { x: 8.2, y: 0.8 },
    { x: 5.2, y: 0.8 },
    { x: 2.2, y: 3.6 },
    { x: 4.2, y: 6.2 },
    { x: 5.8, y: 7.6 },
  ],
};

const DESCRIPCION_RECEPCION_A_DOS =
  'Recepción a 2: solo el líbero y el receptor que le queda en zaga reciben; el resto del ' +
  'equipo (colocador, opuesto y los dos centrales/receptor delantero) queda liberado, ya en ' +
  'posición de ataque. Formación de prueba, no una recomendación táctica.';

/** "TEST Recepción a 2" (femenino): variante de recepción con la responsabilidad concentrada al
 * máximo, en el líbero y en quien lo acompaña en zaga esa rotación — nunca dos jugadores sueltos
 * sobre la pista, los seis titulares siguen colocados como exige `comprobarRoster`
 * (`sistema.repositorio.ts`). */
function recepcionADos(): Omit<Sistema, 'id'> {
  const formaciones: Partial<Record<RotacionValida, Formacion>> = {};
  for (const rotacion of ROTACIONES) {
    const puntos = PUNTOS_RECEPCION_A_DOS[rotacion];
    formaciones[rotacion] = jugadoresEnPista(PLANTILLA_GLOBAL, rotacion).map((jugador, indice) => ({
      jugador,
      punto: puntos[indice],
    }));
  }
  return {
    nombre: 'TEST Recepción a 2',
    tipo: 'recepcion',
    equipoId: 'femenino',
    plantilla: PLANTILLA_GLOBAL,
    formaciones,
    descripcion: DESCRIPCION_RECEPCION_A_DOS,
    explicacionesRotacion: {},
  };
}

const DESCRIPCION_DEFENSA_COMPLETA =
  'Defensa completa de prueba: las 34 variantes posibles (caso del colocador rival × situación ' +
  'de ataque × número de bloqueadores), generadas con las posturas por defecto del dominio — ' +
  'incluye la postura inicial y el ataque por 1, que "TEST Defensa zonas" deja sin colocación.';

/** "TEST Defensa completa" (masculino): todas las variantes que admite el dominio, generadas con
 * `formacionDefensaPorDefecto` — la misma función que ya usa `sistemaDefensaPorDefecto`, así que
 * ninguna coordenada se inventa aquí. A diferencia de `sistemaDefensaPorDefecto`, no se salta
 * `inicial` ni `z1`: con 0 bloqueadores siempre existen (spec 038, E20), así que cubrirlas es
 * gratis y deja un sistema sin huecos que enseñar en Teoría. */
function defensaCompleta(): Omit<Sistema, 'id'> {
  const defensas: VarianteDefensa[] = [];
  for (const caso of ['delantero', 'trasero'] as const) {
    for (const situacion of situacionesDe(caso)) {
      const maximoBloqueadores = situacion === 'inicial' ? 0 : 3;
      for (let bloqueadores = 0; bloqueadores <= maximoBloqueadores; bloqueadores++) {
        defensas.push({
          caso,
          situacion,
          bloqueadores: bloqueadores as 0 | 1 | 2 | 3,
          formacion: formacionDefensaPorDefecto(situacion, bloqueadores as 0 | 1 | 2 | 3),
          explicacion: `${caso === 'delantero' ? 'Colocador rival delantero' : 'Colocador rival trasero'}, ataque ${etiquetaSituacion(situacion)}, ${bloqueadores} bloqueador${bloqueadores === 1 ? '' : 'es'}.`,
        });
      }
    }
  }
  return {
    nombre: 'TEST Defensa completa',
    tipo: 'defensa',
    equipoId: 'masculino',
    plantilla: PLANTILLA_GLOBAL,
    formaciones: {},
    defensas,
    descripcion: DESCRIPCION_DEFENSA_COMPLETA,
    explicacionesRotacion: {},
  };
}

function etiquetaSituacion(situacion: ReturnType<typeof situacionesDe>[number]): string {
  return situacion === 'inicial' ? 'postura inicial' : `por ${situacion}`;
}

/** Los seis sistemas de prueba del entorno de desarrollo (ADR 0045). `sembrarDatosDeDesarrollo`
 * (`semilla-desarrollo.ts`) los planta o los sustituye si ya existen. */
export function sistemasDeDesarrollo(): readonly Omit<Sistema, 'id'>[] {
  return [
    rotacionBase('masculino'),
    rotacionBase('femenino'),
    sistemaPorDefecto(PLANTILLA_GLOBAL, 'masculino'),
    sistemaDefensaPorDefecto(PLANTILLA_GLOBAL, 'masculino'),
    defensaCompleta(),
    recepcionADos(),
  ];
}
