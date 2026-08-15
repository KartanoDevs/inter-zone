import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { Modal } from '../comun/modal';

/**
 * Explicación de enseñanza de la rotación activa, o del jugador seleccionado si lo hay.
 * No decide de quién es la explicación que muestra: eso lo calcula `SistemaStore`
 * (`explicacionMostrada`); este componente solo la enseña y permite editarla en un popup.
 */
@Component({
  selector: 'app-panel-ensenanza',
  imports: [Modal],
  templateUrl: './panel-ensenanza.html',
  styleUrl: './panel-ensenanza.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelEnsenanza {
  readonly titulo = input.required<string>();
  readonly texto = input.required<string>();

  readonly guardar = output<string>();

  protected readonly editando = signal(false);
  protected readonly borrador = signal('');

  protected iniciarEdicion(): void {
    this.borrador.set(this.texto());
    this.editando.set(true);
  }

  protected confirmar(): void {
    this.guardar.emit(this.borrador());
    this.editando.set(false);
  }

  protected cancelar(): void {
    this.editando.set(false);
  }
}
