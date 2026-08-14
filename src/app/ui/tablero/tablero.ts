import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { Pista, type FichaAgarrada, type FichaVista } from '../pista/pista';
import { SelectorRotacion, type EstadoRotacion } from '../rotaciones/selector-rotacion';
import { PanelValidacion, type ItemValidacion } from '../panel/panel-validacion';
import { PaletaJugadores, type ChipAgarrado, type ChipJugador } from '../panel/paleta-jugadores';
import { DialogoConfirmacion } from '../comun/dialogo-confirmacion';
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
 * Shell de la pizarra real (spec 009): consume `SistemaStore`, que es donde vive toda la
 * lógica. Este componente solo traduce signals a vista y gestiona el arrastre con
 * `PointerEvent`, reutilizando tal cual el diseño ya resuelto en `maqueta/tablero.ts`.
 */
@Component({
  selector: 'app-tablero',
  imports: [Pista, SelectorRotacion, PanelValidacion, PaletaJugadores, DialogoConfirmacion],
  templateUrl: './tablero.html',
  styleUrl: './tablero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tablero {
  protected readonly store = inject(SistemaStore);

  protected readonly arrastre = signal<Arrastre | null>(null);
  protected readonly idArrastrada = computed(() => this.arrastre()?.jugadorId ?? null);

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
    return this.store.borrador().map((colocacion) => {
      const posicionRotacional = posicionPorId.get(colocacion.jugador.id) ?? '';
      return {
        id: colocacion.jugador.id,
        punto: colocacion.punto,
        etiqueta: etiquetaDe(colocacion.jugador, CONFIGURACION_ROLES_POR_DEFECTO),
        estado: estadoDe(resultado, colocacion.jugador.id),
        linea: esLineaDelantera(posicionRotacional) ? 'delantera' : 'zaguera',
        esLibero: colocacion.jugador.rol === 'libero',
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

  protected seleccionarRotacion(rotacion: number): void {
    this.store.seleccionarRotacion(rotacion as RotacionValida);
  }

  protected confirmarCambio(): void {
    this.store.confirmarCambio();
  }

  protected cancelarCambio(): void {
    this.store.cancelarCambio();
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
    this.arrastre.set({ jugadorId, etiqueta, clientX: evento.clientX, clientY: evento.clientY });
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
