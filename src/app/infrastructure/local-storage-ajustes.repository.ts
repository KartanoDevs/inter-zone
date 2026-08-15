import type { Ajustes, AjustesRepository } from '../domain/puertos';
import type { AlmacenClaveValor } from './local-storage-sistema.repository';

const CLAVE = 'interzone.ajustes';
/** 2: se añadió `ayudaPosicionDesactivada` a la forma persistida. Sin `migrar()` real, un
 * payload de la versión 1 (sin ese campo) se trata como no legible, mismo patrón que
 * `LocalStorageSistemaRepository`. */
const VERSION_ACTUAL = 2;

interface Payload {
  readonly version: number;
  readonly data: Ajustes;
}

const AJUSTES_POR_DEFECTO: Ajustes = { validacionDesactivada: false, ayudaPosicionDesactivada: false };

function esPayloadValido(valor: unknown): valor is Payload {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const conVersion = valor as { version?: unknown; data?: { validacionDesactivada?: unknown; ayudaPosicionDesactivada?: unknown } };
  return (
    typeof conVersion.version === 'number' &&
    typeof conVersion.data?.validacionDesactivada === 'boolean' &&
    typeof conVersion.data?.ayudaPosicionDesactivada === 'boolean'
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

  leer(): Ajustes {
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

  guardar(ajustes: Ajustes): void {
    const payload: Payload = { version: VERSION_ACTUAL, data: ajustes };
    this.almacen.setItem(CLAVE, JSON.stringify(payload));
  }
}
