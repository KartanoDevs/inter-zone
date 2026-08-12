export interface Punto {
  readonly x: number;
  readonly y: number;
}

export type RolId = 'colocador' | 'receptor' | 'central' | 'opuesto' | 'libero';

export interface Jugador {
  readonly id: string;
  readonly rol: RolId;
}

/** Los seis jugadores del equipo ordenados P1..P6 en la rotación inicial (R1). */
export type OrdenSaque = readonly [Jugador, Jugador, Jugador, Jugador, Jugador, Jugador];

export interface Colocacion {
  readonly jugador: Jugador;
  readonly punto: Punto;
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
