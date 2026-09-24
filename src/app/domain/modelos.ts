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

/** Si un sistema ya está listo para que un jugador lo estudie (spec 051). Ausente = "borrador":
 * mismo criterio que `descripcion?` o `defensas?`, para no obligar a todos los `Sistema`
 * escritos a mano en los tests de specs anteriores a declarar un campo que no existía cuando se
 * escribieron. `estadoDe` en `catalogo-sistemas.ts` resuelve ese valor por defecto. */
export type EstadoSistema = 'borrador' | 'validado';

/** El equipo al que pertenece un sistema (spec 032). Fijos por ahora, igual que la plantilla es
 * hoy una única constante de la aplicación (ADR 0013); equipos de verdad llegan con la base de
 * datos. */
export type EquipoId = 'masculino' | 'femenino';

/** Por dónde ataca el rival: los tres tercios de la línea delantera, o el pipe por el centro
 * de zaga (spec 021). Se deriva de dónde se suelta la ficha rival; nunca se declara a mano.
 * @deprecated Sustituida por `SituacionDefensa` (spec 038): la rotación deja de mandar en
 * defensa y las vías disponibles pasan a depender de `CasoColocador`. */
export type ViaAtaque = 'z4' | 'z3' | 'z2' | 'pipe';

/** Si el colocador rival está en la línea delantera o en la zaga (spec 038): determina cuántos
 * atacantes tiene disponibles su equipo y qué situaciones de ataque existen para ese caso. */
export type CasoColocador = 'delantero' | 'trasero';

/** Contra qué ataca el rival, en defensa (spec 038): la postura de base, o una de las zonas de
 * su ataque — las mismas cuatro que `ViaAtaque` más el ataque por 1, que solo existe cuando el
 * colocador rival es delantero (deja libre su propia zona de zaga derecha para atacar). Qué
 * subconjunto es válido para cada caso lo decide `situacionesDe`, no el tipo. */
export type SituacionDefensa = 'inicial' | 'z4' | 'z3' | 'z2' | 'z1' | 'pipe';

/** Una de las seis zonas físicas del campo propio (spec 038): 1, 5 y 6 en zaga; 2, 3 y 4 en la
 * red. Sustituye al jugador concreto como ocupante de una colocación de defensa — no hay
 * rotación que decida quién está en cada puesto, el diagrama coloca por puesto genérico. */
export type PuestoDefensa = 1 | 2 | 3 | 4 | 5 | 6;

/** Cuántos puestos delanteros bloquean en una variante de defensa (spec 039). 0 es "nadie
 * bloquea"; el máximo son los tres puestos de la red. */
export type NumeroBloqueadores = 0 | 1 | 2 | 3;

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
  /** Celdas de zona de finta (spec 041). Solo se pinta en defensa (mismo alcance que `celdas`
   * desde la spec 024); se declara aquí también por simetría estructural con `ColocacionDefensa`,
   * igual que ya hace `celdas` — nunca la puebla la UI de recepción. */
  readonly celdasFinta?: readonly Celda[];
}

/** Dónde se coloca cada jugador del orden de saque, para una rotación concreta. */
export type Formacion = readonly Colocacion[];

/** Un puesto genérico ocupado en una formación de defensa (spec 038): sin jugador, sin
 * rotación — es la contraparte de `Colocacion` cuando no hay ocupante concreto que colocar. */
export interface ColocacionDefensa {
  readonly puesto: PuestoDefensa;
  readonly punto: Punto;
  /** Explicación de enseñanza para este puesto en esta variante. Voluntaria. */
  readonly explicacion?: string;
  /** Celdas de la rejilla de responsabilidad que este puesto cubre (spec 038, continúa la 022). */
  readonly celdas?: readonly Celda[];
  /** Celdas de la zona de finta de este puesto (spec 041): responsabilidad distinta de `celdas`,
   * campo paralelo por el mismo motivo que la ADR 0029 — no hay ninguna regla que combine los
   * dos conjuntos, así que no gana nada compartir un discriminador dentro de `Celda`. Mismos tres
   * estados que `celdas` (spec 024): `undefined` nunca tocada, `[]` vaciada a propósito. */
  readonly celdasFinta?: readonly Celda[];
}

export type FormacionDefensa = readonly ColocacionDefensa[];

/** Una defensa guardada para un caso de colocador rival, una situación de ataque y un número de
 * bloqueadores (specs 038-039): solo existen las variantes que el entrenador cree. */
export interface VarianteDefensa {
  readonly caso: CasoColocador;
  readonly situacion: SituacionDefensa;
  /** Número de bloqueadores de esta variante (spec 039). Siempre 0 cuando `situacion` es
   * `'inicial'`: la postura de base no admite variantes de bloqueo. */
  readonly bloqueadores: NumeroBloqueadores;
  readonly formacion: FormacionDefensa;
  /** Explicación de enseñanza de conjunto para esta variante. Voluntaria. */
  readonly explicacion?: string;
  /** Retoque manual de la sombra de bloqueo respecto a su posición calculada (spec 040).
   * Ausente si nunca se ha arrastrado la sombra de esta variante. */
  readonly desplazamientoSombra?: Punto;
  /** Punto exacto donde se soltó la ficha "A" del atacante dentro de esta variante (spec 072):
   * sustituye a `PUNTO_POR_SITUACION` como origen del dibujo y del cálculo de la sombra en
   * cuanto existe. Ausente si nunca se ha movido de su punto canónico. La situación (`situacion`)
   * sigue siendo la identidad de la variante — este punto solo afina dentro de su propio tercio,
   * nunca decide a qué variante pertenece (ver `docs/decisiones/`, sustituye parcialmente a la
   * 0020/0033). */
  readonly marcadorAtacante?: Punto;
}

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
  /** Explicación de enseñanza de conjunto para cada rotación guardada. Voluntaria. Solo se usa
   * en recepción: en defensa, la explicación de conjunto va por variante (spec 038). */
  readonly explicacionesRotacion: Readonly<Partial<Record<1 | 2 | 3 | 4 | 5 | 6, string>>>;
  /** Variantes de defensa guardadas (spec 038, sustituye a la forma por rotación y vía de la
   * spec 021). Ausente en un sistema de recepción, o mientras no se haya guardado ninguna
   * defensa todavía. */
  readonly defensas?: readonly VarianteDefensa[];
  /** Ausente equivale a "borrador" — ver `EstadoSistema` y `estadoDe` (spec 051). */
  readonly estado?: EstadoSistema;
}

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
