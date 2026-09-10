import type { Formacion, Infraccion, Jugador, OrdenSaque, Sistema } from './modelos';
import { formacionEnRotacion, jugadoresEnPista, ORDEN_ROTACIONES } from './rotacion';
import { distancia as distanciaEntre } from './separacion';
import { sistemaCompleto } from './sistema-recepcion';
import { validarFormacion } from './validacion';

export type TipoExamen = 'puesto' | 'linea' | 'sistema';

export type Examen =
  { readonly tipo: 'puesto' | 'linea'; readonly titularId: string } | { readonly tipo: 'sistema' };

export type EntregaExamen = Readonly<Partial<Record<1 | 2 | 3 | 4 | 5 | 6, Formacion>>>;

export type Insignia = 'bronce' | 'plata' | 'oro';

export const INSIGNIA_POR_TIPO: Readonly<Record<TipoExamen, Insignia>> = {
  puesto: 'bronce',
  linea: 'plata',
  sistema: 'oro',
};

export const NOTA_APROBADO = 7;

const INDICES_DELANTERA = [3, 2, 1];
const INDICES_ZAGA = [0, 4, 5];

function jugadoresDesdeIndice(
  tipo: 'puesto' | 'linea',
  enPista: readonly Jugador[],
  indice: number,
): readonly Jugador[] {
  if (tipo === 'puesto') {
    return [enPista[indice]];
  }
  const indicesLinea = INDICES_DELANTERA.includes(indice) ? INDICES_DELANTERA : INDICES_ZAGA;
  return indicesLinea.map((i) => enPista[i]);
}

export function jugadoresAColocar(
  examen: Examen,
  sistema: Sistema,
  rotacion: number,
): readonly Jugador[] {
  if (examen.tipo === 'sistema') {
    return jugadoresEnPista(sistema.plantilla, rotacion);
  }
  const enPista = jugadoresEnPista(sistema.plantilla, rotacion);
  const libero = sistema.plantilla.libero;
  if (libero && examen.titularId === libero.jugador.id) {
    // Spec 058: el líbero como sujeto propio. Nunca vive en el orden de saque (ADR 0014), así
    // que se localiza directamente en quién juega de verdad esa rotación, no en el titular al
    // que sustituye.
    const indiceLibero = enPista.findIndex((j) => j.id === libero.jugador.id);
    return indiceLibero === -1 ? [] : jugadoresDesdeIndice(examen.tipo, enPista, indiceLibero);
  }
  // El titular examinado puede no ser quien juega de verdad esa rotación (spec 043/ADR 0034: el
  // líbero puede haber entrado por él). Su índice se localiza en el orden de saque, pero el
  // ocupante real —titular o líbero— sale de `jugadoresEnPista`.
  const orden = formacionEnRotacion(sistema.plantilla.ordenSaque, rotacion);
  const indice = orden.findIndex((j) => j.id === examen.titularId);
  // Spec 057-E3: si el líbero ha entrado por el examinado, este no está físicamente en pista esa
  // rotación — no se examina (revierte 012-E5, que pedía colocar la ficha del líbero en su lugar).
  if (enPista[indice].id !== examen.titularId) {
    return [];
  }
  return jugadoresDesdeIndice(examen.tipo, enPista, indice);
}

/** Spec 058-E1/E2/E5: el líbero es un sujeto de examen más, pero solo si el sistema lo tiene
 * declarado y de verdad entra en pista en alguna rotación — ofrecerlo si nunca sustituye a
 * nadie no tendría sentido. */
export function liberoExaminable(sistema: Sistema): Jugador | null {
  const libero = sistema.plantilla.libero;
  if (!libero) {
    return null;
  }
  const entraEnAlguna = ([1, 2, 3, 4, 5, 6] as const).some((rotacion) =>
    jugadoresEnPista(sistema.plantilla, rotacion).some((j) => j.id === libero.jugador.id),
  );
  return entraEnAlguna ? libero.jugador : null;
}

// Spec 057-E3/E4: qué rotaciones se examinan de verdad. Por sistema son siempre las seis, en
// el orden de juego (spec posterior a la 067, sustituye al numérico 1..6). Por puesto o línea,
// solo aquellas en las que el titular examinado está físicamente en pista, en ese mismo orden.
export function rotacionesExaminables(
  examen: Examen,
  sistema: Sistema,
): readonly (1 | 2 | 3 | 4 | 5 | 6)[] {
  if (examen.tipo === 'sistema') {
    return ORDEN_ROTACIONES;
  }
  return ORDEN_ROTACIONES.filter(
    (rotacion) => jugadoresAColocar(examen, sistema, rotacion).length > 0,
  );
}

export function faltasImputables(
  jugadoresDelAlumno: readonly Jugador[],
  formacion: Formacion,
  posiciones: OrdenSaque,
): readonly Infraccion[] {
  const idsAlumno = new Set(jugadoresDelAlumno.map((j) => j.id));
  const { infracciones } = validarFormacion(formacion, posiciones);
  return infracciones.filter((infraccion) => infraccion.jugadores.some((j) => idsAlumno.has(j.id)));
}

// Spec 057: la curva mide criterio táctico ("más o menos en su sitio"), no precisión de
// pizarra. 0,5 m es un poco más que el radio de una ficha (0,45 m); si tu ficha tapa el punto
// del modelo, aciertas.
export const DISTANCIA_PERFECTA = 0.5;
// Spec 057: el fondo de la zona de ataque contraria — a esa distancia, la nota se pierde entera.
export const DISTANCIA_NULA = 4;

export function notaPorDistancia(distancia: number): number {
  if (distancia <= DISTANCIA_PERFECTA) {
    return 10;
  }
  if (distancia >= DISTANCIA_NULA) {
    return 0;
  }
  return (10 * (DISTANCIA_NULA - distancia)) / (DISTANCIA_NULA - DISTANCIA_PERFECTA);
}

export interface CorreccionRotacion {
  readonly nota: number;
  readonly faltas: readonly Infraccion[];
}

export function corregirRotacion(
  examen: Examen,
  sistema: Sistema,
  rotacion: number,
  formacion: Formacion,
): CorreccionRotacion {
  const jugadoresDelAlumno = jugadoresAColocar(examen, sistema, rotacion);
  const modelo = sistema.formaciones[rotacion as 1 | 2 | 3 | 4 | 5 | 6]!;
  const posiciones = jugadoresEnPista(sistema.plantilla, rotacion);
  const completa = formacion.length === posiciones.length;
  const faltas = completa ? faltasImputables(jugadoresDelAlumno, formacion, posiciones) : [];
  if (faltas.length > 0) {
    return { nota: 0, faltas };
  }
  const notas = jugadoresDelAlumno.map((jugador) => {
    const colocacionAlumno = formacion.find((c) => c.jugador.id === jugador.id);
    const colocacionModelo = modelo.find((c) => c.jugador.id === jugador.id)!;
    if (!colocacionAlumno) {
      return 0;
    }
    return notaPorDistancia(distanciaEntre(colocacionAlumno.punto, colocacionModelo.punto));
  });
  const nota = notas.reduce((suma, n) => suma + n, 0) / notas.length;
  return { nota, faltas: [] };
}

export interface CorreccionExamen {
  readonly nota: number;
  readonly insignia: Insignia | null;
}

export function corregirExamen(
  examen: Examen,
  sistema: Sistema,
  entrega: EntregaExamen,
): CorreccionExamen {
  // Spec 057-E5: la nota final es la media de las rotaciones examinadas, nunca de las seis — una
  // rotación fuera del examen (057-E3) no cuenta como cero, simplemente no entra en la media.
  const correcciones = rotacionesExaminables(examen, sistema).map((rotacion) => {
    const formacion = entrega[rotacion];
    if (!formacion) {
      return { nota: 0, faltas: [] };
    }
    return corregirRotacion(examen, sistema, rotacion, formacion);
  });
  const nota = correcciones.reduce((suma, c) => suma + c.nota, 0) / correcciones.length;
  const sinFaltas = correcciones.every((c) => c.faltas.length === 0);
  const insignia = nota >= NOTA_APROBADO && sinFaltas ? INSIGNIA_POR_TIPO[examen.tipo] : null;
  return { nota, insignia };
}

export function permiteCorregirPorRotacion(tipo: TipoExamen): boolean {
  return tipo !== 'sistema';
}

export function sePuedeExaminar(sistema: Sistema): boolean {
  if (!sistemaCompleto(sistema)) {
    return false;
  }
  return ([1, 2, 3, 4, 5, 6] as const).every((rotacion) => {
    const formacion = sistema.formaciones[rotacion]!;
    const posiciones = jugadoresEnPista(sistema.plantilla, rotacion);
    return validarFormacion(formacion, posiciones).infracciones.length === 0;
  });
}
