import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import type { EquipoId, TipoSistema } from '../../domain/modelos';
import { EQUIPOS, NOMBRE_EQUIPO } from '../../domain/equipos';
import { Modal } from '../comun/modal';

export interface DatosSistema {
  readonly nombre: string;
  readonly tipo: TipoSistema;
  readonly equipoId: EquipoId;
}

/**
 * Formulario de alta (crear) y edición (renombrar) de un sistema (spec 021: la defensa ya se
 * puede elegir, no solo recepción; spec 032: el equipo también). Al renombrar o clonar,
 * `mostrarTipo` se pone a `false` — ni el tipo ni el equipo cambian una vez creado, y clonar
 * mantiene el equipo del original.
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
  readonly equipoInicial = input<EquipoId>('masculino');

  readonly confirmar = output<DatosSistema>();
  readonly cancelar = output<void>();

  protected readonly equipos = EQUIPOS;
  protected readonly nombreEquipo = NOMBRE_EQUIPO;

  protected readonly tipoSeleccionado = signal<TipoSistema>('recepcion');
  protected readonly equipoSeleccionado = signal<EquipoId>('masculino');

  constructor() {
    // Sincroniza el equipo propuesto con el que estaba activo al abrir el diálogo (spec 032);
    // un `effect` en vez de un valor de campo porque los inputs no están garantizados en el
    // constructor.
    effect(() => this.equipoSeleccionado.set(this.equipoInicial()));
  }

  protected emitirConfirmacion(nombre: string): void {
    this.confirmar.emit({ nombre, tipo: this.tipoSeleccionado(), equipoId: this.equipoSeleccionado() });
  }
}
