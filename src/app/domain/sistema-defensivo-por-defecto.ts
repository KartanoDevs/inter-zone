import type { Celda, Formacion, PlantillaEquipo, Punto, Sistema } from './modelos';
import { jugadoresEnPista } from './rotacion';

type PorPosicion<T> = readonly [T, T, T, T, T, T];
type Via = 'z4' | 'z2';

function rectangulo(colInicio: number, colFin: number, filaInicio: number, filaFin: number): readonly Celda[] {
  const celdas: Celda[] = [];
  for (let fila = filaInicio; fila <= filaFin; fila++) {
    for (let columna = colInicio; columna <= colFin; columna++) {
      celdas.push({ columna, fila });
    }
  }
  return celdas;
}

/**
 * Sistema "de lectura" (guía, §1.1): quién bloquea, quién es off-blocker y quién defiende
 * profundo depende solo de la posición rotacional (P1..P6) y de la vía — nunca de qué jugador
 * concreto ocupa esa posición (spec 029). Por eso los puntos, celdas y explicaciones se
 * declaran una única vez por (posición, vía) y se reutilizan en las seis rotaciones.
 *
 * vs Z4: P3+P4 bloquean (P3 se desplaza a la izquierda para cerrar el doble), P2 es
 * off-blocker. vs Z2: P2+P3 bloquean (P3 se desplaza a la derecha), P4 es off-blocker. P1, P5,
 * P6 (los tres zagueros) son siempre los defensores profundos, en las dos vías.
 */
const PUNTOS_POR_VIA: Readonly<Record<Via, PorPosicion<Punto>>> = {
  z4: [
    { x: 7.6, y: 6.6 }, // P1 — defensor de banda contraria
    { x: 7.5, y: 3.0 }, // P2 — off-blocker
    { x: 3.2, y: 0.4 }, // P3 — bloqueador central
    { x: 1.3, y: 0.4 }, // P4 — bloqueador exterior
    { x: 0.8, y: 6.2 }, // P5 — defensor de banda del bloqueo
    { x: 4.5, y: 7.8 }, // P6 — defensor central-profundo
  ],
  z2: [
    { x: 8.2, y: 6.2 }, // P1 — defensor de banda del bloqueo
    { x: 7.7, y: 0.4 }, // P2 — bloqueador exterior
    { x: 5.8, y: 0.4 }, // P3 — bloqueador central
    { x: 1.5, y: 3.0 }, // P4 — off-blocker
    { x: 1.4, y: 6.6 }, // P5 — defensor de banda contraria
    { x: 4.5, y: 7.8 }, // P6 — defensor central-profundo
  ],
};

/** Las celdas de P3 y las del bloqueador exterior de cada vía comparten columna (4 en Z4, 13 en
 * Z2): el central se desplaza para cerrar el doble bloqueo y elimina la costura (guía, §2.1). */
const CELDAS_POR_VIA: Readonly<Record<Via, PorPosicion<readonly Celda[]>>> = {
  z4: [
    rectangulo(13, 17, 10, 15), // P1 — banda contraria: diagonal larga y línea de su lado
    rectangulo(12, 17, 5, 6), // P2 — off-blocker: línea de 3 m de su lado
    rectangulo(4, 8, 0, 1), // P3 — bloqueador central, desplazado a la izquierda
    rectangulo(0, 4, 0, 1), // P4 — bloqueador exterior
    rectangulo(0, 3, 10, 15), // P5 — banda del bloqueo: línea y diagonal corta
    rectangulo(6, 11, 13, 17), // P6 — central-profundo: centro, rechaces, diagonales largas
  ],
  z2: [
    rectangulo(14, 17, 10, 15), // P1 — banda del bloqueo
    rectangulo(13, 17, 0, 1), // P2 — bloqueador exterior
    rectangulo(9, 13, 0, 1), // P3 — bloqueador central, desplazado a la derecha
    rectangulo(0, 5, 5, 6), // P4 — off-blocker
    rectangulo(0, 4, 10, 15), // P5 — banda contraria
    rectangulo(6, 11, 13, 17), // P6 — central-profundo
  ],
};

const EXPLICACION_BANDA_CONTRARIA = 'Defensor de banda contraria: cubre la diagonal larga y la línea de su lado, lejos del bloqueo.';
const EXPLICACION_OFF_BLOCKER =
  'Off-blocker: desciende a la línea de 3 metros para cubrir fintas, toques cortos y rechaces suaves del bloqueo.';
const EXPLICACION_BLOQUEADOR_CENTRAL =
  'Bloqueador central: se desplaza hacia la zona del ataque para cerrar el doble bloqueo, eliminando la costura con el exterior.';
const EXPLICACION_BLOQUEADOR_EXTERIOR =
  'Bloqueador exterior: fija la referencia del bloqueo — decide, leyendo al colocador y al atacante rival, si cierra línea o diagonal.';
const EXPLICACION_BANDA_BLOQUEO = 'Defensor de banda del bloqueo: cubre la línea o la diagonal corta del lado por donde viene el ataque.';
const EXPLICACION_CENTRAL_PROFUNDO =
  'Defensor central-profundo, el ancla del fondo: cubre el centro, los rechaces del bloqueo y las diagonales largas.';

const EXPLICACIONES_JUGADOR_POR_VIA: Readonly<Record<Via, PorPosicion<string>>> = {
  z4: [
    EXPLICACION_BANDA_CONTRARIA,
    EXPLICACION_OFF_BLOCKER,
    EXPLICACION_BLOQUEADOR_CENTRAL,
    EXPLICACION_BLOQUEADOR_EXTERIOR,
    EXPLICACION_BANDA_BLOQUEO,
    EXPLICACION_CENTRAL_PROFUNDO,
  ],
  z2: [
    EXPLICACION_BANDA_BLOQUEO,
    EXPLICACION_BLOQUEADOR_EXTERIOR,
    EXPLICACION_BLOQUEADOR_CENTRAL,
    EXPLICACION_OFF_BLOCKER,
    EXPLICACION_BANDA_CONTRARIA,
    EXPLICACION_CENTRAL_PROFUNDO,
  ],
};

/** Explicación de conjunto por rotación y vía (guía, §3.1-3.6), traducida con la misma tabla
 * guía↔app que la spec 025 (idéntica tabla de rotaciones en ambas guías). */
const EXPLICACIONES_ROTACION: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, Readonly<Record<Via, string>>>> = {
  1: {
    z4: 'Colocador defensor profundo en P1: transición corta hacia el armado. Complejidad baja-media.',
    z2: 'Colocador defensor profundo en P1, banda derecha. El opuesto desciende como off-blocker. Complejidad baja-media.',
  },
  6: {
    z4: 'Bloqueo sin central especialista; el colocador, defensor en P6, tiene transición directa hacia adelante. Complejidad media.',
    z2: 'El central vuelve a su posición natural de bloqueador. Complejidad media.',
  },
  5: {
    z4: 'Rotación crítica: el colocador, defensor en P5, tiene la ruta de transición más larga (unos 8 m). Requiere plan de emergencia si defiende él el primer toque.',
    z2: 'Rotación crítica: bloqueo sin especialistas; misma transición larga para el colocador.',
  },
  4: {
    z4: 'Rotación crítica: el colocador está comprometido en el bloqueo. Si bloquea, el segundo toque lo asume otro (plan de emergencia).',
    z2: 'El colocador es off-blocker, lo que facilita una transición rápida hacia la zona de armado. Complejidad media.',
  },
  3: {
    z4: 'Rotación crítica: el colocador es bloqueador central y bloquea en todos los ataques por esta vía.',
    z2: 'Rotación crítica: el colocador sigue siendo bloqueador central; la transición se complica si bloquea o si desciende tras un bloqueo fallido.',
  },
  2: {
    z4: 'Rotación favorable: el colocador es off-blocker, a un paso de la zona de armado. Transición casi inmediata.',
    z2: 'Rotación crítica: el colocador bloquea como exterior derecho, lo que compromete la transición. Otro asume el segundo toque si bloquea.',
  },
};

const DESCRIPCION =
  'Sistema defensivo 2-1-3: dos bloqueadores en la red, un off-blocker en la línea de 3 metros y ' +
  'tres defensores profundos en el perímetro. Es un sistema de lectura — nadie tiene una posición ' +
  'fija preasignada, cada jugador lee el desarrollo del ataque y se coloca en consecuencia. El ' +
  'bloqueo doble elimina una dirección de ataque completa, el off-blocker cubre las fintas y los ' +
  'tres defensores profundos priorizan los ataques potentes desde los bordes del campo. El reto ' +
  'principal es la transición del colocador cuando participa en el bloqueo o en la defensa profunda.';

const VIAS: readonly Via[] = ['z4', 'z2'];
const ROTACIONES = [1, 2, 3, 4, 5, 6] as const;

/** El sistema defensivo 2-1-3 de `docs/voley/Guia_Sistema_Defensivo_2-1-3_Esquema_5-1.md`
 * (spec 029), con el que arranca la app junto al de recepción (spec 025) cuando el navegador no
 * tiene nada guardado. Solo cubre Z4 y Z2 — la guía no documenta Z3 ni el pipe. */
export function sistemaDefensivoPorDefecto(plantilla: PlantillaEquipo): Sistema {
  const defensas: Record<1 | 2 | 3 | 4 | 5 | 6, Record<Via, Formacion>> = {} as Record<1 | 2 | 3 | 4 | 5 | 6, Record<Via, Formacion>>;
  for (const rotacion of ROTACIONES) {
    const porVia = {} as Record<Via, Formacion>;
    for (const via of VIAS) {
      const puntos = PUNTOS_POR_VIA[via];
      const celdas = CELDAS_POR_VIA[via];
      const explicaciones = EXPLICACIONES_JUGADOR_POR_VIA[via];
      porVia[via] = jugadoresEnPista(plantilla, rotacion).map((jugador, indice) => ({
        jugador,
        punto: puntos[indice],
        explicacion: explicaciones[indice],
        celdas: celdas[indice],
      }));
    }
    defensas[rotacion] = porVia;
  }
  return {
    id: 'sistema-defensivo-por-defecto',
    nombre: 'Defensa 2-1-3 (5-1)',
    tipo: 'defensa',
    plantilla,
    formaciones: {},
    defensas,
    descripcion: DESCRIPCION,
    explicacionesRotacion: Object.fromEntries(
      ROTACIONES.map((rotacion) => [rotacion, `Z4: ${EXPLICACIONES_ROTACION[rotacion].z4} · Z2: ${EXPLICACIONES_ROTACION[rotacion].z2}`]),
    ) as Record<1 | 2 | 3 | 4 | 5 | 6, string>,
  };
}
