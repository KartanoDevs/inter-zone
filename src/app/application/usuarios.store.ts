import { signal } from '@angular/core';
import type { UsuarioListado } from '../domain/acceso';
import type { UsuariosRepository } from '../domain/puertos';

/**
 * Las cuentas existentes, para que el admin borre una (spec 068). Sin decorador de Angular,
 * igual que `ListaBlancaStore`: instanciable con `new UsuariosStore(repositorio)` y testeable
 * sin `TestBed`. Cada borrado recarga la lista entera, mismo criterio que la lista blanca — es
 * otra pantalla de administración de bajo tráfico.
 */
export class UsuariosStore {
  readonly usuarios = signal<readonly UsuarioListado[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly repositorio: UsuariosRepository) {}

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.usuarios.set(await this.repositorio.listar());
    } catch (error) {
      this.error.set(mensajeDe(error));
    }
    this.cargando.set(false);
  }

  async borrar(id: string): Promise<void> {
    this.error.set(null);
    try {
      await this.repositorio.borrar(id);
      await this.cargar();
    } catch (error) {
      this.error.set(mensajeDe(error));
    }
  }
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación';
}
