import type { EquipoId, Sistema } from '../domain/modelos';
import { ConflictoDeEdicion, ErrorDelServidor, ErrorDeRed, type SistemaRepository } from '../domain/puertos';

const EQUIPOS: readonly EquipoId[] = ['masculino', 'femenino'];

interface SistemaConMetadatos extends Sistema {
  readonly actualizadoEn: string;
}

function quitarMetadatos(sistema: SistemaConMetadatos): Sistema {
  const { actualizadoEn: _actualizadoEn, ...resto } = sistema;
  return resto;
}

/**
 * Adaptador de `SistemaRepository` contra la API del servidor (spec 033). Usa `fetch` nativo,
 * no `HttpClient` de Angular (spec 034: así el test sustituye la función global y sigue
 * corriendo sin `TestBed`, igual que `LocalStorageSistemaRepository` corre sin DOM).
 *
 * `Sistema` de dominio no lleva fechas (ADR 0012): el testigo de concurrencia
 * (`actualizadoEn`, que el servidor exige como cabecera `If-Match` al actualizar) se guarda
 * aquí, en memoria, indexado por id — nunca en el tipo de dominio.
 */
export class HttpSistemaRepository implements SistemaRepository {
  private readonly actualizadoEnPorId = new Map<string, string>();

  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  async listar(): Promise<readonly Sistema[]> {
    const porEquipo = await Promise.all(EQUIPOS.map((equipoId) => this.listarEquipo(equipoId)));
    return porEquipo.flat();
  }

  private async listarEquipo(equipoId: EquipoId): Promise<readonly Sistema[]> {
    const respuesta = await this.peticion(`/sistemas?equipoId=${equipoId}`, { method: 'GET' });
    const sistemas = (await respuesta.json()) as readonly SistemaConMetadatos[];
    for (const sistema of sistemas) {
      this.actualizadoEnPorId.set(sistema.id, sistema.actualizadoEn);
    }
    return sistemas.map(quitarMetadatos);
  }

  async crear(sistema: Sistema): Promise<void> {
    const respuesta = await this.peticion('/sistemas', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sistema),
    });
    const creado = (await respuesta.json()) as SistemaConMetadatos;
    this.actualizadoEnPorId.set(sistema.id, creado.actualizadoEn);
  }

  async actualizar(sistema: Sistema): Promise<void> {
    const testigo = this.actualizadoEnPorId.get(sistema.id);
    const respuesta = await this.peticion(`/sistemas/${sistema.id}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...(testigo ? { 'If-Match': testigo } : {}) },
      body: JSON.stringify(sistema),
    });
    const { actualizadoEn } = (await respuesta.json()) as { actualizadoEn: string };
    this.actualizadoEnPorId.set(sistema.id, actualizadoEn);
  }

  async borrar(id: string): Promise<void> {
    await this.peticion(`/sistemas/${id}`, { method: 'DELETE' });
    this.actualizadoEnPorId.delete(id);
  }

  /** Hace la petición y traduce cualquier fallo a uno de los tres motivos que declara el
   * puerto (spec 034) — nunca deja pasar un `Response` con error sin traducir, ni una excepción
   * de red sin envolver. */
  private async peticion(ruta: string, init: RequestInit): Promise<Response> {
    let respuesta: Response;
    try {
      respuesta = await this.fetchFn(`${this.baseUrl}${ruta}`, init);
    } catch {
      throw new ErrorDeRed('No se pudo conectar con el servidor');
    }
    if (respuesta.status === 409) {
      throw new ConflictoDeEdicion(await mensajeDe(respuesta, 'Alguien más ha modificado este sistema mientras tanto'));
    }
    if (!respuesta.ok) {
      throw new ErrorDelServidor(await mensajeDe(respuesta, `El servidor devolvió un error (${respuesta.status})`));
    }
    return respuesta;
  }
}

async function mensajeDe(respuesta: Response, porDefecto: string): Promise<string> {
  try {
    const cuerpo = (await respuesta.clone().json()) as { error?: string };
    return cuerpo.error ?? porDefecto;
  } catch {
    return porDefecto;
  }
}
