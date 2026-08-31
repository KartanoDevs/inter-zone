import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import type { EquipoId, TipoSistema } from '../../domain/modelos';
import { EQUIPOS, NOMBRE_EQUIPO } from '../../domain/equipos';
import { Modal } from '../comun/modal';

export interface DatosSistema {
  readonly nombre: string;
  readonly tipo: TipoSistema;
  /** Uno o más equipos: al crear (spec 048) o al clonar (spec 063), marcar más de uno hace una
   * copia independiente en cada uno. Al renombrar no se lee — el equipo no cambia una vez creado
   * (spec 032). */
  readonly equiposId: readonly EquipoId[];
}

/**
 * Formulario de alta (crear), edición (renombrar) y clonado de un sistema (spec 021: la defensa
 * ya se puede elegir, no solo recepción; spec 032: el equipo también; spec 048: al crear, se
 * puede marcar más de un equipo; spec 063: al clonar, también). `mostrarTipo` solo se enciende
 * al crear —el tipo no cambia al renombrar ni al clonar—; `mostrarEquipo` se enciende al crear y
 * al clonar, y en renombrar los dos van a `false`.
 */
@Component({
  selector: 'app-dialogo-sistema',
  imports: [Modal],
  templateUrl: './dialogo-sistema.html',
  styleUrl: './dialogo-sistema.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoSistema {
  readonly titulo = input.required<string>();
  readonly nombreInicial = input('');
  readonly mostrarTipo = input(true);
  readonly mostrarEquipo = input(true);
  readonly equipoInicial = input<EquipoId>('masculino');

  readonly confirmar = output<DatosSistema>();
  readonly cancelar = output<void>();

  protected readonly equipos = EQUIPOS;
  protected readonly nombreEquipo = NOMBRE_EQUIPO;

  protected readonly tipoSeleccionado = signal<TipoSistema>('recepcion');
  protected readonly equiposSeleccionados = signal<ReadonlySet<EquipoId>>(new Set());

  constructor() {
    // Sincroniza el equipo propuesto con el que estaba activo al abrir el diálogo (spec 032);
    // un `effect` en vez de un valor de campo porque los inputs no están garantizados en el
    // constructor. Solo ese equipo empieza marcado; el entrenador añade el otro a mano (spec 048).
    effect(() => this.equiposSeleccionados.set(new Set([this.equipoInicial()])));
  }

  protected alternarEquipo(equipo: EquipoId): void {
    this.equiposSeleccionados.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(equipo)) {
        nuevo.delete(equipo);
      } else {
        nuevo.add(equipo);
      }
      return nuevo;
    });
  }

  /** Sin ningún equipo marcado no hay dónde crear ni clonar el sistema (spec 048 E5, spec 063 E5).
   * Solo se exige cuando el bloque de Equipo se muestra. */
  protected readonly puedeConfirmar = computed(
    () => !this.mostrarEquipo() || this.equiposSeleccionados().size > 0,
  );

  protected emitirConfirmacion(nombre: string): void {
    // El orden del formulario (`equipos`, spec 032) decide cuál queda activo tras crear (spec
    // 048, E4), no el orden en que se marcaron.
    const equiposId = this.equipos.filter((equipo) => this.equiposSeleccionados().has(equipo));
    this.confirmar.emit({ nombre, tipo: this.tipoSeleccionado(), equiposId });
  }
}
