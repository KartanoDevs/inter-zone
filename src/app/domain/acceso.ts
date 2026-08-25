import type { EquipoId } from './modelos';

/** Rol de acceso (spec 035): `admin` es global; `entrenador` y `usuario` se acotan por equipo,
 * vía membresía. Distinto del rol de voleibol (`RolId`) y de la posición rotacional. */
export type RolAcceso = 'admin' | 'entrenador' | 'usuario';

/** Lo que fija una invitación de la lista blanca: con qué rol nace la cuenta y en qué equipo
 * queda de alta. `equipoId` nulo significa "los dos equipos" — no aplica a `admin`, que no se
 * acota a ninguno. */
export interface Invitacion {
  readonly rol: RolAcceso;
  readonly equipoId: EquipoId | null;
}

export interface Membresia {
  readonly equipoId: EquipoId;
  readonly rol: Exclude<RolAcceso, 'admin'>;
}

export interface AltaResuelta {
  readonly esAdmin: boolean;
  readonly membresias: readonly Membresia[];
}

/** Quién ha entrado (spec 050): lo que devuelve el servidor tras identificarse, o al preguntar
 * "quién soy". Sin contraseña ni testigo de sesión — eso no sale nunca de `server/`. */
export interface SesionUsuario {
  readonly email: string;
  readonly esAdmin: boolean;
  readonly membresias: readonly Membresia[];
}

/** Mínimo exigido al darse de alta (spec 035, E9). No hay una regla de voleibol detrás: es un
 * mínimo de seguridad razonable, igual de arbitrario en cualquier aplicación con contraseña. */
export const LONGITUD_MINIMA_CONTRASENA = 8;

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Traduce una invitación de la lista blanca en lo que hay que crear al dar de alta la cuenta
 * (spec 035, E3-E5): admin nace global y sin membresías; entrenador y usuario nacen con una
 * membresía por cada equipo que les toque — uno solo, o los dos si la invitación no fijó
 * ninguno en concreto. */
export function resolverAltaDesdeInvitacion(invitacion: Invitacion, equipos: readonly EquipoId[]): AltaResuelta {
  const { rol, equipoId } = invitacion;
  if (rol === 'admin') {
    return { esAdmin: true, membresias: [] };
  }
  const equiposAfectados = equipoId === null ? equipos : [equipoId];
  return {
    esAdmin: false,
    membresias: equiposAfectados.map((idEquipo) => ({ equipoId: idEquipo, rol })),
  };
}
