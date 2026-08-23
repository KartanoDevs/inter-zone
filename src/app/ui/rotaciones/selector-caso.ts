import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { CasoColocador } from '../../domain/modelos';

const ETIQUETAS: Readonly<Record<CasoColocador, string>> = { delantero: 'Colocador delantero', trasero: 'Colocador trasero' };
const CASOS: readonly CasoColocador[] = ['delantero', 'trasero'];

/**
 * Pestañas del caso del colocador rival activo (spec 038): sustituye al selector de rotación en
 * un sistema de defensa. La rotación no manda nada en defensa; lo que decide cuántos atacantes
 * tiene el rival es si su colocador está en la red o en la zaga.
 */
@Component({
  selector: 'app-selector-caso',
  imports: [],
  templateUrl: './selector-caso.html',
  styleUrl: './selector-caso.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorCaso {
  readonly casoActivo = input.required<CasoColocador>();

  readonly seleccionar = output<CasoColocador>();

  protected readonly casos = CASOS;
  protected readonly etiquetas = ETIQUETAS;
}
