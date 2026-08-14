import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface EstadoRotacion {
  readonly rotacion: number;
  readonly tieneFalta: boolean;
}

@Component({
  selector: 'mqt-selector-rotacion',
  imports: [],
  templateUrl: './selector-rotacion.html',
  styleUrl: './selector-rotacion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorRotacion {
  readonly rotaciones = input.required<readonly EstadoRotacion[]>();
  readonly rotacionActiva = input.required<number>();
  readonly seleccionar = output<number>();
}
