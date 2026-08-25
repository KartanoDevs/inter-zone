import type { Ajustes, AjustesRepository } from '../domain/puertos';

/** Lo mínimo que necesita este repositorio de un almacén de clave-valor. `localStorage` lo
 * cumple tal cual. */
export interface AlmacenClaveValor {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

const CLAVE = 'interzone.ajustes';
/** 6: `escalaSombra` cambió de rango y de significado (spec 045: antes 0-100 escalando todo el
 * polígono, ahora 0-10 entero escalando solo el ancho) — un valor de la versión 5 ya no
 * significa lo mismo, así que se descarta igual que si el campo no existiera. Sin `migrar()`
 * real, un payload de una versión anterior se trata como no legible, mismo patrón que
 * `LocalStorageSistemaRepository`. */
const VERSION_ACTUAL = 6;

interface Payload {
  readonly version: number;
  readonly data: Ajustes;
}

const AJUSTES_POR_DEFECTO: Ajustes = {
  validacionDesactivada: false,
  ayudaPosicionDesactivada: false,
  ordenRotacionCronologico: false,
  mostrarNumerosMetros: false,
  escalaSombra: 5,
};

function esPayloadValido(valor: unknown): valor is Payload {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const conVersion = valor as {
    version?: unknown;
    data?: {
      validacionDesactivada?: unknown;
      ayudaPosicionDesactivada?: unknown;
      ordenRotacionCronologico?: unknown;
      mostrarNumerosMetros?: unknown;
      escalaSombra?: unknown;
    };
  };
  return (
    typeof conVersion.version === 'number' &&
    typeof conVersion.data?.validacionDesactivada === 'boolean' &&
    typeof conVersion.data?.ayudaPosicionDesactivada === 'boolean' &&
    typeof conVersion.data?.ordenRotacionCronologico === 'boolean' &&
    typeof conVersion.data?.mostrarNumerosMetros === 'boolean' &&
    typeof conVersion.data?.escalaSombra === 'number'
  );
}

/**
 * Adaptador de `AjustesRepository` sobre un almacén de clave-valor, igual patrón que
 * `LocalStorageSistemaRepository` (versión + data; corrupto o de versión desconocida ->
 * valores por defecto, nunca un throw). Los ajustes son globales a la app, no de un sistema
 * (spec 017), así que viven bajo una clave propia.
 */
export class LocalStorageAjustesRepository implements AjustesRepository {
  constructor(private readonly almacen: AlmacenClaveValor) {}

  async leer(): Promise<Ajustes> {
    const bruto = this.almacen.getItem(CLAVE);
    if (bruto === null) {
      return AJUSTES_POR_DEFECTO;
    }
    let parseado: unknown;
    try {
      parseado = JSON.parse(bruto);
    } catch {
      return AJUSTES_POR_DEFECTO;
    }
    if (!esPayloadValido(parseado) || parseado.version !== VERSION_ACTUAL) {
      return AJUSTES_POR_DEFECTO;
    }
    return parseado.data;
  }

  async guardar(ajustes: Ajustes): Promise<void> {
    const payload: Payload = { version: VERSION_ACTUAL, data: ajustes };
    this.almacen.setItem(CLAVE, JSON.stringify(payload));
  }
}
