import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Modal } from '../comun/modal';
import { SelectorEquipo } from '../sistemas/selector-equipo';
import { BarraSistemas, type OpcionSistema } from '../sistemas/barra-sistemas';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from '../../domain/roles';
import type { EquipoId, Jugador } from '../../domain/modelos';
import type { TipoExamen } from '../../domain/examen';

const NOMBRE_TIPO: Readonly<Record<TipoExamen, string>> = {
  puesto: 'Por posición',
  linea: 'Por línea',
  sistema: 'Por sistema',
};

const NOMBRE_INSIGNIA: Readonly<Record<TipoExamen, string>> = {
  puesto: 'bronce',
  linea: 'plata',
  sistema: 'oro',
};

interface FilaTitular {
  readonly id: string;
  readonly etiqueta: string;
}

/**
 * Hoja de inscripción del examen (spec 057, E1): equipo, sistema, tipo y, si el tipo lo pide,
 * titular. Un checklist, no una única pantalla con todo suelto — cada fila se marca al
 * completarse (diseño C, aprobado). Presentacional puro: no decide nada, solo traduce clics a
 * intenciones; `ExamenTablero` decide cuándo está todo listo (`configuracionCompleta`).
 */
@Component({
  selector: 'app-dialogo-configuracion-examen',
  imports: [Modal, SelectorEquipo, BarraSistemas],
  templateUrl: './dialogo-configuracion-examen.html',
  styleUrl: './dialogo-configuracion-examen.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoConfiguracionExamen {
  readonly equipoActivo = input.required<EquipoId>();
  readonly sistemas = input.required<readonly OpcionSistema[]>();
  readonly sistemaActivoId = input.required<string | null>();
  readonly tipo = input.required<TipoExamen>();
  readonly necesitaTitular = input.required<boolean>();
  readonly titulares = input.required<readonly Jugador[]>();
  readonly titularId = input.required<string | null>();
  readonly configuracionCompleta = input.required<boolean>();

  readonly seleccionarEquipo = output<EquipoId>();
  readonly elegirSistema = output<string>();
  readonly elegirTipo = output<TipoExamen>();
  readonly elegirTitular = output<string>();
  readonly continuar = output<void>();
  readonly cerrar = output<void>();

  protected readonly tiposExamen: readonly TipoExamen[] = ['puesto', 'linea', 'sistema'];
  protected readonly nombreTipo = NOMBRE_TIPO;
  protected readonly nombreInsignia = NOMBRE_INSIGNIA;

  protected readonly sistemaElegido = computed(() => this.sistemaActivoId() !== null);
  protected readonly titularElegido = computed(() => !this.necesitaTitular() || this.titularId() !== null);

  protected readonly filasTitular = computed<readonly FilaTitular[]>(() =>
    this.titulares().map((j) => ({ id: j.id, etiqueta: etiquetaDe(j, CONFIGURACION_ROLES_POR_DEFECTO) })),
  );
}
