import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Punto } from '../../domain/modelos';

/** `'dada'` (spec 057, heredado de la 055): una ficha del examen que ya viene colocada por el
 * enunciado y no se puede tocar — se pinta atenuada y con trazo discontinuo, nunca arrastrable. */
export type EstadoFicha = 'normal' | 'aviso' | 'falta' | 'dada';
export type LineaFicha = 'delantera' | 'zaguera';

const RADIO_M = 0.45;

/**
 * Una ficha en el SVG de la pista. No calcula nada del dominio: recibe la etiqueta,
 * el punto y el estado ya derivados por quien la usa (docs/arquitectura.md). Tampoco decide
 * qué pasa al arrastrarla: solo avisa de que alguien la ha agarrado.
 */
@Component({
  selector: 'g[appFicha]',
  imports: [],
  templateUrl: './ficha-jugador.html',
  styleUrl: './ficha-jugador.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.app-ficha--aviso]': "estado() === 'aviso'",
    '[class.app-ficha--falta]': "estado() === 'falta'",
    '[class.app-ficha--dada]': "estado() === 'dada'",
    '[class.app-ficha--libero]': 'esLibero()',
    '[class.app-ficha--zaguera]': "linea() === 'zaguera'",
    '[class.app-ficha--etiqueta-larga]': 'etiquetaLarga()',
    '[class.app-ficha--seleccionada]': 'seleccionada()',
    '[class.app-ficha--arrastrando]': 'arrastrando()',
    '[attr.transform]': 'transform()',
    '(pointerdown)': 'onPointerDown($event)',
  },
})
export class FichaJugador {
  readonly punto = input.required<Punto>();
  readonly etiqueta = input.required<string>();
  /** La etiqueta pequeña bajo la principal (spec 049): "P1".."P6" en recepción, "JD"/"JT" en
   * defensa. Su primer carácter se pinta pequeño y el resto grande. */
  readonly etiquetaPosicion = input.required<string>();
  /** Ajuste global: si se pinta la ayuda de posición bajo la etiqueta de rol. */
  readonly mostrarPosicion = input(true);
  readonly estado = input<EstadoFicha>('normal');
  readonly linea = input<LineaFicha>('delantera');
  readonly esLibero = input(false);
  readonly arrastrando = input(false);
  readonly seleccionada = input(false);

  readonly agarrada = output<PointerEvent>();

  protected readonly radio = RADIO_M;

  /** Solo las etiquetas de dos letras sin índice numérico (`CO`, hoy la única) son más anchas
   * de lo que el círculo espera cómodamente (spec 042); `R1`, `C1`, `C2` ya encajaban y no se
   * tocan. */
  protected etiquetaLarga(): boolean {
    return this.etiqueta().length > 1 && !/\d/.test(this.etiqueta());
  }

  protected transform(): string {
    const { x, y } = this.punto();
    return `translate(${x} ${y})`;
  }

  /** El primer carácter de `etiquetaPosicion` ("P" o "J"), pintado pequeño. */
  protected prefijoPosicion(): string {
    return this.etiquetaPosicion().slice(0, 1);
  }

  /** El resto de `etiquetaPosicion` tras el prefijo ("1".."6", o "D"/"T"), pintado grande. */
  protected cuerpoPosicion(): string {
    return this.etiquetaPosicion().slice(1);
  }

  /** No propaga: el fondo de la pista tiene su propio `pointerdown` para el modo pintar (spec
   * 022), y una ficha encima nunca debe disparar los dos gestos a la vez. */
  protected onPointerDown(evento: PointerEvent): void {
    evento.stopPropagation();
    if (this.estado() === 'dada') {
      return;
    }
    this.agarrada.emit(evento);
  }
}
