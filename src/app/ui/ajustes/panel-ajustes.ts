import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Ajustes de la rotación activa y de la app: si la validación de posiciones está desactivada, y
 * si se oculta la ayuda de posición (P1..P6) bajo cada ficha. Vive como contenido de la pestaña
 * "Ajustes" de `Tablero`, siempre montado — no es un diálogo que se cierre. Pensado para
 * crecer: cada ajuste nuevo añade una fila aquí, no un componente aparte.
 *
 * A quién sustituye el líbero ya no se elige aquí (decisión 0040): siempre es el central que
 * cae en zaga, derivado por `sustitutosLiberoPorDefecto` en `domain/rotacion.ts`. El orden de
 * las pestañas de rotación tampoco: es siempre el orden de juego (spec posterior a la 067,
 * `domain/rotacion.ts`, `ORDEN_ROTACIONES`), sin ajuste que lo cambie.
 */
@Component({
  selector: 'app-panel-ajustes',
  imports: [],
  templateUrl: './panel-ajustes.html',
  styleUrl: './panel-ajustes.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelAjustes {
  readonly validacionDesactivada = input.required<boolean>();
  readonly ayudaPosicionDesactivada = input.required<boolean>();

  readonly alternarValidacion = output<void>();
  readonly alternarAyudaPosicion = output<void>();
}
