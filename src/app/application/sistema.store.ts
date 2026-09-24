import { computed, signal } from '@angular/core';
import type {
  CasoColocador,
  Celda,
  Colocacion,
  ColocacionDefensa,
  EquipoId,
  EstadoSistema,
  Formacion,
  FormacionDefensa,
  NumeroBloqueadores,
  OrdenSaque,
  Punto,
  PuestoDefensa,
  Sistema,
  SituacionDefensa,
  TipoSistema,
} from '../domain/modelos';
import {
  ConflictoDeEdicion,
  ErrorDelServidor,
  ErrorDeRed,
  type AjustesRepository,
  type SistemaRepository,
} from '../domain/puertos';
import {
  borrarSistema,
  cambiarSustitutoLibero,
  clonarSistema,
  crearSistema,
  describirSistema,
  estadoDe,
  importarSistema,
  ordenarCatalogo,
  parsearSistemaImportado,
  renombrarSistema,
  serializarSistema,
} from '../domain/catalogo-sistemas';
import { jugadoresEnPista } from '../domain/rotacion';
import { situacionTrasCambioDeCaso, situacionesDe } from '../domain/defensa';
import { explicarJugador, explicarRotacion, guardarFormacion } from '../domain/sistema-recepcion';
import {
  explicarPuesto,
  explicarVariante,
  guardarVarianteDefensa,
} from '../domain/sistema-defensa';
import { formacionDefensaPorDefecto } from '../domain/sistema-defensa-por-defecto';
import { validarFormacion } from '../domain/validacion';
import { PLANTILLA_GLOBAL } from '../domain/plantilla-global';
import { DISTANCIA_MINIMA_ENTRE_JUGADORES, separarDeOtros } from '../domain/separacion';

export type RotacionValida = 1 | 2 | 3 | 4 | 5 | 6;

/** Una colocación del borrador en edición: un jugador (recepción) o un puesto genérico
 * (defensa, spec 038) — nunca los dos a la vez. */
export type ColocacionBorrador = Colocacion | ColocacionDefensa;

type CambioPendiente =
  | { readonly tipo: 'rotacion'; readonly valor: RotacionValida }
  | { readonly tipo: 'sistema'; readonly valor: string }
  | { readonly tipo: 'caso'; readonly valor: CasoColocador }
  | { readonly tipo: 'situacion'; readonly valor: SituacionDefensa }
  | { readonly tipo: 'bloqueadores'; readonly valor: NumeroBloqueadores }
  | { readonly tipo: 'equipo'; readonly valor: EquipoId };

/** El identificador de a quién ocupa una colocación del borrador: el id del jugador en
 * recepción, o `p${puesto}` en defensa — nunca hay colisión entre los dos espacios porque los
 * puestos de defensa no son jugadores reales (spec 038). */
function idDe(colocacion: ColocacionBorrador): string {
  return 'jugador' in colocacion ? colocacion.jugador.id : `p${colocacion.puesto}`;
}

function coincide(a: Celda, b: Celda): boolean {
  return a.columna === b.columna && a.fila === b.fila;
}

function celdasIguales(a: readonly Celda[] = [], b: readonly Celda[] = []): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((celda) => b.some((otra) => coincide(celda, otra)));
}

/** El mensaje que se enseña al entrenador por cada uno de los tres motivos de fallo que puede
 * señalar un `SistemaRepository` (spec 034) — cada uno pide una reacción distinta, así que el
 * texto lo dice, no solo "algo falló". */
function mensajeDeError(error: unknown): string {
  if (error instanceof ErrorDeRed) {
    return 'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.';
  }
  if (error instanceof ConflictoDeEdicion) {
    return 'Alguien más ha modificado este sistema mientras tanto.';
  }
  if (error instanceof ErrorDelServidor) {
    return `El servidor no pudo guardar el cambio: ${error.message}`;
  }
  return 'Ha ocurrido un error inesperado al guardar.';
}

function formacionesIguales(
  a: readonly ColocacionBorrador[],
  b: readonly ColocacionBorrador[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const colocacionPorId = new Map(b.map((c) => [idDe(c), c]));
  return a.every((c) => {
    const otra = colocacionPorId.get(idDe(c));
    return (
      otra !== undefined &&
      otra.punto.x === c.punto.x &&
      otra.punto.y === c.punto.y &&
      celdasIguales(c.celdas, otra.celdas) &&
      celdasIguales(c.celdasFinta, otra.celdasFinta)
    );
  });
}

/**
 * Estado de la pizarra. Toda la lógica vive aquí, en TypeScript con signals, sin DOM
 * (docs/arquitectura.md). `borrador` es la formación en edición de la rotación activa: se
 * carga desde lo guardado del sistema al activar un sistema o cambiar de rotación, y solo se
 * confirma en `sistema.formaciones` (y se persiste) al llamar a `guardar()`.
 */
export class SistemaStore {
  readonly sistemas = signal<readonly Sistema[]>([]);
  /** Equipo cuyo catálogo se ve y con el que se trabaja (spec 032). Masculino por defecto. */
  readonly equipoActivo = signal<EquipoId>('masculino');
  readonly sistemaActivoId = signal<string | null>(null);
  readonly rotacionActiva = signal<RotacionValida>(1);
  /** Caso del colocador rival activo (spec 038): sustituye a la rotación como eje de navegación
   * en defensa — la rotación no manda nada ahí. Sin efecto en recepción. */
  readonly casoActivo = signal<CasoColocador>('delantero');
  /** Situación de ataque activa (spec 038, sustituye a `viaActiva` de la spec 021). */
  readonly situacionActiva = signal<SituacionDefensa>('z4');
  /** Número de bloqueadores de la variante activa (spec 039). Siempre 0 en la situación inicial. */
  readonly bloqueadoresActivos = signal<NumeroBloqueadores>(0);
  readonly borrador = signal<readonly ColocacionBorrador[]>([]);
  /** Retoque de la sombra de bloqueo en edición (spec 040): `null` si nunca se ha desplazado.
   * Se carga desde `VarianteDefensa.desplazamientoSombra` al cambiar de contexto, igual que
   * `borrador` se carga desde la formación guardada — pero es un desplazamiento, no una lista de
   * colocaciones, así que necesita su propia signal. */
  readonly desplazamientoSombraEdicion = signal<Punto | null>(null);
  /** Punto en edición de la ficha "A" del atacante (spec 072): igual criterio que
   * `desplazamientoSombraEdicion`, cargado desde `VarianteDefensa.marcadorAtacante` al cambiar
   * de contexto. `null` mientras no se haya soltado nunca fuera del punto canónico. */
  readonly marcadorAtacanteEdicion = signal<Punto | null>(null);
  /** Punto en edición de la ficha del central rival (spec 073): mismo criterio que
   * `marcadorAtacanteEdicion`, cargado desde `VarianteDefensa.marcadorCentral`. Sin punto por
   * defecto — `null` hasta que el entrenador lo arrastra la primera vez en esa variante. */
  readonly marcadorCentralEdicion = signal<Punto | null>(null);
  readonly cambioPendiente = signal<CambioPendiente | null>(null);
  readonly jugadorSeleccionadoId = signal<string | null>(null);
  readonly validacionDesactivada = signal(false);
  readonly ayudaPosicionDesactivada = signal(false);
  /** Escala del ancho de la sombra del bloqueo, 0-10 en enteros (spec 044, rango corregido por
   * la 045): puramente de pantalla, ajuste global de la app, nunca viaja al servidor. Escala
   * solo el eje lateral (ancho) del polígono, nunca su profundidad. 5 hasta que se cargan los
   * ajustes guardados. */
  readonly escalaSombra = signal(5);
  /** Cuándo se avisó por última vez para instalar la app (ISO 8601), o `null` si nunca. Vive
   * aquí solo porque comparte el mismo blob de `Ajustes`/localStorage que el resto de esta
   * clase; quien lee y decide si avisar de nuevo es `InstalacionStore`. */
  readonly ultimoAvisoInstalacion = signal<string | null>(null);
  /** Último fallo al escribir, con un reintento explícito (spec 034). `null` cuando no hay
   * ningún aviso pendiente — ni al arrancar, ni tras un reintento que tuvo éxito, ni tras
   * cerrarlo a mano. */
  readonly errorGuardado = signal<{
    readonly mensaje: string;
    readonly reintentar: () => void;
  } | null>(null);

  /** Solo los sistemas del equipo activo (spec 032): dos entrenadores nunca ven mezclados los
   * sistemas del otro equipo. */
  readonly catalogo = computed(() =>
    ordenarCatalogo(this.sistemas().filter((sistema) => sistema.equipoId === this.equipoActivo())),
  );

  readonly sistemaActivo = computed(
    () => this.sistemas().find((s) => s.id === this.sistemaActivoId()) ?? null,
  );
  /** "borrador" o "validado" del sistema activo (spec 051). Ausente en el sistema equivale a
   * "borrador" — ver `estadoDe`. */
  readonly estadoActivo = computed(() => {
    const sistema = this.sistemaActivo();
    return sistema ? estadoDe(sistema) : 'borrador';
  });

  /**
   * Quién juega de verdad en la rotación activa — los seis titulares, o el líbero en su lugar
   * donde corresponda (spec 011). Sustituye a lo que antes era `ordenActivo` (el orden de
   * saque en crudo): colocar, validar y el banquillo necesitan siempre esto, nunca los seis
   * titulares fijos sin más.
   */
  readonly posicionesActivas = computed<OrdenSaque | null>(() => {
    const sistema = this.sistemaActivo();
    return sistema ? jugadoresEnPista(sistema.plantilla, this.rotacionActiva()) : null;
  });

  /** La variante de defensa activa: (caso, situación, bloqueadores) — spec 038, ampliado por la
   * 039. `undefined` si esa combinación nunca se ha guardado. */
  private readonly varianteDefensaActiva = computed(() =>
    this.sistemaActivo()?.defensas?.find(
      (v) =>
        v.caso === this.casoActivo() &&
        v.situacion === this.situacionActiva() &&
        v.bloqueadores === this.bloqueadoresActivos(),
    ),
  );

  /** Recepción lee `sistema.formaciones[rotacion]`; defensa lee la variante activa por
   * (caso, situación, bloqueadores) (spec 038) — son dos claves de guardado distintas para el
   * mismo borrador en edición. */
  readonly formacionGuardadaActiva = computed<readonly ColocacionBorrador[]>(() => {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return [];
    }
    if (sistema.tipo === 'defensa') {
      // spec 042: una variante nunca guardada nace ya colocada (la defensa de referencia de su
      // situación, o la postura base en `inicial`/`z1`), no vacía.
      return (
        this.varianteDefensaActiva()?.formacion ??
        formacionDefensaPorDefecto(this.situacionActiva(), this.bloqueadoresActivos())
      );
    }
    return sistema.formaciones[this.rotacionActiva()] ?? [];
  });

  readonly hayCambiosSinGuardar = computed(
    () => !formacionesIguales(this.borrador(), this.formacionGuardadaActiva()),
  );

  /**
   * `null` si falta completar el borrador, si la validación está desactivada (spec 017), o si
   * el sistema activo es de defensa: ahí la validación posicional no existe, no es un ajuste que
   * se pueda desactivar (spec 021). `puedeGuardar` no depende de este resultado para esos casos
   * — ver más abajo.
   */
  readonly resultadoValidacion = computed(() => {
    if (this.validacionDesactivada() || this.sistemaActivo()?.tipo === 'defensa') {
      return null;
    }
    const posiciones = this.posicionesActivas();
    // Fuera de defensa el borrador siempre contiene `Colocacion` (con `jugador`), nunca puestos.
    const borrador = this.borrador() as Formacion;
    return posiciones && borrador.length === 6 ? validarFormacion(borrador, posiciones) : null;
  });

  readonly puedeGuardar = computed(() => {
    if (this.sistemaActivo()?.tipo === 'defensa' || this.validacionDesactivada()) {
      return this.borrador().length === 6;
    }
    return this.resultadoValidacion()?.infracciones.length === 0;
  });

  /** La explicación de conjunto de la rotación (recepción) o de la variante activa (defensa,
   * spec 038: en defensa la explicación de conjunto va por caso y situación, no por rotación). */
  readonly explicacionRotacionActiva = computed(() => {
    const sistema = this.sistemaActivo();
    if (sistema?.tipo === 'defensa') {
      return this.varianteDefensaActiva()?.explicacion ?? '';
    }
    return sistema?.explicacionesRotacion[this.rotacionActiva()] ?? '';
  });

  /** Descripción general del sistema activo, independiente de la rotación (spec 025). */
  readonly descripcionSistemaActivo = computed(() => this.sistemaActivo()?.descripcion ?? '');

  readonly explicacionJugadorSeleccionado = computed(() => {
    const id = this.jugadorSeleccionadoId();
    if (!id) {
      return '';
    }
    return this.formacionGuardadaActiva().find((c) => idDe(c) === id)?.explicacion ?? '';
  });

  readonly explicacionMostrada = computed(() =>
    this.jugadorSeleccionadoId()
      ? this.explicacionJugadorSeleccionado()
      : this.explicacionRotacionActiva(),
  );

  /**
   * Celdas efectivas del jugador seleccionado (spec 024): las que ya tenga pintadas, o si no
   * tiene ninguna, el bloque de 1 m² por defecto en su posición — que por eso sigue a la ficha
   * mientras no se pinte ni se borre nada suyo — spec 024, E5, **retirado por la spec 047**: ya
   * no hay bloque por defecto, ni aquí ni al pintar/borrar la primera celda; empieza vacía,
   * igual que ya hacía la zona de finta (spec 041, E8). Solo existe en defensa: en recepción la
   * zona de responsabilidad no se pinta (E1), aunque haya quedado guardada de antes (E2).
   */
  readonly celdasJugadorSeleccionado = computed<readonly Celda[]>(() => {
    const id = this.jugadorSeleccionadoId();
    if (!id || this.sistemaActivo()?.tipo !== 'defensa') {
      return [];
    }
    const colocacion = this.borrador().find((c) => idDe(c) === id);
    if (!colocacion) {
      return [];
    }
    return colocacion.celdas ?? [];
  });

  /** Celdas de finta del puesto seleccionado (spec 041): a diferencia de `celdasJugadorSeleccionado`
   * nunca aplica el bloque por defecto de la spec 024 — una zona de finta empieza siempre vacía. */
  readonly celdasFintaJugadorSeleccionado = computed<readonly Celda[]>(() => {
    const id = this.jugadorSeleccionadoId();
    if (!id || this.sistemaActivo()?.tipo !== 'defensa') {
      return [];
    }
    return this.borrador().find((c) => idDe(c) === id)?.celdasFinta ?? [];
  });

  /** Qué hace arrastrar sobre el campo (spec 044, reemplaza el interruptor on/off de la 041;
   * tri-estado desde la spec 045): `'pintar'` pinta el trazo, incluso bajo la sombra; `'mover'`
   * deja arrastrar la sombra para retocarla y no pinta nada al arrastrar el resto del campo;
   * `null` dinamita las dos cosas — el arrastre no hace nada. `'pintar'` por defecto. */
  readonly accionArrastre = signal<'pintar' | 'mover' | null>('pintar');

  /** Si hay algún bloqueador que mover (spec 045, E5-E7): la postura inicial siempre tiene 0
   * (spec 039-E4), así que queda cubierta por esta misma condición sin caso aparte. */
  readonly puedeMoverBloqueo = computed(() => this.bloqueadoresActivos() > 0);

  /** Qué conjunto de celdas pinta o borra `pintarCelda`/`borrarCelda` (spec 041): la zona de
   * defensa de siempre, o la zona de finta, paralela. */
  readonly modoPintado = signal<'defensa' | 'finta'>('defensa');

  /** Qué equipos pidió el último `cargar()` (spec 064), para que `refrescarCatalogo` (spec 065)
   * vuelva a pedir exactamente esos. */
  private equiposCargados: readonly EquipoId[] | undefined;

  constructor(
    private readonly repositorio: SistemaRepository,
    private readonly ajustesRepositorio?: AjustesRepository,
  ) {}

  /**
   * Ejecuta una escritura contra el repositorio; el estado local solo cambia si `accion`
   * termina bien —nada de UI optimista (spec 031)—, así que un fallo nunca dice "guardado"
   * sobre algo que no llegó al servidor. Si falla, `errorGuardado` recoge el motivo y
   * `reintentar` — que cada llamador pasa como "vuelve a intentar esta misma operación desde el
   * principio", nunca como "reanuda a medias" — para que el entrenador decida si reintentar o
   * cerrar el aviso sin perder lo que tenía a medio hacer (spec 034).
   */
  private async ejecutarEscritura(
    accion: () => Promise<void>,
    reintentar: () => void,
  ): Promise<boolean> {
    try {
      await accion();
      this.errorGuardado.set(null);
      return true;
    } catch (error) {
      this.errorGuardado.set({ mensaje: mensajeDeError(error), reintentar });
      return false;
    }
  }

  /** Cierra el aviso de fallo sin reintentar (spec 034, E8): no aplica el cambio, pero tampoco
   * descarta el trabajo sin guardar — solo dice "cerrado". */
  cerrarError(): void {
    this.errorGuardado.set(null);
  }

  /** Carga el catálogo y los ajustes (spec 031). Se llama una vez, antes de que se muestre la
   * pizarra — `app.config.ts` la dispara con `provideAppInitializer` — para que ningún consumidor
   * vea nunca el estado a medio poblar. */
  async cargar(equipos?: readonly EquipoId[]): Promise<void> {
    // `equipos` (spec 064) acota qué catálogos se piden y fija el equipo activo inicial en el
    // primero — una cuenta con acceso solo a femenino nunca descarga el masculino ni arranca
    // en él. Sin el argumento (los tests que no lo pasan), comportamiento de antes de la 064:
    // los dos equipos, masculino activo.
    this.equiposCargados = equipos;
    if (equipos && equipos.length > 0 && !equipos.includes(this.equipoActivo())) {
      this.equipoActivo.set(equipos[0]);
    }
    this.sistemas.set(ordenarCatalogo(await this.repositorio.listar(equipos)));
    // `this.catalogo()` sale ya filtrado por `equipoActivo`, así que el primero que active es el
    // primero de ESE equipo (spec 032).
    this.sistemaActivoId.set(this.catalogo()[0]?.id ?? null);
    const ajustes = await this.ajustesRepositorio?.leer();
    this.validacionDesactivada.set(ajustes?.validacionDesactivada ?? false);
    this.ayudaPosicionDesactivada.set(ajustes?.ayudaPosicionDesactivada ?? false);
    this.escalaSombra.set(ajustes?.escalaSombra ?? 5);
    this.ultimoAvisoInstalacion.set(ajustes?.ultimoAvisoInstalacion ?? null);
    this.cambiarContexto();
  }

  /** Vuelve a pedir el catálogo al servidor sin tocar los ajustes ni el arranque (spec 065): lo
   * llama `Tablero` al abrir el Editor, y `TeoriaStore`/`ExamenStore` heredan el refresco porque
   * derivan de `sistemas()`. A diferencia de `cargar()`:
   * - conserva el sistema activo si sigue en el catálogo; si otro entrenador lo borró, cae al
   *   primero, igual que al borrar uno desde esta misma sesión (E4, E6);
   * - si hay una edición sin guardar, NO recarga el borrador — el catálogo se refresca por
   *   debajo pero la formación en curso se queda intacta (E5). */
  async refrescarCatalogo(): Promise<void> {
    const equipos = this.equiposCargados;
    const activoAntes = this.sistemaActivoId();
    this.sistemas.set(ordenarCatalogo(await this.repositorio.listar(equipos)));
    const sigueExistiendo = this.catalogo().some((s) => s.id === activoAntes);
    if (!sigueExistiendo) {
      this.sistemaActivoId.set(this.catalogo()[0]?.id ?? null);
    }
    if (!this.hayCambiosSinGuardar()) {
      this.cambiarContexto();
    }
  }

  /** Ver/ocultar faltas y avisos: desactivarla permite guardar cualquier formación completa (spec 017). */
  async alternarValidacion(): Promise<void> {
    const valor = !this.validacionDesactivada();
    this.validacionDesactivada.set(valor);
    await this.guardarAjustes();
  }

  /** Ver/ocultar la ayuda de posición rotacional (P1..P6) bajo cada ficha. */
  async alternarAyudaPosicion(): Promise<void> {
    const valor = !this.ayudaPosicionDesactivada();
    this.ayudaPosicionDesactivada.set(valor);
    await this.guardarAjustes();
  }

  /** Cambia a qué escala se dibuja el ancho de la sombra del bloqueo (spec 044, E6-E9; rango
   * corregido por la 045, E8-E10): un entero entre 0 y 10, recortado a ese rango. Puramente de
   * pantalla — nunca toca ninguna variante guardada. */
  async cambiarEscalaSombra(valor: number): Promise<void> {
    this.escalaSombra.set(Math.round(Math.max(0, Math.min(10, valor))));
    await this.guardarAjustes();
  }

  /** Registra el aviso de instalación de hoy, para que `InstalacionStore` no vuelva a
   * disparar hasta pasados 7 días (spec posterior a la 067). */
  async registrarAvisoInstalacion(fecha: string): Promise<void> {
    this.ultimoAvisoInstalacion.set(fecha);
    await this.guardarAjustes();
  }

  /** Solo toca el ajuste global (spec 031): nunca reescribe el catálogo de sistemas. */
  private async guardarAjustes(): Promise<void> {
    await this.ajustesRepositorio?.guardar({
      validacionDesactivada: this.validacionDesactivada(),
      ayudaPosicionDesactivada: this.ayudaPosicionDesactivada(),
      escalaSombra: this.escalaSombra(),
      ultimoAvisoInstalacion: this.ultimoAvisoInstalacion(),
    });
  }

  activarSistema(id: string): void {
    if (id === this.sistemaActivoId()) {
      return;
    }
    if (this.hayCambiosSinGuardar()) {
      this.cambioPendiente.set({ tipo: 'sistema', valor: id });
      return;
    }
    this.sistemaActivoId.set(id);
    this.rotacionActiva.set(1);
    this.cambiarContexto();
  }

  /** Cambia de equipo, con el mismo aviso de cambios sin guardar que cambiar de rotación, de vía
   * o de sistema (spec 032). */
  seleccionarEquipo(equipoId: EquipoId): void {
    if (equipoId === this.equipoActivo()) {
      return;
    }
    if (this.hayCambiosSinGuardar()) {
      this.cambioPendiente.set({ tipo: 'equipo', valor: equipoId });
      return;
    }
    this.cambiarEquipo(equipoId);
  }

  /** Cambia el equipo activo y activa el primero de su catálogo, o ninguno si está vacío. Lo
   * usan tanto `seleccionarEquipo` (cambio directo) como `confirmarCambio` (cambio pendiente). */
  private cambiarEquipo(equipoId: EquipoId): void {
    this.equipoActivo.set(equipoId);
    const primero =
      ordenarCatalogo(this.sistemas().filter((sistema) => sistema.equipoId === equipoId))[0] ??
      null;
    this.sistemaActivoId.set(primero?.id ?? null);
    this.rotacionActiva.set(1);
    this.cambiarContexto();
  }

  /** Cambia el caso del colocador rival activo (spec 038, sustituye a la rotación en defensa).
   * La situación se conserva si sigue existiendo para el caso nuevo, y si no, cae en la inicial
   * (E5); los bloqueadores se reinician a 0 porque son una variante de la (caso, situación)
   * anterior, no de la nueva. */
  seleccionarCaso(caso: CasoColocador): void {
    if (caso === this.casoActivo()) {
      return;
    }
    if (this.hayCambiosSinGuardar()) {
      this.cambioPendiente.set({ tipo: 'caso', valor: caso });
      return;
    }
    this.casoActivo.set(caso);
    this.situacionActiva.set(situacionTrasCambioDeCaso(this.situacionActiva(), caso));
    this.bloqueadoresActivos.set(0);
    this.cambiarContexto();
  }

  seleccionarSituacion(situacion: SituacionDefensa): void {
    if (situacion === this.situacionActiva()) {
      return;
    }
    if (this.hayCambiosSinGuardar()) {
      this.cambioPendiente.set({ tipo: 'situacion', valor: situacion });
      return;
    }
    this.situacionActiva.set(situacion);
    this.bloqueadoresActivos.set(0);
    this.cambiarContexto();
  }

  /** Cambia el número de bloqueadores de la variante activa (spec 039). */
  seleccionarBloqueadores(bloqueadores: NumeroBloqueadores): void {
    if (bloqueadores === this.bloqueadoresActivos()) {
      return;
    }
    if (this.hayCambiosSinGuardar()) {
      this.cambioPendiente.set({ tipo: 'bloqueadores', valor: bloqueadores });
      return;
    }
    this.bloqueadoresActivos.set(bloqueadores);
    this.cambiarContexto();
  }

  seleccionarRotacion(rotacion: RotacionValida): void {
    if (rotacion === this.rotacionActiva()) {
      return;
    }
    if (this.hayCambiosSinGuardar()) {
      this.cambioPendiente.set({ tipo: 'rotacion', valor: rotacion });
      return;
    }
    this.rotacionActiva.set(rotacion);
    this.cambiarContexto();
  }

  confirmarCambio(): void {
    const pendiente = this.cambioPendiente();
    if (!pendiente) {
      return;
    }
    this.cambioPendiente.set(null);
    if (pendiente.tipo === 'rotacion') {
      this.rotacionActiva.set(pendiente.valor);
    } else if (pendiente.tipo === 'caso') {
      this.casoActivo.set(pendiente.valor);
      this.situacionActiva.set(situacionTrasCambioDeCaso(this.situacionActiva(), pendiente.valor));
      this.bloqueadoresActivos.set(0);
    } else if (pendiente.tipo === 'situacion') {
      this.situacionActiva.set(pendiente.valor);
      this.bloqueadoresActivos.set(0);
    } else if (pendiente.tipo === 'bloqueadores') {
      this.bloqueadoresActivos.set(pendiente.valor);
    } else if (pendiente.tipo === 'equipo') {
      this.cambiarEquipo(pendiente.valor); // ya llama a cambiarContexto()
      return;
    } else {
      this.sistemaActivoId.set(pendiente.valor);
      this.rotacionActiva.set(1);
    }
    this.cambiarContexto();
  }

  seleccionarJugador(jugadorId: string): void {
    this.jugadorSeleccionadoId.update((actual) => (actual === jugadorId ? null : jugadorId));
  }

  /** Selecciona a `jugadorId` directamente, sin toggle (spec 027): a diferencia de
   * `seleccionarJugador`, no deselecciona si ya era el seleccionado. Se usa al terminar un
   * arrastre que coloca una ficha, para que quede señalada. */
  enfocarJugador(jugadorId: string): void {
    this.jugadorSeleccionadoId.set(jugadorId);
  }

  /** Limpia la selección (spec 027): se usa al pinchar el fondo de la pista cuando no tiene ya
   * otro trabajo asignado (pintar zona, en defensa). */
  deseleccionarJugador(): void {
    this.jugadorSeleccionadoId.set(null);
  }

  /** Crea un sistema en cada uno de `equiposId` (spec 032, ampliado por la 048 a más de un
   * equipo a la vez): una copia independiente por equipo, mismo nombre y tipo, cada una editable
   * después por separado — igual que crear y clonar a mano al otro equipo. Todo o nada (spec
   * 048, E3): si el nombre colisiona en cualquiera de los equipos marcados, no se crea ninguna.
   * El equipo activo pasa a ser el primero de la lista, para que su copia se vea de inmediato
   * (E4). Si falla al escribir (spec 034), no queda ni rastro local del intento — reintentar
   * vuelve a generar ids nuevos, así que dos intentos que ambos lleguen al servidor (uno cuya
   * respuesta se perdió por la red, y su reintento) crearían copias de más en vez de una por
   * equipo; es un límite conocido, ya existía con un único equipo y no lo resuelve esta spec. */
  async crear(nombre: string, tipo: TipoSistema, equiposId: readonly EquipoId[]): Promise<boolean> {
    if (equiposId.length === 0) {
      return false;
    }
    const nuevos: Sistema[] = [];
    for (const equipoId of equiposId) {
      const nuevo = crearSistema(crypto.randomUUID(), nombre, tipo, equipoId, PLANTILLA_GLOBAL, [
        ...this.sistemas(),
        ...nuevos,
      ]);
      if (!nuevo) {
        return false;
      }
      nuevos.push(nuevo);
    }
    return this.ejecutarEscritura(
      async () => {
        for (const nuevo of nuevos) {
          await this.repositorio.crear(nuevo);
        }
        this.sistemas.update((lista) => [...lista, ...nuevos]);
        this.equipoActivo.set(equiposId[0]);
        this.sistemaActivoId.set(nuevos[0].id);
        this.rotacionActiva.set(1);
        this.cambiarContexto();
      },
      () => void this.crear(nombre, tipo, equiposId),
    );
  }

  /**
   * Duplica el sistema activo bajo un nombre nuevo, en uno o en los dos equipos (spec 026, spec
   * 063). Una copia independiente por equipo marcado — mismo patrón "todo o nada" que `crear`
   * desde la spec 048: se validan las `n` copias antes de tocar el repositorio, y si el nombre
   * choca en cualquiera de los equipos marcados no se crea nada en ninguno.
   *
   * Queda activa la copia del equipo del original si estaba marcado; si no (se clonó solo al
   * otro equipo), la del primer equipo marcado, y el equipo activo salta a ese (spec 063, E3/E11).
   *
   * Límite heredado de `crear` (spec 034/048): si la escritura falla a mitad de un clonado a dos
   * equipos y el entrenador reintenta, el reintento genera ids nuevos; si una copia ya había
   * llegado al servidor, queda una de más en ese equipo.
   */
  async clonar(nombre: string, equiposId: readonly EquipoId[]): Promise<boolean> {
    const sistema = this.sistemaActivo();
    if (!sistema || equiposId.length === 0) {
      return false;
    }
    const clones: Sistema[] = [];
    for (const equipoId of equiposId) {
      const clon = clonarSistema(sistema, crypto.randomUUID(), nombre, equipoId, [
        ...this.sistemas(),
        ...clones,
      ]);
      if (!clon) {
        return false;
      }
      clones.push(clon);
    }
    const equipoTrasClonar = equiposId.includes(sistema.equipoId) ? sistema.equipoId : equiposId[0];
    const clonActivo = clones.find((clon) => clon.equipoId === equipoTrasClonar) as Sistema;
    return this.ejecutarEscritura(
      async () => {
        for (const clon of clones) {
          await this.repositorio.crear(clon);
        }
        this.sistemas.update((lista) => [...lista, ...clones]);
        this.equipoActivo.set(equipoTrasClonar);
        this.sistemaActivoId.set(clonActivo.id);
        this.rotacionActiva.set(1);
        this.cambiarContexto();
      },
      () => void this.clonar(nombre, equiposId),
    );
  }

  /** Exporta un sistema del catálogo (spec 071), por id — nunca depende del sistema o el equipo
   * activo en el editor (E11): el admin puede exportar cualquiera sin cambiar lo que tiene
   * abierto. `null` si `id` no existe. La UI decide qué hacer con el JSON (descargarlo). */
  exportar(id: string): string | null {
    const sistema = this.sistemas().find((s) => s.id === id);
    return sistema ? serializarSistema(sistema) : null;
  }

  /**
   * Importa un sistema desde un JSON exportado (spec 071): siempre crea un sistema nuevo, nunca
   * sobrescribe uno existente. `equipoId` lo elige quien importa, nunca el que trae el JSON
   * (E7). Si el nombre resultante choca en `(equipoId, tipo)`, no crea nada y devuelve
   * `'conflicto'` — la UI puede reintentar con `nombreNuevo` (E5/E6). `'invalido'` si el texto
   * no es un sistema serializado válido (E8); nunca lanza.
   */
  async importar(
    json: string,
    equipoId: EquipoId,
    nombreNuevo?: string,
  ): Promise<'ok' | 'conflicto' | 'invalido'> {
    const sistemaImportado = parsearSistemaImportado(json);
    if (!sistemaImportado) {
      return 'invalido';
    }
    const nuevo = importarSistema(
      sistemaImportado,
      crypto.randomUUID(),
      equipoId,
      this.sistemas(),
      nombreNuevo,
    );
    if (!nuevo) {
      return 'conflicto';
    }
    await this.ejecutarEscritura(
      async () => {
        await this.repositorio.crear(nuevo);
        this.sistemas.update((lista) => [...lista, nuevo]);
      },
      () => void this.importar(json, equipoId, nombreNuevo),
    );
    return 'ok';
  }

  async renombrarActivo(nombre: string): Promise<boolean> {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return false;
    }
    const actualizado = renombrarSistema(sistema, nombre, this.sistemas());
    if (!actualizado) {
      return false;
    }
    return this.reemplazarSistema(actualizado, () => void this.renombrarActivo(nombre));
  }

  /** A quién sustituye el líbero del sistema activo, en una rotación concreta (spec 017). */
  async cambiarSustitutoLibero(
    rotacion: RotacionValida,
    sustituidoId: string | null,
  ): Promise<void> {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return;
    }
    const actualizado = cambiarSustitutoLibero(sistema, rotacion, sustituidoId);
    const exito = await this.reemplazarSistema(
      actualizado,
      () => void this.cambiarSustitutoLibero(rotacion, sustituidoId),
    );
    if (exito) {
      this.borrador.set(this.formacionGuardadaActiva());
    }
  }

  async borrar(id: string): Promise<void> {
    await this.ejecutarEscritura(
      async () => {
        await this.repositorio.borrar(id);
        this.sistemas.update((lista) => borrarSistema(lista, id));
        if (this.sistemaActivoId() === id) {
          const primero = ordenarCatalogo(this.sistemas())[0] ?? null;
          this.sistemaActivoId.set(primero?.id ?? null);
          this.rotacionActiva.set(1);
          this.cambiarContexto();
        }
      },
      () => void this.borrar(id),
    );
  }

  /** Valida o quita la validación del sistema activo (spec 051). El servidor decide si quien
   * pregunta tiene permiso — si lo rechaza, `errorGuardado` recoge el motivo igual que
   * cualquier otra escritura. */
  async cambiarEstadoActivo(estado: EstadoSistema): Promise<void> {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return;
    }
    await this.ejecutarEscritura(
      async () => {
        await this.repositorio.cambiarEstado(sistema.id, estado);
        this.sistemas.update((lista) =>
          lista.map((s) => (s.id === sistema.id ? { ...s, estado } : s)),
        );
      },
      () => void this.cambiarEstadoActivo(estado),
    );
  }

  async guardarExplicacion(texto: string): Promise<void> {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return;
    }
    const ocupanteId = this.jugadorSeleccionadoId();
    let actualizado: Sistema | null;
    if (sistema.tipo === 'defensa') {
      const puesto = ocupanteId === null ? null : SistemaStore.puestoDeId(ocupanteId);
      actualizado =
        puesto !== null
          ? explicarPuesto(
              sistema,
              this.casoActivo(),
              this.situacionActiva(),
              this.bloqueadoresActivos(),
              puesto,
              texto,
            )
          : explicarVariante(
              sistema,
              this.casoActivo(),
              this.situacionActiva(),
              this.bloqueadoresActivos(),
              texto,
            );
    } else {
      actualizado = ocupanteId
        ? explicarJugador(sistema, this.rotacionActiva(), ocupanteId, texto)
        : explicarRotacion(sistema, this.rotacionActiva(), texto);
    }
    if (!actualizado) {
      return;
    }
    await this.reemplazarSistema(actualizado, () => void this.guardarExplicacion(texto));
  }

  /** Cambia la descripción general del sistema activo (spec 025). */
  async guardarDescripcion(texto: string): Promise<void> {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return;
    }
    await this.reemplazarSistema(
      describirSistema(sistema, texto),
      () => void this.guardarDescripcion(texto),
    );
  }

  cancelarCambio(): void {
    this.cambioPendiente.set(null);
  }

  /** El puesto de defensa que corresponde a un id sintético `p1`..`p6` (spec 038), o `null` si
   * no tiene esa forma — así `colocarOMover` sabe si `ocupanteId` señala a un jugador (recepción)
   * o a un puesto genérico (defensa) sin que el llamador tenga que decirlo aparte. */
  private static puestoDeId(ocupanteId: string): PuestoDefensa | null {
    const m = /^p([1-6])$/.exec(ocupanteId);
    return m ? (Number(m[1]) as PuestoDefensa) : null;
  }

  /** Ni en recepción ni en defensa dos fichas pueden solaparse (spec posterior a la 045): si el
   * punto de destino queda demasiado cerca de otra ya colocada, se aparta lo mínimo para
   * respetar `DISTANCIA_MINIMA_ENTRE_JUGADORES`, elegida para no abrir nunca un pasillo de luz
   * en la sombra de bloqueo (`separacion.ts`). */
  colocarOMover(ocupanteId: string, punto: Punto): void {
    const puesto = SistemaStore.puestoDeId(ocupanteId);
    if (puesto !== null) {
      this.borrador.update((formacion) => {
        const previa = formacion.find((c) => idDe(c) === ocupanteId) as
          ColocacionDefensa | undefined;
        const resto = formacion.filter((c) => idDe(c) !== ocupanteId);
        const puntoLibre = separarDeOtros(
          punto,
          resto.map((c) => c.punto),
          DISTANCIA_MINIMA_ENTRE_JUGADORES,
        );
        const nueva: ColocacionDefensa = { ...previa, puesto, punto: puntoLibre };
        return [...resto, nueva];
      });
      return;
    }
    const jugador = this.posicionesActivas()?.find((j) => j.id === ocupanteId);
    if (!jugador) {
      return;
    }
    this.borrador.update((formacion) => {
      const previa = formacion.find((c) => idDe(c) === ocupanteId) as Colocacion | undefined;
      const resto = formacion.filter((c) => idDe(c) !== ocupanteId);
      const puntoLibre = separarDeOtros(
        punto,
        resto.map((c) => c.punto),
        DISTANCIA_MINIMA_ENTRE_JUGADORES,
      );
      const nueva: Colocacion = { ...previa, jugador, punto: puntoLibre };
      return [...resto, nueva];
    });
  }

  /** Quita a `ocupanteId` del borrador (jugador en recepción, puesto genérico en defensa). Si
   * era el seleccionado, lo deselecciona (spec 027): no tiene sentido dejar el panel de
   * enseñanza mostrando a alguien que ya no está en la formación. */
  quitar(ocupanteId: string): void {
    this.borrador.update((formacion) => formacion.filter((c) => idDe(c) !== ocupanteId));
    if (this.jugadorSeleccionadoId() === ocupanteId) {
      this.jugadorSeleccionadoId.set(null);
    }
  }

  /** Marca `celda` como responsabilidad de `ocupanteId` (spec 022, extendido a puestos de
   * defensa por la 038). Sin bloque por defecto en ningún modo (spec 024/041, retirado en la
   * zona de defensa por la 047): siempre parte de vacío si todavía no tenía ninguna celda
   * propia. Idempotente: pintar una celda ya suya no la duplica. */
  pintarCelda(ocupanteId: string, celda: Celda): void {
    const campo = this.modoPintado() === 'finta' ? 'celdasFinta' : 'celdas';
    this.borrador.update((formacion) =>
      formacion.map((c) => {
        if (idDe(c) !== ocupanteId) {
          return c;
        }
        const base = c[campo] ?? [];
        if (base.some((existente) => coincide(existente, celda))) {
          return { ...c, [campo]: base };
        }
        return { ...c, [campo]: [...base, celda] };
      }),
    );
  }

  /** Quita `celda` de la responsabilidad de `ocupanteId` (spec 022, extendido a puestos de
   * defensa por la 038, y a la zona de finta por la 041). Sin bloque por defecto en ningún modo
   * (spec 047): sin celdas propias, borrar no hace nada — no hay bloque del que partir para
   * quitar una. Idempotente. */
  borrarCelda(ocupanteId: string, celda: Celda): void {
    const campo = this.modoPintado() === 'finta' ? 'celdasFinta' : 'celdas';
    this.borrador.update((formacion) =>
      formacion.map((c) => {
        if (idDe(c) !== ocupanteId) {
          return c;
        }
        const base = c[campo] ?? [];
        return { ...c, [campo]: base.filter((existente) => !coincide(existente, celda)) };
      }),
    );
  }

  /** Elige qué hace arrastrar sobre el campo (spec 044, E1-E4; deseleccionable desde la 045,
   * E1-E4): clicar la opción ya activa la apaga, dejando la acción en `null`. "Mover bloqueo"
   * se ignora sin bloqueadores que mover (E5, defensa en profundidad — el botón ya sale
   * deshabilitado en la UI, pero el store no confía solo en eso). */
  seleccionarAccionArrastre(accion: 'pintar' | 'mover'): void {
    if (accion === 'mover' && !this.puedeMoverBloqueo()) {
      return;
    }
    this.accionArrastre.set(this.accionArrastre() === accion ? null : accion);
  }

  /** Elige qué conjunto de celdas afectan `pintarCelda`/`borrarCelda` (spec 041, E5). */
  seleccionarModoPintado(modo: 'defensa' | 'finta'): void {
    this.modoPintado.set(modo);
  }

  vaciar(): void {
    this.borrador.set([]);
  }

  /** Guarda la formación en edición (spec 034: si falla, el borrador no se toca — sigue ahí,
   * listo para reintentar o para seguir editando antes de volver a intentarlo). */
  async guardar(): Promise<void> {
    const sistema = this.sistemaActivo();
    if (!sistema || !this.puedeGuardar()) {
      return;
    }
    const guardado =
      sistema.tipo === 'defensa'
        ? guardarVarianteDefensa(
            sistema,
            this.casoActivo(),
            this.situacionActiva(),
            this.bloqueadoresActivos(),
            this.borrador() as FormacionDefensa,
            this.desplazamientoSombraEdicion() ?? undefined,
            this.marcadorAtacanteEdicion() ?? undefined,
            this.marcadorCentralEdicion() ?? undefined,
          )
        : guardarFormacion(
            sistema,
            this.rotacionActiva(),
            this.borrador() as Formacion,
            !this.validacionDesactivada(),
          );
    if (!guardado) {
      return;
    }
    const exito = await this.reemplazarSistema(guardado, () => void this.guardar());
    if (exito) {
      this.borrador.set(this.formacionGuardadaActiva());
      this.desplazamientoSombraEdicion.set(
        this.varianteDefensaActiva()?.desplazamientoSombra ?? null,
      );
      this.marcadorAtacanteEdicion.set(this.varianteDefensaActiva()?.marcadorAtacante ?? null);
      this.marcadorCentralEdicion.set(this.varianteDefensaActiva()?.marcadorCentral ?? null);
    }
  }

  /** Sustituye un sistema en el catálogo por su versión actualizada y persiste solo ese sistema
   * (spec 031): nunca reescribe los demás. Si la escritura falla, el catálogo local no cambia
   * (spec 034) — quien llama decide, con el `boolean` de vuelta, si depende de que triunfara. */
  private async reemplazarSistema(actualizado: Sistema, reintentar: () => void): Promise<boolean> {
    return this.ejecutarEscritura(async () => {
      await this.repositorio.actualizar(actualizado);
      this.sistemas.update((lista) =>
        lista.map((s) => (s.id === actualizado.id ? actualizado : s)),
      );
    }, reintentar);
  }

  /** Recarga el borrador desde lo guardado y deselecciona: se llama al cambiar de rotación o de sistema. */
  private cambiarContexto(): void {
    this.borrador.set(this.formacionGuardadaActiva());
    this.jugadorSeleccionadoId.set(null);
    this.desplazamientoSombraEdicion.set(
      this.varianteDefensaActiva()?.desplazamientoSombra ?? null,
    );
    this.marcadorAtacanteEdicion.set(this.varianteDefensaActiva()?.marcadorAtacante ?? null);
    this.marcadorCentralEdicion.set(this.varianteDefensaActiva()?.marcadorCentral ?? null);
    // spec 045, E6: si "mover bloqueo" deja de tener sentido (0 bloqueadores tras el cambio de
    // contexto), se apaga — y no se reactiva sola si más tarde vuelven a existir bloqueadores.
    if (this.accionArrastre() === 'mover' && !this.puedeMoverBloqueo()) {
      this.accionArrastre.set(null);
    }
  }

  /** Retoca el desplazamiento de la sombra de bloqueo en edición (spec 040, E10): se llama
   * mientras se arrastra, y el valor final se persiste al guardar. */
  desplazarSombra(desplazamiento: Punto): void {
    this.desplazamientoSombraEdicion.set(desplazamiento);
  }

  /** Fija el punto de la ficha "A" del atacante en edición (spec 072, E1): se llama al soltarla
   * dentro de su tercio, y el valor final se persiste al guardar — mismo criterio que
   * `desplazarSombra`. Soltarla fuera del tercio activo no pasa por aquí: cambia de variante
   * (`seleccionarSituacion`), que ya recarga este punto desde la variante nueva. `null` lo quita
   * de la edición (spec 074, E4): vuelve al banquillo rival, sin persistirse hasta que se guarde
   * de nuevo. */
  moverAtacante(punto: Punto | null): void {
    this.marcadorAtacanteEdicion.set(punto);
  }

  /** Fija el punto de la ficha del central rival en edición (spec 073, E1): mismo criterio que
   * `moverAtacante`, pero sin ningún efecto sobre `situacionActiva` — el central rival no deriva
   * ninguna situación, es puramente una referencia visual. `null` lo quita de la edición
   * (spec 074, E4). */
  moverCentral(punto: Punto | null): void {
    this.marcadorCentralEdicion.set(punto);
  }

  /** Descarta el retoque y vuelve a la sombra calculada (spec 040, E13). El desplazamiento
   * guardado no se borra hasta que se guarda de nuevo — igual que cualquier otro cambio en el
   * borrador. */
  recentrarSombra(): void {
    this.desplazamientoSombraEdicion.set(null);
  }
}
