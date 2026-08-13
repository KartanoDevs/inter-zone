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
  return definicion.llevaIndice ? `${definicion.abreviatura}${jugador.indice}` : definicion.abreviatura;
}

export function validarConfiguracionRoles(configuracion: ConfiguracionRoles): ColisionAbreviatura[] {
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
