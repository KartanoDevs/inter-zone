import type { Formacion, Infraccion, Jugador, OrdenSaque, Sistema } from './modelos';
import { formacionEnRotacion, jugadoresEnPista } from './rotacion';
import { sistemaCompleto } from './sistema-recepcion';
import { validarFormacion } from './validacion';

export type TipoExamen = 'puesto' | 'linea' | 'sistema';

export type Examen = { readonly tipo: 'puesto' | 'linea'; readonly titularId: string } | { readonly tipo: 'sistema' };

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
