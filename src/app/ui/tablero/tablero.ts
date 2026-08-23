import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { PALETA_COLORES, Pista, type CeldaConjunto, type FichaAgarrada, type FichaVista } from '../pista/pista';
import { SelectorRotacion, type EstadoRotacion } from '../rotaciones/selector-rotacion';
import { SelectorCaso } from '../rotaciones/selector-caso';
import { SelectorSituacion } from '../rotaciones/selector-situacion';
import { PanelValidacion, type ItemValidacion } from '../panel/panel-validacion';
import { PaletaJugadores, type ChipAgarrado, type ChipJugador } from '../panel/paleta-jugadores';
import { PanelEnsenanza } from '../panel/panel-ensenanza';
import { DialogoConfirmacion } from '../comun/dialogo-confirmacion';
import { Speeddial, type AccionSpeeddial } from '../comun/speeddial';
import { BarraSistemas, type OpcionSistema } from '../sistemas/barra-sistemas';
import { DialogoSistema, type DatosSistema } from '../sistemas/dialogo-sistema';
import { SelectorEquipo } from '../sistemas/selector-equipo';
import { PanelAjustes, type OpcionLibero } from '../ajustes/panel-ajustes';
import { SistemaStore, type ColocacionBorrador, type RotacionValida } from '../../application/sistema.store';
import { jugadoresEnPista, zaguerosEnRotacion } from '../../domain/rotacion';
import { validarFormacion } from '../../domain/validacion';
import { situacionMasCercana } from '../../domain/defensa';
import { celdaDe, celdasDeTrazo } from '../../domain/rejilla';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from '../../domain/roles';
import { claveOrdenRol } from '../comun/orden-roles';
import type {
  CasoColocador,
  Celda,
  Colocacion,
  EquipoId,
  Formacion,
  Infraccion,
  Jugador,
  PuestoDefensa,
  Punto,
  ResultadoValidacion,
  SituacionDefensa,
} from '../../domain/modelos';

/** Etiqueta doble de cada puesto de defensa, según su línea (spec 038, E12): sin depender de
 * ninguna rotación ni de la plantilla activa — se deriva del puesto, es fijo. */
const ETIQUETA_PUESTO: Readonly<Record<PuestoDefensa, string>> = {
  1: 'C/O',
  2: 'C/O',
  3: 'C1/C2',
  4: 'R1/R2',
  5: 'L',
  6: 'R1/R2',
};

function esPuestoDelantero(puesto: PuestoDefensa): boolean {
  return puesto === 2 || puesto === 3 || puesto === 4;
}

/** Índice de color de un puesto de defensa en la vista de conjunto (spec 023/038): fijo por
 * puesto, igual que hoy se deriva por rol — un color estable independiente de quién ocupe el
 * puesto en la realidad, porque en defensa ya no hay "quién". */
const INDICE_COLOR_POR_PUESTO: Readonly<Record<PuestoDefensa, number>> = { 1: 0, 2: 5, 3: 3, 4: 1, 5: 6, 6: 2 };

const ROTACIONES: readonly RotacionValida[] = [1, 2, 3, 4, 5, 6];
// Orden en que las rotaciones ocurren realmente al jugar (P2→P1→P6→P5→P4→P3→P2), alternativa
// al orden numérico simple — ajuste del usuario, ver PanelAjustes.
const ROTACIONES_ORDEN_JUEGO: readonly RotacionValida[] = [1, 6, 5, 4, 3, 2];

// Límites de arrastre: el campo propio va de 0 a 9 m en los dos ejes (pista.html,
// `.app-pista__campo`), y nadie del propio equipo puede salirse por ningún lado — ni cruzar la
// red (`y = 0`), ni salirse por las bandas o por el fondo. Antes los lados y el fondo tenían
// 0,3 m de margen y se veía al jugador pisando fuera del campo; la red nunca lo tuvo.
const LIMITE_X: readonly [number, number] = [0, 9];
const LIMITE_Y: readonly [number, number] = [0, 9];

// La ficha del atacante solo se mueve dentro del campo rival (spec 038, continúa la 021): ahí es
// de donde `situacionMasCercana` deriva la situación, y no tiene sentido soltarla fuera de él.
const LIMITE_X_RIVAL: readonly [number, number] = [0, 9];
const LIMITE_Y_RIVAL: readonly [number, number] = [-4, 0];

// El índice de color de la vista de conjunto (spec 023) se deriva del mismo orden fijo de
// roles que ya usan el banquillo y la leyenda de etiquetas — nunca se declara a mano, así que
// dos jugadores con el mismo rol e índice comparten color aunque sean de plantillas distintas.
const CLAVES_ORDEN_COLOR = [
  claveOrdenRol('colocador'),
  claveOrdenRol('receptor', 1),
  claveOrdenRol('receptor', 2),
  claveOrdenRol('central', 1),
  claveOrdenRol('central', 2),
  claveOrdenRol('opuesto'),
  claveOrdenRol('libero'),
];

function indiceColorDe(jugador: Jugador): number {
  return CLAVES_ORDEN_COLOR.indexOf(claveOrdenRol(jugador.rol, jugador.indice));
}

// El arrastre no se arma al primer píxel: hace falta superar este desplazamiento en pantalla
// o mantener pulsado este tiempo, lo que ocurra antes. Mientras no está armado, un
// pointerdown+pointerup sobre una ficha ya en pista cuenta como un toque y selecciona en vez
// de arrastrar (spec 010, E9-E10 vs E12) — el retardo es lo que hace ese toque marcable sin
// que arrastrar la ficha por error.
const RETARDO_ARRASTRE_MS = 150;
const UMBRAL_ARRASTRE_PX = 8;

type DialogoSistemaAbierto = 'crear' | 'editar' | 'clonar' | null;

type Ventana = 'editor' | 'examen' | 'cuenta';

type PestanaTablero = 'banquillo' | 'ensenanza' | 'zonas' | 'ajustes';

/** Entrada de la leyenda de colores de la vista de conjunto (spec 023): qué color le tocó a
 * cada jugador, para la pestaña "Zonas". */
export interface EntradaLeyendaColor {
  readonly etiqueta: string;
  readonly indiceColor: number;
}

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

function acotarPuntoRival(punto: Punto): Punto {
  return { x: acotar(punto.x, LIMITE_X_RIVAL), y: acotar(punto.y, LIMITE_Y_RIVAL) };
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
function colocacionMasCercana(formacion: readonly ColocacionBorrador[], punto: Punto): ColocacionBorrador | null {
  return formacion.reduce<ColocacionBorrador | null>((mejor, actual) => {
    if (!mejor || distancia(actual.punto, punto) < distancia(mejor.punto, punto)) {
      return actual;
    }
    return mejor;
  }, null);
}

/** El identificador de a quién ocupa una colocación del borrador, igual que en el store: el id
 * del jugador en recepción, o `p${puesto}` en defensa (spec 038). Se repite aquí en vez de
 * importarlo porque en el store es privado — es fontanería de UI, no una regla de dominio. */
function idOcupanteDe(colocacion: ColocacionBorrador): string {
  return 'jugador' in colocacion ? colocacion.jugador.id : `p${colocacion.puesto}`;
}

/** La etiqueta de una colocación del borrador: derivada del rol en recepción (`etiquetaDe`), o
 * fija por puesto en defensa (spec 038, E12 — no depende de rol ni de plantilla). */
function etiquetaOcupanteDe(colocacion: ColocacionBorrador): string {
  return 'jugador' in colocacion ? etiquetaDe(colocacion.jugador, CONFIGURACION_ROLES_POR_DEFECTO) : ETIQUETA_PUESTO[colocacion.puesto];
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
    SelectorCaso,
    SelectorSituacion,
    PanelValidacion,
    PaletaJugadores,
    PanelEnsenanza,
    DialogoConfirmacion,
    Speeddial,
    BarraSistemas,
    DialogoSistema,
    SelectorEquipo,
    PanelAjustes,
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
  protected readonly confirmandoVaciado = signal(false);
  protected readonly confirmandoGuardado = signal(false);

  /** Navegación de ventana: hoy solo "Editor" está implementado; "Examen" y "Cuenta" son el
   * hueco de las specs 012-013 y 035-037 (aplazadas, ADR 0028), sin funcionalidad todavía. */
  protected readonly ventana = signal<Ventana>('editor');

  protected readonly tab = signal<PestanaTablero>('banquillo');
  protected readonly panelPlegado = signal(false);

  /** Nombres de variable CSS, en el mismo orden que `CLAVES_ORDEN_COLOR`: la pestaña "Zonas"
   * pinta cada muestra con `var(paletaColores[indiceColor])`. */
  protected readonly paletaColores = PALETA_COLORES;

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

  protected readonly infracciones = computed(() => itemsDe(this.store.resultadoValidacion()?.infracciones ?? []));
  protected readonly avisos = computed(() => itemsDe(this.store.resultadoValidacion()?.avisos ?? []));

  /** En defensa un puesto delantero se pinta en línea delantera y el resto en zaga (spec 038,
   * E12): es fijo por puesto, no depende de ninguna rotación. En recepción sigue derivándose de
   * la posición rotacional real. */
  protected readonly fichas = computed<readonly FichaVista[]>(() => {
    if (this.esDefensa()) {
      const seleccionadoId = this.store.jugadorSeleccionadoId();
      return this.store.borrador().map((colocacion) => {
        const puesto = (colocacion as { puesto: PuestoDefensa }).puesto;
        const id = `p${puesto}`;
        return {
          id,
          punto: colocacion.punto,
          etiqueta: ETIQUETA_PUESTO[puesto],
          posicion: 0,
          estado: 'normal' as const,
          linea: esPuestoDelantero(puesto) ? ('delantera' as const) : ('zaguera' as const),
          esLibero: puesto === 5,
          seleccionada: id === seleccionadoId,
        };
      });
    }
    const resultado = this.store.resultadoValidacion();
    const posicionPorId = this.posicionPorId();
    const seleccionadoId = this.store.jugadorSeleccionadoId();
    return this.store.borrador().map((colocacion) => {
      const c = colocacion as Colocacion;
      const posicionRotacional = posicionPorId.get(c.jugador.id) ?? 0;
      return {
        id: c.jugador.id,
        punto: c.punto,
        etiqueta: etiquetaDe(c.jugador, CONFIGURACION_ROLES_POR_DEFECTO),
        posicion: posicionRotacional,
        estado: estadoDe(resultado, c.jugador.id),
        linea: esLineaDelantera(posicionRotacional) ? 'delantera' : 'zaguera',
        esLibero: c.jugador.rol === 'libero',
        seleccionada: c.jugador.id === seleccionadoId,
      };
    });
  });

  /** El índice de color de una colocación del borrador: por rol en recepción, fijo por puesto en
   * defensa (spec 038) — igual de estable, porque en defensa ya no hay "quién" que lo derive. */
  private indiceColorDeColocacion(colocacion: ColocacionBorrador): number {
    return 'jugador' in colocacion ? indiceColorDe(colocacion.jugador) : INDICE_COLOR_POR_PUESTO[colocacion.puesto];
  }

  /** Índice de color del ocupante seleccionado (spec 024): qué zona de `celdasVistaConjunto` se
   * pinta a plena intensidad; las de los demás se atenúan (E12). `null` si no hay nadie
   * seleccionado, y entonces ninguna se destaca (E13). */
  protected readonly indiceColorSeleccionado = computed<number | null>(() => {
    const id = this.store.jugadorSeleccionadoId();
    const colocacion = this.store.borrador().find((c) => idOcupanteDe(c) === id);
    return colocacion ? this.indiceColorDeColocacion(colocacion) : null;
  });

  /** Todas las celdas pintadas de la formación activa, con el índice de color de cada ocupante
   * que la cubre (spec 023, E1); varios índices en la misma celda si la comparten (E3). El
   * ocupante seleccionado aporta sus celdas efectivas (spec 024): incluye el bloque por defecto
   * si todavía no ha pintado nada — los demás solo lo que tengan pintado de verdad. */
  protected readonly celdasVistaConjunto = computed<readonly CeldaConjunto[]>(() => {
    const seleccionadoId = this.store.jugadorSeleccionadoId();
    const porClave = new Map<string, { columna: number; fila: number; indices: number[] }>();
    for (const colocacion of this.store.borrador()) {
      const indice = this.indiceColorDeColocacion(colocacion);
      const celdas = idOcupanteDe(colocacion) === seleccionadoId ? this.store.celdasJugadorSeleccionado() : (colocacion.celdas ?? []);
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
  });

  /** Leyenda de la vista de conjunto: los seis, con o sin zona pintada (spec 023, E2). */
  protected readonly leyendaVistaConjunto = computed<readonly EntradaLeyendaColor[]>(() =>
    this.store.borrador().map((colocacion) => ({
      etiqueta: etiquetaOcupanteDe(colocacion),
      indiceColor: this.indiceColorDeColocacion(colocacion),
    })),
  );

  /** El banquillo de jugadores sin colocar solo existe en recepción (spec 038): en defensa los
   * seis puestos son fijos, no hay jugadores de los que tirar. */
  protected readonly pendientesChips = computed<readonly ChipJugador[]>(() => {
    if (this.esDefensa()) {
      return [];
    }
    const posiciones = this.store.posicionesActivas();
    if (!posiciones) {
      return [];
    }
    const colocadosIds = new Set(this.store.borrador().map((c) => idOcupanteDe(c)));
    return posiciones
      .filter((jugador) => !colocadosIds.has(jugador.id))
      .sort((a, b) => claveOrdenRol(a.rol, a.indice) - claveOrdenRol(b.rol, b.indice))
      .map((jugador) => ({ id: jugador.id, etiqueta: etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO) }));
  });

  protected readonly estadosRotacion = computed<readonly EstadoRotacion[]>(() => {
    const orden = this.store.ordenRotacionCronologico() ? ROTACIONES_ORDEN_JUEGO : ROTACIONES;
    const sistema = this.store.sistemaActivo();
    if (!sistema) {
      return orden.map((rotacion) => ({ rotacion, tieneFalta: false }));
    }
    return orden.map((rotacion) => {
      const formacion = sistema.formaciones[rotacion] ?? [];
      const posiciones = jugadoresEnPista(sistema.plantilla, rotacion);
      const tieneFalta = formacion.length === 6 && validarFormacion(formacion, posiciones).infracciones.length > 0;
      return { rotacion, tieneFalta };
    });
  });

  /**
   * Opciones del selector "líbero sustituye a": solo los tres zagueros de la rotación activa
   * (el líbero no puede sustituir a un delantero, FIVB 19.3.1.1), con el central en zaga
   * primero — el caso típico del 5-1 —, luego "Ninguno", y el resto en el orden fijo de
   * `orden-roles.ts`. Si ninguna central cae en zaga (plantilla sin la separación habitual),
   * no se inventa una.
   */
  protected readonly opcionesSustitutoLibero = computed<readonly OpcionLibero[]>(() => {
    const orden = this.store.sistemaActivo()?.plantilla.ordenSaque;
    if (!orden) {
      return [];
    }
    const opcion = (jugador: Jugador): OpcionLibero => ({
      id: jugador.id,
      etiqueta: etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO),
    });
    const zagueros = zaguerosEnRotacion(orden, this.store.rotacionActiva());
    const centralEnZaga = zagueros.find((j) => j.rol === 'central') ?? null;
    const resto = zagueros
      .filter((j) => j !== centralEnZaga)
      .sort((a, b) => claveOrdenRol(a.rol, a.indice) - claveOrdenRol(b.rol, b.indice));
    return [
      ...(centralEnZaga ? [opcion(centralEnZaga)] : []),
      { id: null, etiqueta: 'Ninguno' },
      ...resto.map(opcion),
    ];
  });

  protected readonly tieneLibero = computed(() => !!this.store.sistemaActivo()?.plantilla.libero);

  protected readonly esDefensa = computed(() => this.store.sistemaActivo()?.tipo === 'defensa');

  /**
   * Si lo guardado ya no está entre las opciones (p. ej. quedó de antes de filtrar el
   * desplegable a solo zagueros), se ve "Ninguno" — coherente con lo que `jugadoresEnPista` ya
   * hace con ese valor: ignorarlo. No se reescribe lo guardado, solo lo que se muestra.
   */
  protected readonly sustitutoLiberoActual = computed(() => {
    const libero = this.store.sistemaActivo()?.plantilla.libero;
    if (!libero) {
      return null;
    }
    const sustituidoId = libero.sustitutosPorRotacion[this.store.rotacionActiva()];
    const esOpcionValida = this.opcionesSustitutoLibero().some((opcion) => opcion.id === sustituidoId);
    return esOpcionValida ? sustituidoId : null;
  });

  protected readonly opcionesSistema = computed<readonly OpcionSistema[]>(() =>
    this.store.catalogo().map((sistema) => ({ id: sistema.id, nombre: sistema.nombre, tipo: sistema.tipo })),
  );

  /** Acciones del Speeddial: renombrar/clonar/borrar solo tienen sentido con un sistema activo
   * (mismo criterio que hoy el `[disabled]` de `BarraSistemas`), así que se deshabilitan sin
   * desaparecer — perder de vista el motivo por el que están bloqueadas sería peor. */
  protected readonly accionesSistema = computed<readonly AccionSpeeddial[]>(() => {
    const haySistema = this.store.sistemaActivoId() !== null;
    return [
      { id: 'crear', etiqueta: 'Nuevo sistema', icono: 'nuevo' },
      { id: 'renombrar', etiqueta: 'Renombrar', icono: 'lapiz', deshabilitada: !haySistema },
      { id: 'clonar', etiqueta: 'Clonar', icono: 'clonar', deshabilitada: !haySistema },
      { id: 'borrar', etiqueta: 'Borrar', icono: 'papelera', peligro: true, deshabilitada: !haySistema },
    ];
  });

  protected readonly tituloDescripcionSistema = computed(() => `Sistema · ${this.store.sistemaActivo()?.nombre ?? ''}`);

  /** Nombre sugerido al abrir el diálogo de clonar (spec 026, E7): «‹Nombre del original›
   * (copia)», editable antes de confirmar. */
  protected readonly nombreClonSugerido = computed(() => {
    const nombre = this.store.sistemaActivo()?.nombre;
    return nombre ? `${nombre} (copia)` : '';
  });

  /** Etiqueta legible de la situación activa, para el título de enseñanza en defensa. */
  private readonly ETIQUETAS_SITUACION: Readonly<Record<SituacionDefensa, string>> = {
    inicial: 'Inicial',
    z4: 'Ataque por 4',
    z3: 'Ataque por 3',
    z2: 'Ataque por 2',
    z1: 'Ataque por 1',
    pipe: 'Pipe',
  };

  protected readonly tituloEnsenanza = computed(() => {
    const base = this.esDefensa()
      ? `Enseñanza · ${this.ETIQUETAS_SITUACION[this.store.situacionActiva()]}`
      : `Enseñanza · R${this.store.rotacionActiva()}`;
    const seleccionadoId = this.store.jugadorSeleccionadoId();
    if (!seleccionadoId) {
      return base;
    }
    const colocacion = this.store.borrador().find((c) => idOcupanteDe(c) === seleccionadoId);
    return colocacion ? `${base} · ${etiquetaOcupanteDe(colocacion)}` : base;
  });

  protected seleccionarRotacion(rotacion: number): void {
    this.store.seleccionarRotacion(rotacion as RotacionValida);
  }

  protected seleccionarCaso(caso: CasoColocador): void {
    this.store.seleccionarCaso(caso);
  }

  protected seleccionarSituacion(situacion: SituacionDefensa): void {
    this.store.seleccionarSituacion(situacion);
  }

  protected elegirSistema(id: string): void {
    this.store.activarSistema(id);
  }

  protected elegirEquipo(equipoId: EquipoId): void {
    this.store.seleccionarEquipo(equipoId);
  }

  protected confirmarCambio(): void {
    this.store.confirmarCambio();
  }

  protected cancelarCambio(): void {
    this.store.cancelarCambio();
  }

  protected reintentarGuardado(): void {
    this.store.errorGuardado()?.reintentar();
  }

  protected cerrarErrorGuardado(): void {
    this.store.cerrarError();
  }

  protected abrirCrear(): void {
    this.dialogoSistema.set('crear');
  }

  protected abrirEditar(): void {
    if (this.store.sistemaActivo()) {
      this.dialogoSistema.set('editar');
    }
  }

  protected abrirClonar(): void {
    if (this.store.sistemaActivo()) {
      this.dialogoSistema.set('clonar');
    }
  }

  protected cancelarDialogoSistema(): void {
    this.dialogoSistema.set(null);
  }

  protected confirmarDialogoSistema(datos: DatosSistema): void {
    const modo = this.dialogoSistema();
    if (modo === 'crear') {
      this.store.crear(datos.nombre, datos.tipo, datos.equipoId);
    } else if (modo === 'clonar') {
      this.store.clonar(datos.nombre);
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

  protected guardarDescripcionSistema(texto: string): void {
    this.store.guardarDescripcion(texto);
  }

  protected onAgarrarPaleta(chip: ChipAgarrado): void {
    const jugador = this.store.posicionesActivas()?.find((j) => j.id === chip.id);
    if (!jugador) {
      return;
    }
    this.iniciarArrastre(chip.id, etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO), chip.evento, 'paleta');
  }

  /** Pulsar la pestaña ya activa pliega el panel en vez de no hacer nada — así el entrenador
   * recupera el alto de la pista sin tener que elegir otra pestaña primero. */
  protected seleccionarTab(id: PestanaTablero): void {
    if (id === this.tab()) {
      this.panelPlegado.update((valor) => !valor);
      return;
    }
    this.tab.set(id);
    this.panelPlegado.set(false);
  }

  protected elegirAccionSistema(id: string): void {
    if (id === 'crear') {
      this.abrirCrear();
    } else if (id === 'renombrar') {
      this.abrirEditar();
    } else if (id === 'clonar') {
      this.abrirClonar();
    } else if (id === 'borrar') {
      this.pedirBorrado();
    }
  }

  protected cambiarSustitutoLibero(sustituidoId: string | null): void {
    this.store.cambiarSustitutoLibero(this.store.rotacionActiva(), sustituidoId);
  }

  protected alternarValidacion(): void {
    this.store.alternarValidacion();
  }

  protected alternarAyudaPosicion(): void {
    this.store.alternarAyudaPosicion();
  }

  protected alternarOrdenRotacion(): void {
    this.store.alternarOrdenRotacion();
  }

  protected alternarMostrarNumerosMetros(): void {
    this.store.alternarMostrarNumerosMetros();
  }

  protected onAgarrarFicha(agarrada: FichaAgarrada): void {
    const borrador = this.store.borrador();
    const punto = this.pistaCmp().puntoDesde(agarrada.evento);
    const colocacion = colocacionMasCercana(borrador, punto) ?? borrador.find((c) => idOcupanteDe(c) === agarrada.id);
    if (!colocacion) {
      return;
    }
    this.iniciarArrastre(idOcupanteDe(colocacion), etiquetaOcupanteDe(colocacion), agarrada.evento, 'pista');
  }

  /**
   * Arrastre de la ficha del atacante "A" (spec 038, continúa la 021): mucho más simple que
   * `iniciarArrastre` porque no hay tap-vs-drag que distinguir (la ficha no se selecciona) ni
   * puesto que colocar — solo un fantasma que sigue al puntero y, al soltar, deriva la
   * situación del punto de caída.
   */
  protected onAgarrarRival(evento: PointerEvent): void {
    evento.preventDefault();
    this.pistaCmp().capturarPuntero(evento);
    this.arrastre.set({ jugadorId: '__rival__', etiqueta: 'Atacante', clientX: evento.clientX, clientY: evento.clientY });

    const mover = (e: PointerEvent): void => {
      this.arrastre.update((actual) => (actual ? { ...actual, clientX: e.clientX, clientY: e.clientY } : actual));
    };

    const limpiar = (e: PointerEvent): void => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', cancelar);
      this.pistaCmp().liberarPuntero(e);
    };

    const soltar = (e: PointerEvent): void => {
      limpiar(e);
      const punto = acotarPuntoRival(this.pistaCmp().puntoDesde(e));
      this.arrastre.set(null);
      this.store.seleccionarSituacion(situacionMasCercana(punto, this.store.casoActivo()));
    };

    const cancelar = (e: PointerEvent): void => {
      limpiar(e);
      this.arrastre.set(null);
    };

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', cancelar);
  }

  /**
   * Modo pintar (spec 022, solo en defensa desde la spec 024): con un jugador seleccionado,
   * arrastrar por el fondo de la pista pinta o borra celdas para él en vez de mover fichas. El
   * primer punto tocado decide el modo del trazo entero — pintar si esa celda no era suya,
   * borrar si ya lo era — para que un arrastre no alterne entre pintar y borrar celda a celda.
   * Si el trazo se cierra (vuelve cerca de donde empezó), al soltar se rellena lo que encierra
   * (spec 024, E9-E11). Sin jugador seleccionado, el fondo se queda inerte. En recepción, donde
   * el fondo no pinta, pinchar fuera con alguien seleccionado lo deselecciona en su lugar (spec
   * 027) — en defensa el fondo sigue pintando exactamente igual que hoy, sin ese atajo.
   */
  protected iniciarPintado(evento: PointerEvent): void {
    const jugadorId = this.store.jugadorSeleccionadoId();
    if (!jugadorId) {
      return;
    }
    if (!this.esDefensa()) {
      this.store.deseleccionarJugador();
      return;
    }
    evento.preventDefault();
    this.pistaCmp().capturarPuntero(evento);

    let modo: 'pintar' | 'borrar' | null = null;
    const tocadas = new Set<string>();
    const trazo: Celda[] = [];

    const aplicar = (celda: Celda): void => {
      if (modo === 'pintar') {
        this.store.pintarCelda(jugadorId, celda);
      } else {
        this.store.borrarCelda(jugadorId, celda);
      }
    };

    const procesar = (e: PointerEvent): void => {
      const celda = celdaDe(this.pistaCmp().puntoDesde(e));
      if (!celda) {
        return;
      }
      const clave = `${celda.columna},${celda.fila}`;
      if (tocadas.has(clave)) {
        return;
      }
      tocadas.add(clave);
      trazo.push(celda);
      if (modo === null) {
        const yaPintada = this.store.celdasJugadorSeleccionado().some((c) => c.columna === celda.columna && c.fila === celda.fila);
        modo = yaPintada ? 'borrar' : 'pintar';
      }
      aplicar(celda);
    };

    procesar(evento);

    const mover = (e: PointerEvent): void => procesar(e);

    const limpiar = (e: PointerEvent): void => {
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', soltar);
      window.removeEventListener('pointercancel', soltar);
      this.pistaCmp().liberarPuntero(e);
    };

    const soltar = (e: PointerEvent): void => {
      limpiar(e);
      if (!modo || trazo.length === 0) {
        return;
      }
      for (const celda of celdasDeTrazo(trazo)) {
        const clave = `${celda.columna},${celda.fila}`;
        if (!tocadas.has(clave)) {
          aplicar(celda);
        }
      }
    };

    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', soltar);
    window.addEventListener('pointercancel', soltar);
  }

  private irAEnsenanza(): void {
    this.tab.set('ensenanza');
    this.panelPlegado.set(false);
  }

  protected pedirVaciado(): void {
    this.confirmandoVaciado.set(true);
  }

  protected cancelarVaciado(): void {
    this.confirmandoVaciado.set(false);
  }

  protected confirmarVaciado(): void {
    this.confirmandoVaciado.set(false);
    this.store.vaciar();
  }

  protected pedirGuardado(): void {
    this.confirmandoGuardado.set(true);
  }

  protected cancelarGuardado(): void {
    this.confirmandoGuardado.set(false);
  }

  protected confirmarGuardado(): void {
    this.confirmandoGuardado.set(false);
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
        const colocacion = this.store.borrador().find((c) => idOcupanteDe(c) === jugadorId);
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
          // Terminar un arrastre que coloca la ficha la deja seleccionada (spec 027, E1/E2):
          // venga de la pista (se reposiciona) o del banquillo (se coloca por primera vez).
          this.store.enfocarJugador(jugadorId);
          this.irAEnsenanza();
        } else if (origen === 'pista') {
          this.store.quitar(jugadorId);
        }
      }
      this.arrastre.set(null);
      // Nunca se armó: es un toque, no un arrastre. Sobre el banquillo no hay nada que
      // seleccionar (spec 010, E9/E10/E12).
      if (origen === 'pista' && !armado) {
        this.store.seleccionarJugador(jugadorId);
        // `seleccionarJugador` alterna: un segundo toque deselecciona, y entonces no hay nada
        // que enseñar todavía.
        if (this.store.jugadorSeleccionadoId() === jugadorId) {
          this.irAEnsenanza();
        }
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
