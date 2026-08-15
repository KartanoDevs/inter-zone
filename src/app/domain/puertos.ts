import type { Sistema } from './modelos';

export interface SistemaRepository {
  listar(): readonly Sistema[];
  guardar(sistemas: readonly Sistema[]): void;
}

/** Ajustes globales de la app (no de un sistema concreto): si la validación de posiciones
 * está desactivada (spec 017), si se oculta la ayuda de posición rotacional (P1..P6) bajo
 * cada ficha, y si las pestañas de rotación se muestran en orden cronológico de juego
 * (R1, R6, R5, R4, R3, R2) en vez de en orden numérico simple. */
export interface Ajustes {
  readonly validacionDesactivada: boolean;
  readonly ayudaPosicionDesactivada: boolean;
  readonly ordenRotacionCronologico: boolean;
}

export interface AjustesRepository {
  leer(): Ajustes;
  guardar(ajustes: Ajustes): void;
}
