import { computed, linkedSignal, signal } from '@angular/core';
import type { EquipoId, Formacion, Jugador, Punto, Sistema } from '../domain/modelos';
import { estadoDe, ordenarCatalogo } from '../domain/catalogo-sistemas';
import {
  corregirExamen,
  corregirRotacion,
  jugadoresAColocar,
  liberoExaminable,
  permiteCorregirPorRotacion,
  rotacionesExaminables,
  sePuedeExaminar,
  type CorreccionExamen,
  type CorreccionRotacion,
  type Examen,
  type EntregaExamen,
  type TipoExamen,
} from '../domain/examen';
import type { InsigniaGanada } from '../domain/insignias';
import { jugadoresEnPista } from '../domain/rotacion';
import { DISTANCIA_MINIMA_ENTRE_JUGADORES, separarDeOtros } from '../domain/separacion';
import type { InsigniasRepository } from '../domain/puertos';
import { SistemaStore, type RotacionValida } from './sistema.store';

/** Navegación del examen en curso (spec 057, E1/E2): antes de tocar la pista hay que elegir
 * equipo, sistema, tipo y (si aplica) titular, y confirmar que se empieza. Solo en `en-curso`
 * existe una rotación activa que colocar; solo en `terminado` existe una corrección final. */
export type FaseExamen = 'configurando' | 'en-curso' | 'terminado';

/**
 * Navegación y estado en curso de la ventana Examen (spec 057, sustituye a la 055): mismo patrón
 * que `TeoriaStore` — propio, sin decorador de Angular, instanciable con `new ExamenStore(
 * sistemaStore, insigniasRepositorio)` — para no pisar ni el borrador del editor ni la
 * navegación de Teoría. Cada rotación acumula su propia entrega (`entrega`); confirmar corrige
 * con las funciones puras de dominio (specs 012-013-057) y, si concede insignia, la guarda a
 * través del puerto.
 */
export class ExamenStore {
  /** Arranca en el equipo activo de `SistemaStore` — la spec 064 lo fija en el primer equipo
   * visible de la cuenta — y se resetea a él en cada recarga. La hoja de inscripción puede
   * cambiarlo aparte (navegación independiente, spec 057). */
  readonly equipoActivo: ReturnType<typeof linkedSignal<EquipoId>>;
  readonly sistemaActivoId = signal<string | null>(null);
  readonly tipo = signal<TipoExamen>('puesto');
  readonly titularId = signal<string | null>(null);
  readonly rotacionActiva = signal<RotacionValida>(1);

  readonly fase = signal<FaseExamen>('configurando');

  /** Las colocaciones que el alumno ha hecho hasta ahora, por rotación — nunca las "dadas": esas
   * se derivan siempre del sistema, no se guardan en el estado del examen. */
  readonly entrega = signal<EntregaExamen>({});

  /** La corrección de cada rotación ya validada (spec 057, E7/E9-E10): a diferencia de la 055,
   * no se borra al cambiar de rotación — se acumula para poder mostrar el desglose completo al
   * terminar (E11). */
  readonly correccionesPorRotacion = signal<Partial<Record<RotacionValida, CorreccionRotacion>>>(
    {},
  );

  /** La corrección del examen completo, solo tras terminar (fase 'terminado'). */
  readonly correccionExamen = signal<CorreccionExamen | null>(null);

  readonly insigniaGuardada = signal(false);

  constructor(
    private readonly sistemaStore: SistemaStore,
    private readonly insigniasRepositorio: InsigniasRepository,
  ) {
    this.equipoActivo = linkedSignal(() => this.sistemaStore.equipoActivo());
  }

  /** Solo sistemas de recepción, validados, y examinables de verdad — con sus seis rotaciones
   * completas y legales (spec 012, E6-E7): no tiene sentido medir al alumno contra un modelo que
   * no cumple sus propias reglas. */
  readonly catalogo = computed<readonly Sistema[]>(() =>
    ordenarCatalogo(
      this.sistemaStore
        .sistemas()
        .filter(
          (s) =>
            s.equipoId === this.equipoActivo() &&
            s.tipo === 'recepcion' &&
            estadoDe(s) === 'validado' &&
            sePuedeExaminar(s),
        ),
    ),
  );

  readonly sistemaActivo = computed(
    () => this.catalogo().find((s) => s.id === this.sistemaActivoId()) ?? null,
  );

  /** Los titulares del orden de saque, más el líbero si el sistema lo tiene y de verdad entra en
   * pista alguna rotación (spec 058, E1/E2/E5), para el selector de "a quién examinar" (spec
   * 057, E2) — solo tiene sentido en los tipos que examinan a alguien concreto. */
  readonly titulares = computed<readonly Jugador[]>(() => {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return [];
    }
    const libero = liberoExaminable(sistema);
    return libero ? [...sistema.plantilla.ordenSaque, libero] : sistema.plantilla.ordenSaque;
  });

  readonly necesitaTitular = computed(() => this.tipo() !== 'sistema');

  /** La configuración está completa cuando hay sistema, tipo, y titular si el tipo lo exige
   * (spec 057, E1): hasta entonces no se puede pasar a la confirmación de inicio. */
  readonly configuracionCompleta = computed(() => {
    if (!this.sistemaActivo()) {
      return false;
    }
    return this.necesitaTitular() ? this.titularId() !== null : true;
  });

  private readonly examen = computed<Examen | null>(() => {
    const tipo = this.tipo();
    if (tipo === 'sistema') {
      return { tipo };
    }
    const titularId = this.titularId();
    return titularId ? { tipo, titularId } : null;
  });

  /** Qué rotaciones se examinan de verdad (spec 057, E3-E5): por sistema, las seis; por puesto o
   * línea, solo aquellas en las que el titular examinado está físicamente en pista. */
  readonly rotacionesExaminablesActuales = computed<readonly RotacionValida[]>(() => {
    const sistema = this.sistemaActivo();
    const examen = this.examen();
    if (!sistema || !examen) {
      return [];
    }
    return rotacionesExaminables(examen, sistema);
  });

  /** Quién viene ya colocado en la rotación activa (no se puede tocar) y a quién le toca colocar
   * al alumno (spec 057, E3-E5, herederos de 012 E1-E5). `[]` si todavía no hay examen bien
   * formado, o si el titular no está en pista esta rotación. */
  readonly jugadoresDelAlumno = computed<readonly Jugador[]>(() => {
    const sistema = this.sistemaActivo();
    const examen = this.examen();
    if (!sistema || !examen) {
      return [];
    }
    return jugadoresAColocar(examen, sistema, this.rotacionActiva());
  });

  readonly dadosDeLaRotacion = computed<Formacion>(() => {
    const sistema = this.sistemaActivo();
    const examen = this.examen();
    if (!sistema || !examen) {
      return [];
    }
    return this.dadosDeRotacion(this.rotacionActiva(), sistema, examen);
  });

  /** Lo que el alumno ha colocado hasta ahora en la rotación activa. */
  readonly colocadosDeLaRotacion = computed<Formacion>(
    () => this.entrega()[this.rotacionActiva()] ?? [],
  );

  readonly pendientes = computed<readonly Jugador[]>(() => {
    const colocadosIds = new Set(this.colocadosDeLaRotacion().map((c) => c.jugador.id));
    return this.jugadoresDelAlumno().filter((j) => !colocadosIds.has(j.id));
  });

  readonly rotacionCompleta = computed(
    () => this.pendientes().length === 0 && this.jugadoresDelAlumno().length > 0,
  );

  readonly permiteCorregirRotacionSuelta = computed(() => permiteCorregirPorRotacion(this.tipo()));

  /** Si la rotación activa ya se ha validado (spec 060): distinto de ver su veredicto. Esto
   * decide si la interfaz del examen en curso muestra "Validar rotación" o el estado de "ya
   * hecha", sin filtrar nota ni faltas. */
  readonly rotacionRegistrada = computed(
    () => this.rotacionActiva() in this.correccionesPorRotacion(),
  );

  /** El veredicto de la rotación activa (spec 060): validar una rotación la registra en
   * `correccionesPorRotacion` para habilitar el boletín, pero su nota y sus faltas no se
   * exponen hasta que el examen entero ha terminado. Antes de eso, siempre `null` — validando
   * no se ve nada, igual que colocando (revisa 057-E7). */
  readonly correccionRotacionActiva = computed(() =>
    this.fase() === 'terminado'
      ? (this.correccionesPorRotacion()[this.rotacionActiva()] ?? null)
      : null,
  );

  /** Qué rotaciones examinadas tienen una falta que el alumno puede ver ya (spec 060): ninguna
   * hasta que el examen termina; después, las que la corrección final marca. Es la única puerta
   * por la que la interfaz debe preguntar "¿enseño la falta de Rn?" — ni las pestañas ni el
   * boletín leen `correccionesPorRotacion` en crudo para eso. */
  readonly rotacionesConFaltaVisible = computed<ReadonlySet<RotacionValida>>(() => {
    if (this.fase() !== 'terminado') {
      return new Set();
    }
    const mapa = this.correccionesPorRotacion();
    return new Set(
      Object.entries(mapa)
        .filter(([, correccion]) => (correccion?.faltas.length ?? 0) > 0)
        .map(([r]) => Number(r) as RotacionValida),
    );
  });

  /** La comparación de la rotación activa con el modelo del entrenador (spec 057, E12): el punto
   * donde debía estar cada ficha del alumno frente a donde la colocó. Solo tiene sentido leerla
   * en la fase 'terminado', pero no depende de la fase — es una lectura más de `entrega`. */
  readonly comparacionRotacionActiva = computed<
    readonly { puntoModelo: Punto; puntoAlumno: Punto }[]
  >(() => {
    const sistema = this.sistemaActivo();
    const examen = this.examen();
    if (!sistema || !examen) {
      return [];
    }
    const rotacion = this.rotacionActiva();
    const modelo = sistema.formaciones[rotacion] ?? [];
    const colocados = this.entrega()[rotacion] ?? [];
    return jugadoresAColocar(examen, sistema, rotacion).flatMap((jugador) => {
      const puntoModelo = modelo.find((c) => c.jugador.id === jugador.id)?.punto;
      const puntoAlumno = colocados.find((c) => c.jugador.id === jugador.id)?.punto;
      return puntoModelo && puntoAlumno ? [{ puntoModelo, puntoAlumno }] : [];
    });
  });

  /** Spec 057, E11: se puede terminar el examen cuando todas las rotaciones examinables están
   * validadas — por puesto o línea, una a una; por sistema, de golpe al final. */
  readonly todasLasExaminablesValidadas = computed(() => {
    const rotaciones = this.rotacionesExaminablesActuales();
    if (rotaciones.length === 0) {
      return false;
    }
    const correcciones = this.correccionesPorRotacion();
    return rotaciones.every((r) => r in correcciones);
  });

  readonly todasLasRotacionesCompletas = computed(() =>
    this.rotacionesExaminablesActuales().every((r) => {
      const sistema = this.sistemaActivo();
      const examen = this.examen();
      if (!sistema || !examen) {
        return false;
      }
      const colocados = new Set((this.entrega()[r] ?? []).map((c) => c.jugador.id));
      return jugadoresAColocar(examen, sistema, r).every((j) => colocados.has(j.id));
    }),
  );

  seleccionarEquipo(equipo: EquipoId): void {
    this.equipoActivo.set(equipo);
    this.activarSistema(this.catalogo()[0]?.id ?? null);
  }

  activarSistema(id: string | null): void {
    this.sistemaActivoId.set(id);
    this.cancelarExamen();
  }

  seleccionarTipo(tipo: TipoExamen): void {
    this.tipo.set(tipo);
    this.cancelarExamen();
  }

  seleccionarTitular(titularId: string | null): void {
    this.titularId.set(titularId);
    this.cancelarExamen();
  }

  seleccionarRotacion(rotacion: RotacionValida): void {
    this.rotacionActiva.set(rotacion);
  }

  /** Empieza el examen tras la confirmación de inicio (spec 057, E2): ya no se puede volver a
   * `'configurando'`. Arranca en la primera rotación que de verdad se examina. */
  empezarExamen(): void {
    const primera = this.rotacionesExaminablesActuales()[0];
    if (primera !== undefined) {
      this.rotacionActiva.set(primera);
    }
    this.fase.set('en-curso');
  }

  /** Arrastrar una ficha del alumno: mismo criterio de separación que el editor
   * (`SistemaStore.colocarOMover`), para que dos fichas nunca se solapen. */
  colocar(jugadorId: string, punto: Punto): void {
    const jugador = this.jugadoresDelAlumno().find((j) => j.id === jugadorId);
    if (!jugador) {
      return;
    }
    this.entrega.update((entrega) => {
      const rotacion = this.rotacionActiva();
      const actual = entrega[rotacion] ?? [];
      const resto = actual.filter((c) => c.jugador.id !== jugadorId);
      const otros = [...this.dadosDeLaRotacion(), ...resto].map((c) => c.punto);
      const puntoLibre = separarDeOtros(punto, otros, DISTANCIA_MINIMA_ENTRE_JUGADORES);
      return { ...entrega, [rotacion]: [...resto, { jugador, punto: puntoLibre }] };
    });
  }

  quitar(jugadorId: string): void {
    this.entrega.update((entrega) => {
      const rotacion = this.rotacionActiva();
      const actual = entrega[rotacion] ?? [];
      return { ...entrega, [rotacion]: actual.filter((c) => c.jugador.id !== jugadorId) };
    });
  }

  vaciarRotacion(): void {
    const rotacion = this.rotacionActiva();
    this.entrega.update((entrega) => ({ ...entrega, [rotacion]: [] }));
    this.correccionesPorRotacion.update((mapa) => {
      const { [rotacion]: _quitada, ...resto } = mapa;
      return resto;
    });
  }

  /** Validar (spec 057, E6-E7): solo aquí se calcula el veredicto de esa rotación — mientras se
   * arrastra no hay ninguna función que lo devuelva antes de tiempo. Queda guardado en el mapa,
   * no se pierde al cambiar de pestaña. */
  confirmarRotacion(): void {
    const sistema = this.sistemaActivo();
    const examen = this.examen();
    if (!sistema || !examen || !this.rotacionCompleta()) {
      return;
    }
    const rotacion = this.rotacionActiva();
    const dados = this.dadosDeLaRotacion();
    const colocados = this.colocadosDeLaRotacion();
    const formacionCompleta = [...dados, ...colocados];
    const correccion = corregirRotacion(examen, sistema, rotacion, formacionCompleta);
    this.correccionesPorRotacion.update((mapa) => ({ ...mapa, [rotacion]: correccion }));
  }

  /** Termina el examen (spec 057, E11): agrega la nota final y, si concede insignia, la guarda.
   * Disponible cuando todas las rotaciones examinables están validadas (puesto/línea) o
   * completas (sistema, que se corrige de golpe). */
  async terminarExamen(): Promise<void> {
    const sistema = this.sistemaActivo();
    const examen = this.examen();
    if (!sistema || !examen) {
      return;
    }
    const rotaciones = this.rotacionesExaminablesActuales();
    const entregaCompleta: EntregaExamen = Object.fromEntries(
      rotaciones.map((r) => [
        r,
        [...this.dadosDeRotacion(r, sistema, examen), ...(this.entrega()[r] ?? [])],
      ]),
    );
    const desglose: Partial<Record<RotacionValida, CorreccionRotacion>> = {};
    for (const rotacion of rotaciones) {
      desglose[rotacion] = corregirRotacion(
        examen,
        sistema,
        rotacion,
        entregaCompleta[rotacion] ?? [],
      );
    }
    this.correccionesPorRotacion.set(desglose);
    const correccion = corregirExamen(examen, sistema, entregaCompleta);
    this.correccionExamen.set(correccion);
    this.insigniaGuardada.set(false);
    this.fase.set('terminado');
    if (correccion.insignia) {
      await this.insigniasRepositorio.registrar(
        sistema.id,
        examen.tipo,
        examen.tipo === 'sistema' ? null : examen.titularId,
      );
      this.insigniaGuardada.set(true);
    }
  }

  private dadosDeRotacion(rotacion: RotacionValida, sistema: Sistema, examen: Examen): Formacion {
    const idsAlumno = new Set(jugadoresAColocar(examen, sistema, rotacion).map((j) => j.id));
    const posiciones = jugadoresEnPista(sistema.plantilla, rotacion);
    const modelo = sistema.formaciones[rotacion] ?? [];
    return posiciones
      .filter((j) => !idsAlumno.has(j.id))
      .map((j) => modelo.find((c) => c.jugador.id === j.id))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);
  }

  /** Vuelve a la hoja de inscripción y descarta lo que el alumno llevara colocado (spec 057):
   * lo usan los `seleccionar*` de la configuración y el botón "Reiniciar examen" desde
   * `en-curso`/`terminado`, además del guard de navegación de `Tablero`. No toca la elección
   * de equipo/sistema/tipo/titular: solo el progreso del examen. */
  cancelarExamen(): void {
    this.fase.set('configurando');
    this.rotacionActiva.set(1);
    this.entrega.set({});
    this.correccionesPorRotacion.set({});
    this.correccionExamen.set(null);
    this.insigniaGuardada.set(false);
  }
}
