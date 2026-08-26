import type { EquipoId, EstadoSistema, Sistema } from './modelos';
import type { DatosPerfil, InvitacionListada, RolAcceso, SesionUsuario } from './acceso';
import type { TipoExamen } from './examen';
import type { InsigniaGanada } from './insignias';

/** Cada método toca solo lo que cambia — nunca el catálogo entero — para que una escritura no
 * pueda arriesgar el trabajo de sistemas que no tocó (spec 031). `cambiarEstado` (spec 051) es
 * su propia acción, no un `actualizar` más: valida o quita la validación, y solo eso — exige
 * sesión y rol, a diferencia del resto de este puerto (spec 037, todavía sin cerrar esa puerta). */
export interface SistemaRepository {
  listar(): Promise<readonly Sistema[]>;
  crear(sistema: Sistema): Promise<void>;
  actualizar(sistema: Sistema): Promise<void>;
  cambiarEstado(id: string, estado: EstadoSistema): Promise<void>;
  borrar(id: string): Promise<void>;
}

/**
 * Los tres motivos de fallo que un adaptador de `SistemaRepository` puede señalar al escribir
 * (spec 034) — parte del contrato del puerto, no un detalle de cómo lo cumple un adaptador en
 * concreto. Cada uno pide una reacción distinta de quien lo usa: sin conexión invita a
 * comprobar la red antes de reintentar; un error del servidor trae su propio motivo; un
 * conflicto de edición avisa de que alguien más ya guardó ese sistema mientras tanto, y
 * reintentar sin más volvería a pisarlo.
 */
export class ErrorDeRed extends Error {}
export class ErrorDelServidor extends Error {}
export class ConflictoDeEdicion extends Error {}

/** Ajustes globales de la app (no de un sistema concreto): si la validación de posiciones
 * está desactivada (spec 017), si se oculta la ayuda de posición rotacional (P1..P6) bajo
 * cada ficha, si las pestañas de rotación se muestran en orden cronológico de juego
 * (R1, R6, R5, R4, R3, R2) en vez de en orden numérico simple, si se muestran los números
 * de metros a la izquierda de la rejilla, y a qué escala se dibuja el ancho de la sombra del
 * bloqueo (spec 044, rango corregido por la 045: entero 0-10, puramente de pantalla — nunca
 * cambia dónde cae la sombra ni su profundidad, solo su ancho lateral en pantalla;
 * `domain/sombra-bloqueo.ts` no sabe que existe). */
export interface Ajustes {
  readonly validacionDesactivada: boolean;
  readonly ayudaPosicionDesactivada: boolean;
  readonly ordenRotacionCronologico: boolean;
  readonly mostrarNumerosMetros: boolean;
  readonly escalaSombra: number;
}

export interface AjustesRepository {
  leer(): Promise<Ajustes>;
  guardar(ajustes: Ajustes): Promise<void>;
}

/** Entrar, crear cuenta, salir y preguntar quién ha entrado (spec 050). `quienSoy` nunca lanza
 * por falta de sesión: `null` es una respuesta válida, no un fallo. `actualizarPerfil` y
 * `cambiarContrasena` (spec 053) actúan siempre sobre la propia cuenta de la sesión — no hay
 * ningún id de usuario que pasar, porque no se puede editar el perfil de otra cuenta. */
export interface AccesoRepository {
  registrar(email: string, contrasena: string): Promise<void>;
  entrar(email: string, contrasena: string): Promise<SesionUsuario>;
  quienSoy(): Promise<SesionUsuario | null>;
  salir(): Promise<void>;
  actualizarPerfil(datos: DatosPerfil): Promise<void>;
  cambiarContrasena(actual: string, nueva: string): Promise<void>;
}

/** Dos motivos de fallo propios de `AccesoRepository` (spec 050), parte del contrato del
 * puerto: `CredencialesInvalidas` cubre a la vez contraseña incorrecta y correo inexistente
 * (spec 035, E11 — la respuesta del servidor ya es la misma a propósito) y
 * `InvitacionNoDisponible` cubre un correo sin invitación o con la invitación ya usada. Un
 * fallo que no sea ninguno de los dos (por ejemplo, contraseña demasiado corta) se señala con
 * `ErrorDelServidor`, el mismo que ya usa `SistemaRepository`. */
export class CredencialesInvalidas extends Error {}
export class InvitacionNoDisponible extends Error {}

/** Invitar, listar y retirar de la lista blanca (spec 054) — solo para el admin; el servidor
 * rechaza a cualquier otro rol. */
export interface ListaBlancaRepository {
  listar(): Promise<readonly InvitacionListada[]>;
  invitar(email: string, rol: RolAcceso, equipoId: EquipoId | null): Promise<void>;
  retirar(email: string): Promise<void>;
}

/** El correo ya tiene cuenta (spec 054, E3): su rol se cambia desde la cuenta, no desde la
 * lista blanca. Un rechazo que no sea este se señala con `ErrorDelServidor`. */
export class CorreoYaRegistrado extends Error {}

/** Insignias de la propia cuenta (spec 056): `registrar` guarda que se ha ganado la insignia de
 * un tipo de examen sobre un sistema (y un titular, si el tipo lo exige); repetir el mismo
 * examen y volver a superarlo no duplica nada. `listar` siempre devuelve las de quien tiene la
 * sesión — nunca acepta un id de otra cuenta. */
export interface InsigniasRepository {
  listar(): Promise<readonly InsigniaGanada[]>;
  registrar(sistemaId: string, tipo: TipoExamen, titularId: string | null): Promise<void>;
}
