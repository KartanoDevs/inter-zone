import type { Sistema } from './modelos';

export interface SistemaRepository {
  listar(): readonly Sistema[];
  guardar(sistemas: readonly Sistema[]): void;
}
