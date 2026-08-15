import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Modal } from '../comun/modal';

export interface OpcionLibero {
  readonly id: string | null;
  readonly etiqueta: string;
}

/**
 * Ajustes de la rotación activa y de la app: a quién sustituye el líbero en esta rotación
 * (spec 017) y si la validación de posiciones está desactivada. Pensado para crecer: cada
 * ajuste nuevo añade una sección a este popup, no un componente aparte.
 */
@Component({
  selector: 'app-dialogo-ajustes',
  imports: [Modal],
  templateUrl: './dialogo-ajustes.html',
  styleUrl: './dialogo-ajustes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoAjustes {
  readonly rotacion = input.required<number>();
  readonly tieneLibero = input.required<boolean>();
  readonly opcionesLibero = input.required<readonly OpcionLibero[]>();
  readonly sustitutoActual = input.required<string | null>();
  readonly validacionDesactivada = input.required<boolean>();

  readonly cambiarSustituto = output<string | null>();
  readonly alternarValidacion = output<void>();
  readonly cerrar = output<void>();

  protected onCambiarSustituto(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.cambiarSustituto.emit(valor === '' ? null : valor);
  }
}
