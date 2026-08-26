import type { Formacion, Infraccion, Jugador, OrdenSaque, Sistema } from './modelos';
import { formacionEnRotacion, jugadoresEnPista } from './rotacion';
import { distancia as distanciaEntre } from './separacion';
import { sistemaCompleto } from './sistema-recepcion';
import { validarFormacion } from './validacion';

export type TipoExamen = 'puesto' | 'linea' | 'sistema';

export type Examen = { readonly tipo: 'puesto' | 'linea'; readonly titularId: string } | { readonly tipo: 'sistema' };

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

export function jugadoresAColocar(examen: Examen, sistema: Sistema, rotacion: number): readonly Jugador[] {
  if (examen.tipo === 'sistema') {
    return jugadoresEnPista(sistema.plantilla, rotacion);
  }
  // El titular examinado puede no ser quien juega de verdad esa rotación (spec 043/ADR 0034: el
  // líbero puede haber entrado por él). Su índice se localiza en el orden de saque, pero el
  // ocupante real —titular o líbero— sale de `jugadoresEnPista`.
  const orden = formacionEnRotacion(sistema.plantilla.ordenSaque, rotacion);
  const enPista = jugadoresEnPista(sistema.plantilla, rotacion);
  const indice = orden.findIndex((j) => j.id === examen.titularId);
  if (examen.tipo === 'puesto') {
    return [enPista[indice]];
  }
  const indicesLinea = INDICES_DELANTERA.includes(indice) ? INDICES_DELANTERA : INDICES_ZAGA;
  return indicesLinea.map((i) => enPista[i]);
}

export function faltasImputables(jugadoresDelAlumno: readonly Jugador[], formacion: Formacion, posiciones: OrdenSaque): readonly Infraccion[] {
  const idsAlumno = new Set(jugadoresDelAlumno.map((j) => j.id));
  const { infracciones } = validarFormacion(formacion, posiciones);
  return infracciones.filter((infraccion) => infraccion.jugadores.some((j) => idsAlumno.has(j.id)));
}

// Radio de una ficha en la pizarra (`separacion.ts`: los 0,9 m de distancia mínima entre
// jugadores son "dos radios de 0,45 m cada una"): si tu ficha tapa el punto del modelo, aciertas.
export const DISTANCIA_PERFECTA = 0.45;
// La línea de ataque: a esa distancia del sitio ya estás en el sitio de otro jugador.
export const DISTANCIA_NULA = 3;

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

export function corregirRotacion(examen: Examen, sistema: Sistema, rotacion: number, formacion: Formacion): CorreccionRotacion {
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

export function corregirExamen(examen: Examen, sistema: Sistema, entrega: EntregaExamen): CorreccionExamen {
  const correcciones = ([1, 2, 3, 4, 5, 6] as const).map((rotacion) => {
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
