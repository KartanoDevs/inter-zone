import { computed, signal } from '@angular/core';
import type { Celda, EquipoId, Formacion, OrdenSaque, Punto, Sistema, TipoSistema, ViaAtaque } from '../domain/modelos';
import { ConflictoDeEdicion, ErrorDelServidor, ErrorDeRed, type AjustesRepository, type SistemaRepository } from '../domain/puertos';
import {
  borrarSistema,
  cambiarSustitutoLibero,
  clonarSistema,
  crearSistema,
  describirSistema,
  ordenarCatalogo,
  renombrarSistema,
} from '../domain/catalogo-sistemas';
import { jugadoresEnPista } from '../domain/rotacion';
import { bloquePorDefecto } from '../domain/rejilla';
import { explicarJugador, explicarRotacion, guardarFormacion } from '../domain/sistema-recepcion';
import { guardarFormacionDefensa } from '../domain/sistema-defensa';
import { validarFormacion } from '../domain/validacion';
import { PLANTILLA_GLOBAL } from '../domain/plantilla-global';

export type RotacionValida = 1 | 2 | 3 | 4 | 5 | 6;

type CambioPendiente =
  | { readonly tipo: 'rotacion'; readonly valor: RotacionValida }
  | { readonly tipo: 'sistema'; readonly valor: string }
  | { readonly tipo: 'via'; readonly valor: ViaAtaque }
  | { readonly tipo: 'equipo'; readonly valor: EquipoId };

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

function formacionesIguales(a: Formacion, b: Formacion): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const colocacionPorId = new Map(b.map((c) => [c.jugador.id, c]));
  return a.every((c) => {
    const otra = colocacionPorId.get(c.jugador.id);
    return (
      otra !== undefined && otra.punto.x === c.punto.x && otra.punto.y === c.punto.y && celdasIguales(c.celdas, otra.celdas)
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
  readonly viaActiva = signal<ViaAtaque>('z4');
  readonly borrador = signal<Formacion>([]);
  readonly cambioPendiente = signal<CambioPendiente | null>(null);
  readonly jugadorSeleccionadoId = signal<string | null>(null);
  readonly validacionDesactivada = signal(false);
  readonly ayudaPosicionDesactivada = signal(false);
  readonly ordenRotacionCronologico = signal(false);
  readonly mostrarNumerosMetros = signal(false);
  /** Último fallo al escribir, con un reintento explícito (spec 034). `null` cuando no hay
   * ningún aviso pendiente — ni al arrancar, ni tras un reintento que tuvo éxito, ni tras
   * cerrarlo a mano. */
  readonly errorGuardado = signal<{ readonly mensaje: string; readonly reintentar: () => void } | null>(null);

  /** Solo los sistemas del equipo activo (spec 032): dos entrenadores nunca ven mezclados los
   * sistemas del otro equipo. */
  readonly catalogo = computed(() =>
    ordenarCatalogo(this.sistemas().filter((sistema) => sistema.equipoId === this.equipoActivo())),
  );

  readonly sistemaActivo = computed(() => this.sistemas().find((s) => s.id === this.sistemaActivoId()) ?? null);

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

  /** Recepción lee `sistema.formaciones[rotacion]`; defensa lee `sistema.defensas[rotacion][vía]`
   * (spec 021) — son dos claves de guardado distintas para el mismo borrador en edición. */
  readonly formacionGuardadaActiva = computed<Formacion>(() => {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return [];
    }
    if (sistema.tipo === 'defensa') {
      return sistema.defensas?.[this.rotacionActiva()]?.[this.viaActiva()] ?? [];
    }
    return sistema.formaciones[this.rotacionActiva()] ?? [];
  });

  readonly hayCambiosSinGuardar = computed(() => !formacionesIguales(this.borrador(), this.formacionGuardadaActiva()));

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
    const borrador = this.borrador();
    return posiciones && borrador.length === 6 ? validarFormacion(borrador, posiciones) : null;
  });

  readonly puedeGuardar = computed(() => {
    if (this.sistemaActivo()?.tipo === 'defensa' || this.validacionDesactivada()) {
      return this.borrador().length === 6;
    }
    return this.resultadoValidacion()?.infracciones.length === 0;
  });

  readonly explicacionRotacionActiva = computed(
    () => this.sistemaActivo()?.explicacionesRotacion[this.rotacionActiva()] ?? '',
  );

  /** Descripción general del sistema activo, independiente de la rotación (spec 025). */
  readonly descripcionSistemaActivo = computed(() => this.sistemaActivo()?.descripcion ?? '');

  readonly explicacionJugadorSeleccionado = computed(() => {
    const id = this.jugadorSeleccionadoId();
    if (!id) {
      return '';
    }
    return this.formacionGuardadaActiva().find((c) => c.jugador.id === id)?.explicacion ?? '';
  });

  readonly explicacionMostrada = computed(() =>
    this.jugadorSeleccionadoId() ? this.explicacionJugadorSeleccionado() : this.explicacionRotacionActiva(),
  );

  /**
   * Celdas efectivas del jugador seleccionado (spec 024): las que ya tenga pintadas, o si no
   * tiene ninguna, el bloque de 1 m² por defecto en su posición — que por eso sigue a la ficha
   * mientras no se pinte ni se borre nada suyo (E5). Solo existe en defensa: en recepción la
   * zona de responsabilidad no se pinta (E1), aunque haya quedado guardada de antes (E2).
   */
  readonly celdasJugadorSeleccionado = computed<readonly Celda[]>(() => {
    const id = this.jugadorSeleccionadoId();
    if (!id || this.sistemaActivo()?.tipo !== 'defensa') {
      return [];
    }
    const colocacion = this.borrador().find((c) => c.jugador.id === id);
    if (!colocacion) {
      return [];
    }
    return colocacion.celdas ?? bloquePorDefecto(colocacion.punto);
  });

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
  private async ejecutarEscritura(accion: () => Promise<void>, reintentar: () => void): Promise<boolean> {
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
  async cargar(): Promise<void> {
    this.sistemas.set(ordenarCatalogo(await this.repositorio.listar()));
    // El equipo activo ya vale su valor por defecto (masculino): `this.catalogo()` sale ya
    // filtrado por él, así que el primero que active es el primero de ESE equipo (spec 032).
    this.sistemaActivoId.set(this.catalogo()[0]?.id ?? null);
    const ajustes = await this.ajustesRepositorio?.leer();
    this.validacionDesactivada.set(ajustes?.validacionDesactivada ?? false);
    this.ayudaPosicionDesactivada.set(ajustes?.ayudaPosicionDesactivada ?? false);
    this.ordenRotacionCronologico.set(ajustes?.ordenRotacionCronologico ?? false);
    this.mostrarNumerosMetros.set(ajustes?.mostrarNumerosMetros ?? false);
    this.cambiarContexto();
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

  /** Pestañas en orden cronológico de juego (R1, R6, R5, R4, R3, R2) en vez de orden numérico. */
  async alternarOrdenRotacion(): Promise<void> {
    const valor = !this.ordenRotacionCronologico();
    this.ordenRotacionCronologico.set(valor);
    await this.guardarAjustes();
  }

  /** Ver/ocultar los números de metros a la izquierda de la rejilla. */
  async alternarMostrarNumerosMetros(): Promise<void> {
    const valor = !this.mostrarNumerosMetros();
    this.mostrarNumerosMetros.set(valor);
    await this.guardarAjustes();
  }

  /** Solo toca el ajuste global (spec 031): nunca reescribe el catálogo de sistemas. */
  private async guardarAjustes(): Promise<void> {
    await this.ajustesRepositorio?.guardar({
      validacionDesactivada: this.validacionDesactivada(),
      ayudaPosicionDesactivada: this.ayudaPosicionDesactivada(),
      ordenRotacionCronologico: this.ordenRotacionCronologico(),
      mostrarNumerosMetros: this.mostrarNumerosMetros(),
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
    const primero = ordenarCatalogo(this.sistemas().filter((sistema) => sistema.equipoId === equipoId))[0] ?? null;
    this.sistemaActivoId.set(primero?.id ?? null);
    this.rotacionActiva.set(1);
    this.cambiarContexto();
  }

  seleccionarVia(via: ViaAtaque): void {
    if (via === this.viaActiva()) {
      return;
    }
    if (this.hayCambiosSinGuardar()) {
      this.cambioPendiente.set({ tipo: 'via', valor: via });
      return;
    }
    this.viaActiva.set(via);
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
    } else if (pendiente.tipo === 'via') {
      this.viaActiva.set(pendiente.valor);
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

  /** Crea un sistema para `equipoId` (spec 032): si es distinto del equipo activo, el equipo
   * activo cambia también, para que el sistema recién creado se vea de inmediato. Si falla al
   * escribir (spec 034), no queda ni rastro local del intento — reintentar vuelve a generar un
   * id nuevo, así que dos intentos que ambos lleguen al servidor (uno cuya respuesta se perdió
   * por la red, y su reintento) crearían dos sistemas en vez de uno; es un límite conocido, no
   * un caso que esta spec resuelva. */
  async crear(nombre: string, tipo: TipoSistema, equipoId: EquipoId): Promise<boolean> {
    const nuevo = crearSistema(crypto.randomUUID(), nombre, tipo, equipoId, PLANTILLA_GLOBAL, this.sistemas());
    if (!nuevo) {
      return false;
    }
    return this.ejecutarEscritura(
      async () => {
        await this.repositorio.crear(nuevo);
        this.sistemas.update((lista) => [...lista, nuevo]);
        this.equipoActivo.set(equipoId);
        this.sistemaActivoId.set(nuevo.id);
        this.rotacionActiva.set(1);
        this.cambiarContexto();
      },
      () => void this.crear(nombre, tipo, equipoId),
    );
  }

  /** Duplica el sistema activo bajo un nombre nuevo y lo deja activo (spec 026). */
  async clonar(nombre: string): Promise<boolean> {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return false;
    }
    const clon = clonarSistema(sistema, crypto.randomUUID(), nombre, this.sistemas());
    if (!clon) {
      return false;
    }
    return this.ejecutarEscritura(
      async () => {
        await this.repositorio.crear(clon);
        this.sistemas.update((lista) => [...lista, clon]);
        this.sistemaActivoId.set(clon.id);
        this.rotacionActiva.set(1);
        this.cambiarContexto();
      },
      () => void this.clonar(nombre),
    );
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
  async cambiarSustitutoLibero(rotacion: RotacionValida, sustituidoId: string | null): Promise<void> {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return;
    }
    const actualizado = cambiarSustitutoLibero(sistema, rotacion, sustituidoId);
    const exito = await this.reemplazarSistema(actualizado, () => void this.cambiarSustitutoLibero(rotacion, sustituidoId));
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

  async guardarExplicacion(texto: string): Promise<void> {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return;
    }
    const jugadorId = this.jugadorSeleccionadoId();
    const actualizado = jugadorId
      ? explicarJugador(sistema, this.rotacionActiva(), jugadorId, texto)
      : explicarRotacion(sistema, this.rotacionActiva(), texto);
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
    await this.reemplazarSistema(describirSistema(sistema, texto), () => void this.guardarDescripcion(texto));
  }

  cancelarCambio(): void {
    this.cambioPendiente.set(null);
  }

  colocarOMover(jugadorId: string, punto: Punto): void {
    const jugador = this.posicionesActivas()?.find((j) => j.id === jugadorId);
    if (!jugador) {
      return;
    }
    this.borrador.update((formacion) => {
      const previa = formacion.find((c) => c.jugador.id === jugadorId);
      return [...formacion.filter((c) => c.jugador.id !== jugadorId), { ...previa, jugador, punto }];
    });
  }

  /** Quita a `jugadorId` del borrador. Si era el seleccionado, lo deselecciona (spec 027): no
   * tiene sentido dejar el panel de enseñanza mostrando a alguien que ya no está en la formación. */
  quitar(jugadorId: string): void {
    this.borrador.update((formacion) => formacion.filter((c) => c.jugador.id !== jugadorId));
    if (this.jugadorSeleccionadoId() === jugadorId) {
      this.jugadorSeleccionadoId.set(null);
    }
  }

  /** Marca `celda` como responsabilidad de `jugadorId` (spec 022). Si todavía no tenía ninguna
   * celda propia, parte del bloque por defecto (spec 024, E6) en vez de partir de vacío — así
   * pintar una celda nueva la añade a lo que ya se veía, no lo sustituye. Idempotente: pintar
   * una celda ya suya no la duplica — para despintarla, ver `borrarCelda`. */
  pintarCelda(jugadorId: string, celda: Celda): void {
    this.borrador.update((formacion) =>
      formacion.map((c) => {
        if (c.jugador.id !== jugadorId) {
          return c;
        }
        const base = c.celdas ?? bloquePorDefecto(c.punto);
        if (base.some((existente) => coincide(existente, celda))) {
          return { ...c, celdas: base };
        }
        return { ...c, celdas: [...base, celda] };
      }),
    );
  }

  /** Quita `celda` de la responsabilidad de `jugadorId` (spec 022). Si todavía no tenía ninguna
   * celda propia, parte del bloque por defecto (spec 024, E7): borrar una de sus celdas la
   * convierte en zona explícita con las que queden, en vez de no hacer nada. Idempotente. */
  borrarCelda(jugadorId: string, celda: Celda): void {
    this.borrador.update((formacion) =>
      formacion.map((c) => {
        if (c.jugador.id !== jugadorId) {
          return c;
        }
        const base = c.celdas ?? bloquePorDefecto(c.punto);
        return { ...c, celdas: base.filter((existente) => !coincide(existente, celda)) };
      }),
    );
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
        ? guardarFormacionDefensa(sistema, this.rotacionActiva(), this.viaActiva(), this.borrador())
        : guardarFormacion(sistema, this.rotacionActiva(), this.borrador(), !this.validacionDesactivada());
    if (!guardado) {
      return;
    }
    const exito = await this.reemplazarSistema(guardado, () => void this.guardar());
    if (exito) {
      this.borrador.set(this.formacionGuardadaActiva());
    }
  }

  /** Sustituye un sistema en el catálogo por su versión actualizada y persiste solo ese sistema
   * (spec 031): nunca reescribe los demás. Si la escritura falla, el catálogo local no cambia
   * (spec 034) — quien llama decide, con el `boolean` de vuelta, si depende de que triunfara. */
  private async reemplazarSistema(actualizado: Sistema, reintentar: () => void): Promise<boolean> {
    return this.ejecutarEscritura(async () => {
      await this.repositorio.actualizar(actualizado);
      this.sistemas.update((lista) => lista.map((s) => (s.id === actualizado.id ? actualizado : s)));
    }, reintentar);
  }

  /** Recarga el borrador desde lo guardado y deselecciona: se llama al cambiar de rotación o de sistema. */
  private cambiarContexto(): void {
    this.borrador.set(this.formacionGuardadaActiva());
    this.jugadorSeleccionadoId.set(null);
  }
}
