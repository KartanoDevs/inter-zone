import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { TipoSistema } from '../../domain/modelos';

export interface DatosSistema {
  readonly nombre: string;
  readonly tipo: TipoSistema;
}

/**
 * Formulario de alta (crear) y edición (renombrar) de un sistema. La defensa se ve pero no
 * se puede elegir: es fase 2 del proyecto (spec 010, E5). Al renombrar, `mostrarTipo` se pone
 * a `false` porque el tipo no cambia una vez creado.
 */
@Component({
  selector: 'app-dialogo-sistema',
  imports: [],
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

  protected emitirConfirmacion(nombre: string): void {
    this.confirmar.emit({ nombre, tipo: 'recepcion' });
  }
}
