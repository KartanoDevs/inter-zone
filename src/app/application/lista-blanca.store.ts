import { signal } from '@angular/core';
import type { EquipoId } from '../domain/modelos';
import type { InvitacionListada, RolAcceso } from '../domain/acceso';
import type { ListaBlancaRepository } from '../domain/puertos';

/**
 * La lista blanca del admin (spec 054): invitar, ver y retirar. Sin decorador de Angular, igual
 * que el resto de stores — instanciable con `new ListaBlancaStore(repositorio)` y testeable sin
 * `TestBed`. Cada escritura recarga la lista entera desde el servidor en vez de mutar en local:
 * es una pantalla de administración de bajo tráfico, no vale la pena la granularidad que sí
 * tiene `SistemaStore`.
 */
export class ListaBlancaStore {
  readonly invitaciones = signal<readonly InvitacionListada[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly repositorio: ListaBlancaRepository) {}

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.invitaciones.set(await this.repositorio.listar());
    } catch (error) {
      this.error.set(mensajeDe(error));
    }
    this.cargando.set(false);
  }

  async invitar(email: string, rol: RolAcceso, equipoId: EquipoId | null): Promise<boolean> {
    this.error.set(null);
    try {
      await this.repositorio.invitar(email, rol, equipoId);
      await this.cargar();
      return true;
    } catch (error) {
      this.error.set(mensajeDe(error));
      return false;
    }
  }

  async retirar(email: string): Promise<void> {
    this.error.set(null);
    try {
      await this.repositorio.retirar(email);
      await this.cargar();
    } catch (error) {
      this.error.set(mensajeDe(error));
    }
  }
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación';
}
