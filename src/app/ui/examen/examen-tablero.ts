import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal, viewChild } from '@angular/core';
import { PALETA_COLORES, Pista, type FichaAgarrada, type FichaComparada, type FichaVista } from '../pista/pista';
import { PaletaJugadores, type ChipAgarrado, type ChipJugador } from '../panel/paleta-jugadores';
import { SelectorRotacion, type EstadoRotacion } from '../rotaciones/selector-rotacion';
import { PanelValidacion, type ItemValidacion } from '../panel/panel-validacion';
import { DialogoConfirmacion } from '../comun/dialogo-confirmacion';
import { DialogoConfiguracionExamen } from './dialogo-configuracion-examen';
import { ExamenStore } from '../../application/examen.store';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from '../../domain/roles';
import type { Infraccion, Jugador } from '../../domain/modelos';
import type { RotacionValida } from '../../application/sistema.store';
import type { TipoExamen } from '../../domain/examen';

const NOMBRE_TIPO: Readonly<Record<TipoExamen, string>> = {
  puesto: 'Por posición',
  linea: 'Por línea',
  sistema: 'Por sistema',
};

const NOMBRE_INSIGNIA: Readonly<Record<TipoExamen, 'bronce' | 'plata' | 'oro'>> = {
  puesto: 'bronce',
  linea: 'plata',
  sistema: 'oro',
};

/** Coronas del boletín (spec 059): las añade el equipo de diseño en `public/medals/`. La caja
 * las reserva con width/height, así que un 404 no descuadra el layout. */
const RUTA_INSIGNIA: Readonly<Record<'bronce' | 'plata' | 'oro', string>> = {
  bronce: '/medals/bronze.png',
  plata: '/medals/silver.png',
  oro: '/medals/gold.png',
};

function itemsDe(items: readonly Infraccion[]): ItemValidacion[] {
  return items.map((item) => ({
    tipo: item.tipo,
    etiquetas: item.jugadores.map((jugador) => etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO)),
  }));
}

/**
 * Ventana "Examen" (spec 057, sustituye a la 055): hoja de inscripción antes de empezar, examen
 * guiado por rotación con faltas visibles solo al validar (igual que Edición), y un boletín de
 * resultado con desglose por rotación y comparación con el modelo. Sigue el mismo patrón
 * simplificado de arrastre de `TeoriaStore`/`Tablero`, pero sin tap-vs-drag ni selección de
 * jugador: el examen no tiene panel de enseñanza que enfocar.
 */
@Component({
  selector: 'app-examen-tablero',
  imports: [Pista, PaletaJugadores, SelectorRotacion, PanelValidacion, DialogoConfirmacion, DialogoConfiguracionExamen],
  templateUrl: './examen-tablero.html',
  styleUrl: './examen-tablero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExamenTablero {
  protected readonly examen = inject(ExamenStore);

  /** Salir de la ventana Examen: lo pide la "×"/backdrop/Escape del modal de configuración
   * (no queda nada bajo él). Quien decide a qué ventana volver es `Tablero`. */
  readonly salir = output<void>();

  protected readonly paletaColores = PALETA_COLORES;
  protected readonly nombreTipo = NOMBRE_TIPO;
  protected readonly nombreInsignia = NOMBRE_INSIGNIA;
  protected readonly rutaInsignia = RUTA_INSIGNIA;

  protected readonly pidiendoInicio = signal(false);
  protected readonly reiniciando = signal(false);
  protected readonly comparando = signal(false);

  constructor() {
    // Activa el primer sistema examinable en cuanto haya catálogo, sin pisar una elección ya
    // hecha: mismo patrón que `TeoriaTablero`. Sin esto la hoja de inscripción no muestra las
    // filas de tipo y titular hasta que se toca el selector de sistema o de equipo.
    effect(() => {
      if (this.examen.sistemaActivoId() === null) {
        const primero = this.examen.catalogo()[0];
        if (primero) {
          this.examen.activarSistema(primero.id);
        }
      }
    });
  }

  private readonly pistaCmp = viewChild.required(Pista);

  protected readonly opcionesSistema = computed(() => this.examen.catalogo().map((s) => ({ id: s.id, nombre: s.nombre, tipo: s.tipo })));

  /** Etiqueta de rol del titular examinado (o del líbero, spec 058), nunca su id crudo. */
  protected readonly etiquetaTitularActivo = computed(() => {
    const id = this.examen.titularId();
    if (!id) {
      return null;
    }
    const titular = this.examen.titulares().find((j) => j.id === id);
    return titular ? etiquetaDe(titular, CONFIGURACION_ROLES_POR_DEFECTO) : null;
  });

  /** Estado de cada pestaña de rotación (spec 057, E3): solo se ofrecen las que de verdad se
   * examinan — un titular al que el líbero sustituye esa rotación no la ofrece. La marca de
   * falta no aparece hasta que el examen termina (spec 060): durante el examen, `false`
   * siempre, aunque la rotación ya esté validada. */
  protected readonly estadosRotacion = computed<readonly EstadoRotacion[]>(() => {
    const conFalta = this.examen.rotacionesConFaltaVisible();
    return this.examen.rotacionesExaminablesActuales().map((rotacion) => ({
      rotacion,
      tieneFalta: conFalta.has(rotacion),
    }));
  });

  /** Fichas dadas (atenuadas, no arrastrables) más las ya colocadas por el alumno. Sin corregir
   * todavía la rotación activa, el estado siempre es 'normal' para las del alumno — eso
   * delataría la corrección antes de validar (spec 057, E6). Una vez validada, se tiñen de falta
   * o normal según corresponda, igual que en Edición. */
  protected readonly fichas = computed<readonly FichaVista[]>(() => {
    const correccion = this.examen.correccionRotacionActiva();
    const idsEnFalta = new Set(correccion?.faltas.flatMap((f) => f.jugadores.map((j) => j.id)) ?? []);
    const dadas = this.examen.dadosDeLaRotacion().map(
      (c): FichaVista => ({
        id: c.jugador.id,
        punto: c.punto,
        etiqueta: etiquetaDe(c.jugador, CONFIGURACION_ROLES_POR_DEFECTO),
        etiquetaPosicion: '',
        estado: 'dada',
        linea: 'delantera',
        esLibero: c.jugador.rol === 'libero',
        seleccionada: false,
      }),
    );
    const colocadas = this.examen.colocadosDeLaRotacion().map(
      (c): FichaVista => ({
        id: c.jugador.id,
        punto: c.punto,
        etiqueta: etiquetaDe(c.jugador, CONFIGURACION_ROLES_POR_DEFECTO),
        etiquetaPosicion: '',
        estado: idsEnFalta.has(c.jugador.id) ? 'falta' : 'normal',
        linea: 'delantera',
        esLibero: c.jugador.rol === 'libero',
        seleccionada: false,
      }),
    );
    return [...dadas, ...colocadas];
  });

  /** Faltas de la rotación activa, ya traducidas para `PanelValidacion` (spec 057, E7): mismo
   * aviso que usa Edición, con los jugadores implicados. */
  protected readonly infraccionesRotacion = computed<ItemValidacion[]>(() => itemsDe(this.examen.correccionRotacionActiva()?.faltas ?? []));

  protected readonly fichasComparadas = computed<readonly FichaComparada[]>(() =>
    this.comparando() ? this.examen.comparacionRotacionActiva() : [],
  );

  protected readonly pendientesChips = computed<readonly ChipJugador[]>(() =>
    this.examen.pendientes().map((j) => ({ id: j.id, etiqueta: etiquetaDe(j, CONFIGURACION_ROLES_POR_DEFECTO) })),
  );

  /** Para el examen en curso: si la rotación activa ya se validó (spec 060) — no si se ve su
   * veredicto, que durante el examen nunca. */
  protected readonly rotacionValidada = computed(() => this.examen.rotacionRegistrada());

  /** Texto corto del botón comparar del boletín (spec 059, móvil primero): el label dice qué
   * hace en dos palabras como mucho; la rotación con la que se compara va aparte, en pequeño. */
  protected readonly textoComparar = computed(() => (this.comparando() ? 'Solo la mía' : 'Comparar'));

  protected seleccionarEquipo(equipo: 'masculino' | 'femenino'): void {
    this.examen.seleccionarEquipo(equipo);
  }

  protected elegirSistema(id: string): void {
    this.examen.activarSistema(id);
  }

  protected elegirTipo(tipo: TipoExamen): void {
    this.examen.seleccionarTipo(tipo);
  }

  protected elegirTitular(titularId: string): void {
    this.examen.seleccionarTitular(titularId);
  }

  protected pedirInicio(): void {
    this.pidiendoInicio.set(true);
  }

  protected cancelarInicio(): void {
    this.pidiendoInicio.set(false);
  }

  protected empezar(): void {
    this.pidiendoInicio.set(false);
    this.examen.empezarExamen();
  }

  /** Cerrar el modal de configuración (spec 057, E1): si el sub-diálogo "¿Empezamos?" está
   * abierto, Escape lo cierra solo a él; si no, se abandona la ventana Examen. */
  protected cerrarConfiguracion(): void {
    if (this.pidiendoInicio()) {
      this.pidiendoInicio.set(false);
      return;
    }
    this.salir.emit();
  }

  protected pedirReinicio(): void {
    this.reiniciando.set(true);
  }

  protected cancelarReinicio(): void {
    this.reiniciando.set(false);
  }

  protected confirmarReinicio(): void {
    this.reiniciando.set(false);
    this.examen.cancelarExamen();
  }

  /** `SelectorRotacion.seleccionar` emite `number` a secas (lo comparte con cualquier posible
   * consumidor futuro): siempre es una de las rotaciones que ya pasamos como examinables. */
  protected seleccionarRotacion(rotacion: number): void {
    this.examen.seleccionarRotacion(rotacion as RotacionValida);
  }

  protected onAgarrarPaleta(chip: ChipAgarrado): void {
    const jugador = this.examen.jugadoresDelAlumno().find((j: Jugador) => j.id === chip.id);
    if (!jugador) {
      return;
    }
    this.iniciarArrastre(chip.id, chip.evento);
  }

  protected onAgarrarFicha(agarrada: FichaAgarrada): void {
    const colocado = this.examen.colocadosDeLaRotacion().find((c) => c.jugador.id === agarrada.id);
    if (!colocado) {
      return;
    }
    this.iniciarArrastre(agarrada.id, agarrada.evento);
  }

  private iniciarArrastre(jugadorId: string, evento: PointerEvent): void {
    evento.preventDefault();
    const pista = this.pistaCmp();
    pista.capturarPuntero(evento);

    const mover = (e: PointerEvent): void => {
      if (pista.contiene(e)) {
        this.examen.colocar(jugadorId, pista.puntoDesde(e));
      }
    };

    const limpiar = (e: PointerEvent): void => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      pista.liberarPuntero(e);
    };

    const soltar = (e: PointerEvent): void => {
      limpiar(e);
      if (pista.contiene(e)) {
        this.examen.colocar(jugadorId, pista.puntoDesde(e));
      } else {
        this.examen.quitar(jugadorId);
      }
    };

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  }

  protected pedirVaciado(): void {
    this.examen.vaciarRotacion();
  }

  protected validarRotacion(): void {
    this.examen.confirmarRotacion();
  }

  protected async terminarExamen(): Promise<void> {
    await this.examen.terminarExamen();
  }

  protected alternarComparar(): void {
    this.comparando.update((valor) => !valor);
  }
}
