import type { Colocacion, Formacion, Jugador, PlantillaEquipo, Sistema, TipoSistema } from '../domain/modelos';
import type { SistemaRepository } from '../domain/puertos';

const CLAVE = 'interzone.sistemas';
/**
 * 4 desde la spec 021: se añade `defensas` (formaciones de defensa, por rotación y por vía de
 * ataque) a la forma persistida. Mismo motivo que las subidas anteriores: sin `migrar()` real,
 * cualquier versión que no sea exactamente esta se trata como no legible — igual que una
 * versión futura (spec 008, E4) — en vez de intentar interpretarla con las reglas nuevas y
 * arriesgarse a reventar o, peor, a leerla mal en silencio.
 */
const VERSION_ACTUAL = 4;

/** Lo mínimo que necesita el repositorio de un almacén de clave-valor. `localStorage` lo cumple tal cual. */
export interface AlmacenClaveValor {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

interface PosicionPersistida {
  readonly jugadorId: string;
  readonly x: number;
  readonly y: number;
  readonly explicacion?: string;
}

interface SistemaPersistido {
  readonly id: string;
  readonly nombre: string;
  readonly tipo: TipoSistema;
  /** A quién sustituye el líbero en cada rotación, si el sistema tiene uno. Ausente si no
   * tiene líbero; `null` en las rotaciones donde no sustituye a nadie (spec 017). */
  readonly sustitutosLibero?: Readonly<Record<string, string | null>>;
  readonly formaciones: Readonly<Record<string, readonly PosicionPersistida[]>>;
  /** Formaciones de defensa, por rotación y por vía de ataque. Ausente en un sistema de
   * recepción, o mientras no se haya guardado ninguna defensa todavía (spec 021). */
  readonly defensas?: Readonly<Record<string, Readonly<Record<string, readonly PosicionPersistida[]>>>>;
  readonly explicacionesRotacion: Readonly<Record<string, string>>;
  readonly creadoEn: string;
  readonly actualizadoEn: string;
}

interface Payload {
  readonly version: number;
  readonly data: { readonly sistemas: readonly SistemaPersistido[] };
}

function esPayloadValido(valor: unknown): valor is Payload {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const conVersion = valor as { version?: unknown; data?: { sistemas?: unknown } };
  return typeof conVersion.version === 'number' && Array.isArray(conVersion.data?.sistemas);
}

/**
 * Adaptador de `SistemaRepository` sobre un almacén de clave-valor (`localStorage` en producción).
 *
 * `domain/` no lleva fechas (ver `docs/arquitectura.md`), así que `creadoEn`/`actualizadoEn` no
 * existen en `Sistema`: son metadatos que solo vive aquí, en la forma persistida. Tampoco se
 * persiste la plantilla completa de cada sistema: en la v1 hay una única plantilla, constante
 * de la aplicación (`domain/plantilla-global.ts`), inyectada por constructor; solo se guarda a
 * quién sustituye el líbero (`sustitutoLibero`), que sí puede variar de un sistema a otro
 * (spec 011).
 */
export class LocalStorageSistemaRepository implements SistemaRepository {
  constructor(
    private readonly almacen: AlmacenClaveValor,
    private readonly plantilla: PlantillaEquipo,
    private readonly ahora: () => string = () => new Date().toISOString(),
  ) {}

  listar(): readonly Sistema[] {
    const payload = this.leerPayload();
    return payload ? payload.data.sistemas.map((persistido) => this.aSistema(persistido)) : [];
  }

  guardar(sistemas: readonly Sistema[]): void {
    const anterior = this.leerPayload();
    const timestampsPorId = new Map(
      (anterior?.data.sistemas ?? []).map((s) => [s.id, s.creadoEn] as const),
    );
    const marca = this.ahora();
    const persistidos = sistemas.map((sistema) =>
      this.aPersistido(sistema, timestampsPorId.get(sistema.id) ?? marca, marca),
    );
    const payload: Payload = { version: VERSION_ACTUAL, data: { sistemas: persistidos } };
    this.almacen.setItem(CLAVE, JSON.stringify(payload));
  }

  private leerPayload(): Payload | null {
    const bruto = this.almacen.getItem(CLAVE);
    if (bruto === null) {
      return null;
    }
    let parseado: unknown;
    try {
      parseado = JSON.parse(bruto);
    } catch {
      return null;
    }
    if (!esPayloadValido(parseado) || parseado.version !== VERSION_ACTUAL) {
      return null;
    }
    return parseado;
  }

  private aPersistido(sistema: Sistema, creadoEn: string, actualizadoEn: string): SistemaPersistido {
    const formaciones: Record<string, readonly PosicionPersistida[]> = {};
    for (const [rotacion, formacion] of Object.entries(sistema.formaciones)) {
      formaciones[rotacion] = posicionesPersistidasDe(formacion ?? []);
    }
    let defensas: Record<string, Record<string, readonly PosicionPersistida[]>> | undefined;
    if (sistema.defensas) {
      defensas = {};
      for (const [rotacion, porVia] of Object.entries(sistema.defensas)) {
        const viaPersistida: Record<string, readonly PosicionPersistida[]> = {};
        for (const [via, formacion] of Object.entries(porVia ?? {})) {
          viaPersistida[via] = posicionesPersistidasDe(formacion ?? []);
        }
        defensas[rotacion] = viaPersistida;
      }
    }
    return {
      id: sistema.id,
      nombre: sistema.nombre,
      tipo: sistema.tipo,
      sustitutosLibero: sistema.plantilla.libero?.sustitutosPorRotacion,
      formaciones,
      defensas,
      explicacionesRotacion: { ...sistema.explicacionesRotacion },
      creadoEn,
      actualizadoEn,
    };
  }

  private aSistema(persistido: SistemaPersistido): Sistema {
    const plantilla: PlantillaEquipo =
      persistido.sustitutosLibero === undefined
        ? { nombre: this.plantilla.nombre, ordenSaque: this.plantilla.ordenSaque }
        : {
            ...this.plantilla,
            libero: {
              jugador: this.plantilla.libero!.jugador,
              sustitutosPorRotacion: {
                1: persistido.sustitutosLibero['1'] ?? null,
                2: persistido.sustitutosLibero['2'] ?? null,
                3: persistido.sustitutosLibero['3'] ?? null,
                4: persistido.sustitutosLibero['4'] ?? null,
                5: persistido.sustitutosLibero['5'] ?? null,
                6: persistido.sustitutosLibero['6'] ?? null,
              },
            },
          };
    const jugadorPorId = new Map(plantilla.ordenSaque.map((jugador) => [jugador.id, jugador]));
    if (plantilla.libero) {
      jugadorPorId.set(plantilla.libero.jugador.id, plantilla.libero.jugador);
    }
    const formaciones: Record<string, Formacion> = {};
    for (const [rotacion, posiciones] of Object.entries(persistido.formaciones)) {
      formaciones[rotacion] = formacionDe(posiciones, jugadorPorId);
    }
    let defensas: Record<string, Record<string, Formacion>> | undefined;
    if (persistido.defensas) {
      defensas = {};
      for (const [rotacion, porVia] of Object.entries(persistido.defensas)) {
        const viaFormaciones: Record<string, Formacion> = {};
        for (const [via, posiciones] of Object.entries(porVia)) {
          viaFormaciones[via] = formacionDe(posiciones, jugadorPorId);
        }
        defensas[rotacion] = viaFormaciones;
      }
    }
    return {
      id: persistido.id,
      nombre: persistido.nombre,
      tipo: persistido.tipo,
      plantilla,
      formaciones,
      defensas,
      explicacionesRotacion: { ...persistido.explicacionesRotacion },
    };
  }
}

function posicionesPersistidasDe(formacion: Formacion): readonly PosicionPersistida[] {
  return formacion.map((c) => ({
    jugadorId: c.jugador.id,
    x: c.punto.x,
    y: c.punto.y,
    explicacion: c.explicacion,
  }));
}

function formacionDe(posiciones: readonly PosicionPersistida[], jugadorPorId: ReadonlyMap<string, Jugador>): Formacion {
  return posiciones.map((p) => {
    const jugador = jugadorPorId.get(p.jugadorId);
    if (!jugador) {
      throw new Error(`Jugador desconocido en los datos guardados: ${p.jugadorId}`);
    }
    const colocacion: Colocacion = { jugador, punto: { x: p.x, y: p.y } };
    return p.explicacion === undefined ? colocacion : { ...colocacion, explicacion: p.explicacion };
  });
}
