import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Pista, type FichaAgarrada, type FichaVista } from '../pista/pista';
import { SelectorRotacion, type EstadoRotacion } from '../rotaciones/selector-rotacion';
import { PanelValidacion, type ItemValidacion } from '../panel/panel-validacion';
import { PaletaJugadores, type ChipAgarrado, type ChipJugador } from '../panel/paleta-jugadores';
import { PanelEnsenanza } from '../panel/panel-ensenanza';
import { DialogoConfirmacion } from '../comun/dialogo-confirmacion';
import { BarraSistemas, type OpcionSistema } from '../sistemas/barra-sistemas';
import { DialogoSistema, type DatosSistema } from '../sistemas/dialogo-sistema';
import { DialogoAjustes, type OpcionLibero } from '../ajustes/dialogo-ajustes';
import { SistemaStore, type RotacionValida } from '../../application/sistema.store';
import { jugadoresEnPista } from '../../domain/rotacion';
import { validarFormacion } from '../../domain/validacion';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from '../../domain/roles';
import { claveOrdenRol } from '../comun/orden-roles';
import type { Colocacion, Formacion, Infraccion, Jugador, Punto, ResultadoValidacion, RolId } from '../../domain/modelos';

// Orden de las pestañas, no de numeración: R1, R6, R5, R4, R3, R2 es el orden en que el
// colocador recorre P1, P2, P3, P4, P5, P6 (spec 019) — más intuitivo en pantalla que el
// orden cronológico de rotación (R1, R2, R3...), que salta de posición en posición sin
// seguir la red de izquierda a derecha.
const ROTACIONES: readonly RotacionValida[] = [1, 6, 5, 4, 3, 2];

// Límites de arrastre: algo más ajustados que el viewBox de la pista, para que la ficha
// nunca quede recortada por el borde visible (igual que en la maqueta).
const LIMITE_X: readonly [number, number] = [-0.3, 9.3];
const LIMITE_Y: readonly [number, number] = [-3.6, 9.3];

// El arrastre no se arma al primer píxel: hace falta superar este desplazamiento en pantalla
// o mantener pulsado este tiempo, lo que ocurra antes. Mientras no está armado, un
// pointerdown+pointerup sobre una ficha ya en pista cuenta como un toque y selecciona en vez
// de arrastrar (spec 010, E9-E10 vs E12) — el retardo es lo que hace ese toque marcable sin
// que arrastrar la ficha por error.
const RETARDO_ARRASTRE_MS = 150;
const UMBRAL_ARRASTRE_PX = 8;

type DialogoSistemaAbierto = 'crear' | 'editar' | null;

interface Arrastre {
  readonly jugadorId: string;
  readonly etiqueta: string;
  readonly clientX: number;
  readonly clientY: number;
}

function acotar(valor: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, valor));
}

function acotarPunto(punto: Punto): Punto {
  return { x: acotar(punto.x, LIMITE_X), y: acotar(punto.y, LIMITE_Y) };
}

function esLineaDelantera(posicion: number): boolean {
  return posicion === 2 || posicion === 3 || posicion === 4;
}

function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanciaPantalla(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }): number {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

/** Ver docs/arquitectura.md: con fichas solapadas, se busca la más cercana al punto real del toque. */
function colocacionMasCercana(formacion: Formacion, punto: Punto): Colocacion | null {
  return formacion.reduce<Colocacion | null>((mejor, actual) => {
    if (!mejor || distancia(actual.punto, punto) < distancia(mejor.punto, punto)) {
      return actual;
    }
    return mejor;
  }, null);
}

function estadoDe(resultado: ResultadoValidacion | null, jugadorId: string): 'falta' | 'aviso' | 'normal' {
  if (!resultado) {
    return 'normal';
  }
  if (resultado.infracciones.some((inf) => inf.jugadores.some((j) => j.id === jugadorId))) {
    return 'falta';
  }
  if (resultado.avisos.some((av) => av.jugadores.some((j) => j.id === jugadorId))) {
    return 'aviso';
  }
  return 'normal';
}

function itemsDe(items: readonly Infraccion[]): ItemValidacion[] {
  return items.map((item) => ({
    tipo: item.tipo,
    etiquetas: item.jugadores.map((jugador) => etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO)),
  }));
}

/**
 * Shell de la pizarra real: consume `SistemaStore`, que es donde vive toda la lógica. Este
 * componente solo traduce signals a vista, gestiona el arrastre con `PointerEvent`
 * (reutilizando el diseño de `maqueta/tablero.ts`) y distingue un toque de un arrastre para
 * la selección de jugador (spec 010).
 */
@Component({
  selector: 'app-tablero',
  imports: [
    Pista,
    SelectorRotacion,
    PanelValidacion,
    PaletaJugadores,
    PanelEnsenanza,
    DialogoConfirmacion,
    BarraSistemas,
    DialogoSistema,
    DialogoAjustes,
  ],
  templateUrl: './tablero.html',
  styleUrl: './tablero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tablero {
  protected readonly store = inject(SistemaStore);

  protected readonly arrastre = signal<Arrastre | null>(null);
  protected readonly idArrastrada = computed(() => this.arrastre()?.jugadorId ?? null);

  protected readonly dialogoSistema = signal<DialogoSistemaAbierto>(null);
  protected readonly confirmandoBorrado = signal(false);
  protected readonly ajustesAbierto = signal(false);

  private readonly pistaCmp = viewChild.required(Pista);

  protected readonly completo = computed(() => this.store.borrador().length === 6);

  private readonly posicionPorId = computed(() => {
    const posiciones = this.store.posicionesActivas();
    const mapa = new Map<string, number>();
    if (!posiciones) {
      return mapa;
    }
    posiciones.forEach((jugador, indice) => mapa.set(jugador.id, indice + 1));
    return mapa;
  });

  protected readonly esLegal = computed(() => this.store.resultadoValidacion()?.infracciones.length === 0);
  protected readonly infracciones = computed(() => itemsDe(this.store.resultadoValidacion()?.infracciones ?? []));
  protected readonly avisos = computed(() => itemsDe(this.store.resultadoValidacion()?.avisos ?? []));

  protected readonly fichas = computed<readonly FichaVista[]>(() => {
    const resultado = this.store.resultadoValidacion();
    const posicionPorId = this.posicionPorId();
    const seleccionadoId = this.store.jugadorSeleccionadoId();
    return this.store.borrador().map((colocacion) => {
      const posicionRotacional = posicionPorId.get(colocacion.jugador.id) ?? 0;
      return {
        id: colocacion.jugador.id,
        punto: colocacion.punto,
        etiqueta: etiquetaDe(colocacion.jugador, CONFIGURACION_ROLES_POR_DEFECTO),
        posicion: posicionRotacional,
        estado: estadoDe(resultado, colocacion.jugador.id),
        linea: esLineaDelantera(posicionRotacional) ? 'delantera' : 'zaguera',
        esLibero: colocacion.jugador.rol === 'libero',
        seleccionada: colocacion.jugador.id === seleccionadoId,
      };
    });
  });

  protected readonly pendientesChips = computed<readonly ChipJugador[]>(() => {
    const posiciones = this.store.posicionesActivas();
    if (!posiciones) {
      return [];
    }
    const colocadosIds = new Set(this.store.borrador().map((c) => c.jugador.id));
    return posiciones
      .filter((jugador) => !colocadosIds.has(jugador.id))
      .sort((a, b) => claveOrdenRol(a.rol, a.indice) - claveOrdenRol(b.rol, b.indice))
      .map((jugador) => ({ id: jugador.id, etiqueta: etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO) }));
  });

  protected readonly estadosRotacion = computed<readonly EstadoRotacion[]>(() => {
    const sistema = this.store.sistemaActivo();
    if (!sistema) {
      return ROTACIONES.map((rotacion) => ({ rotacion, tieneFalta: false }));
    }
    return ROTACIONES.map((rotacion) => {
      const formacion = sistema.formaciones[rotacion] ?? [];
      const posiciones = jugadoresEnPista(sistema.plantilla, rotacion);
      const tieneFalta = formacion.length === 6 && validarFormacion(formacion, posiciones).infracciones.length > 0;
      return { rotacion, tieneFalta };
    });
  });

  /**
   * Opciones del selector "líbero sustituye a", en el orden pedido para esta pantalla: los
   * dos centrales primero (el caso típico del 5-1), "Ninguno", y el resto de titulares. No
   * es el orden de saque: es una decisión de esta pantalla, no del dominio.
   */
  protected readonly opcionesSustitutoLibero = computed<readonly OpcionLibero[]>(() => {
    const orden = this.store.sistemaActivo()?.plantilla.ordenSaque;
    if (!orden) {
      return [];
    }
    const porRol = (rol: RolId, indice?: 1 | 2): Jugador => orden.find((j) => j.rol === rol && j.indice === indice)!;
    const opcion = (jugador: Jugador): OpcionLibero => ({
      id: jugador.id,
      etiqueta: etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO),
    });
    return [
      opcion(porRol('central', 1)),
      opcion(porRol('central', 2)),
      { id: null, etiqueta: 'Ninguno' },
      opcion(porRol('opuesto')),
      opcion(porRol('receptor', 1)),
      opcion(porRol('receptor', 2)),
      opcion(porRol('colocador')),
    ];
  });

  protected readonly tieneLibero = computed(() => !!this.store.sistemaActivo()?.plantilla.libero);

  protected readonly sustitutoLiberoActual = computed(() => {
    const libero = this.store.sistemaActivo()?.plantilla.libero;
    return libero ? libero.sustitutosPorRotacion[this.store.rotacionActiva()] : null;
  });

  protected readonly opcionesSistema = computed<readonly OpcionSistema[]>(() =>
    this.store.catalogo().map((sistema) => ({ id: sistema.id, nombre: sistema.nombre, tipo: sistema.tipo })),
  );

  protected readonly tituloEnsenanza = computed(() => {
    const base = `Enseñanza · R${this.store.rotacionActiva()}`;
    const seleccionadoId = this.store.jugadorSeleccionadoId();
    if (!seleccionadoId) {
      return base;
    }
    const jugador = this.store.borrador().find((c) => c.jugador.id === seleccionadoId)?.jugador;
    return jugador ? `${base} · ${etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO)}` : base;
  });

  protected seleccionarRotacion(rotacion: number): void {
    this.store.seleccionarRotacion(rotacion as RotacionValida);
  }

  protected elegirSistema(id: string): void {
    this.store.activarSistema(id);
  }

  protected confirmarCambio(): void {
    this.store.confirmarCambio();
  }

  protected cancelarCambio(): void {
    this.store.cancelarCambio();
  }

  protected abrirCrear(): void {
    this.dialogoSistema.set('crear');
  }

  protected abrirEditar(): void {
    if (this.store.sistemaActivo()) {
      this.dialogoSistema.set('editar');
    }
  }

  protected cancelarDialogoSistema(): void {
    this.dialogoSistema.set(null);
  }

  protected confirmarDialogoSistema(datos: DatosSistema): void {
    if (this.dialogoSistema() === 'crear') {
      this.store.crear(datos.nombre, datos.tipo);
    } else {
      this.store.renombrarActivo(datos.nombre);
    }
    this.dialogoSistema.set(null);
  }

  protected pedirBorrado(): void {
    if (this.store.sistemaActivo()) {
      this.confirmandoBorrado.set(true);
    }
  }

  protected cancelarBorrado(): void {
    this.confirmandoBorrado.set(false);
  }

  protected confirmarBorrado(): void {
    const id = this.store.sistemaActivoId();
    this.confirmandoBorrado.set(false);
    if (id) {
      this.store.borrar(id);
    }
  }

  protected guardarExplicacion(texto: string): void {
    this.store.guardarExplicacion(texto);
  }

  protected onAgarrarPaleta(chip: ChipAgarrado): void {
    const jugador = this.store.posicionesActivas()?.find((j) => j.id === chip.id);
    if (!jugador) {
      return;
    }
    this.iniciarArrastre(chip.id, etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO), chip.evento, 'paleta');
  }

  protected abrirAjustes(): void {
    this.ajustesAbierto.set(true);
  }

  protected cerrarAjustes(): void {
    this.ajustesAbierto.set(false);
  }

  protected cambiarSustitutoLibero(sustituidoId: string | null): void {
    this.store.cambiarSustitutoLibero(this.store.rotacionActiva(), sustituidoId);
  }

  protected alternarValidacion(): void {
    this.store.alternarValidacion();
  }

  protected onAgarrarFicha(agarrada: FichaAgarrada): void {
    const borrador = this.store.borrador();
    const punto = this.pistaCmp().puntoDesde(agarrada.evento);
    const colocacion = colocacionMasCercana(borrador, punto) ?? borrador.find((c) => c.jugador.id === agarrada.id);
    if (!colocacion) {
      return;
    }
    this.iniciarArrastre(
      colocacion.jugador.id,
      etiquetaDe(colocacion.jugador, CONFIGURACION_ROLES_POR_DEFECTO),
      agarrada.evento,
      'pista',
    );
  }

  protected vaciarRotacion(): void {
    this.store.vaciar();
  }

  protected guardar(): void {
    this.store.guardar();
  }

  private iniciarArrastre(jugadorId: string, etiqueta: string, evento: PointerEvent, origen: 'paleta' | 'pista'): void {
    evento.preventDefault();
    const inicio = { clientX: evento.clientX, clientY: evento.clientY };
    this.pistaCmp().capturarPuntero(evento);

    let armado = false;

    // Engancha la ficha al puntero: a partir de aquí se ve el fantasma y, si viene de pista,
    // la ficha se trae al frente del DOM sin moverla (colocarOMover reordena al final).
    const armar = (clientX: number, clientY: number): void => {
      if (armado) {
        return;
      }
      armado = true;
      window.clearTimeout(temporizador);
      this.arrastre.set({ jugadorId, etiqueta, clientX, clientY });
      if (origen === 'pista') {
        const colocacion = this.store.borrador().find((c) => c.jugador.id === jugadorId);
        if (colocacion) {
          this.store.colocarOMover(jugadorId, colocacion.punto);
        }
      }
    };

    const temporizador = window.setTimeout(() => armar(inicio.clientX, inicio.clientY), RETARDO_ARRASTRE_MS);

    const mover = (e: PointerEvent): void => {
      if (!armado && distanciaPantalla(inicio, e) > UMBRAL_ARRASTRE_PX) {
        armar(e.clientX, e.clientY);
      }
      if (!armado) {
        return;
      }
      this.arrastre.update((actual) => (actual ? { ...actual, clientX: e.clientX, clientY: e.clientY } : actual));
      if (origen === 'pista' && this.pistaCmp().contiene(e)) {
        this.store.colocarOMover(jugadorId, acotarPunto(this.pistaCmp().puntoDesde(e)));
      }
    };

    const limpiar = (e: PointerEvent): void => {
      window.clearTimeout(temporizador);
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', cancelar);
      this.pistaCmp().liberarPuntero(e);
    };

    const soltar = (e: PointerEvent): void => {
      limpiar(e);
      if (armado) {
        const pista = this.pistaCmp();
        if (pista.contiene(e)) {
          this.store.colocarOMover(jugadorId, acotarPunto(pista.puntoDesde(e)));
        } else if (origen === 'pista') {
          this.store.quitar(jugadorId);
        }
      }
      this.arrastre.set(null);
      // Nunca se armó: es un toque, no un arrastre. Sobre el banquillo no hay nada que
      // seleccionar (spec 010, E9/E10/E12).
      if (origen === 'pista' && !armado) {
        this.store.seleccionarJugador(jugadorId);
      }
    };

    const cancelar = (e: PointerEvent): void => {
      limpiar(e);
      this.arrastre.set(null);
    };

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', cancelar);
  }
}
