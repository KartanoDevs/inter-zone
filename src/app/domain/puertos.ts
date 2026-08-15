import type { Sistema } from './modelos';

export interface SistemaRepository {
  listar(): readonly Sistema[];
  guardar(sistemas: readonly Sistema[]): void;
}

/** Ajustes globales de la app (no de un sistema concreto), spec 017: hoy solo si la
 * validación de posiciones está desactivada. */
export interface Ajustes {
  readonly validacionDesactivada: boolean;
}

export interface AjustesRepository {
  leer(): Ajustes;
  guardar(ajustes: Ajustes): void;
}
