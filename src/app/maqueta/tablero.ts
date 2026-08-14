import { ChangeDetectionStrategy, Component, computed, signal, viewChild } from '@angular/core';
import { Pista, type FichaAgarrada, type FichaVista } from './pista';
import { SelectorRotacion, type EstadoRotacion } from './selector-rotacion';
import { PanelValidacion, type ItemValidacion } from './panel-validacion';
import { PaletaJugadores, type ChipAgarrado, type ChipJugador } from './paleta-jugadores';
import { ordenSaquePara, ROSTER, SISTEMA_EJEMPLO, type OcupanteCasilla } from './datos-ejemplo';
import { formacionEnRotacion } from '../domain/rotacion';
import { validarFormacion } from '../domain/validacion';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from '../domain/roles';
import type { Colocacion, Formacion, Infraccion, OrdenSaque, Punto, ResultadoValidacion } from '../domain/modelos';

type RotacionValida = 1 | 2 | 3 | 4 | 5 | 6;
type Formaciones = Partial<Record<RotacionValida, Formacion>>;

const ROTACIONES: readonly RotacionValida[] = [1, 2, 3, 4, 5, 6];
const POSICIONES = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6'] as const;

// Límites de arrastre: algo más ajustados que el viewBox de la pista (pista.html),
// para que la ficha nunca quede recortada por el borde visible.
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

/**
 * El SVG no tiene z-index: pinta en orden de DOM, y el hit-test del `pointerdown` se
 * queda con lo primero que pinta encima. Con fichas solapadas eso deja alguna
 * inalcanzable (docs de la investigación de este bug). En vez de fiarse de qué ficha
 * ganó el hit-test, se busca la más cercana al punto real del toque.
 */
function colocacionMasCercana(formacion: Formacion, punto: Punto): Colocacion | null {
  return formacion.reduce<Colocacion | null>((mejor, actual) => {
    if (!mejor || distancia(actual.punto, punto) < distancia(mejor.punto, punto)) {
      return actual;
    }
    return mejor;
  }, null);
}

function esOcupanteCasilla(jugadorId: string): jugadorId is OcupanteCasilla {
  return jugadorId === 'central2' || jugadorId === 'libero';
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

/** Quita a `idAPurgar` de todas las rotaciones. Se usa al cambiar quién ocupa la casilla intercambiable. */
function purgarDeFormaciones(mapa: Formaciones, idAPurgar: string): Formaciones {
  const limpio: Formaciones = {};
  for (const rotacion of ROTACIONES) {
    limpio[rotacion] = (mapa[rotacion] ?? []).filter((c) => c.jugador.id !== idAPurgar);
  }
  return limpio;
}

/**
 * Shell de la maqueta: selector de rotación, campo, banquillo y acciones. Consume el
 * dominio tal cual (`formacionEnRotacion`, `validarFormacion`, `etiquetaDe`); no
 * reimplementa ninguna regla de voleibol. El estado editable (`formaciones`) empieza
 * con los datos de ejemplo pero es mutable: arrastrar coloca, mueve o quita jugadores.
 * `validarFormacion` exige los seis jugadores colocados (revienta si falta alguno), así
 * que solo se llama cuando la formación activa tiene longitud 6 — ver `resultadoActivo`.
 *
 * Roster de 7 (docs/dominio.md §2): `central2` y `libero` se turnan la última casilla
 * del orden de saque. `ocupanteCasilla` dice cuál está activo ahora mismo; arrastrar al
 * campo al que no lo está dispara el cambio (`asegurarOcupante`), que también limpia de
 * todas las rotaciones al que sale, para no dejar un jugador fuera del orden de saque
 * colocado en una formación.
 */
@Component({
  selector: 'mqt-tablero',
  imports: [Pista, SelectorRotacion, PanelValidacion, PaletaJugadores],
  templateUrl: './tablero.html',
  styleUrl: './tablero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Tablero {
  protected readonly rotacionActiva = signal<RotacionValida>(1);
  protected readonly arrastre = signal<Arrastre | null>(null);
  protected readonly ocupanteCasilla = signal<OcupanteCasilla>('libero');

  private readonly formaciones = signal<Formaciones>({ ...SISTEMA_EJEMPLO.formaciones });

  private readonly pistaCmp = viewChild.required(Pista);

  protected readonly idArrastrada = computed(() => this.arrastre()?.jugadorId ?? null);

  private readonly orden = computed<OrdenSaque>(() => ordenSaquePara(this.ocupanteCasilla()));

  private readonly formacionActiva = computed<Formacion>(() => this.formaciones()[this.rotacionActiva()] ?? []);
  protected readonly completo = computed(() => this.formacionActiva().length === 6);

  private readonly posicionesActivas = computed(() => formacionEnRotacion(this.orden(), this.rotacionActiva()));
  private readonly posicionPorId = computed(() => {
    const mapa = new Map<string, string>();
    this.posicionesActivas().forEach((jugador, indice) => mapa.set(jugador.id, POSICIONES[indice]));
    return mapa;
  });

  private readonly resultadoActivo = computed<ResultadoValidacion | null>(() =>
    this.completo() ? validarFormacion(this.formacionActiva(), this.posicionesActivas()) : null,
  );

  protected readonly esLegal = computed(() => this.resultadoActivo()?.infracciones.length === 0);
  protected readonly infracciones = computed(() => itemsDe(this.resultadoActivo()?.infracciones ?? []));
  protected readonly avisos = computed(() => itemsDe(this.resultadoActivo()?.avisos ?? []));

  protected readonly fichas = computed<readonly FichaVista[]>(() => {
    const resultado = this.resultadoActivo();
    const posicionPorId = this.posicionPorId();
    return this.formacionActiva().map((colocacion) => {
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
    const colocadosIds = new Set(this.formacionActiva().map((c) => c.jugador.id));
    return ROSTER.filter((jugador) => !colocadosIds.has(jugador.id)).map((jugador) => ({
      id: jugador.id,
      etiqueta: etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO),
    }));
  });

  protected readonly estadosRotacion = computed<readonly EstadoRotacion[]>(() => {
    const orden = this.orden();
    return ROTACIONES.map((rotacion) => {
      const formacion = this.formaciones()[rotacion] ?? [];
      const tieneFalta =
        formacion.length === 6 && validarFormacion(formacion, formacionEnRotacion(orden, rotacion)).infracciones.length > 0;
      return { rotacion, tieneFalta };
    });
  });

  protected seleccionarRotacion(rotacion: number): void {
    this.rotacionActiva.set(rotacion as RotacionValida);
  }

  protected onAgarrarPaleta(chip: ChipAgarrado): void {
    const jugador = ROSTER.find((j) => j.id === chip.id);
    if (!jugador) {
      return;
    }
    this.iniciarArrastre(chip.id, etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO), chip.evento, 'paleta');
  }

  protected onAgarrarFicha(agarrada: FichaAgarrada): void {
    const formacion = this.formacionActiva();
    const punto = this.pistaCmp().puntoDesde(agarrada.evento);
    const colocacion = colocacionMasCercana(formacion, punto) ?? formacion.find((c) => c.jugador.id === agarrada.id);
    if (!colocacion) {
      return;
    }
    // Captura primero (sobre el `<svg>`, que nunca se mueve) y solo después reordena el
    // array: `traerAlFrente` hace que Angular reubique el nodo `<g>` de la ficha en el
    // DOM, y en táctil ese nodo es el que tiene la captura implícita del `pointerdown`.
    // Capturar antes de moverlo evita competir con esa captura implícita.
    this.iniciarArrastre(
      colocacion.jugador.id,
      etiquetaDe(colocacion.jugador, CONFIGURACION_ROLES_POR_DEFECTO),
      agarrada.evento,
      'pista',
    );
    this.traerAlFrente(colocacion.jugador.id);
  }

  protected vaciarRotacion(): void {
    this.actualizarFormacionActiva(() => []);
  }

  private iniciarArrastre(jugadorId: string, etiqueta: string, evento: PointerEvent, origen: 'paleta' | 'pista'): void {
    evento.preventDefault();
    this.arrastre.set({ jugadorId, etiqueta, clientX: evento.clientX, clientY: evento.clientY });
    // Captura el puntero para que el arrastre no se pierda al moverlo rápido o sacarlo
    // de la ventana, y para que ningún elemento que quede por debajo pueda robarlo.
    this.pistaCmp().capturarPuntero(evento);

    const mover = (e: PointerEvent): void => {
      this.arrastre.update((actual) => (actual ? { ...actual, clientX: e.clientX, clientY: e.clientY } : actual));
      if (origen === 'pista' && this.pistaCmp().contiene(e)) {
        this.moverJugador(jugadorId, this.pistaCmp().puntoDesde(e));
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
        this.colocarOMover(jugadorId, pista.puntoDesde(e));
      } else if (origen === 'pista') {
        this.quitarJugador(jugadorId);
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

  /** Deja `jugadorId` el último del array: en SVG, el orden de pintado es el orden del DOM. */
  private traerAlFrente(jugadorId: string): void {
    this.actualizarFormacionActiva((formacion) => {
      const colocacion = formacion.find((c) => c.jugador.id === jugadorId);
      if (!colocacion) {
        return formacion;
      }
      return [...formacion.filter((c) => c.jugador.id !== jugadorId), colocacion];
    });
  }

  private asegurarOcupante(jugadorId: string): void {
    if (!esOcupanteCasilla(jugadorId) || this.ocupanteCasilla() === jugadorId) {
      return;
    }
    const saliente = this.ocupanteCasilla();
    this.ocupanteCasilla.set(jugadorId);
    this.formaciones.update((mapa) => purgarDeFormaciones(mapa, saliente));
  }

  private colocarOMover(jugadorId: string, punto: Punto): void {
    this.asegurarOcupante(jugadorId);
    const jugador = this.orden().find((j) => j.id === jugadorId);
    if (!jugador) {
      return;
    }
    const puntoAcotado = acotarPunto(punto);
    this.actualizarFormacionActiva((formacion) => [
      ...formacion.filter((c) => c.jugador.id !== jugadorId),
      { jugador, punto: puntoAcotado },
    ]);
  }

  private moverJugador(jugadorId: string, punto: Punto): void {
    const puntoAcotado = acotarPunto(punto);
    this.actualizarFormacionActiva((formacion) =>
      formacion.map((c) => (c.jugador.id === jugadorId ? { ...c, punto: puntoAcotado } : c)),
    );
  }

  private quitarJugador(jugadorId: string): void {
    this.actualizarFormacionActiva((formacion) => formacion.filter((c) => c.jugador.id !== jugadorId));
  }

  private actualizarFormacionActiva(fn: (formacion: Formacion) => Formacion): void {
    const rotacion = this.rotacionActiva();
    this.formaciones.update((mapa) => ({ ...mapa, [rotacion]: fn(mapa[rotacion] ?? []) }));
  }
}
