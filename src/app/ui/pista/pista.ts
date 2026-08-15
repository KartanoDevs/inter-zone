import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import type { ConfiguracionRoles, Punto } from '../../domain/modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO } from '../../domain/roles';
import { Modal } from '../comun/modal';
import { ORDEN_ROLES } from '../comun/orden-roles';
import { FichaJugador, type EstadoFicha, type LineaFicha } from './ficha-jugador';

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

  readonly fichaAgarrada = output<FichaAgarrada>();
  readonly abrirAjustes = output<void>();

  protected readonly lineasRejilla = [1, 2, 3, 4, 5, 6, 7, 8] as const;
  protected readonly numerosMetros = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
  protected readonly entradasLeyenda = ENTRADAS_LEYENDA;
  protected readonly leyendaAbierta = signal(false);

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
}
