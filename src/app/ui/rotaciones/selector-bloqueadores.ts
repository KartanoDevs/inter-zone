import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { NumeroBloqueadores } from '../../domain/modelos';

const BLOQUEADORES: readonly NumeroBloqueadores[] = [0, 1, 2, 3];

/**
 * Pestañas del número de bloqueadores de la variante activa (spec 039): 0 a 3, con una marca
 * visual para distinguir las combinaciones ya guardadas de las que aún están vacías (E7) — elegir
 * una vacía no falla, simplemente empieza en blanco (E3). No se ofrece en la situación "posición
 * inicial" (E4): esa postura no admite variantes de bloqueo, siempre es 0.
 */
@Component({
  selector: 'app-selector-bloqueadores',
  imports: [],
  templateUrl: './selector-bloqueadores.html',
  styleUrl: './selector-bloqueadores.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorBloqueadores {
  readonly bloqueadoresActivos = input.required<NumeroBloqueadores>();
  /** Qué números de bloqueadores ya tienen una variante guardada para la situación activa. */
  readonly bloqueadoresCreados = input<readonly NumeroBloqueadores[]>([]);

  readonly seleccionar = output<NumeroBloqueadores>();

  protected readonly opciones = BLOQUEADORES;

  protected estaCreado(bloqueadores: NumeroBloqueadores): boolean {
    return this.bloqueadoresCreados().includes(bloqueadores);
  }
}
