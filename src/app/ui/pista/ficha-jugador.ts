import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Punto } from '../../domain/modelos';

export type EstadoFicha = 'normal' | 'aviso' | 'falta';
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
    '[class.app-ficha--libero]': 'esLibero()',
    '[class.app-ficha--zaguera]': "linea() === 'zaguera'",
    '[class.app-ficha--seleccionada]': 'seleccionada()',
    '[class.app-ficha--arrastrando]': 'arrastrando()',
    '[attr.transform]': 'transform()',
    '(pointerdown)': 'agarrada.emit($event)',
  },
})
export class FichaJugador {
  readonly punto = input.required<Punto>();
  readonly etiqueta = input.required<string>();
  /** Posición rotacional 1..6 (P1..P6) que ocupa el jugador en la rotación activa. */
  readonly posicion = input.required<number>();
  /** Ajuste global: si se pinta la ayuda de posición (P1..P6) bajo la etiqueta de rol. */
  readonly mostrarPosicion = input(true);
  readonly estado = input<EstadoFicha>('normal');
  readonly linea = input<LineaFicha>('delantera');
  readonly esLibero = input(false);
  readonly arrastrando = input(false);
  readonly seleccionada = input(false);

  readonly agarrada = output<PointerEvent>();

  protected readonly radio = RADIO_M;

  protected transform(): string {
    const { x, y } = this.punto();
    return `translate(${x} ${y})`;
  }
}
