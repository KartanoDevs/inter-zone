import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { EquipoId } from '../../../src/app/domain/modelos';
import { prisma } from '../infraestructura/prisma';
import { sembrarCatalogoBase } from '../infraestructura/semilla';
import { crearServidor } from './servidor';

/**
 * Tests de integración contra un Postgres real (spec 054) — requieren `npm run db:up` y la
 * migración aplicada. No entran en el `npm test` de la raíz.
 */

let servidor: Server;
let base: string;

beforeAll(async () => {
  await sembrarCatalogoBase();
  servidor = crearServidor().listen(0);
  await new Promise<void>((resolve) => servidor.once('listening', resolve));
  const direccion = servidor.address();
  if (!direccion || typeof direccion === 'string') {
    throw new Error('No se pudo levantar el servidor de pruebas');
  }
  base = `http://127.0.0.1:${direccion.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => servidor.close(() => resolve()));
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.usuario.deleteMany({});
  await prisma.lista_blanca.deleteMany({});
});

async function entrarComo(email: string, rol: 'admin' | 'entrenador' | 'usuario', equipoClave?: EquipoId): Promise<string> {
  const equipoId = equipoClave ? (await prisma.equipo.findUniqueOrThrow({ where: { clave: equipoClave } })).id : null;
  await prisma.lista_blanca.create({ data: { email, rol, equipo_id: equipoId } });
  await fetch(`${base}/api/auth/registro`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, contrasena: 'contrasena123' }),
  });
  const respuesta = await fetch(`${base}/api/auth/entrar`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, contrasena: 'contrasena123' }),
  });
  const testigo = /iz_sesion=([^;]*)/.exec(respuesta.headers.get('set-cookie') ?? '')?.[1];
  if (!testigo) {
    throw new Error('No se obtuvo cookie de sesión');
  }
  return `iz_sesion=${testigo}`;
}

interface RespuestaJson {
  readonly status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly cuerpo: any;
}

async function invitar(cuerpo: unknown, cookie?: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/lista-blanca`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(cuerpo),
  });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function listar(cookie?: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/lista-blanca`, { headers: cookie ? { cookie } : {} });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function retirar(email: string, cookie?: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/lista-blanca/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: cookie ? { cookie } : {},
  });
  return { status: respuesta.status, cuerpo: null };
}

describe('API de lista blanca (spec 054)', () => {
  it('054-E1: el admin invita un correo con un rol y un equipo', async () => {
    const cookie = await entrarComo('admin@club.com', 'admin');

    const { status } = await invitar({ email: 'nueva@club.com', rol: 'entrenador', equipoId: 'femenino' }, cookie);

    expect(status).toBe(201);
    const invitacion = await prisma.lista_blanca.findUniqueOrThrow({ where: { email: 'nueva@club.com' } });
    expect(invitacion.rol).toBe('entrenador');
    expect(invitacion.usada_en).toBeNull();
  });

  it('054-E2: invitar un correo ya invitado y sin usar actualiza su rol', async () => {
    const cookie = await entrarComo('admin@club.com', 'admin');
    await invitar({ email: 'nueva@club.com', rol: 'usuario', equipoId: null }, cookie);

    const { status } = await invitar({ email: 'nueva@club.com', rol: 'entrenador', equipoId: 'masculino' }, cookie);

    expect(status).toBe(201);
    const filas = await prisma.lista_blanca.findMany({ where: { email: 'nueva@club.com' } });
    expect(filas).toHaveLength(1);
    expect(filas[0]?.rol).toBe('entrenador');
  });

  it('054-E3: invitar un correo que ya tiene cuenta se rechaza', async () => {
    const cookieAdmin = await entrarComo('admin@club.com', 'admin');
    await entrarComo('yaexiste@club.com', 'usuario');

    const { status } = await invitar({ email: 'yaexiste@club.com', rol: 'admin', equipoId: null }, cookieAdmin);

    expect(status).toBe(409);
  });

  it('054-E4: retirar una invitación pendiente la borra', async () => {
    const cookie = await entrarComo('admin@club.com', 'admin');
    await invitar({ email: 'pendiente@club.com', rol: 'usuario', equipoId: null }, cookie);

    const { status } = await retirar('pendiente@club.com', cookie);

    expect(status).toBe(204);
    expect(await prisma.lista_blanca.findUnique({ where: { email: 'pendiente@club.com' } })).toBeNull();
  });

  it('054-E5: retirar una invitación ya usada no toca la cuenta que salió de ella', async () => {
    const cookieAdmin = await entrarComo('admin@club.com', 'admin');
    await entrarComo('usada@club.com', 'usuario');

    const { status } = await retirar('usada@club.com', cookieAdmin);

    expect(status).toBe(204);
    const usuario = await prisma.usuario.findUnique({ where: { email: 'usada@club.com' } });
    expect(usuario).not.toBeNull();
    expect(usuario?.es_admin).toBe(false);
  });

  it('054-E6: la lista distingue pendientes de usadas', async () => {
    const cookieAdmin = await entrarComo('admin@club.com', 'admin');
    await invitar({ email: 'pendiente2@club.com', rol: 'usuario', equipoId: null }, cookieAdmin);
    await entrarComo('usada2@club.com', 'usuario');

    const { cuerpo } = await listar(cookieAdmin);

    const pendiente = cuerpo.find((i: { email: string }) => i.email === 'pendiente2@club.com');
    const usada = cuerpo.find((i: { email: string }) => i.email === 'usada2@club.com');
    expect(pendiente.usadaEn).toBeNull();
    expect(usada.usadaEn).not.toBeNull();
  });

  it('054-E7: un entrenador no puede ver, invitar ni retirar de la lista blanca', async () => {
    const cookie = await entrarComo('entrenador@club.com', 'entrenador', 'masculino');

    const ver = await listar(cookie);
    const invitacion = await invitar({ email: 'x@club.com', rol: 'usuario', equipoId: null }, cookie);
    const borrado = await retirar('x@club.com', cookie);

    expect(ver.status).toBe(403);
    expect(invitacion.status).toBe(403);
    expect(borrado.status).toBe(403);
  });

  it('054-E7: un usuario tampoco puede', async () => {
    const cookie = await entrarComo('jugador@club.com', 'usuario', 'masculino');

    const ver = await listar(cookie);

    expect(ver.status).toBe(403);
  });

  it('054-E8: sin sesión no se puede ver, invitar ni retirar', async () => {
    const ver = await listar();
    const invitacion = await invitar({ email: 'x@club.com', rol: 'usuario', equipoId: null });
    const borrado = await retirar('x@club.com');

    expect(ver.status).toBe(401);
    expect(invitacion.status).toBe(401);
    expect(borrado.status).toBe(401);
  });
});
