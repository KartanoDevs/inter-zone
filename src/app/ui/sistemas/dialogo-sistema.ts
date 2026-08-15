import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import type { TipoSistema } from '../../domain/modelos';
import { Modal } from '../comun/modal';

export interface DatosSistema {
  readonly nombre: string;
  readonly tipo: TipoSistema;
}

/**
 * Formulario de alta (crear) y edición (renombrar) de un sistema (spec 021: la defensa ya se
 * puede elegir, no solo recepción). Al renombrar, `mostrarTipo` se pone a `false` porque el
 * tipo no cambia una vez creado.
 */
@Component({
  selector: 'app-dialogo-sistema',
  imports: [Modal],
  templateUrl: './dialogo-sistema.html',
  styleUrl: './dialogo-sistema.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoSistema {
  readonly titulo = input.required<string>();
  readonly nombreInicial = input('');
  readonly mostrarTipo = input(true);

  readonly confirmar = output<DatosSistema>();
  readonly cancelar = output<void>();

  protected readonly tipoSeleccionado = signal<TipoSistema>('recepcion');

  protected emitirConfirmacion(nombre: string): void {
    this.confirmar.emit({ nombre, tipo: this.tipoSeleccionado() });
  }
}
