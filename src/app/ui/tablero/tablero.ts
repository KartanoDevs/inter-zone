import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Pista, type FichaAgarrada, type FichaVista } from '../pista/pista';
import { SelectorRotacion, type EstadoRotacion } from '../rotaciones/selector-rotacion';
import { PanelValidacion, type ItemValidacion } from '../panel/panel-validacion';
import { PaletaJugadores, type ChipAgarrado, type ChipJugador } from '../panel/paleta-jugadores';
import { PanelEnsenanza } from '../panel/panel-ensenanza';
import { DialogoConfirmacion } from '../comun/dialogo-confirmacion';
import { BarraSistemas, type OpcionSistema } from '../sistemas/barra-sistemas';
import { DialogoSistema, type DatosSistema } from '../sistemas/dialogo-sistema';
import { SistemaStore, type RotacionValida } from '../../application/sistema.store';
import { formacionEnRotacion } from '../../domain/rotacion';
import { validarFormacion } from '../../domain/validacion';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from '../../domain/roles';
import type { Colocacion, Formacion, Infraccion, Punto, ResultadoValidacion } from '../../domain/modelos';

const ROTACIONES: readonly RotacionValida[] = [1, 2, 3, 4, 5, 6];
const POSICIONES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as const;

// Límites de arrastre: algo más ajustados que el viewBox de la pista, para que la ficha
// nunca quede recortada por el borde visible (igual que en la maqueta).
const LIMITE_X: readonly [number, number] = [-0.3, 9.3];
const LIMITE_Y: readonly [number, number] = [-3.6, 9.3];

// Por debajo de este desplazamiento en pantalla, un pointerdown+pointerup sobre una ficha
// cuenta como un toque (selecciona) y no como un arrastre (spec 010, E9-E10 vs E12).
const UMBRAL_TOQUE_PX = 5;

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

function esLineaDelantera(posicion: string): boolean {
  return posicion === 'P2' || posicion === 'P3' || posicion === 'P4';
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

  private readonly pistaCmp = viewChild.required(Pista);

  protected readonly completo = computed(() => this.store.borrador().length === 6);

  private readonly posicionPorId = computed(() => {
    const orden = this.store.ordenActivo();
    const mapa = new Map<string, string>();
    if (!orden) {
      return mapa;
    }
    formacionEnRotacion(orden, this.store.rotacionActiva()).forEach((jugador, indice) => mapa.set(jugador.id, POSICIONES[indice]));
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
      const posicionRotacional = posicionPorId.get(colocacion.jugador.id) ?? '';
      return {
        id: colocacion.jugador.id,
        punto: colocacion.punto,
        etiqueta: etiquetaDe(colocacion.jugador, CONFIGURACION_ROLES_POR_DEFECTO),
        estado: estadoDe(resultado, colocacion.jugador.id),
        linea: esLineaDelantera(posicionRotacional) ? 'delantera' : 'zaguera',
        esLibero: colocacion.jugador.rol === 'libero',
        seleccionada: colocacion.jugador.id === seleccionadoId,
      };
    });
  });

  protected readonly pendientesChips = computed<readonly ChipJugador[]>(() => {
    const orden = this.store.ordenActivo();
    if (!orden) {
      return [];
    }
    const colocadosIds = new Set(this.store.borrador().map((c) => c.jugador.id));
    return orden
      .filter((jugador) => !colocadosIds.has(jugador.id))
      .map((jugador) => ({ id: jugador.id, etiqueta: etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO) }));
  });

  protected readonly estadosRotacion = computed<readonly EstadoRotacion[]>(() => {
    const sistema = this.store.sistemaActivo();
    const orden = this.store.ordenActivo();
    if (!sistema || !orden) {
      return ROTACIONES.map((rotacion) => ({ rotacion, tieneFalta: false }));
    }
    return ROTACIONES.map((rotacion) => {
      const formacion = sistema.formaciones[rotacion] ?? [];
      const tieneFalta = formacion.length === 6 && validarFormacion(formacion, orden, rotacion).infracciones.length > 0;
      return { rotacion, tieneFalta };
    });
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
    const jugador = this.store.ordenActivo()?.find((j) => j.id === chip.id);
    if (!jugador) {
      return;
    }
    this.iniciarArrastre(chip.id, etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO), chip.evento, 'paleta');
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
    // Trae la ficha al frente del DOM (colocarOMover reordena al final) sin moverla.
    this.store.colocarOMover(colocacion.jugador.id, colocacion.punto);
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
    this.arrastre.set({ jugadorId, etiqueta, ...inicio });
    this.pistaCmp().capturarPuntero(evento);

    const mover = (e: PointerEvent): void => {
      this.arrastre.update((actual) => (actual ? { ...actual, clientX: e.clientX, clientY: e.clientY } : actual));
      if (origen === 'pista' && this.pistaCmp().contiene(e)) {
        this.store.colocarOMover(jugadorId, acotarPunto(this.pistaCmp().puntoDesde(e)));
      }
    };

    const limpiar = (e: PointerEvent): void => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', cancelar);
      this.pistaCmp().liberarPuntero(e);
    };

    const soltar = (e: PointerEvent): void => {
      limpiar(e);
      const pista = this.pistaCmp();
      if (pista.contiene(e)) {
        this.store.colocarOMover(jugadorId, acotarPunto(pista.puntoDesde(e)));
      } else if (origen === 'pista') {
        this.store.quitar(jugadorId);
      }
      this.arrastre.set(null);
      // Un desplazamiento mínimo sobre una ficha ya en pista es un toque: selecciona en vez
      // de arrastrar (spec 010, E9/E10/E12). Sobre el banquillo no hay nada que seleccionar.
      if (origen === 'pista' && distanciaPantalla(inicio, e) < UMBRAL_TOQUE_PX) {
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
