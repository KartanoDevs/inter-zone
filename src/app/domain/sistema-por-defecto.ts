import type { Formacion, PlantillaEquipo, Punto, Sistema } from './modelos';
import { jugadoresEnPista } from './rotacion';

/**
 * Puntos de P1..P6 para cada rotación, siguiendo la distribución de
 * `docs/voley/Guia_Sistema_Recepcion_3_Esquema_5-1.md` (spec 025). La guía numera sus
 * rotaciones por el orden cronológico en que el colocador recorre las zonas; aquí se indexan
 * por `Rn` de la app (colocador en Pn, ver `docs/dominio.md` §4) — la spec 025 documenta la
 * traducción entre ambas numeraciones. El líbero, no declarado aquí, lo resuelve
 * `jugadoresEnPista`: ocupa el punto de a quién sustituye.
 */
const PUNTOS_POR_ROTACION: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, readonly [Punto, Punto, Punto, Punto, Punto, Punto]>> = {
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

/** Explicación de P1..P6 en cada rotación (guía, §2 por rol + §3 por rotación), en el mismo
 * orden e indexado igual que `PUNTOS_POR_ROTACION`. */
const EXPLICACIONES_JUGADOR: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, readonly [string, string, string, string, string, string]>> = {
  1: [
    'Zaguero, escondido en el fondo derecho: no recibe. Ruta corta, una diagonal de 6-7 m hacia la red.',
    'Desciende adelantado para cubrir los saques cortos y medios de su lado.',
    'Delantero, pegado a la red: liberado de recibir, listo para el primer tiempo.',
    'En la red, escondido en su zona: liberado de recibir, prepara su aproximación de ataque.',
    'Cubre la franja izquierda-profunda de la recepción.',
    'Recibe en el centro-profundo, la zona de mayor tráfico; dirige los ajustes de R1 y R2.',
  ],
  2: [
    'Recibe en el fondo derecho, ya casi en la zona donde se preparará el ataque.',
    'Delantero, ya en la zona de armado: apenas necesita desplazarse. La rotación más cómoda.',
    'Desciende adelantado para cubrir los saques cortos y medios de su lado.',
    'Delantero, en red: liberado de recibir, listo para el primer tiempo.',
    'Zaguero, se esconde en el fondo para preparar un ataque de segunda línea por el pipe.',
    'Recibe sin descender: cubre su franja habitual.',
  ],
  3: [
    'Recibe sin descender: cubre su franja habitual.',
    'Delantero, en red: liberado de recibir, listo para el primer tiempo.',
    'Delantero, ya en el centro de la red: solo un paso lateral de ~2 m hasta la zona de armado. Puede rematar en segunda mano.',
    'Desciende adelantado para cubrir los saques cortos y medios de su lado.',
    'Recibe cerca del colocador, en la zona de mayor tráfico.',
    'Zaguero, se esconde en el fondo para preparar un ataque de segunda línea por el pipe.',
  ],
  4: [
    'Zaguero, se esconde en el fondo para preparar un ataque de segunda línea por el pipe.',
    'Desciende adelantado para cubrir los saques cortos y medios de su lado.',
    'Delantero, en el centro de la red: liberado de recibir, listo para el primer tiempo.',
    'Delantero, lejos de la zona de armado: ruta lateral larga (~5 m), cruzándose con el central sin estorbarlo. Puede rematar en segunda mano.',
    'Recibe sin descender: cubre su franja habitual.',
    'Recibe en el fondo; su zona linda con la ruta lateral del colocador.',
  ],
  5: [
    'Recibe en la esquina inferior izquierda; cubre lo que el colocador dejaría descubierto si jugara él.',
    'Delantero, en red: liberado de recibir, prepara su aproximación de ataque.',
    'Desciende adelantado para cubrir los saques cortos y medios de su lado.',
    'Delantero, pegado a la red: liberado de recibir, listo para el primer tiempo.',
    'Zaguero, en la esquina inferior izquierda: no recibe. Penetración diagonal completa de 10-11 m, con riesgo de colisión con los receptores.',
    'Recibe sin descender: cubre su franja habitual.',
  ],
  6: [
    'Zaguero, recibe en su franja habitual sin descender.',
    'Delantero, pegado a la red: liberado de recibir, listo para el primer tiempo.',
    'En la red, escondido en su zona: liberado de recibir, prepara su aproximación de ataque.',
    'Desciende adelantado para cubrir los saques cortos y medios de su lado.',
    'Recibe junto al colocador; riesgo de cruzarse con su ruta si no se coordinan.',
    'Zaguero, fondo-centro: no recibe. Ruta media, una diagonal frontal-derecha de unos 6 m hacia la red.',
  ],
};

/** Descripción general del sistema (guía, §1.1 y §5.4). */
const DESCRIPCION =
  'Recepción a 3: dos receptores (R1, R2) y el líbero reciben; colocador, opuesto y el central ' +
  'delantero quedan liberados para preparar su ataque sin la carga del pase. Concentra la ' +
  'responsabilidad en los tres mejores pasadores del equipo, agiliza la salida de la recepción y ' +
  'reparte la pista en tres franjas — izquierda, centro (líbero) y derecha.';

/** Explicación de conjunto de cada rotación (guía, §3.1-3.6), indexada por `Rn` de la app. */
const EXPLICACIONES_ROTACION: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, string>> = {
  1: 'Colocador en P1, escondido en el fondo derecho: no recibe. Ruta corta, una diagonal de 6-7 m hacia la red. Complejidad baja-moderada.',
  2: 'Colocador en P2, ya en la zona de armado: apenas necesita desplazarse. La rotación más cómoda, con el máximo potencial ofensivo inmediato.',
  3: 'Colocador en P3, ya en el centro de la red: solo un paso lateral de ~2 m hasta la zona de armado. Complejidad baja y gran comodidad ofensiva.',
  4: 'Colocador en P4, en la red pero lejos de la zona de armado: ruta lateral larga (~5 m), cruzándose con el central delantero. Rotación crítica.',
  5: 'Colocador en P5, la rotación más exigente: penetración diagonal completa de 10-11 m desde la esquina inferior izquierda, con riesgo de colisión con los receptores. Rotación crítica.',
  6: 'Colocador en P6, fondo-centro: ruta media, una diagonal frontal-derecha de unos 6 m hacia la red. Complejidad moderada.',
};

/** El sistema de recepción a 3 en 5-1 de `docs/voley/Guia_Sistema_Recepcion_3_Esquema_5-1.md`
 * (spec 025), con el que arranca la app cuando el navegador no tiene nada guardado. */
export function sistemaPorDefecto(plantilla: PlantillaEquipo): Sistema {
  const formaciones: Record<1 | 2 | 3 | 4 | 5 | 6, Formacion> = {} as Record<1 | 2 | 3 | 4 | 5 | 6, Formacion>;
  const explicacionesRotacion: Record<1 | 2 | 3 | 4 | 5 | 6, string> = {} as Record<1 | 2 | 3 | 4 | 5 | 6, string>;
  for (const rotacion of [1, 2, 3, 4, 5, 6] as const) {
    const puntos = PUNTOS_POR_ROTACION[rotacion];
    const explicaciones = EXPLICACIONES_JUGADOR[rotacion];
    formaciones[rotacion] = jugadoresEnPista(plantilla, rotacion).map((jugador, indice) => ({
      jugador,
      punto: puntos[indice],
      explicacion: explicaciones[indice],
    }));
    explicacionesRotacion[rotacion] = EXPLICACIONES_ROTACION[rotacion];
  }
  return {
    id: 'sistema-por-defecto',
    nombre: 'TEST Recepción 5-1',
    tipo: 'recepcion',
    plantilla,
    formaciones,
    descripcion: DESCRIPCION,
    explicacionesRotacion,
  };
}
