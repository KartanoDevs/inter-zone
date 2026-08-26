import type { TipoExamen } from '../domain/examen';
import type { InsigniaGanada } from '../domain/insignias';
import { type InsigniasRepository, ErrorDelServidor, ErrorDeRed } from '../domain/puertos';

/**
 * Adaptador de `InsigniasRepository` contra `/api/examen/insignias` (spec 056). Mismo criterio
 * que el resto de adaptadores HTTP: `fetch` nativo, `credentials: 'include'` — el servidor
 * resuelve de quién son las insignias por la sesión, nunca por un id que mande el cliente.
 */
export class HttpInsigniasRepository implements InsigniasRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch.bind(globalThis),
  ) {}

  async listar(): Promise<readonly InsigniaGanada[]> {
    const respuesta = await this.peticion('/examen/insignias', { method: 'GET' });
    if (!respuesta.ok) {
      throw new ErrorDelServidor(await mensajeDe(respuesta, `El servidor devolvió un error (${respuesta.status})`));
    }
    return (await respuesta.json()) as readonly InsigniaGanada[];
  }

  async registrar(sistemaId: string, tipo: TipoExamen, titularId: string | null): Promise<void> {
    const respuesta = await this.peticion('/examen/insignias', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sistemaId, tipo, titularId }),
    });
    if (!respuesta.ok) {
      throw new ErrorDelServidor(await mensajeDe(respuesta, `El servidor devolvió un error (${respuesta.status})`));
    }
  }

  private async peticion(ruta: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchFn(`${this.baseUrl}${ruta}`, { ...init, credentials: 'include' });
    } catch {
      throw new ErrorDeRed('No se pudo conectar con el servidor');
    }
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
