export interface Punto {
  readonly x: number;
  readonly y: number;
}

export type RolId = 'colocador' | 'receptor' | 'central' | 'opuesto' | 'libero';

export interface Jugador {
  readonly id: string;
  readonly rol: RolId;
  readonly indice?: 1 | 2;
}

export interface DefinicionRol {
  readonly nombre: string;
  readonly abreviatura: string;
  readonly llevaIndice: boolean;
}

export type ConfiguracionRoles = Readonly<Record<RolId, DefinicionRol>>;

export interface ColisionAbreviatura {
  readonly abreviatura: string;
  readonly roles: readonly RolId[];
}

/** Los seis jugadores del equipo ordenados P1..P6 en la rotación inicial (R1). */
export type OrdenSaque = readonly [Jugador, Jugador, Jugador, Jugador, Jugador, Jugador];

/**
 * A quién sustituye el líbero, decidido rotación a rotación (spec 017): puede sustituir a un
 * titular distinto en cada una de las seis, o a ninguno (`null`) en las que no entra a propósito.
 * No puede existir un líbero declarado sin decidir, para las seis rotaciones, a quién sustituye
 * — de ahí que el mapa cubra siempre 1..6, nunca un subconjunto (spec 011, precisado por 017).
 */
export interface SustitucionLibero {
  readonly jugador: Jugador;
  readonly sustitutosPorRotacion: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, string | null>>;
}

/**
 * Un equipo guardado con nombre. Inmutable: no se modifica su orden de saque una vez creada.
 * `ordenSaque` son siempre los seis titulares; el líbero (si lo hay) vive aparte, porque no
 * ocupa una plaza fija — entra y sale según la rotación (spec 011, FIVB 19.3.1.1).
 */
export interface PlantillaEquipo {
  readonly nombre: string;
  readonly ordenSaque: OrdenSaque;
  readonly libero?: SustitucionLibero;
}

export type TipoSistema = 'recepcion' | 'defensa';

/** El equipo al que pertenece un sistema (spec 032). Fijos por ahora, igual que la plantilla es
 * hoy una única constante de la aplicación (ADR 0013); equipos de verdad llegan con la base de
 * datos. */
export type EquipoId = 'masculino' | 'femenino';

/** Por dónde ataca el rival: los tres tercios de la línea delantera, o el pipe por el centro
 * de zaga (spec 021). Se deriva de dónde se suelta la ficha rival; nunca se declara a mano. */
export type ViaAtaque = 'z4' | 'z3' | 'z2' | 'pipe';

/** Un sistema con nombre y tipo, ligado a una plantilla, con hasta seis formaciones (una por Rn). */
export interface Sistema {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoSistema;
  /** Equipo al que pertenece (spec 032). El catálogo se filtra por él; la unicidad del nombre
   * se comprueba dentro de (equipoId, tipo), no globalmente. */
  readonly equipoId: EquipoId;
  readonly plantilla: PlantillaEquipo;
  readonly formaciones: Readonly<Partial<Record<1 | 2 | 3 | 4 | 5 | 6, Formacion>>>;
  /** Explicación general del sistema, independiente de cualquier rotación. Voluntaria (spec 025). */
  readonly descripcion?: string;
  /** Explicación de enseñanza de conjunto para cada rotación guardada. Voluntaria. */
  readonly explicacionesRotacion: Readonly<Partial<Record<1 | 2 | 3 | 4 | 5 | 6, string>>>;
  /** Formaciones de defensa, por rotación y por vía de ataque (spec 021). Ausente en un sistema
   * de recepción, o mientras no se haya guardado ninguna defensa todavía. */
  readonly defensas?: Readonly<Partial<Record<1 | 2 | 3 | 4 | 5 | 6, Readonly<Partial<Record<ViaAtaque, Formacion>>>>>>;
}

/** Una celda de la rejilla de responsabilidad, de `TAMANO_CELDA` metros de lado (`rejilla.ts`,
 * ADR 0004). */
export interface Celda {
  readonly columna: number;
  readonly fila: number;
}

export interface Colocacion {
  readonly jugador: Jugador;
  readonly punto: Punto;
  /** Explicación de enseñanza para este jugador en esta rotación. Voluntaria. */
  readonly explicacion?: string;
  /** Celdas de la rejilla de responsabilidad que este jugador cubre (spec 022). Voluntaria: sin
   * celdas pintadas, ausente. */
  readonly celdas?: readonly Celda[];
}

/** Dónde se coloca cada jugador del orden de saque, para una rotación concreta. */
export type Formacion = readonly Colocacion[];

export type TipoComparacion = 'zaguero-delantero' | 'orden-lateral' | 'libero-delantero';

export interface Infraccion {
  readonly tipo: TipoComparacion;
  readonly jugadores: readonly Jugador[];
}

/** Comparación que cumple la regla pero por menos del margen de tolerancia. No es una infracción. */
export interface Aviso {
  readonly tipo: TipoComparacion;
  readonly jugadores: readonly Jugador[];
}

export interface ResultadoValidacion {
  readonly infracciones: readonly Infraccion[];
  readonly avisos: readonly Aviso[];
}
