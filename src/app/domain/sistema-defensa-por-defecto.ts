import type { Celda, Formacion, Jugador, OrdenSaque, PlantillaEquipo, Punto, RolId, Sistema, ViaAtaque } from './modelos';
import { jugadoresEnPista } from './rotacion';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from './roles';

/** Una de las seis zonas del campo propio: 1, 5 y 6 en zaga; 2, 3 y 4 en la red. No confundir
 * con la posición rotacional P1..P6 — este sistema coloca por zona, no por rotación. */
type ZonaFisica = 1 | 2 | 3 | 4 | 5 | 6;

const ROTACIONES = [1, 2, 3, 4, 5, 6] as const;
const VIAS: readonly ViaAtaque[] = ['z4', 'z3', 'z2', 'pipe'];
const ZONAS: readonly ZonaFisica[] = [1, 2, 3, 4, 5, 6];

/**
 * Quién defiende cada zona, derivado del **rol** y de si el jugador está en zaga o en delantera
 * — nunca de su posición rotacional (`docs/voley/sistema_defensivo_unificado.md`: "se abandona
 * la rotación posicional pura de zagueros en favor de una especialización por zonas").
 *
 * Zaga: líbero a la 5, receptor a la 6, colocador u opuesto a la 1. Delantera: central a la 3,
 * receptor a la 4, colocador u opuesto a la 2. Con la plantilla por defecto el reparto sale
 * exacto en las seis rotaciones (spec 030, E1); los `??` solo evitan reventar con una plantilla
 * que no cumpla esa forma, repartiendo lo que quede en orden.
 */
function repartirZonas(enPista: OrdenSaque): Readonly<Record<ZonaFisica, Jugador>> {
  const zaga = [enPista[0], enPista[4], enPista[5]]; // P1, P5, P6
  const delantera = [enPista[1], enPista[2], enPista[3]]; // P2, P3, P4
  const tomar = (grupo: Jugador[], rol: RolId): Jugador | undefined => {
    const indice = grupo.findIndex((jugador) => jugador.rol === rol);
    return indice === -1 ? undefined : grupo.splice(indice, 1)[0];
  };
  const libero = tomar(zaga, 'libero');
  const receptorZaguero = tomar(zaga, 'receptor');
  const central = tomar(delantera, 'central');
  const receptorDelantero = tomar(delantera, 'receptor');
  return {
    5: libero ?? zaga.shift()!,
    6: receptorZaguero ?? zaga.shift()!,
    1: zaga.shift()!,
    3: central ?? delantera.shift()!,
    4: receptorDelantero ?? delantera.shift()!,
    2: delantera.shift()!,
  };
}

/**
 * Dónde se coloca cada zona contra cada vía de ataque. Las de `z2` y `z4` son la misma defensa
 * reflejada respecto al eje central del campo (spec 030, E9): el sistema es el mismo por los dos
 * extremos, con los papeles de la zona 5 y la zona 1 intercambiados.
 */
const PUNTOS: Readonly<Record<ViaAtaque, Readonly<Record<ZonaFisica, Punto>>>> = {
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

/**
 * La zona de responsabilidad de cada puesto contra cada vía: exactamente lo que el documento le
 * encarga, no un reparto que cubra el campo entero. Donde el documento no manda a nadie, la
 * celda queda descubierta a propósito (spec 030, "Fuera de alcance").
 *
 * Los dos bloqueadores comparten siempre una columna: es la costura que el doble bloqueo cierra,
 * y verla es justo lo que el documento pide vigilar.
 */
const CELDAS: Readonly<Record<ViaAtaque, Readonly<Record<ZonaFisica, readonly Celda[]>>>> = {
  z2: {
    4: bloque(0, 5, 0, 1), // bloqueo exterior: cierra la línea
    3: bloque(5, 9, 0, 1), // central: cierra el doble por dentro
    2: bloque(5, 10, 4, 6), // fintas detrás del hueco del bloqueo
    5: bloque(0, 3, 8, 17), // líbero: la paralela, pegado a la banda
    6: bloque(6, 15, 13, 17), // diagonal larga y rebotes, en el fondo
    1: bloque(12, 17, 7, 12), // diagonal corta: sube a por el cruzado fuerte
  },
  z4: {
    2: bloque(12, 17, 0, 1),
    3: bloque(8, 12, 0, 1),
    4: bloque(7, 12, 4, 6),
    1: bloque(14, 17, 8, 17), // la paralela por nuestra derecha
    6: bloque(2, 11, 13, 17),
    5: bloque(0, 5, 7, 12), // líbero: sube a por la diagonal corta
  },
  z3: {
    3: bloque(7, 11, 0, 1), // central, frente al primer tiempo
    4: bloque(4, 7, 0, 1), // asiste el doble por su lado
    2: bloque(10, 14, 4, 6), // se cierra al centro en los 3 metros
    5: bloque(2, 7, 10, 14), // se cierra al centro-izquierda
    6: bloque(5, 12, 15, 17), // profundo, balones bombeados y block-outs
    1: bloque(10, 15, 10, 14), // se cierra al centro-derecha
  },
  pipe: {
    3: bloque(7, 11, 0, 1), // bloqueo individual
    4: bloque(3, 8, 4, 6), // las dos bandas barren las fintas
    2: bloque(9, 14, 4, 6),
    5: bloque(0, 6, 11, 17), // el pivote: absorbe el remate fuerte
    6: bloque(6, 10, 15, 17), // profundo, basculado a la izquierda con el resto de la zaga
    1: bloque(12, 17, 8, 14), // agresivo en la media-derecha
  },
};

/** Qué hace cada puesto contra cada vía. Sale del documento del equipo; lo que cambia de una
 * rotación a otra es solo quién ocupa el puesto, nunca la tarea. */
const EXPLICACIONES: Readonly<Record<ViaAtaque, Readonly<Record<ZonaFisica, string>>>> = {
  z2: {
    4: 'Bloqueo exterior: salta con el central y cierra la línea y la diagonal principal. Ojo: no tapar del todo la paralela, el líbero necesita ver el brazo del atacante para reaccionar al golpe duro.',
    3: 'El central siempre va al bloqueo en los extremos. Paso cruzado rápido para cerrar el doble; si llega tarde, se abre una brecha por el medio.',
    2: 'Único delantero libre: se descuelga a la línea de 3 metros, detrás del hueco del bloqueo, a por las fintas y los toques suaves.',
    5: 'Líbero, fijo en la 5: cubre la línea. Es un ataque duro y directo, así que juega la paralela sin anticipar de más.',
    6: 'Receptor, fijo en la 6: cubre la diagonal larga por el centro-fondo, atento a los rebotes del bloqueo.',
    1: 'Sube ligeramente para cubrir la diagonal corta, el cruzado fuerte que cae por delante de la zona 1.',
  },
  z4: {
    2: 'Bloqueo exterior: salta con el central y cierra la paralela y la diagonal principal.',
    3: 'El central siempre va al bloqueo en los extremos. Paso cruzado rápido para cerrar el doble por fuera.',
    4: 'Único delantero libre: se descuelga a la línea de 3 metros a barrer fintas y toques suaves detrás del bloqueo.',
    5: 'Líbero, fijo en la 5: aquí no puede quedarse anclado. Primer paso explosivo hacia adelante para interceptar la diagonal corta.',
    6: 'Receptor, fijo en la 6: cubre la diagonal larga por el centro-fondo y los block-outs.',
    1: 'Cubre la línea, la paralela que baja por nuestra banda derecha.',
  },
  z3: {
    3: 'Salta frente al atacante de primer tiempo, sin esperar a leer nada más.',
    4: 'Asiste al central lo más rápido posible para que el bloqueo llegue a ser doble.',
    2: 'No entra al bloqueo: se cierra hacia el centro en la línea de 3 metros.',
    5: 'Líbero: se cierra hacia el centro-izquierda.',
    6: 'Receptor: se queda profundo en el fondo, a por los balones bombeados y los block-outs largos.',
    1: 'Se cierra hacia el centro-derecha.',
  },
  pipe: {
    3: 'Contra la pipe el bloqueo es individual: solo salta el central, en el centro de la red.',
    4: 'Con bloqueo individual las dos bandas quedan libres: se descuelga a los 3 metros a barrer cualquier finta o toque suave.',
    2: 'Con bloqueo individual las dos bandas quedan libres: se descuelga a los 3 metros para tapar lo que pase por encima o por el lado del central.',
    5: 'Toda la zaga pivota a la 5: el líbero se coloca a absorber el remate fuerte, que es lo que el sistema anticipa contra la pipe.',
    6: 'Receptor: profundo, pero basculando a la izquierda para apoyar la zona de mayor probabilidad de impacto.',
    1: 'Mucho más agresivo de lo normal en la diagonal corta y media derecha: el resto de la zaga ha pivotado a la izquierda y este lado queda solo.',
  },
};

const DESCRIPCION =
  'Defensa especializada por zonas, no por rotación: el líbero defiende siempre en la zona 5, el ' +
  'receptor zaguero siempre en la zona 6, y el colocador o el opuesto —el que esté en zaga— en la ' +
  'zona 1. Contra los ataques por los extremos el central sube siempre al doble bloqueo con el ' +
  'jugador de banda, y el delantero que queda libre se descuelga a la línea de 3 metros a cubrir ' +
  'las fintas. Contra la pipe solo bloquea el central: las dos bandas quedan libres para barrer los ' +
  'toques suaves y toda la zaga pivota hacia la zona 5, donde el sistema anticipa el remate.';

/** Quién ocupa cada zona en esta rotación: lo único que cambia de una rotación a otra, porque
 * las tareas van por zona y no por jugador. Se deriva del reparto, no se declara. */
function explicacionDeRotacion(porZona: Readonly<Record<ZonaFisica, Jugador>>): string {
  const etiqueta = (zona: ZonaFisica): string => etiquetaDe(porZona[zona], CONFIGURACION_ROLES_POR_DEFECTO);
  return (
    `En zaga defienden ${etiqueta(5)} en la zona 5, ${etiqueta(6)} en la zona 6 y ${etiqueta(1)} en la zona 1. ` +
    `En la red, ${etiqueta(3)} bloquea por el centro, ${etiqueta(4)} cubre la banda izquierda y ${etiqueta(2)} la derecha.`
  );
}

/** El sistema defensivo de `docs/voley/sistema_defensivo_unificado.md` (spec 030), sembrado
 * junto al de recepción cuando el navegador no tiene nada guardado. */
export function sistemaDefensaPorDefecto(plantilla: PlantillaEquipo): Sistema {
  const defensas = {} as Record<1 | 2 | 3 | 4 | 5 | 6, Record<ViaAtaque, Formacion>>;
  const explicacionesRotacion = {} as Record<1 | 2 | 3 | 4 | 5 | 6, string>;
  for (const rotacion of ROTACIONES) {
    const porZona = repartirZonas(jugadoresEnPista(plantilla, rotacion));
    const porVia = {} as Record<ViaAtaque, Formacion>;
    for (const via of VIAS) {
      porVia[via] = ZONAS.map((zona) => ({
        jugador: porZona[zona],
        punto: PUNTOS[via][zona],
        explicacion: EXPLICACIONES[via][zona],
        celdas: CELDAS[via][zona],
      }));
    }
    defensas[rotacion] = porVia;
    explicacionesRotacion[rotacion] = explicacionDeRotacion(porZona);
  }
  return {
    id: 'sistema-defensa-por-defecto',
    nombre: 'TEST Defensa zonas',
    tipo: 'defensa',
    plantilla,
    formaciones: {},
    defensas,
    descripcion: DESCRIPCION,
    explicacionesRotacion,
  };
}
