import type { UsuarioListado } from '../domain/acceso';
import {
  type UsuariosRepository,
  ErrorDelServidor,
  ErrorDeRed,
  UltimoAdminNoSePuedeBorrar,
} from '../domain/puertos';

/**
 * Adaptador de `UsuariosRepository` contra `/api/usuarios` (spec 068). Mismo criterio que
 * `HttpListaBlancaRepository`: `fetch` nativo, `credentials: 'include'` — el servidor exige
 * sesión y rol de admin en las dos rutas.
 */
export class HttpUsuariosRepository implements UsuariosRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch.bind(globalThis),
  ) {}

  async listar(): Promise<readonly UsuarioListado[]> {
    const respuesta = await this.peticion('/usuarios', { method: 'GET' });
    if (!respuesta.ok) {
      throw new ErrorDelServidor(
        await mensajeDe(respuesta, `El servidor devolvió un error (${respuesta.status})`),
      );
    }
    return (await respuesta.json()) as readonly UsuarioListado[];
  }

  async borrar(id: string): Promise<void> {
    const respuesta = await this.peticion(`/usuarios/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (respuesta.status === 409) {
      throw new UltimoAdminNoSePuedeBorrar(
        await mensajeDe(respuesta, 'No se puede borrar al último admin'),
      );
    }
    if (!respuesta.ok) {
      throw new ErrorDelServidor(
        await mensajeDe(respuesta, `El servidor devolvió un error (${respuesta.status})`),
      );
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
