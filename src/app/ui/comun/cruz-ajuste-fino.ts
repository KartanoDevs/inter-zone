import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { DireccionAjuste } from '../../domain/ajuste-fino';

/**
 * Cruz de flechas para el ajuste fino de una ficha ya seleccionada (spec 070): cuatro botones
 * cardinales más un cierre, anclados en pantalla en `x`/`y` (coordenadas de
 * `Pista.puntoAPantalla`, mismo sistema que `PointerEvent.clientX/clientY`). Presentacional y
 * sin estado de dominio, como `Barra`: solo emite qué se pulsó, quien la usa decide qué punto
 * corresponde y llama a `aplicarPaso`.
 */
@Component({
  selector: 'app-cruz-ajuste-fino',
  imports: [],
  templateUrl: './cruz-ajuste-fino.html',
  styleUrl: './cruz-ajuste-fino.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-cruz-ajuste-fino',
    role: 'group',
    'aria-label': 'Ajuste fino de posición',
    '[style.left.px]': 'x()',
    '[style.top.px]': 'y()',
  },
})
export class CruzAjusteFino {
  readonly x = input.required<number>();
  readonly y = input.required<number>();

  readonly mover = output<DireccionAjuste>();
  readonly cerrar = output<void>();
}
