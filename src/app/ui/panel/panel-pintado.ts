import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Barra } from '../comun/barra';
import type { EntradaLeyendaColor } from '../comun/ficha-vista';

/**
 * Contenido de la pestaña "Pintado" (spec 041, rediseñado por la 044): selector de acción al
 * arrastrar (pintar / mover el bloqueo), dial de tamaño de sombra, selector de qué zona se pinta
 * y la leyenda con las dos zonas de cada puesto siempre visibles. No sabe pintar celdas ni mover
 * la sombra — solo refleja el estado del store y avisa de lo que el entrenador toca, igual que
 * `PanelAjustes`.
 */
@Component({
  selector: 'app-panel-pintado',
  imports: [Barra],
  templateUrl: './panel-pintado.html',
  styleUrl: './panel-pintado.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelPintado {
  readonly accionArrastre = input.required<'pintar' | 'mover' | null>();
  /** Spec 045, E5: sin bloqueadores (incluida la postura inicial, spec 039-E4) no hay nada que
   * mover — la opción se deshabilita en vez de dejar que no haga nada al clicarla. */
  readonly puedeMoverBloqueo = input.required<boolean>();
  readonly modoPintado = input.required<'defensa' | 'finta'>();
  readonly escalaSombra = input.required<number>();
  readonly leyenda = input.required<readonly EntradaLeyendaColor[]>();
  readonly paletaColores = input.required<readonly string[]>();

  readonly seleccionarAccionArrastre = output<'pintar' | 'mover'>();
  readonly seleccionarModoPintado = output<'defensa' | 'finta'>();
  readonly cambiarEscalaSombra = output<number>();
}
