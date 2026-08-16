import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TipoSistema } from '../../domain/modelos';

export interface OpcionSistema {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoSistema;
}

/**
 * Desplegable de sistemas más las acciones de catálogo (crear, renombrar, borrar). No decide
 * el orden: recibe el catálogo ya ordenado de `SistemaStore.catalogo()` (recepción antes que
 * defensa, spec 006 E10) y solo lo pinta.
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
  readonly crear = output<void>();
  readonly editar = output<void>();
  readonly clonar = output<void>();
  readonly borrar = output<void>();

  protected onElegir(evento: Event): void {
    const id = (evento.target as HTMLSelectElement).value;
    if (id) {
      this.elegir.emit(id);
    }
  }
}
