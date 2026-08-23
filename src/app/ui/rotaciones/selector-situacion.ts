import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CasoColocador, SituacionDefensa } from '../../domain/modelos';
import { situacionesDe } from '../../domain/defensa';

const ETIQUETAS: Readonly<Record<SituacionDefensa, string>> = {
  inicial: 'Inicial',
  z4: 'Ataque por 4',
  z3: 'Ataque por 3',
  z2: 'Ataque por 2',
  z1: 'Ataque por 1',
  pipe: 'Pipe',
};

/**
 * Pestañas de la situación de ataque activa, solo para sistemas de defensa (spec 038): sustituye
 * al selector de vía de la spec 021. Las situaciones disponibles dependen del caso del colocador
 * rival activo — con el colocador delante no hay ataque por 2, con el colocador detrás no hay
 * ataque por 1.
 */
@Component({
  selector: 'app-selector-situacion',
  imports: [],
  templateUrl: './selector-situacion.html',
  styleUrl: './selector-situacion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorSituacion {
  readonly casoActivo = input.required<CasoColocador>();
  readonly situacionActiva = input.required<SituacionDefensa>();

  readonly seleccionar = output<SituacionDefensa>();

  protected readonly situaciones = computed(() => situacionesDe(this.casoActivo()));
  protected readonly etiquetas = ETIQUETAS;
}
