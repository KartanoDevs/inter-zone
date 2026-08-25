import type { Sistema } from './modelos';
import type { SesionUsuario } from './acceso';

/** Cada método toca solo lo que cambia — nunca el catálogo entero — para que una escritura no
 * pueda arriesgar el trabajo de sistemas que no tocó (spec 031). */
export interface SistemaRepository {
  listar(): Promise<readonly Sistema[]>;
  crear(sistema: Sistema): Promise<void>;
  actualizar(sistema: Sistema): Promise<void>;
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
 * por falta de sesión: `null` es una respuesta válida, no un fallo. */
export interface AccesoRepository {
  registrar(email: string, contrasena: string): Promise<void>;
  entrar(email: string, contrasena: string): Promise<SesionUsuario>;
  quienSoy(): Promise<SesionUsuario | null>;
  salir(): Promise<void>;
}

/** Dos motivos de fallo propios de `AccesoRepository` (spec 050), parte del contrato del
 * puerto: `CredencialesInvalidas` cubre a la vez contraseña incorrecta y correo inexistente
 * (spec 035, E11 — la respuesta del servidor ya es la misma a propósito) y
 * `InvitacionNoDisponible` cubre un correo sin invitación o con la invitación ya usada. Un
 * fallo que no sea ninguno de los dos (por ejemplo, contraseña demasiado corta) se señala con
 * `ErrorDelServidor`, el mismo que ya usa `SistemaRepository`. */
export class CredencialesInvalidas extends Error {}
export class InvitacionNoDisponible extends Error {}
