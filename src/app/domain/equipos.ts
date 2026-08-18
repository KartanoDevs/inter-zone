import type { EquipoId } from './modelos';

/** Los dos equipos fijos de la v2 (spec 032). Configuración del dominio, igual que los roles en
 * `roles.ts`: el identificador es estable, el nombre visible es lo único que podría cambiar. */
export const EQUIPOS: readonly EquipoId[] = ['masculino', 'femenino'];

export const NOMBRE_EQUIPO: Readonly<Record<EquipoId, string>> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
};
