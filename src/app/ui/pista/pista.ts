import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  CasoColocador,
  ConfiguracionRoles,
  Punto,
  SituacionDefensa,
} from '../../domain/modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO } from '../../domain/roles';
import { TAMANO_CELDA } from '../../domain/rejilla';
import { PUNTO_POR_SITUACION } from '../../domain/sistema-defensa-por-defecto';
import { Modal } from '../comun/modal';
import { ORDEN_ROLES } from '../comun/orden-roles';
import { FichaJugador, type EstadoFicha, type LineaFicha } from './ficha-jugador';

export { PUNTO_POR_SITUACION };

/** Punto fijo del colocador rival, el mismo sea cual sea su caso (spec 042): cerca de la red, en
 * el límite entre las zonas 2 y 3 rivales. Un colocador trasero no arma desde el fondo — penetra
 * hasta ahí para hacerlo, así que dibujarlo también en el fondo (como hacía la spec 038, E8)
 * enseñaba algo que no pasa en pista. Que sea delantero o trasero sigue decidiendo qué
 * situaciones de ataque existen (`situacionesDe`); solo cambia dónde se dibuja la ficha. */
const PUNTO_COLOCADOR_RIVAL: Punto = { x: 3.0, y: -0.5 };

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
  /** La etiqueta pequeña bajo la principal (spec 049): "P1".."P6" en recepción (posición
   * rotacional real), "JD"/"JT" en defensa (jugador delantero/zaguero — sin rotación de la que
   * derivar una posición, spec 038). Su primer carácter se pinta pequeño y el resto grande
   * (`ficha-jugador.html`), igual que ya distinguía "P" de "1" antes de esta spec. */
  readonly etiquetaPosicion: string;
  readonly estado: EstadoFicha;
  readonly linea: LineaFicha;
  readonly esLibero: boolean;
  readonly seleccionada: boolean;
}

export interface FichaAgarrada {
  readonly id: string;
  readonly evento: PointerEvent;
}

/** Comparación con el modelo del entrenador (spec 057, E12): el punto donde debía estar la
 * ficha frente a donde la colocó el alumno, unidos por una línea — el error se ve como
 * magnitud, no depende solo del color. Solo lo usa Examen; Editor y Teoría no lo pasan nunca. */
export interface FichaComparada {
  readonly puntoModelo: Punto;
  readonly puntoAlumno: Punto;
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
  { etiqueta: 'CR', nombre: 'Colocador rival' },
  { etiqueta: 'CO', nombre: 'Colocador u opuesto' },
  { etiqueta: 'R', nombre: 'Receptor' },
  { etiqueta: 'Ce', nombre: 'Central' },
  { etiqueta: 'L', nombre: 'Líbero' },
  { etiqueta: 'JD', nombre: 'Jugador delantero' },
  { etiqueta: 'JT', nombre: 'Jugador trasero' },
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
  /** Celdas de zona de finta (spec 041): mismo dato que `celdasVistaConjunto`, se pintan del
   * mismo color de su puesto pero con una textura de puntos encima, para distinguirlas de la
   * zona de defensa sólida. */
  readonly celdasFintaVistaConjunto = input<readonly CeldaConjunto[]>([]);
  /** Índice de color del jugador seleccionado: su zona se pinta a plena intensidad; las de los
   * demás se atenúan (spec 024, E12-E13). */
  readonly indiceColorSeleccionado = input<number | null>(null);
  /** La sombra de bloqueo ya calculada (spec 040), con la escala de pantalla (spec 044/045) ya
   * aplicada por `sombraDeBloqueo`: uno o más polígonos, en metros, listos para dibujar tal
   * cual. Nunca en recepción (E15) — es `Tablero` quien decide si la pasa o no. */
  readonly sombra = input<readonly (readonly Punto[])[]>([]);
  /** Con la acción de arrastre en "pintar" (spec 044, antes un interruptor on/off en la 041,
   * E11), la sombra deja de capturar el puntero: hace falta poder pintar lo que queda debajo
   * suyo, sin dejar de poder arrastrarla en "mover bloqueo". Con `null` (spec 045: acción
   * deseleccionada) tampoco captura — no hay nada que hacer con la sombra en ese estado. */
  readonly accionArrastre = input<'pintar' | 'mover' | null>('pintar');
  /** Spec 057, E12: solo Examen la usa, al comparar un resultado con el modelo. */
  readonly fichasComparadas = input<readonly FichaComparada[]>([]);

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

  /** La leyenda de recepción, o la de defensa — nunca las dos a la vez (spec 038, E21,
   * corregida en una spec posterior): las etiquetas de recepción (roles) no existen en defensa,
   * que solo usa las suyas propias por puesto. */
  protected readonly entradasLeyenda = computed<readonly EntradaLeyenda[]>(() =>
    this.mostrarRival() ? ENTRADAS_LEYENDA_DEFENSA : ENTRADAS_LEYENDA,
  );

  /** El punto de la ficha "A" para la situación activa (spec 038): `null` en la postura inicial
   * (E11, no hay atacante) o si la situación todavía no tiene punto asignado. */
  protected readonly puntoAtacante = computed<Punto | null>(() => {
    const situacion = this.situacionActiva();
    return situacion ? (PUNTO_POR_SITUACION[situacion] ?? null) : null;
  });

  /** El punto de la ficha "C" del colocador rival: siempre presente mientras el sistema sea de
   * defensa, con independencia de la situación activa y del caso (spec 042: es el mismo punto
   * delantero o trasero). */
  protected readonly puntoColocadorRival = computed<Punto | null>(() =>
    this.casoActivo() ? PUNTO_COLOCADOR_RIVAL : null,
  );

  /** Un patrón de franjas diagonales por cada combinación de colores que comparte alguna
   * celda (spec 023, E3) — una celda de un solo jugador no necesita patrón, solo su color. */
  protected readonly patronesFranjas = computed<readonly PatronFranjas[]>(() => {
    const combos = new Map<string, readonly number[]>();
    for (const celda of [...this.celdasVistaConjunto(), ...this.celdasFintaVistaConjunto()]) {
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

  /** El atributo `points` de un `<polygon>` SVG a partir de un polígono en metros (spec 040),
   * ya con la escala de pantalla aplicada por el dominio (spec 044/045). */
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
   * también el modo pintar. En "pintar" (spec 044) se deja pasar el evento tal cual, sin
   * capturarlo: pintar debajo de la sombra importa más que poder arrastrarla justo en ese
   * momento — para moverla, hay que elegir "Mover bloqueo" primero. */
  protected onSombraPointerDown(evento: PointerEvent): void {
    if (this.accionArrastre() !== 'mover') {
      // spec 045: en 'pintar' se deja pasar (E11 de la 044); en null tampoco hay nada que
      // mover, así que se deja pasar igual — el fondo ya está gobernado por la misma acción.
      return;
    }
    evento.stopPropagation();
    this.sombraAgarrada.emit(evento);
  }
}
