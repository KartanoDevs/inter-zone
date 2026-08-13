import type { ColisionAbreviatura, ConfiguracionRoles, Jugador, RolId } from './modelos';

export const CONFIGURACION_ROLES_POR_DEFECTO: ConfiguracionRoles = {
  colocador: { nombre: 'Colocador', abreviatura: 'C', llevaIndice: false },
  receptor: { nombre: 'Receptor', abreviatura: 'R', llevaIndice: true },
  central: { nombre: 'Central', abreviatura: 'M', llevaIndice: true },
  opuesto: { nombre: 'Opuesto', abreviatura: 'O', llevaIndice: false },
  libero: { nombre: 'Líbero', abreviatura: 'L', llevaIndice: false },
};

export function etiquetaDe(jugador: Jugador, configuracion: ConfiguracionRoles): string {
  const definicion = configuracion[jugador.rol];
  return definicion.llevaIndice ? `${definicion.abreviatura}${jugador.indice}` : definicion.abreviatura;
}

export function validarConfiguracionRoles(configuracion: ConfiguracionRoles): ColisionAbreviatura[] {
  const rolesPorAbreviatura = new Map<string, RolId[]>();
  for (const rolId of Object.keys(configuracion) as RolId[]) {
    const abreviatura = configuracion[rolId].abreviatura;
    const roles = rolesPorAbreviatura.get(abreviatura) ?? [];
    roles.push(rolId);
    rolesPorAbreviatura.set(abreviatura, roles);
  }

  return Array.from(rolesPorAbreviatura.entries())
    .filter(([, roles]) => roles.length > 1)
    .map(([abreviatura, roles]) => ({ abreviatura, roles }));
}
