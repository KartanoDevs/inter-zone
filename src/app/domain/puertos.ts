import type { Sistema } from './modelos';

/** Cada método toca solo lo que cambia — nunca el catálogo entero — para que una escritura no
 * pueda arriesgar el trabajo de sistemas que no tocó (spec 031). */
export interface SistemaRepository {
  listar(): Promise<readonly Sistema[]>;
  crear(sistema: Sistema): Promise<void>;
  actualizar(sistema: Sistema): Promise<void>;
  borrar(id: string): Promise<void>;
}

/**
 * Los tres motivos de fallo que un adaptador de `SistemaRepository` puede señalar al escribir
 * (spec 034) — parte del contrato del puerto, no un detalle de cómo lo cumple un adaptador en
 * concreto. Cada uno pide una reacción distinta de quien lo usa: sin conexión invita a
 * comprobar la red antes de reintentar; un error del servidor trae su propio motivo; un
 * conflicto de edición avisa de que alguien más ya guardó ese sistema mientras tanto, y
 * reintentar sin más volvería a pisarlo.
 */
export class ErrorDeRed extends Error {}
export class ErrorDelServidor extends Error {}
export class ConflictoDeEdicion extends Error {}

/** Ajustes globales de la app (no de un sistema concreto): si la validación de posiciones
 * está desactivada (spec 017), si se oculta la ayuda de posición rotacional (P1..P6) bajo
 * cada ficha, si las pestañas de rotación se muestran en orden cronológico de juego
 * (R1, R6, R5, R4, R3, R2) en vez de en orden numérico simple, y si se muestran los números
 * de metros a la izquierda de la rejilla. */
export interface Ajustes {
  readonly validacionDesactivada: boolean;
  readonly ayudaPosicionDesactivada: boolean;
  readonly ordenRotacionCronologico: boolean;
  readonly mostrarNumerosMetros: boolean;
}

export interface AjustesRepository {
  leer(): Promise<Ajustes>;
  guardar(ajustes: Ajustes): Promise<void>;
}
