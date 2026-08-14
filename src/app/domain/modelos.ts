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

/** Un equipo guardado con nombre. Inmutable: no se modifica su orden de saque una vez creada. */
export interface PlantillaEquipo {
  readonly nombre: string;
  readonly ordenSaque: OrdenSaque;
}

export type TipoSistema = 'recepcion' | 'defensa';

/** Un sistema con nombre y tipo, ligado a una plantilla, con hasta seis formaciones (una por Rn). */
export interface Sistema {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoSistema;
  readonly plantilla: PlantillaEquipo;
  readonly formaciones: Readonly<Partial<Record<1 | 2 | 3 | 4 | 5 | 6, Formacion>>>;
  /** Explicación de enseñanza de conjunto para cada rotación guardada. Voluntaria. */
  readonly explicacionesRotacion: Readonly<Partial<Record<1 | 2 | 3 | 4 | 5 | 6, string>>>;
}

export interface Colocacion {
  readonly jugador: Jugador;
  readonly punto: Punto;
  /** Explicación de enseñanza para este jugador en esta rotación. Voluntaria. */
  readonly explicacion?: string;
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
