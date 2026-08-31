import type { ColisionAbreviatura, ConfiguracionRoles, Jugador, RolId } from './modelos';

export const CONFIGURACION_ROLES_POR_DEFECTO: ConfiguracionRoles = {
  colocador: { nombre: 'Colocador', abreviatura: 'C', llevaIndice: false },
  receptor: { nombre: 'Receptor', abreviatura: 'R', llevaIndice: true },
  central: { nombre: 'Central', abreviatura: 'C', llevaIndice: true },
  opuesto: { nombre: 'Opuesto', abreviatura: 'O', llevaIndice: false },
  libero: { nombre: 'Líbero', abreviatura: 'L', llevaIndice: false },
};

export function etiquetaDe(jugador: Jugador, configuracion: ConfiguracionRoles): string {
  const definicion = configuracion[jugador.rol];
  return definicion.llevaIndice
    ? `${definicion.abreviatura}${jugador.indice}`
    : definicion.abreviatura;
}

const ROLES_VALIDOS: readonly RolId[] = Object.keys(CONFIGURACION_ROLES_POR_DEFECTO) as RolId[];

/** Si un valor es uno de los cinco roles de voleibol del dominio (spec 053, E3): usado para
 * validar la posición favorita del perfil, que acepta cualquiera de estos cinco o ninguno. */
export function esRolIdValido(valor: unknown): valor is RolId {
  return typeof valor === 'string' && (ROLES_VALIDOS as readonly string[]).includes(valor);
}

export function validarConfiguracionRoles(
  configuracion: ConfiguracionRoles,
): ColisionAbreviatura[] {
  const rolesPorEtiquetaBase = new Map<string, { abreviatura: string; roles: RolId[] }>();
  for (const rolId of Object.keys(configuracion) as RolId[]) {
    const { abreviatura, llevaIndice } = configuracion[rolId];
    const clave = `${abreviatura}:${llevaIndice}`;
    const grupo = rolesPorEtiquetaBase.get(clave) ?? { abreviatura, roles: [] };
    grupo.roles.push(rolId);
    rolesPorEtiquetaBase.set(clave, grupo);
  }

  return Array.from(rolesPorEtiquetaBase.values()).filter((grupo) => grupo.roles.length > 1);
}
