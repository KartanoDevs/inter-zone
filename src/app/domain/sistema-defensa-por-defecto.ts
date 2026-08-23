import type { CasoColocador, Celda, EquipoId, FormacionDefensa, PlantillaEquipo, Punto, PuestoDefensa, Sistema, SituacionDefensa, VarianteDefensa } from './modelos';

const CASOS: readonly CasoColocador[] = ['delantero', 'trasero'];
/** Situaciones con material de referencia (`docs/voley/sistema_defensivo_unificado.md`): el
 * ataque por 1 y la posición inicial no tienen precedente y nacen vacíos (spec 038, E20). */
const SITUACIONES_CON_MATERIAL: readonly SituacionDefensa[] = ['z4', 'z3', 'z2', 'pipe'];
const PUESTOS: readonly PuestoDefensa[] = [1, 2, 3, 4, 5, 6];

/**
 * Dónde se coloca cada puesto contra cada situación con material de referencia. Las de `z2` y
 * `z4` son la misma defensa reflejada respecto al eje central del campo (spec 030, conservado en
 * la 038): el sistema es el mismo por los dos extremos, con los papeles del puesto 5 y el
 * puesto 1 intercambiados. `z2` solo se usa para el caso trasero (spec 038, E4): el delantero no
 * tiene ataque por esa zona.
 */
const PUNTOS: Readonly<Record<SituacionDefensa, Readonly<Record<PuestoDefensa, Punto>>>> = {
  inicial: { 1: { x: 0, y: 0 }, 2: { x: 0, y: 0 }, 3: { x: 0, y: 0 }, 4: { x: 0, y: 0 }, 5: { x: 0, y: 0 }, 6: { x: 0, y: 0 } },
  z1: { 1: { x: 0, y: 0 }, 2: { x: 0, y: 0 }, 3: { x: 0, y: 0 }, 4: { x: 0, y: 0 }, 5: { x: 0, y: 0 }, 6: { x: 0, y: 0 } },
  // Ataque rival por zona 2: viene por nuestra izquierda. Bloquean Z4 y Z3.
  z2: {
    4: { x: 1.4, y: 0.4 },
    3: { x: 2.9, y: 0.4 },
    2: { x: 4.0, y: 2.9 },
    5: { x: 0.9, y: 6.4 },
    6: { x: 5.4, y: 8.0 },
    1: { x: 7.4, y: 4.8 },
  },
  // Ataque rival por zona 4: viene por nuestra derecha. Espejo exacto del anterior.
  z4: {
    2: { x: 7.6, y: 0.4 },
    3: { x: 6.1, y: 0.4 },
    4: { x: 5.0, y: 2.9 },
    1: { x: 8.1, y: 6.4 },
    6: { x: 3.6, y: 8.0 },
    5: { x: 1.6, y: 4.8 },
  },
  // Primer tiempo por el centro: bloquean Z3 y Z4; Z2 se cierra al centro en los 3 metros.
  z3: {
    3: { x: 4.4, y: 0.4 },
    4: { x: 3.2, y: 0.4 },
    2: { x: 5.8, y: 2.9 },
    5: { x: 2.4, y: 6.0 },
    6: { x: 4.5, y: 8.2 },
    1: { x: 6.6, y: 6.0 },
  },
  // Pipe: bloqueo individual del central, las dos bandas se descuelgan y la zaga pivota a la 5.
  pipe: {
    3: { x: 4.5, y: 0.4 },
    4: { x: 2.6, y: 2.9 },
    2: { x: 6.4, y: 2.9 },
    5: { x: 1.7, y: 6.6 },
    6: { x: 4.0, y: 8.2 },
    1: { x: 7.2, y: 5.4 },
  },
};

/** Un bloque rectangular de celdas, por índices inclusivos (la rejilla del campo propio va de 0
 * a 17 en las dos direcciones, a 0,5 m por celda). */
function bloque(columnaInicio: number, columnaFin: number, filaInicio: number, filaFin: number): readonly Celda[] {
  const celdas: Celda[] = [];
  for (let fila = filaInicio; fila <= filaFin; fila++) {
    for (let columna = columnaInicio; columna <= columnaFin; columna++) {
      celdas.push({ columna, fila });
    }
  }
  return celdas;
}

const SIN_CELDAS: Readonly<Record<PuestoDefensa, readonly Celda[]>> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

/**
 * La zona de responsabilidad de cada puesto contra cada situación con material: exactamente lo
 * que el documento le encarga. Los dos bloqueadores comparten siempre una columna: es la costura
 * que el doble bloqueo cierra, y verla es justo lo que el documento pide vigilar.
 */
const CELDAS: Readonly<Record<SituacionDefensa, Readonly<Record<PuestoDefensa, readonly Celda[]>>>> = {
  inicial: SIN_CELDAS,
  z1: SIN_CELDAS,
  z2: {
    4: bloque(0, 5, 0, 1),
    3: bloque(5, 9, 0, 1),
    2: bloque(5, 10, 4, 6),
    5: bloque(0, 3, 8, 17),
    6: bloque(6, 15, 13, 17),
    1: bloque(12, 17, 7, 12),
  },
  z4: {
    2: bloque(12, 17, 0, 1),
    3: bloque(8, 12, 0, 1),
    4: bloque(7, 12, 4, 6),
    1: bloque(14, 17, 8, 17),
    6: bloque(2, 11, 13, 17),
    5: bloque(0, 5, 7, 12),
  },
  z3: {
    3: bloque(7, 11, 0, 1),
    4: bloque(4, 7, 0, 1),
    2: bloque(10, 14, 4, 6),
    5: bloque(2, 7, 10, 14),
    6: bloque(5, 12, 15, 17),
    1: bloque(10, 15, 10, 14),
  },
  pipe: {
    3: bloque(7, 11, 0, 1),
    4: bloque(3, 8, 4, 6),
    2: bloque(9, 14, 4, 6),
    5: bloque(0, 6, 11, 17),
    6: bloque(6, 10, 15, 17),
    1: bloque(12, 17, 8, 14),
  },
};

const SIN_EXPLICACION: Readonly<Record<PuestoDefensa, string>> = { 1: '', 2: '', 3: '', 4: '', 5: '', 6: '' };

/** Qué hace cada puesto contra cada situación con material. Sale del documento del equipo. */
const EXPLICACIONES: Readonly<Record<SituacionDefensa, Readonly<Record<PuestoDefensa, string>>>> = {
  inicial: SIN_EXPLICACION,
  z1: SIN_EXPLICACION,
  z2: {
    4: 'Bloqueo exterior: salta con el central y cierra la línea y la diagonal principal. Ojo: no tapar del todo la paralela, el defensor de la zona 5 necesita ver el brazo del atacante para reaccionar al golpe duro.',
    3: 'El puesto 3 siempre va al bloqueo en los extremos. Paso cruzado rápido para cerrar el doble; si llega tarde, se abre una brecha por el medio.',
    2: 'Único delantero libre: se descuelga a la línea de 3 metros, detrás del hueco del bloqueo, a por las fintas y los toques suaves.',
    5: 'Fijo en la zona 5: cubre la línea. Es un ataque duro y directo, así que juega la paralela sin anticipar de más.',
    6: 'Fijo en la zona 6: cubre la diagonal larga por el centro-fondo, atento a los rebotes del bloqueo.',
    1: 'Sube ligeramente para cubrir la diagonal corta, el cruzado fuerte que cae por delante de la zona 1.',
  },
  z4: {
    2: 'Bloqueo exterior: salta con el central y cierra la paralela y la diagonal principal.',
    3: 'El puesto 3 siempre va al bloqueo en los extremos. Paso cruzado rápido para cerrar el doble por fuera.',
    4: 'Único delantero libre: se descuelga a la línea de 3 metros a barrer fintas y toques suaves detrás del bloqueo.',
    5: 'Fijo en la zona 5: aquí no puede quedarse anclado. Primer paso explosivo hacia adelante para interceptar la diagonal corta.',
    6: 'Fijo en la zona 6: cubre la diagonal larga por el centro-fondo y los block-outs.',
    1: 'Cubre la línea, la paralela que baja por nuestra banda derecha.',
  },
  z3: {
    3: 'Salta frente al atacante de primer tiempo, sin esperar a leer nada más.',
    4: 'Asiste al puesto 3 lo más rápido posible para que el bloqueo llegue a ser doble.',
    2: 'No entra al bloqueo: se cierra hacia el centro en la línea de 3 metros.',
    5: 'Se cierra hacia el centro-izquierda.',
    6: 'Se queda profundo en el fondo, a por los balones bombeados y los block-outs largos.',
    1: 'Se cierra hacia el centro-derecha.',
  },
  pipe: {
    3: 'Contra la pipe el bloqueo es individual: solo salta el puesto 3, en el centro de la red.',
    4: 'Con bloqueo individual las dos bandas quedan libres: se descuelga a los 3 metros a barrer cualquier finta o toque suave.',
    2: 'Con bloqueo individual las dos bandas quedan libres: se descuelga a los 3 metros para tapar lo que pase por encima o por el lado del central.',
    5: 'Toda la zaga pivota a la zona 5: se coloca a absorber el remate fuerte, que es lo que el sistema anticipa contra la pipe.',
    6: 'Profundo, pero basculando a la izquierda para apoyar la zona de mayor probabilidad de impacto.',
    1: 'Mucho más agresivo de lo normal en la diagonal corta y media derecha: el resto de la zaga ha pivotado a la izquierda y este lado queda solo.',
  },
};

const DESCRIPCION =
  'Defensa especializada por zonas: el puesto 5 (línea de zaga izquierda) defiende siempre esa ' +
  'esquina, el puesto 6 (centro-fondo) siempre la suya, y el puesto 1 (zaga derecha) la suya. ' +
  'Contra los ataques por los extremos el puesto 3 sube siempre al doble bloqueo con el puesto ' +
  'de banda correspondiente, y el delantero que queda libre se descuelga a la línea de 3 metros ' +
  'a cubrir las fintas. Contra la pipe solo bloquea el puesto 3: las dos bandas quedan libres ' +
  'para barrer los toques suaves y toda la zaga pivota hacia la zona 5, donde el sistema ' +
  'anticipa el remate.';

function explicacionDeVariante(): string {
  return (
    'En zaga defienden los puestos 5, 6 y 1, cada uno su esquina. ' +
    'En la red, el puesto 3 bloquea por el centro, el puesto 4 cubre la banda izquierda y el ' +
    'puesto 2 la derecha.'
  );
}

function formacionDe(situacion: SituacionDefensa): FormacionDefensa {
  return PUESTOS.map((puesto) => ({
    puesto,
    punto: PUNTOS[situacion][puesto],
    explicacion: EXPLICACIONES[situacion][puesto],
    celdas: CELDAS[situacion][puesto],
  }));
}

/** El sistema defensivo de `docs/voley/sistema_defensivo_unificado.md` (spec 030, reescrito en
 * la spec 038 por caso de colocador rival y situación en vez de rotación y vía). Sembrado junto
 * al de recepción cuando el servidor no tiene nada guardado. Del equipo masculino por defecto
 * (spec 032), mismo motivo que `sistemaPorDefecto`. Deja sin colocación la posición inicial y el
 * ataque por 1: no hay material de referencia que las cubra (spec 038, E20). */
export function sistemaDefensaPorDefecto(plantilla: PlantillaEquipo, equipoId: EquipoId = 'masculino'): Sistema {
  const defensas: VarianteDefensa[] = [];
  for (const caso of CASOS) {
    for (const situacion of SITUACIONES_CON_MATERIAL) {
      if (caso === 'delantero' && situacion === 'z2') {
        continue; // no existe ataque por zona 2 rival cuando su colocador está delante
      }
      defensas.push({
        caso,
        situacion,
        bloqueadores: 0,
        formacion: formacionDe(situacion),
        explicacion: explicacionDeVariante(),
      });
    }
  }
  return {
    id: 'sistema-defensa-por-defecto',
    nombre: 'TEST Defensa zonas',
    tipo: 'defensa',
    equipoId,
    plantilla,
    formaciones: {},
    defensas,
    descripcion: DESCRIPCION,
    explicacionesRotacion: {},
  };
}
