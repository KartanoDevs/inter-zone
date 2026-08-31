import type { EquipoId } from '../domain/modelos';
import type { InvitacionListada, RolAcceso } from '../domain/acceso';
import {
  type ListaBlancaRepository,
  CorreoYaRegistrado,
  ErrorDelServidor,
  ErrorDeRed,
} from '../domain/puertos';

/**
 * Adaptador de `ListaBlancaRepository` contra `/api/lista-blanca` (spec 054). Mismo criterio
 * que el resto de adaptadores HTTP del proyecto: `fetch` nativo, `credentials: 'include'` — el
 * servidor exige sesión y rol de admin en las tres rutas.
 */
export class HttpListaBlancaRepository implements ListaBlancaRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch.bind(globalThis),
  ) {}

  async listar(): Promise<readonly InvitacionListada[]> {
    const respuesta = await this.peticion('/lista-blanca', { method: 'GET' });
    if (!respuesta.ok) {
      throw new ErrorDelServidor(
        await mensajeDe(respuesta, `El servidor devolvió un error (${respuesta.status})`),
      );
    }
    return (await respuesta.json()) as readonly InvitacionListada[];
  }

  async invitar(email: string, rol: RolAcceso, equipoId: EquipoId | null): Promise<void> {
    const respuesta = await this.peticion('/lista-blanca', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, rol, equipoId }),
    });
    if (respuesta.status === 409) {
      throw new CorreoYaRegistrado(await mensajeDe(respuesta, 'Ese correo ya tiene cuenta'));
    }
    if (!respuesta.ok) {
      throw new ErrorDelServidor(
        await mensajeDe(respuesta, `El servidor devolvió un error (${respuesta.status})`),
      );
    }
  }

  async retirar(email: string): Promise<void> {
    const respuesta = await this.peticion(`/lista-blanca/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
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
