import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { EquipoId } from '../../domain/modelos';
import { EQUIPOS, NOMBRE_EQUIPO } from '../../domain/equipos';

/** Pestañas del equipo activo (spec 032): decide qué catálogo se ve y en qué equipo entra el
 * próximo sistema que se cree. */
@Component({
  selector: 'app-selector-equipo',
  imports: [],
  templateUrl: './selector-equipo.html',
  styleUrl: './selector-equipo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorEquipo {
  readonly equipoActivo = input.required<EquipoId>();

  readonly seleccionar = output<EquipoId>();

  protected readonly equipos = EQUIPOS;
  protected readonly nombreEquipo = NOMBRE_EQUIPO;
}
