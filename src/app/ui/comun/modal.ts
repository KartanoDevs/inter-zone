import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Diálogo modal genérico: overlay + tarjeta + cabecera con título y cierre + cuerpo proyectado
 * + acciones proyectadas. Los diálogos concretos (confirmación, alta de sistema, ajustes,
 * leyenda, edición de texto) proyectan su contenido aquí en vez de reimplementar overlay y
 * cierre cada uno por su cuenta.
 */
@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.app-modal-host--alerta]': "variante() === 'alerta'",
    '(document:keydown.escape)': 'cerrar.emit()',
  },
})
export class Modal {
  readonly titulo = input.required<string>();
  /** `alerta` pinta el borde en rosa en vez del cian por defecto (ver dialogo-confirmacion). */
  readonly variante = input<'normal' | 'alerta'>('normal');
  /** `alertdialog` para diálogos que interrumpen con una decisión urgente (confirmaciones). */
  readonly rol = input<'dialog' | 'alertdialog'>('dialog');

  readonly cerrar = output<void>();
}
