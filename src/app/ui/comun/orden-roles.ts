import type { RolId } from '../../domain/modelos';

/**
 * Orden fijo de roles para listas de jugadores en pantalla (leyenda, banquillo): coincide con
 * el recorrido de `docs/dominio.md` §2 (colocador, receptor, central, opuesto, líbero). El mismo
 * orden en los dos sitios evita que la app diga cosas distintas según dónde se mire.
 */
export const ORDEN_ROLES: readonly RolId[] = [
  'colocador',
  'receptor',
  'central',
  'opuesto',
  'libero',
];

/** Clave de orden de un jugador: por rol (según `ORDEN_ROLES`) y, dentro del rol, por índice. */
export function claveOrdenRol(rol: RolId, indice?: 1 | 2): number {
  return ORDEN_ROLES.indexOf(rol) * 10 + (indice ?? 0);
}
