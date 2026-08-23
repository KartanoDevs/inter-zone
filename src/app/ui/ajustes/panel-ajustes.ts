import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface OpcionLibero {
  readonly id: string | null;
  readonly etiqueta: string;
}

/**
 * Ajustes de la rotación activa y de la app: a quién sustituye el líbero en esta rotación
 * (spec 017), si la validación de posiciones está desactivada, si se oculta la ayuda de
 * posición (P1..P6) bajo cada ficha, en qué orden se muestran las pestañas de rotación, y si
 * se muestran los números de metros a la izquierda de la rejilla. Vive como contenido de la
 * pestaña "Ajustes" de `Tablero`, siempre montado — no es un diálogo que se cierre. Pensado
 * para crecer: cada ajuste nuevo añade una fila aquí, no un componente aparte.
 */
@Component({
  selector: 'app-panel-ajustes',
  imports: [],
  templateUrl: './panel-ajustes.html',
  styleUrl: './panel-ajustes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAjustes {
  readonly rotacion = input.required<number>();
  readonly tieneLibero = input.required<boolean>();
  readonly opcionesLibero = input.required<readonly OpcionLibero[]>();
  readonly sustitutoActual = input.required<string | null>();
  readonly validacionDesactivada = input.required<boolean>();
  readonly ayudaPosicionDesactivada = input.required<boolean>();
  readonly ordenRotacionCronologico = input.required<boolean>();
  readonly mostrarNumerosMetros = input.required<boolean>();

  readonly cambiarSustituto = output<string | null>();
  readonly alternarValidacion = output<void>();
  readonly alternarAyudaPosicion = output<void>();
  readonly alternarOrdenRotacion = output<void>();
  readonly alternarMostrarNumerosMetros = output<void>();

  protected onCambiarSustituto(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    this.cambiarSustituto.emit(valor === '' ? null : valor);
  }
}
