import type { SesionUsuario } from '../domain/acceso';
import { type AccesoRepository, CredencialesInvalidas, ErrorDelServidor, ErrorDeRed, InvitacionNoDisponible } from '../domain/puertos';

/**
 * Adaptador de `AccesoRepository` contra la API del servidor (spec 050). Mismo criterio que
 * `HttpSistemaRepository`: `fetch` nativo, no `HttpClient`. Toda petición manda `credentials:
 * 'include'` — sin eso el navegador no envía la cookie de sesión a un origen distinto del suyo
 * (`localhost:4200` contra `localhost:3000`).
 *
 * `entrar` no recibe a quién ha entrado en la respuesta de `/auth/entrar` (spec 035: esa ruta
 * solo abre la sesión) — pregunta a `/auth/quien-soy` justo después, ya con la cookie puesta.
 */
export class HttpAccesoRepository implements AccesoRepository {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch = fetch.bind(globalThis),
  ) {}

  async registrar(email: string, contrasena: string): Promise<void> {
    const respuesta = await this.peticion('/auth/registro', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, contrasena }),
    });
    if (respuesta.status === 403) {
      throw new InvitacionNoDisponible(await mensajeDe(respuesta, 'Ese correo no tiene una invitación disponible'));
    }
    if (!respuesta.ok) {
      throw new ErrorDelServidor(await mensajeDe(respuesta, `El servidor devolvió un error (${respuesta.status})`));
    }
  }

  async entrar(email: string, contrasena: string): Promise<SesionUsuario> {
    const respuesta = await this.peticion('/auth/entrar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, contrasena }),
    });
    if (respuesta.status === 401) {
      throw new CredencialesInvalidas(await mensajeDe(respuesta, 'Correo o contraseña incorrectos'));
    }
    if (!respuesta.ok) {
      throw new ErrorDelServidor(await mensajeDe(respuesta, `El servidor devolvió un error (${respuesta.status})`));
    }
    const usuario = await this.quienSoy();
    if (!usuario) {
      throw new ErrorDelServidor('El servidor no devolvió la sesión recién abierta');
    }
    return usuario;
  }

  async quienSoy(): Promise<SesionUsuario | null> {
    const respuesta = await this.peticion('/auth/quien-soy', { method: 'GET' });
    if (!respuesta.ok) {
      throw new ErrorDelServidor(await mensajeDe(respuesta, `El servidor devolvió un error (${respuesta.status})`));
    }
    const { usuario } = (await respuesta.json()) as { usuario: SesionUsuario | null };
    return usuario;
  }

  async salir(): Promise<void> {
    const respuesta = await this.peticion('/auth/salir', { method: 'POST' });
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
