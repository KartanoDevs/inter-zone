import type { ColocacionBorrador } from '../../application/sistema.store';
import type { Jugador, PuestoDefensa } from '../../domain/modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from '../../domain/roles';
import { claveOrdenRol } from './orden-roles';

/**
 * Fontanería de presentación compartida entre `Tablero` (editor) y `TeoriaTablero` (consulta,
 * spec 052): cómo se etiqueta y colorea un puesto o un jugador en la pista. No es una regla de
 * dominio — vive en `ui/` a propósito — pero los dos consumidores la necesitan igual, y
 * duplicarla en los dos habría sido peor que sacarla de `tablero.ts` (que además habría creado
 * un import circular entre los dos componentes).
 */

/** Etiqueta doble de cada puesto de defensa, según su línea (spec 038, E12): sin depender de
 * ninguna rotación ni de la plantilla activa — se deriva del puesto, es fijo. */
export const ETIQUETA_PUESTO: Readonly<Record<PuestoDefensa, string>> = {
  1: 'CO',
  2: 'CO',
  3: 'Ce',
  4: 'R',
  5: 'L',
  6: 'R',
};

export function esPuestoDelantero(puesto: PuestoDefensa): boolean {
  return puesto === 2 || puesto === 3 || puesto === 4;
}

export function esLineaDelantera(posicion: number): boolean {
  return posicion === 2 || posicion === 3 || posicion === 4;
}

/** Índice de color de un puesto de defensa en la vista de conjunto (spec 023/038): fijo por
 * puesto, igual que hoy se deriva por rol — un color estable independiente de quién ocupe el
 * puesto en la realidad, porque en defensa ya no hay "quién". */
export const INDICE_COLOR_POR_PUESTO: Readonly<Record<PuestoDefensa, number>> = {
  1: 0,
  2: 5,
  3: 3,
  4: 1,
  5: 6,
  6: 2,
};

// El índice de color de la vista de conjunto (spec 023) se deriva del mismo orden fijo de
// roles que ya usan el banquillo y la leyenda de etiquetas — nunca se declara a mano, así que
// dos jugadores con el mismo rol e índice comparten color aunque sean de plantillas distintas.
const CLAVES_ORDEN_COLOR = [
  claveOrdenRol('colocador'),
  claveOrdenRol('receptor', 1),
  claveOrdenRol('receptor', 2),
  claveOrdenRol('central', 1),
  claveOrdenRol('central', 2),
  claveOrdenRol('opuesto'),
  claveOrdenRol('libero'),
];

export function indiceColorDe(jugador: Jugador): number {
  return CLAVES_ORDEN_COLOR.indexOf(claveOrdenRol(jugador.rol, jugador.indice));
}

/** El identificador de a quién ocupa una colocación del borrador: el id del jugador en
 * recepción, o `p${puesto}` en defensa (spec 038). */
export function idOcupanteDe(colocacion: ColocacionBorrador): string {
  return 'jugador' in colocacion ? colocacion.jugador.id : `p${colocacion.puesto}`;
}

/** La etiqueta de una colocación del borrador: derivada del rol en recepción (`etiquetaDe`), o
 * fija por puesto en defensa (spec 038, E12 — no depende de rol ni de plantilla). */
export function etiquetaOcupanteDe(colocacion: ColocacionBorrador): string {
  return 'jugador' in colocacion
    ? etiquetaDe(colocacion.jugador, CONFIGURACION_ROLES_POR_DEFECTO)
    : ETIQUETA_PUESTO[colocacion.puesto];
}

/** Entrada de la leyenda de colores de la vista de conjunto (spec 023): qué color le tocó a
 * cada jugador o puesto. */
export interface EntradaLeyendaColor {
  readonly etiqueta: string;
  readonly indiceColor: number;
}
