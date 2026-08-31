import type { EquipoId, RolId } from './modelos';

/** Rol de acceso (spec 035): `admin` es global; `entrenador` y `usuario` se acotan por equipo,
 * vía membresía. Distinto del rol de voleibol (`RolId`) y de la posición rotacional. */
export type RolAcceso = 'admin' | 'entrenador' | 'usuario';

const ROLES_ACCESO_VALIDOS: readonly RolAcceso[] = ['admin', 'entrenador', 'usuario'];

/** Si un valor es uno de los tres roles de acceso (spec 054, E1): usado al invitar un correo a
 * la lista blanca, para no dejar que Prisma sea el único que lo comprueba. */
export function esRolAccesoValido(valor: unknown): valor is RolAcceso {
  return typeof valor === 'string' && (ROLES_ACCESO_VALIDOS as readonly string[]).includes(valor);
}

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
 * "quién soy". Sin contraseña ni testigo de sesión — eso no sale nunca de `server/`. `nombre`,
 * `posicionFavorita` y `dorsal` son los tres campos opcionales del perfil (spec 053): `null`
 * cuando no se han guardado, nunca `undefined` — a diferencia de `Sistema.estado`, aquí el
 * servidor siempre los incluye explícitos. */
export interface SesionUsuario {
  readonly email: string;
  readonly esAdmin: boolean;
  readonly membresias: readonly Membresia[];
  readonly nombre: string | null;
  readonly posicionFavorita: RolId | null;
  readonly dorsal: number | null;
}

/** Los tres campos de perfil que una cuenta puede guardar sobre sí misma (spec 053): siempre
 * los tres juntos, como el envío completo de un formulario — no un parche parcial. `null`
 * significa "vacío", y guardarlo así borra lo que hubiera antes (E6): no hay manera de "no
 * tocar" un campo por separado, para no arrastrar la ambigüedad de un tercer estado. */
export interface DatosPerfil {
  readonly nombre: string | null;
  readonly posicionFavorita: RolId | null;
  readonly dorsal: number | null;
}

/** Una fila de la lista blanca, tal como la ve el admin (spec 054): pendiente si `usadaEn` es
 * `null`, ya usada si no. Las fechas llegan como texto ISO — son metadato de esta frontera, ni
 * `Sistema` ni `SesionUsuario` guardan fechas tampoco (ADR 0012). */
export interface InvitacionListada {
  readonly email: string;
  readonly rol: RolAcceso;
  readonly equipoId: EquipoId | null;
  readonly creadaEn: string;
  readonly usadaEn: string | null;
}

/** Quién puede gestionar los sistemas de un equipo — crearlos, editarlos, borrarlos o validarlos
 * (specs 037 y 051, docs/modelo-de-datos.md §4): el admin, o un entrenador con membresía en ese
 * equipo — nunca un `usuario`, y nunca un entrenador de otro equipo. Es la misma regla para las
 * dos acciones: la matriz de permisos les da idéntica respuesta por rol. */
export function puedeGestionarEquipo(
  usuario: Pick<SesionUsuario, 'esAdmin' | 'membresias'>,
  equipoId: EquipoId,
): boolean {
  return (
    usuario.esAdmin ||
    usuario.membresias.some((m) => m.equipoId === equipoId && m.rol === 'entrenador')
  );
}

/** Si la cuenta puede editar el sistema de algún equipo, sea cual sea (spec 037): decide si se
 * le muestra la pestaña Editor. `admin` siempre; un `entrenador` con al menos una membresía;
 * `usuario`, nunca — no tiene ninguna membresía de entrenador por construcción (spec 035). */
export function puedeEditarAlgo(usuario: Pick<SesionUsuario, 'esAdmin' | 'membresias'>): boolean {
  return usuario.esAdmin || usuario.membresias.some((m) => m.rol === 'entrenador');
}

/** Mínimo exigido al darse de alta (spec 035, E9). No hay una regla de voleibol detrás: es un
 * mínimo de seguridad razonable, igual de arbitrario en cualquier aplicación con contraseña. */
export const LONGITUD_MINIMA_CONTRASENA = 8;

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Rango del dorsal (spec 053, E4): sin regla de voleibol detrás, un límite de sentido común
 * igual de arbitrario que `LONGITUD_MINIMA_CONTRASENA`. */
export function dorsalValido(dorsal: number): boolean {
  return Number.isInteger(dorsal) && dorsal >= 1 && dorsal <= 99;
}

/** Un nombre en blanco lo borra, igual que `describirSistema` con la descripción de un sistema
 * (spec 053, E6): mismo criterio en todo el dominio para "vaciar un texto opcional". */
export function normalizarNombre(texto: string): string | null {
  const limpio = texto.trim();
  return limpio.length === 0 ? null : limpio;
}

/** Traduce una invitación de la lista blanca en lo que hay que crear al dar de alta la cuenta
 * (spec 035, E3-E5): admin nace global y sin membresías; entrenador y usuario nacen con una
 * membresía por cada equipo que les toque — uno solo, o los dos si la invitación no fijó
 * ninguno en concreto. */
export function resolverAltaDesdeInvitacion(
  invitacion: Invitacion,
  equipos: readonly EquipoId[],
): AltaResuelta {
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
