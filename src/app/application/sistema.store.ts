import { computed, signal } from '@angular/core';
import type { Celda, Formacion, OrdenSaque, Punto, Sistema, TipoSistema, ViaAtaque } from '../domain/modelos';
import type { AjustesRepository, SistemaRepository } from '../domain/puertos';
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
  | { readonly tipo: 'via'; readonly valor: ViaAtaque };

function coincide(a: Celda, b: Celda): boolean {
  return a.columna === b.columna && a.fila === b.fila;
}

function celdasIguales(a: readonly Celda[] = [], b: readonly Celda[] = []): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return a.every((celda) => b.some((otra) => coincide(celda, otra)));
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

  readonly catalogo = computed(() => ordenarCatalogo(this.sistemas()));

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
  ) {
    const catalogo = ordenarCatalogo(repositorio.listar());
    this.sistemas.set(catalogo);
    this.sistemaActivoId.set(catalogo[0]?.id ?? null);
    const ajustes = ajustesRepositorio?.leer();
    this.validacionDesactivada.set(ajustes?.validacionDesactivada ?? false);
    this.ayudaPosicionDesactivada.set(ajustes?.ayudaPosicionDesactivada ?? false);
    this.ordenRotacionCronologico.set(ajustes?.ordenRotacionCronologico ?? false);
    this.mostrarNumerosMetros.set(ajustes?.mostrarNumerosMetros ?? false);
    this.cambiarContexto();
  }

  /** Ver/ocultar faltas y avisos: desactivarla permite guardar cualquier formación completa (spec 017). */
  alternarValidacion(): void {
    const valor = !this.validacionDesactivada();
    this.validacionDesactivada.set(valor);
    this.guardarAjustes();
  }

  /** Ver/ocultar la ayuda de posición rotacional (P1..P6) bajo cada ficha. */
  alternarAyudaPosicion(): void {
    const valor = !this.ayudaPosicionDesactivada();
    this.ayudaPosicionDesactivada.set(valor);
    this.guardarAjustes();
  }

  /** Pestañas en orden cronológico de juego (R1, R6, R5, R4, R3, R2) en vez de orden numérico. */
  alternarOrdenRotacion(): void {
    const valor = !this.ordenRotacionCronologico();
    this.ordenRotacionCronologico.set(valor);
    this.guardarAjustes();
  }

  /** Ver/ocultar los números de metros a la izquierda de la rejilla. */
  alternarMostrarNumerosMetros(): void {
    const valor = !this.mostrarNumerosMetros();
    this.mostrarNumerosMetros.set(valor);
    this.guardarAjustes();
  }

  private guardarAjustes(): void {
    this.ajustesRepositorio?.guardar({
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

  crear(nombre: string, tipo: TipoSistema): boolean {
    const id = crypto.randomUUID();
    const nuevo = crearSistema(id, nombre, tipo, PLANTILLA_GLOBAL, this.sistemas());
    if (!nuevo) {
      return false;
    }
    this.sistemas.update((lista) => [...lista, nuevo]);
    this.repositorio.guardar(this.sistemas());
    this.sistemaActivoId.set(id);
    this.rotacionActiva.set(1);
    this.cambiarContexto();
    return true;
  }

  /** Duplica el sistema activo bajo un nombre nuevo y lo deja activo (spec 026). */
  clonar(nombre: string): boolean {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return false;
    }
    const id = crypto.randomUUID();
    const clon = clonarSistema(sistema, id, nombre, this.sistemas());
    if (!clon) {
      return false;
    }
    this.sistemas.update((lista) => [...lista, clon]);
    this.repositorio.guardar(this.sistemas());
    this.sistemaActivoId.set(id);
    this.rotacionActiva.set(1);
    this.cambiarContexto();
    return true;
  }

  renombrarActivo(nombre: string): boolean {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return false;
    }
    const actualizado = renombrarSistema(sistema, nombre, this.sistemas());
    if (!actualizado) {
      return false;
    }
    this.reemplazarSistema(actualizado);
    return true;
  }

  /** A quién sustituye el líbero del sistema activo, en una rotación concreta (spec 017). */
  cambiarSustitutoLibero(rotacion: RotacionValida, sustituidoId: string | null): void {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return;
    }
    this.reemplazarSistema(cambiarSustitutoLibero(sistema, rotacion, sustituidoId));
    this.borrador.set(this.formacionGuardadaActiva());
  }

  borrar(id: string): void {
    this.sistemas.update((lista) => borrarSistema(lista, id));
    this.repositorio.guardar(this.sistemas());
    if (this.sistemaActivoId() === id) {
      const primero = ordenarCatalogo(this.sistemas())[0] ?? null;
      this.sistemaActivoId.set(primero?.id ?? null);
      this.rotacionActiva.set(1);
      this.cambiarContexto();
    }
  }

  guardarExplicacion(texto: string): void {
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
    this.reemplazarSistema(actualizado);
  }

  /** Cambia la descripción general del sistema activo (spec 025). */
  guardarDescripcion(texto: string): void {
    const sistema = this.sistemaActivo();
    if (!sistema) {
      return;
    }
    this.reemplazarSistema(describirSistema(sistema, texto));
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

  guardar(): void {
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
    this.reemplazarSistema(guardado);
    this.borrador.set(this.formacionGuardadaActiva());
  }

  /** Sustituye un sistema en el catálogo por su versión actualizada y persiste. */
  private reemplazarSistema(actualizado: Sistema): void {
    this.sistemas.update((lista) => lista.map((s) => (s.id === actualizado.id ? actualizado : s)));
    this.repositorio.guardar(this.sistemas());
  }

  /** Recarga el borrador desde lo guardado y deselecciona: se llama al cambiar de rotación o de sistema. */
  private cambiarContexto(): void {
    this.borrador.set(this.formacionGuardadaActiva());
    this.jugadorSeleccionadoId.set(null);
  }
}
