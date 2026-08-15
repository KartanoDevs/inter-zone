import type { Sistema } from './modelos';

export interface SistemaRepository {
  listar(): readonly Sistema[];
  guardar(sistemas: readonly Sistema[]): void;
}

/** Ajustes globales de la app (no de un sistema concreto): si la validación de posiciones
 * está desactivada (spec 017) y si se oculta la ayuda de posición rotacional (P1..P6) bajo
 * cada ficha. */
export interface Ajustes {
  readonly validacionDesactivada: boolean;
  readonly ayudaPosicionDesactivada: boolean;
}

export interface AjustesRepository {
  leer(): Ajustes;
  guardar(ajustes: Ajustes): void;
}
