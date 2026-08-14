import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Punto } from '../domain/modelos';

export type EstadoFicha = 'normal' | 'aviso' | 'falta';
export type LineaFicha = 'delantera' | 'zaguera';

const RADIO_M = 0.45;

/**
 * Una ficha en el SVG de la pista. No calcula nada del dominio: recibe la etiqueta,
 * el punto y el estado ya derivados por quien la usa (ver docs/arquitectura.md, ui/
 * "no calcula nada del dominio, ni siquiera la etiqueta de una ficha"). Tampoco decide
 * qué pasa al arrastrarla: solo avisa de que alguien la ha agarrado y delega el cálculo
 * de coordenadas — que necesita el `<svg>` — en quien la contiene. La posición
 * rotacional (P1..P6) ya no se pinta aquí: son etiquetas fijas sobre el campo, ver
 * `pista.html`.
 */
@Component({
  selector: 'g[mqtFicha]',
  imports: [],
  templateUrl: './ficha-jugador.html',
  styleUrl: './ficha-jugador.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.mqt-ficha--aviso]': "estado() === 'aviso'",
    '[class.mqt-ficha--falta]': "estado() === 'falta'",
    '[class.mqt-ficha--libero]': 'esLibero()',
    '[class.mqt-ficha--zaguera]': "linea() === 'zaguera'",
    '[class.mqt-ficha--arrastrando]': 'arrastrando()',
    '[attr.transform]': 'transform()',
    '(pointerdown)': 'agarrada.emit($event)',
  },
})
export class FichaJugador {
  readonly punto = input.required<Punto>();
  readonly etiqueta = input.required<string>();
  readonly estado = input<EstadoFicha>('normal');
  readonly linea = input<LineaFicha>('delantera');
  readonly esLibero = input(false);
  readonly arrastrando = input(false);

  readonly agarrada = output<PointerEvent>();

  protected readonly radio = RADIO_M;

  protected transform(): string {
    const { x, y } = this.punto();
    return `translate(${x} ${y})`;
  }
}
