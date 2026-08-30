import { signal } from '@angular/core';
import type { InsigniaGanada } from '../domain/insignias';
import type { InsigniasRepository } from '../domain/puertos';

/**
 * Las insignias de la propia cuenta para la vitrina de medallas (spec 061). Sin decorador de
 * Angular, igual que el resto de stores — `new InsigniasStore(repositorio)`, testeable sin
 * `TestBed`. Solo lee: `InsigniasRepository.registrar` lo sigue llamando `ExamenStore` al
 * terminar un examen, no este store.
 *
 * `cargadas` distingue "aún no se ha pedido / se está pidiendo" de "se pidió y vino vacío"
 * (E11 vs E18): sin esta señal, una cuenta sin ninguna medalla y una carga en curso se verían
 * igual.
 */
export class InsigniasStore {
  readonly insignias = signal<readonly InsigniaGanada[]>([]);
  readonly cargando = signal(false);
  readonly cargadas = signal(false);
  readonly error = signal<string | null>(null);

  constructor(private readonly repositorio: InsigniasRepository) {}

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);
    try {
      this.insignias.set(await this.repositorio.listar());
      this.cargadas.set(true);
    } catch (error) {
      this.error.set(mensajeDe(error));
    }
    this.cargando.set(false);
  }
}

function mensajeDe(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudieron cargar las medallas';
}
