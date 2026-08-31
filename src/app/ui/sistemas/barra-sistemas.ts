import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { TipoSistema } from '../../domain/modelos';

export interface OpcionSistema {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoSistema;
}

/**
 * Selector del sistema activo: desplegable nativo (accesible, con teclado) restyleado como una
 * pastilla con badge de tipo (recepción/defensa) y flecha decorativa. No decide el orden:
 * recibe el catálogo ya ordenado de `SistemaStore.catalogo()` (recepción antes que defensa,
 * spec 006 E10) y solo lo pinta. El CRUD de catálogo (crear, renombrar, clonar, borrar) vive en
 * el `Speeddial` de `Tablero`, no aquí.
 */
@Component({
  selector: 'app-barra-sistemas',
  imports: [],
  templateUrl: './barra-sistemas.html',
  styleUrl: './barra-sistemas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarraSistemas {
  readonly sistemas = input.required<readonly OpcionSistema[]>();
  readonly sistemaActivoId = input.required<string | null>();

  readonly elegir = output<string>();

  protected readonly sistemaActivo = computed(
    () => this.sistemas().find((sistema) => sistema.id === this.sistemaActivoId()) ?? null,
  );

  protected onElegir(evento: Event): void {
    const id = (evento.target as HTMLSelectElement).value;
    if (id) {
      this.elegir.emit(id);
    }
  }
}
