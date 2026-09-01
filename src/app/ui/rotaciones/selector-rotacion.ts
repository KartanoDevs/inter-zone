import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface EstadoRotacion {
  readonly rotacion: number;
  readonly tieneFalta: boolean;
  /** Marca neutra de "ya validada" en el examen (spec 066): no dice si estaba bien o mal
   * —eso es la spec 060—, solo que el alumno ya la dio por hecha. En Edición siempre `false`. */
  readonly validada?: boolean;
}

@Component({
  selector: 'app-selector-rotacion',
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
