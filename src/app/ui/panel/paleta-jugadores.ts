import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface ChipJugador {
  readonly id: string;
  readonly etiqueta: string;
}

export interface ChipAgarrado {
  readonly id: string;
  readonly evento: PointerEvent;
}

/**
 * Banquillo: los jugadores de la plantilla que aún no están en pista, como fichas de
 * arrastre. No sabe nada de dónde caen ni si el lugar es válido: solo avisa de que se
 * ha agarrado un chip.
 */
@Component({
  selector: 'app-paleta-jugadores',
  imports: [],
  templateUrl: './paleta-jugadores.html',
  styleUrl: './paleta-jugadores.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaletaJugadores {
  readonly pendientes = input.required<readonly ChipJugador[]>();

  readonly agarrar = output<ChipAgarrado>();
}
