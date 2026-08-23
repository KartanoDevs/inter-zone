import { ChangeDetectionStrategy, Component, ElementRef, computed, input, output, signal, viewChild } from '@angular/core';
import type { CasoColocador, ConfiguracionRoles, Punto, SituacionDefensa } from '../../domain/modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO } from '../../domain/roles';
import { TAMANO_CELDA } from '../../domain/rejilla';
import { Modal } from '../comun/modal';
import { ORDEN_ROLES } from '../comun/orden-roles';
import { FichaJugador, type EstadoFicha, type LineaFicha } from './ficha-jugador';

/** Punto fijo donde se pinta al atacante para cada situación (spec 038): la ficha no guarda una
 * posición exacta, solo la situación ya derivada — cada pestaña la muestra siempre en el mismo
 * sitio. Un poco más cerca de la red que en la spec 021 (y = -1.2 en vez de -1.5): a petición del
 * entrenador, para que quede más claro que ataca desde la línea delantera. La postura inicial no
 * tiene punto: no hay ficha "A" en esa situación (E11). El ataque por 1 es la zaga derecha rival:
 * no tiene un tercio de red propio, se sitúa por detrás de la línea de ataque, en el lado
 * derecho — el espejo de la banda de zona 4, pero desde la zaga. */
export const PUNTO_POR_SITUACION: Readonly<Partial<Record<SituacionDefensa, Punto>>> = {
  z2: { x: 1.5, y: -1.2 },
  z3: { x: 4.5, y: -1.2 },
  z4: { x: 7.5, y: -1.2 },
  z1: { x: 7.5, y: -3.5 },
  pipe: { x: 4.5, y: -3.5 },
};

/** Punto fijo del colocador rival según el caso (spec 038, E8): delantero, en su zona 2 —que
 * cae a nuestra izquierda, el espejo de `docs/dominio.md` §3—; trasero, en su zona 1, en el
 * fondo de su campo. */
const PUNTO_COLOCADOR_RIVAL: Readonly<Record<CasoColocador, Punto>> = {
  delantero: { x: 1.5, y: -0.5 },
  trasero: { x: 7.5, y: -3.5 },
};

/** Paleta de la vista de conjunto (spec 023), en el mismo orden que `CLAVES_ORDEN_COLOR` de
 * `Tablero`: colocador, receptor1, receptor2, central1, central2, opuesto, líbero. Se exporta
 * porque `Tablero` la necesita también para la leyenda de colores de su pestaña "Zonas". */
export const PALETA_COLORES = [
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

/** Leyenda de las etiquetas propias de defensa (spec 038, E21): el atacante, el colocador rival,
 * y los seis puestos genéricos con su etiqueta doble según la línea. Se añade a la leyenda
 * normal solo cuando el sistema activo es de defensa — en recepción no hay nada de esto. */
const ENTRADAS_LEYENDA_DEFENSA: readonly EntradaLeyenda[] = [
  { etiqueta: 'A', nombre: 'Atacante' },
  { etiqueta: 'C', nombre: 'Colocador rival' },
  { etiqueta: 'C/O', nombre: 'Colocador u opuesto' },
  { etiqueta: 'R1/R2', nombre: 'Receptor' },
  { etiqueta: 'C1/C2', nombre: 'Central' },
  { etiqueta: 'L', nombre: 'Líbero' },
];

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
  /** Si el sistema activo es de defensa: pinta la ficha "A" del atacante y la "C" del colocador
   * rival (spec 038). */
  readonly mostrarRival = input(false);
  readonly casoActivo = input<CasoColocador | null>(null);
  readonly situacionActiva = input<SituacionDefensa | null>(null);
  /** Si se pintan las zonas de responsabilidad: solo en defensa (spec 024, E1). */
  readonly mostrarZonas = input(false);
  /** Todas las celdas pintadas de la formación activa, con su color por jugador (spec 023). */
  readonly celdasVistaConjunto = input<readonly CeldaConjunto[]>([]);
  /** Índice de color del jugador seleccionado: su zona se pinta a plena intensidad; las de los
   * demás se atenúan (spec 024, E12-E13). */
  readonly indiceColorSeleccionado = input<number | null>(null);
  /** La sombra de bloqueo ya calculada (spec 040): uno o más polígonos, en metros. Nunca en
   * recepción (E15) — es `Tablero` quien decide si la pasa o no. */
  readonly sombra = input<readonly (readonly Punto[])[]>([]);

  readonly fichaAgarrada = output<FichaAgarrada>();
  readonly rivalAgarrado = output<PointerEvent>();
  /** Se agarra la sombra de bloqueo para retocarla a mano (spec 040, E10). */
  readonly sombraAgarrada = output<PointerEvent>();
  /** Se agarra el fondo de la pista (no una ficha): arranca el modo pintar (spec 022). */
  readonly fondoAgarrado = output<PointerEvent>();

  protected readonly lineasRejilla = [1, 2, 3, 4, 5, 6, 7, 8] as const;
  protected readonly numerosMetros = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
  protected readonly leyendaAbierta = signal(false);
  protected readonly tamanoCelda = TAMANO_CELDA;
  protected readonly ladoPatron = LADO_PATRON;

  /** La leyenda normal, y en defensa también las entradas propias de defensa (spec 038, E21). */
  protected readonly entradasLeyenda = computed<readonly EntradaLeyenda[]>(() =>
    this.mostrarRival() ? [...ENTRADAS_LEYENDA, ...ENTRADAS_LEYENDA_DEFENSA] : ENTRADAS_LEYENDA,
  );

  /** El punto de la ficha "A" para la situación activa (spec 038): `null` en la postura inicial
   * (E11, no hay atacante) o si la situación todavía no tiene punto asignado. */
  protected readonly puntoAtacante = computed<Punto | null>(() => {
    const situacion = this.situacionActiva();
    return situacion ? (PUNTO_POR_SITUACION[situacion] ?? null) : null;
  });

  /** El punto de la ficha "C" del colocador rival (spec 038, E8): siempre presente mientras el
   * sistema sea de defensa, con independencia de la situación activa. */
  protected readonly puntoColocadorRival = computed<Punto | null>(() => {
    const caso = this.casoActivo();
    return caso ? PUNTO_COLOCADOR_RIVAL[caso] : null;
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

  /** El atributo `points` de un `<polygon>` SVG a partir de un polígono en metros (spec 040). */
  protected puntosSvg(poligono: readonly Punto[]): string {
    return poligono.map((p) => `${p.x},${p.y}`).join(' ');
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

  /** No propaga: por el mismo motivo que `onRivalPointerDown` — si llegara al fondo, dispararía
   * también el modo pintar. */
  protected onSombraPointerDown(evento: PointerEvent): void {
    evento.stopPropagation();
    this.sombraAgarrada.emit(evento);
  }
}
