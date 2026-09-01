import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { EquipoId } from '../../domain/modelos';
import { EQUIPOS, NOMBRE_EQUIPO } from '../../domain/equipos';

/** Pestañas del equipo activo (spec 032): decide qué catálogo se ve y en qué equipo entra el
 * próximo sistema que se cree. `equipos` (spec 064) limita cuáles se ofrecen; si solo queda uno
 * el componente no pinta nada — no hay nada que elegir. */
@Component({
  selector: 'app-selector-equipo',
  imports: [],
  templateUrl: './selector-equipo.html',
  styleUrl: './selector-equipo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorEquipo {
  readonly equipoActivo = input.required<EquipoId>();
  readonly equipos = input<readonly EquipoId[]>(EQUIPOS);

  readonly seleccionar = output<EquipoId>();

  protected readonly nombreEquipo = NOMBRE_EQUIPO;
  protected readonly equiposOrdenados = computed(() =>
    EQUIPOS.filter((equipo) => this.equipos().includes(equipo)),
  );
}
