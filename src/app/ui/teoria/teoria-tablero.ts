import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Pista, PALETA_COLORES, PUNTO_POR_SITUACION, type CeldaConjunto, type FichaVista } from '../pista/pista';
import { SelectorRotacion, type EstadoRotacion } from '../rotaciones/selector-rotacion';
import { SelectorCaso } from '../rotaciones/selector-caso';
import { SelectorSituacion } from '../rotaciones/selector-situacion';
import { SelectorBloqueadores } from '../rotaciones/selector-bloqueadores';
import { SelectorEquipo } from '../sistemas/selector-equipo';
import { BarraSistemas, type OpcionSistema } from '../sistemas/barra-sistemas';
import { PanelEnsenanza } from '../panel/panel-ensenanza';
import {
  ETIQUETA_PUESTO,
  INDICE_COLOR_POR_PUESTO,
  esLineaDelantera,
  esPuestoDelantero,
  etiquetaOcupanteDe,
  idOcupanteDe,
  indiceColorDe,
  type EntradaLeyendaColor,
} from '../comun/ficha-vista';
import { TeoriaStore } from '../../application/teoria.store';
import type { ColocacionBorrador } from '../../application/sistema.store';
import { CONFIGURACION_ROLES_POR_DEFECTO } from '../../domain/roles';
import { etiquetaDe } from '../../domain/roles';
import type { Colocacion, ColocacionDefensa, EquipoId } from '../../domain/modelos';

const ROTACIONES = [1, 2, 3, 4, 5, 6] as const;

/**
 * "Teoría" (spec 052): consulta de solo lectura de los sistemas validados. Reutiliza `Pista` y
 * los selectores del editor —son presentacionales, sin acoplar a `SistemaStore`— pero nunca
 * escucha sus eventos de arrastre: no hay nada que mover, pintar ni editar aquí. La construcción
 * de `FichaVista`/`CeldaConjunto`/leyenda repite el cálculo de `Tablero` sobre los datos de
 * `TeoriaStore` en vez de sobre `SistemaStore.borrador()` — es la misma fontanería de UI, no
 * una regla de dominio, así que repetirla es más barato que forzar a los dos a compartir un
 * borrador que Teoría no tiene ni necesita.
 */
@Component({
  selector: 'app-teoria-tablero',
  imports: [Pista, SelectorEquipo, BarraSistemas, SelectorRotacion, SelectorCaso, SelectorSituacion, SelectorBloqueadores, PanelEnsenanza],
  templateUrl: './teoria-tablero.html',
  styleUrl: './teoria-tablero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeoriaTablero {
  protected readonly teoria = inject(TeoriaStore);
  protected readonly paletaColores = PALETA_COLORES;

  constructor() {
    // Activa el primer sistema validado en cuanto haya alguno, sin pisar una elección ya hecha
    // (spec 052, E1/E2/E8): mismo patrón que `App` disparando `SistemaStore.cargar()`.
    effect(() => {
      if (this.teoria.sistemaActivoId() === null) {
        const primero = this.teoria.catalogo()[0];
        if (primero) {
          this.teoria.activarSistema(primero.id);
        }
      }
    });
  }

  protected seleccionarEquipo(equipo: EquipoId): void {
    this.teoria.seleccionarEquipo(equipo);
  }

  /** `SelectorRotacion.seleccionar` emite `number` a secas (lo comparte con cualquier posible
   * consumidor futuro); aquí se acota a `RotacionValida`, mismo criterio que `Tablero`. */
  protected seleccionarRotacion(rotacion: number): void {
    this.teoria.seleccionarRotacion(rotacion as 1 | 2 | 3 | 4 | 5 | 6);
  }

  protected readonly opcionesSistema = computed<readonly OpcionSistema[]>(() =>
    this.teoria.catalogo().map((s) => ({ id: s.id, nombre: s.nombre, tipo: s.tipo })),
  );

  protected readonly estadosRotacion = computed<readonly EstadoRotacion[]>(() => ROTACIONES.map((rotacion) => ({ rotacion, tieneFalta: false })));

  private indiceColorDeColocacion(colocacion: ColocacionBorrador): number {
    return 'jugador' in colocacion ? indiceColorDe(colocacion.jugador) : INDICE_COLOR_POR_PUESTO[colocacion.puesto];
  }

  protected readonly fichas = computed<readonly FichaVista[]>(() => {
    const formacion = this.teoria.formacionActiva();
    if (!formacion) {
      return [];
    }
    const seleccionadoId = this.teoria.jugadorSeleccionadoId();
    if (this.teoria.esDefensa()) {
      return (formacion as readonly ColocacionDefensa[]).map((c) => {
        const id = `p${c.puesto}`;
        return {
          id,
          punto: c.punto,
          etiqueta: ETIQUETA_PUESTO[c.puesto],
          etiquetaPosicion: esPuestoDelantero(c.puesto) ? 'JD' : 'JT',
          estado: 'normal' as const,
          linea: esPuestoDelantero(c.puesto) ? ('delantera' as const) : ('zaguera' as const),
          esLibero: c.puesto === 5,
          seleccionada: id === seleccionadoId,
        };
      });
    }
    const posicionPorId = new Map<string, number>();
    (this.teoria.posicionesActivas() ?? []).forEach((jugador, indice) => posicionPorId.set(jugador.id, indice + 1));
    return (formacion as readonly Colocacion[]).map((c) => {
      const posicionRotacional = posicionPorId.get(c.jugador.id) ?? 0;
      return {
        id: c.jugador.id,
        punto: c.punto,
        etiqueta: etiquetaDe(c.jugador, CONFIGURACION_ROLES_POR_DEFECTO),
        etiquetaPosicion: `P${posicionRotacional}`,
        estado: 'normal' as const,
        linea: esLineaDelantera(posicionRotacional) ? ('delantera' as const) : ('zaguera' as const),
        esLibero: c.jugador.rol === 'libero',
        seleccionada: c.jugador.id === seleccionadoId,
      };
    });
  });

  protected readonly indiceColorSeleccionado = computed<number | null>(() => {
    const id = this.teoria.jugadorSeleccionadoId();
    const colocacion = (this.teoria.formacionActiva() ?? []).find((c) => idOcupanteDe(c) === id);
    return colocacion ? this.indiceColorDeColocacion(colocacion) : null;
  });

  private vistaDeConjunto(celdasDe: (c: ColocacionBorrador) => readonly { columna: number; fila: number }[]): readonly CeldaConjunto[] {
    const seleccionadoId = this.teoria.jugadorSeleccionadoId();
    const porClave = new Map<string, { columna: number; fila: number; indices: number[] }>();
    for (const colocacion of this.teoria.formacionActiva() ?? []) {
      const indice = this.indiceColorDeColocacion(colocacion);
      const celdas =
        idOcupanteDe(colocacion) === seleccionadoId
          ? celdasDe === this.celdasDeFinta
            ? this.teoria.celdasFintaJugadorSeleccionado()
            : this.teoria.celdasJugadorSeleccionado()
          : celdasDe(colocacion);
      for (const celda of celdas) {
        const clave = `${celda.columna},${celda.fila}`;
        const existente = porClave.get(clave);
        if (existente) {
          existente.indices.push(indice);
        } else {
          porClave.set(clave, { columna: celda.columna, fila: celda.fila, indices: [indice] });
        }
      }
    }
    return [...porClave.values()].map((c) => ({ columna: c.columna, fila: c.fila, indicesColor: c.indices }));
  }

  private readonly celdasDeDefensa = (c: ColocacionBorrador): readonly { columna: number; fila: number }[] => c.celdas ?? [];
  private readonly celdasDeFinta = (c: ColocacionBorrador): readonly { columna: number; fila: number }[] => c.celdasFinta ?? [];

  protected readonly celdasVistaConjunto = computed<readonly CeldaConjunto[]>(() => this.vistaDeConjunto(this.celdasDeDefensa));
  protected readonly celdasFintaVistaConjunto = computed<readonly CeldaConjunto[]>(() => this.vistaDeConjunto(this.celdasDeFinta));

  protected readonly leyendaVistaConjunto = computed<readonly EntradaLeyendaColor[]>(() =>
    (this.teoria.formacionActiva() ?? []).map((c) => ({ etiqueta: etiquetaOcupanteDe(c), indiceColor: this.indiceColorDeColocacion(c) })),
  );

  protected readonly puntoAtacante = computed(() => PUNTO_POR_SITUACION[this.teoria.situacionActiva()]);

  protected seleccionarFicha(id: string): void {
    this.teoria.seleccionarJugador(id);
  }

  /** Sin variante ni rotación guardada para la clave activa (spec 052, E3/E4): se avisa en vez
   * de enseñar una pista en blanco sin explicación. */
  protected readonly formacionActivaVacia = computed(() => this.teoria.formacionActiva() === null);
}
