import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import type { ConfiguracionRoles, Punto, ViaAtaque } from '../../domain/modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO } from '../../domain/roles';
import { TAMANO_CELDA } from '../../domain/rejilla';
import { Modal } from '../comun/modal';
import { ORDEN_ROLES } from '../comun/orden-roles';
import { FichaJugador, type EstadoFicha, type LineaFicha } from './ficha-jugador';

/** Punto fijo donde se pinta al rival para cada vía (spec 021): la ficha no guarda una posición
 * exacta, solo la vía ya derivada — cada pestaña la muestra siempre en el mismo sitio. */
const PUNTO_POR_VIA: Readonly<Record<ViaAtaque, Punto>> = {
  z2: { x: 1.5, y: -1.5 },
  z3: { x: 4.5, y: -1.5 },
  z4: { x: 7.5, y: -1.5 },
  pipe: { x: 4.5, y: -3.5 },
};

/** Paleta de la vista de conjunto (spec 023), en el mismo orden que `CLAVES_ORDEN_COLOR` de
 * `Tablero`: colocador, receptor1, receptor2, central1, central2, opuesto, líbero. */
const PALETA_COLORES = [
  '--neon-cyan',
  '--neon-green',
  '--neon-teal',
  '--neon-magenta',
  '--neon-amber',
  '--neon-purple',
  '--neon-pink',
] as const;

const LADO_PATRON = 0.28;

export interface CeldaConjunto {
  readonly columna: number;
  readonly fila: number;
  readonly indicesColor: readonly number[];
}

export interface EntradaLeyendaColor {
  readonly etiqueta: string;
  readonly indiceColor: number;
}

interface PatronFranjas {
  readonly id: string;
  readonly colores: readonly string[];
}

export interface FichaVista {
  readonly id: string;
  readonly punto: Punto;
  readonly etiqueta: string;
  /** Posición rotacional 1..6 (P1..P6) que ocupa el jugador en la rotación activa. */
  readonly posicion: number;
  readonly estado: EstadoFicha;
  readonly linea: LineaFicha;
  readonly esLibero: boolean;
  readonly seleccionada: boolean;
}

export interface FichaAgarrada {
  readonly id: string;
  readonly evento: PointerEvent;
}

interface EntradaLeyenda {
  readonly etiqueta: string;
  readonly nombre: string;
}

/** Deriva la leyenda (misma lógica de índice que `etiquetaDe`, docs/dominio.md §2: 1 = cercano, 2 = lejano). */
function entradasLeyendaDe(configuracion: ConfiguracionRoles): readonly EntradaLeyenda[] {
  return ORDEN_ROLES.flatMap((rol): EntradaLeyenda[] => {
    const definicion = configuracion[rol];
    if (!definicion.llevaIndice) {
      return [{ etiqueta: definicion.abreviatura, nombre: definicion.nombre }];
    }
    return [
      { etiqueta: `${definicion.abreviatura}1`, nombre: `${definicion.nombre} cercano` },
      { etiqueta: `${definicion.abreviatura}2`, nombre: `${definicion.nombre} lejano` },
    ];
  });
}

const ENTRADAS_LEYENDA = entradasLeyendaDe(CONFIGURACION_ROLES_POR_DEFECTO);

/**
 * El SVG de la pista. `viewBox` en metros (docs/dominio.md §3): origen en la esquina
 * red-lateral izquierda, x a la derecha, y hacia el fondo propio. Nada de píxeles ni
 * cálculo de tamaño aquí: el navegador escala solo.
 *
 * También hace de traductor de coordenadas: convierte puntos de pantalla (`clientX`,
 * `clientY`) a metros de pista usando `getScreenCTM()`. Quien arrastra (`Tablero`) le
 * pregunta a través de `puntoDesde`/`contiene`; la pista no guarda estado de arrastre.
 */
@Component({
  selector: 'app-pista',
  imports: [FichaJugador, Modal],
  templateUrl: './pista.html',
  styleUrl: './pista.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pista {
  readonly fichas = input.required<readonly FichaVista[]>();
  readonly idArrastrada = input<string | null>(null);
  /** Ajuste global: si se pinta la ayuda de posición (P1..P6) bajo cada ficha. */
  readonly mostrarPosicion = input(true);
  /** Ajuste global: si se pintan los números de metros a la izquierda de la rejilla. */
  readonly mostrarNumerosMetros = input(false);
  /** Si el sistema activo es de defensa: pinta la ficha rival en la vía activa (spec 021). */
  readonly mostrarRival = input(false);
  readonly viaActiva = input<ViaAtaque | null>(null);
  /** Si se pintan las zonas de responsabilidad: solo en defensa (spec 024, E1). */
  readonly mostrarZonas = input(false);
  /** Todas las celdas pintadas de la formación activa, con su color por jugador (spec 023). */
  readonly celdasVistaConjunto = input<readonly CeldaConjunto[]>([]);
  readonly leyendaVistaConjunto = input<readonly EntradaLeyendaColor[]>([]);
  /** Índice de color del jugador seleccionado: su zona se pinta a plena intensidad; las de los
   * demás se atenúan (spec 024, E12-E13). */
  readonly indiceColorSeleccionado = input<number | null>(null);

  readonly fichaAgarrada = output<FichaAgarrada>();
  readonly rivalAgarrado = output<PointerEvent>();
  /** Se agarra el fondo de la pista (no una ficha): arranca el modo pintar (spec 022). */
  readonly fondoAgarrado = output<PointerEvent>();
  readonly abrirAjustes = output<void>();

  protected readonly lineasRejilla = [1, 2, 3, 4, 5, 6, 7, 8] as const;
  protected readonly numerosMetros = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
  protected readonly entradasLeyenda = ENTRADAS_LEYENDA;
  protected readonly leyendaAbierta = signal(false);
  protected readonly tamanoCelda = TAMANO_CELDA;
  protected readonly ladoPatron = LADO_PATRON;
  protected readonly paleta = PALETA_COLORES;

  protected readonly puntoRival = computed<Punto | null>(() => {
    const via = this.viaActiva();
    return via ? PUNTO_POR_VIA[via] : null;
  });

  /** Un patrón de franjas diagonales por cada combinación de colores que comparte alguna
   * celda (spec 023, E3) — una celda de un solo jugador no necesita patrón, solo su color. */
  protected readonly patronesFranjas = computed<readonly PatronFranjas[]>(() => {
    const combos = new Map<string, readonly number[]>();
    for (const celda of this.celdasVistaConjunto()) {
      if (celda.indicesColor.length > 1) {
        const ordenados = [...new Set(celda.indicesColor)].sort((a, b) => a - b);
        combos.set(ordenados.join('-'), ordenados);
      }
    }
    return [...combos.entries()].map(([id, indices]) => ({
      id,
      colores: indices.map((indice) => `var(${PALETA_COLORES[indice]})`),
    }));
  });

  protected rellenoDe(celda: CeldaConjunto): string {
    if (celda.indicesColor.length <= 1) {
      return `var(${PALETA_COLORES[celda.indicesColor[0]]})`;
    }
    const ordenados = [...new Set(celda.indicesColor)].sort((a, b) => a - b);
    return `url(#app-pista__franjas-${ordenados.join('-')})`;
  }

  /** Plena intensidad para la zona del jugador seleccionado; atenuada para las demás (spec 024,
   * E12). Sin nadie seleccionado, todas iguales — ninguna destacada (E13). */
  protected opacidadDe(celda: CeldaConjunto): number {
    const activo = this.indiceColorSeleccionado();
    return activo === null || celda.indicesColor.includes(activo) ? 1 : 0.35;
  }

  private readonly svgRef = viewChild.required<ElementRef<SVGSVGElement>>('svgPista');

  puntoDesde(evento: PointerEvent): Punto {
    const svg = this.svgRef().nativeElement;
    const ctm = svg.getScreenCTM();
    if (!ctm) {
      return { x: 0, y: 0 };
    }
    const puntoPantalla = svg.createSVGPoint();
    puntoPantalla.x = evento.clientX;
    puntoPantalla.y = evento.clientY;
    const transformado = puntoPantalla.matrixTransform(ctm.inverse());
    return { x: transformado.x, y: transformado.y };
  }

  /**
   * Captura sobre el propio `<svg>`, nunca sobre la ficha: `Tablero` reordena las fichas
   * en el DOM al agarrarlas, y capturar sobre un nodo que se mueve es frágil.
   */
  capturarPuntero(evento: PointerEvent): void {
    this.svgRef().nativeElement.setPointerCapture(evento.pointerId);
  }

  liberarPuntero(evento: PointerEvent): void {
    const svg = this.svgRef().nativeElement;
    if (svg.hasPointerCapture(evento.pointerId)) {
      svg.releasePointerCapture(evento.pointerId);
    }
  }

  contiene(evento: PointerEvent): boolean {
    const rect = this.svgRef().nativeElement.getBoundingClientRect();
    return (
      evento.clientX >= rect.left &&
      evento.clientX <= rect.right &&
      evento.clientY >= rect.top &&
      evento.clientY <= rect.bottom
    );
  }

  /** No propaga: si llegara al fondo, dispararía también el modo pintar (spec 022) a la vez
   * que el arrastre del rival. */
  protected onRivalPointerDown(evento: PointerEvent): void {
    evento.stopPropagation();
    this.rivalAgarrado.emit(evento);
  }
}
