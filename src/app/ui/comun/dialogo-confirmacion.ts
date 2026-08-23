import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Modal } from '../comun/modal';

@Component({
  selector: 'app-dialogo-confirmacion',
  imports: [Modal],
  templateUrl: './dialogo-confirmacion.html',
  styleUrl: './dialogo-confirmacion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoConfirmacion {
  readonly titulo = input.required<string>();
  readonly mensaje = input.required<string>();
  readonly textoConfirmar = input('Descartar');
  readonly textoCancelar = input('Cancelar');
  /** `false` para confirmar una acción normal (p. ej. guardar): borde cian y botón primario en
   * vez del rosa de alerta, que aquí sería engañoso — nada se pierde al confirmar. */
  readonly peligro = input(true);

  readonly confirmar = output<void>();
  readonly cancelar = output<void>();
}
