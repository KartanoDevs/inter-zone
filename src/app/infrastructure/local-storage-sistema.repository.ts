import type { Colocacion, PlantillaEquipo, Sistema, TipoSistema } from '../domain/modelos';
import type { SistemaRepository } from '../domain/puertos';

const CLAVE = 'interzone.sistemas';
/**
 * 2 desde la spec 011: la forma persistida de un sistema cambió (`ocupanteCasilla` ->
 * `sustitutoLibero`) sin que las reglas del juego cambiaran, así que hubo que subir la
 * versión aunque no exista todavía una `migrar()` real. Sin ella, cualquier versión que no
 * sea exactamente esta se trata como no legible — igual que una versión futura (spec 008,
 * E4) — en vez de intentar interpretarla con las reglas nuevas y arriesgarse a reventar o,
 * peor, a leerla mal en silencio.
 */
const VERSION_ACTUAL = 2;

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
  /** A quién sustituye el líbero, si el sistema tiene uno. Ausente si no tiene líbero (spec 011). */
  readonly sustitutoLibero?: string;
  readonly formaciones: Readonly<Record<string, readonly PosicionPersistida[]>>;
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
      formaciones[rotacion] = (formacion ?? []).map((c) => ({
        jugadorId: c.jugador.id,
        x: c.punto.x,
        y: c.punto.y,
        explicacion: c.explicacion,
      }));
    }
    return {
      id: sistema.id,
      nombre: sistema.nombre,
      tipo: sistema.tipo,
      sustitutoLibero: sistema.plantilla.libero?.sustituidoId,
      formaciones,
      explicacionesRotacion: { ...sistema.explicacionesRotacion },
      creadoEn,
      actualizadoEn,
    };
  }

  private aSistema(persistido: SistemaPersistido): Sistema {
    const plantilla: PlantillaEquipo =
      persistido.sustitutoLibero === undefined
        ? { nombre: this.plantilla.nombre, ordenSaque: this.plantilla.ordenSaque }
        : {
            ...this.plantilla,
            libero: { jugador: this.plantilla.libero!.jugador, sustituidoId: persistido.sustitutoLibero },
          };
    const jugadorPorId = new Map(plantilla.ordenSaque.map((jugador) => [jugador.id, jugador]));
    if (plantilla.libero) {
      jugadorPorId.set(plantilla.libero.jugador.id, plantilla.libero.jugador);
    }
    const formaciones: Record<string, readonly Colocacion[]> = {};
    for (const [rotacion, posiciones] of Object.entries(persistido.formaciones)) {
      formaciones[rotacion] = posiciones.map((p) => {
        const jugador = jugadorPorId.get(p.jugadorId);
        if (!jugador) {
          throw new Error(`Jugador desconocido en los datos guardados: ${p.jugadorId}`);
        }
        const colocacion: Colocacion = { jugador, punto: { x: p.x, y: p.y } };
        return p.explicacion === undefined ? colocacion : { ...colocacion, explicacion: p.explicacion };
      });
    }
    return {
      id: persistido.id,
      nombre: persistido.nombre,
      tipo: persistido.tipo,
      plantilla,
      formaciones,
      explicacionesRotacion: { ...persistido.explicacionesRotacion },
    };
  }
}
