import { computed, linkedSignal, signal } from '@angular/core';
import type {
  Celda,
  CasoColocador,
  ColocacionDefensa,
  EquipoId,
  NumeroBloqueadores,
  Punto,
  Sistema,
  SituacionDefensa,
} from '../domain/modelos';
import { estadoDe, ordenarCatalogo } from '../domain/catalogo-sistemas';
import { situacionTrasCambioDeCaso, situacionesDe } from '../domain/defensa';
import { jugadoresEnPista } from '../domain/rotacion';
import { puestosQueBloquean } from '../domain/sistema-defensa';
import { sombraDeBloqueo } from '../domain/sombra-bloqueo';
import { PUNTO_POR_SITUACION } from '../domain/sistema-defensa-por-defecto';
import { SistemaStore, type ColocacionBorrador, type RotacionValida } from './sistema.store';

/** El identificador de a quién ocupa una colocación (spec 052): el id del jugador en recepción,
 * o `p${puesto}` en defensa. Se repite en vez de importarlo porque en `sistema.store.ts` es
 * privado y en `tablero.ts` (ui/) importarlo violaría la dirección de dependencias
 * (`application/` nunca importa de `ui/`) — es fontanería, no una regla de dominio. */
function idOcupanteDe(colocacion: ColocacionBorrador): string {
  return 'jugador' in colocacion ? colocacion.jugador.id : `p${colocacion.puesto}`;
}

/** Escala fija de la sombra en Teoría (spec 052): a diferencia del editor, no hay un ajuste de
 * pantalla propio que consultar — es de solo lectura, sin panel de ajustes. Mismo valor medio
 * que trae `AjustesRepository` por defecto. */
const ESCALA_SOMBRA_FIJA = (5 / 10) * 1.25;

/**
 * Navegación y vistas de "Teoría" (spec 052): consulta de sistemas validados, de solo lectura.
 * Sin decorador de Angular, como `SistemaStore` — instanciable con `new TeoriaStore(sistemaStore)`
 * y testeable sin `TestBed`. Su propia navegación (equipo, sistema, rotación, caso, situación,
 * bloqueadores, jugador seleccionado) es independiente de la del editor a propósito (ADR
 * pendiente de anotar en el cierre de la spec): así, abrir Teoría nunca pisa un cambio sin
 * guardar que el entrenador tuviera a medias en `SistemaStore`.
 */
export class TeoriaStore {
  /** Arranca en el equipo activo de `SistemaStore` — que la spec 064 ya fija en el primer
   * equipo visible de la cuenta — y se resetea a él en cada recarga. El entrenador puede
   * cambiarlo aparte con `seleccionarEquipo`; su elección manda hasta la siguiente recarga
   * (navegación independiente, spec 052 E9). */
  readonly equipoActivo: ReturnType<typeof linkedSignal<EquipoId>>;
  readonly sistemaActivoId = signal<string | null>(null);
  readonly rotacionActiva = signal<RotacionValida>(1);
  readonly casoActivo = signal<CasoColocador>('delantero');
  readonly situacionActiva = signal<SituacionDefensa>('z4');
  readonly bloqueadoresActivos = signal<NumeroBloqueadores>(0);
  readonly jugadorSeleccionadoId = signal<string | null>(null);

  constructor(private readonly sistemaStore: SistemaStore) {
    this.equipoActivo = linkedSignal(() => this.sistemaStore.equipoActivo());
  }

  /** Solo los sistemas validados (spec 051): en borrador no hay nada que un jugador deba
   * estudiar todavía. */
  readonly catalogo = computed<readonly Sistema[]>(() =>
    ordenarCatalogo(
      this.sistemaStore
        .sistemas()
        .filter((s) => s.equipoId === this.equipoActivo() && estadoDe(s) === 'validado'),
    ),
  );

  readonly sistemaActivo = computed(
    () => this.catalogo().find((s) => s.id === this.sistemaActivoId()) ?? null,
  );
  readonly esDefensa = computed(() => this.sistemaActivo()?.tipo === 'defensa');
  readonly descripcionSistemaActivo = computed(() => this.sistemaActivo()?.descripcion ?? '');
  readonly situacionesPosibles = computed(() => situacionesDe(this.casoActivo()));
  readonly admiteBloqueadores = computed(
    () => this.esDefensa() && this.situacionActiva() !== 'inicial',
  );

  readonly bloqueadoresCreados = computed<readonly NumeroBloqueadores[]>(() => {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return [];
    }
    return (sistema.defensas ?? [])
      .filter((v) => v.caso === this.casoActivo() && v.situacion === this.situacionActiva())
      .map((v) => v.bloqueadores);
  });

  private readonly varianteActiva = computed(
    () =>
      this.sistemaActivo()?.defensas?.find(
        (v) =>
          v.caso === this.casoActivo() &&
          v.situacion === this.situacionActiva() &&
          v.bloqueadores === this.bloqueadoresActivos(),
      ) ?? null,
  );

  /** `null` cuando esa clave nunca se guardó (E3/E4): a diferencia del editor, Teoría avisa en
   * vez de fingir una formación de partida — no hay nada que "empezar a colocar" aquí. */
  readonly formacionActiva = computed<readonly ColocacionBorrador[] | null>(() => {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return null;
    }
    if (sistema.tipo === 'defensa') {
      return this.varianteActiva()?.formacion ?? null;
    }
    return sistema.formaciones[this.rotacionActiva()] ?? null;
  });

  readonly posicionesActivas = computed(() => {
    const sistema = this.sistemaActivo();
    return sistema && sistema.tipo === 'recepcion'
      ? jugadoresEnPista(sistema.plantilla, this.rotacionActiva())
      : null;
  });

  private readonly explicacionRotacionActiva = computed(() => {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return '';
    }
    if (sistema.tipo === 'defensa') {
      return this.varianteActiva()?.explicacion ?? '';
    }
    return sistema.explicacionesRotacion[this.rotacionActiva()] ?? '';
  });

  private readonly explicacionJugadorSeleccionado = computed(() => {
    const id = this.jugadorSeleccionadoId();
    if (!id) {
      return '';
    }
    return (this.formacionActiva() ?? []).find((c) => idOcupanteDe(c) === id)?.explicacion ?? '';
  });

  readonly explicacionMostrada = computed(() =>
    this.jugadorSeleccionadoId()
      ? this.explicacionJugadorSeleccionado()
      : this.explicacionRotacionActiva(),
  );

  readonly celdasJugadorSeleccionado = computed<readonly Celda[]>(() => {
    const id = this.jugadorSeleccionadoId();
    if (!id || !this.esDefensa()) {
      return [];
    }
    return (this.formacionActiva() ?? []).find((c) => idOcupanteDe(c) === id)?.celdas ?? [];
  });

  readonly celdasFintaJugadorSeleccionado = computed<readonly Celda[]>(() => {
    const id = this.jugadorSeleccionadoId();
    if (!id || !this.esDefensa()) {
      return [];
    }
    return (this.formacionActiva() ?? []).find((c) => idOcupanteDe(c) === id)?.celdasFinta ?? [];
  });

  /** La sombra de bloqueo ya guardada (spec 052, E6): sin arrastre, así que siempre es la
   * calculada con el retoque que tuviera la variante — nunca una "en edición". */
  readonly sombra = computed<readonly (readonly Punto[])[]>(() => {
    if (!this.esDefensa()) {
      return [];
    }
    const formacion = this.formacionActiva() as readonly ColocacionDefensa[] | null;
    if (!formacion) {
      return [];
    }
    const puntoAtacante = PUNTO_POR_SITUACION[this.situacionActiva()];
    if (!puntoAtacante) {
      return [];
    }
    const puestosBloqueadores = puestosQueBloquean(formacion, this.bloqueadoresActivos());
    const puntosBloqueadores = puestosBloqueadores
      .map((puesto) => formacion.find((c) => c.puesto === puesto)?.punto)
      .filter((p): p is Punto => p !== undefined);
    return sombraDeBloqueo(
      puntoAtacante,
      puntosBloqueadores,
      this.varianteActiva()?.desplazamientoSombra,
      ESCALA_SOMBRA_FIJA,
    );
  });

  /** Cambia de equipo y activa su primer sistema validado, o ninguno si no tiene (spec 052, E8). */
  seleccionarEquipo(equipo: EquipoId): void {
    this.equipoActivo.set(equipo);
    this.activarSistema(this.catalogo()[0]?.id ?? null);
  }

  activarSistema(id: string | null): void {
    this.sistemaActivoId.set(id);
    this.rotacionActiva.set(1);
    this.casoActivo.set('delantero');
    this.situacionActiva.set('z4');
    this.bloqueadoresActivos.set(0);
    this.jugadorSeleccionadoId.set(null);
  }

  seleccionarRotacion(rotacion: RotacionValida): void {
    this.rotacionActiva.set(rotacion);
    this.jugadorSeleccionadoId.set(null);
  }

  seleccionarCaso(caso: CasoColocador): void {
    this.casoActivo.set(caso);
    this.situacionActiva.set(situacionTrasCambioDeCaso(this.situacionActiva(), caso));
    this.bloqueadoresActivos.set(0);
    this.jugadorSeleccionadoId.set(null);
  }

  seleccionarSituacion(situacion: SituacionDefensa): void {
    this.situacionActiva.set(situacion);
    this.bloqueadoresActivos.set(0);
    this.jugadorSeleccionadoId.set(null);
  }

  seleccionarBloqueadores(bloqueadores: NumeroBloqueadores): void {
    this.bloqueadoresActivos.set(bloqueadores);
    this.jugadorSeleccionadoId.set(null);
  }

  /** Toque: la misma ficha deselecciona, otra cambia el foco — igual que en el editor (spec 010). */
  seleccionarJugador(id: string): void {
    this.jugadorSeleccionadoId.update((actual) => (actual === id ? null : id));
  }
}
