import { signal } from '@angular/core';
import type { SesionUsuario } from '../domain/acceso';
import type { AccesoRepository } from '../domain/puertos';

/**
 * Quién ha entrado, si lo hay (spec 050). Sin decorador de Angular, igual que `SistemaStore`:
 * instanciable con `new AccesoStore(repositorio)` y testeable sin `TestBed`.
 *
 * `cargando` empieza en `true` a propósito: hasta que `comprobarSesion()` resuelve, ni el
 * tablero ni la pantalla de entrar tienen nada que enseñar (E8) — mostrar la pantalla de entrar
 * antes de tiempo parpadearía para quien sí tenía sesión viva.
 */
export class AccesoStore {
  readonly usuario = signal<SesionUsuario | null>(null);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);

  constructor(private readonly repositorio: AccesoRepository) {}

  async comprobarSesion(): Promise<void> {
    this.usuario.set(await this.repositorio.quienSoy());
    this.cargando.set(false);
  }

  async entrar(email: string, contrasena: string): Promise<void> {
    this.error.set(null);
    try {
      this.usuario.set(await this.repositorio.entrar(email, contrasena));
    } catch (error) {
      this.usuario.set(null);
      this.error.set(mensajeDe(error));
    }
  }

  /** Registro y entrada en una sola acción (E4): quien acaba de crear su cuenta no debería
   * teclear la misma contraseña una segunda vez para poder usarla. */
  async crearCuenta(email: string, contrasena: string): Promise<void> {
    this.error.set(null);
    try {
      await this.repositorio.registrar(email, contrasena);
      this.usuario.set(await this.repositorio.entrar(email, contrasena));
    } catch (error) {
      this.usuario.set(null);
      this.error.set(mensajeDe(error));
    }
  }

  async salir(): Promise<void> {
    await this.repositorio.salir();
    this.usuario.set(null);
  }
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación';
}
