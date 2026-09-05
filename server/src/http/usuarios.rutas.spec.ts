import type { Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { EquipoId } from '../../../src/app/domain/modelos';
import { prisma } from '../infraestructura/prisma';
import { sembrarCatalogoBase } from '../infraestructura/semilla';
import { crearServidor } from './servidor';

/**
 * Tests de integración contra un Postgres real (spec 068) — requieren `npm run db:up` y la
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

async function entrarComo(
  email: string,
  rol: 'admin' | 'entrenador' | 'usuario',
  equipoClave?: EquipoId,
): Promise<string> {
  const equipoId = equipoClave
    ? (await prisma.equipo.findUniqueOrThrow({ where: { clave: equipoClave } })).id
    : null;
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

async function idDe(email: string): Promise<string> {
  return (await prisma.usuario.findUniqueOrThrow({ where: { email } })).id;
}

interface RespuestaJson {
  readonly status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly cuerpo: any;
}

async function listarUsuarios(cookie?: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/usuarios`, { headers: cookie ? { cookie } : {} });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function borrarUsuario(id: string, cookie?: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/usuarios/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: cookie ? { cookie } : {},
  });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

describe('API de borrado de cuentas (spec 068)', () => {
  it('068-E1: el admin borra una cuenta, con su membresía y su sesión', async () => {
    const cookieAdmin = await entrarComo('admin@club.com', 'admin');
    await entrarComo('jugador@club.com', 'usuario', 'masculino');
    const id = await idDe('jugador@club.com');

    const { status } = await borrarUsuario(id, cookieAdmin);

    expect(status).toBe(204);
    expect(await prisma.usuario.findUnique({ where: { id } })).toBeNull();
    expect(await prisma.membresia.findMany({ where: { usuario_id: id } })).toHaveLength(0);
    expect(await prisma.sesion.findMany({ where: { usuario_id: id } })).toHaveLength(0);
  });

  it('068-E2: borrar una cuenta admin cuando hay más de una se permite', async () => {
    const cookieAdmin = await entrarComo('admin1@club.com', 'admin');
    await entrarComo('admin2@club.com', 'admin');
    const idSegundo = await idDe('admin2@club.com');

    const { status } = await borrarUsuario(idSegundo, cookieAdmin);

    expect(status).toBe(204);
    expect(
      (await prisma.usuario.findUniqueOrThrow({ where: { email: 'admin1@club.com' } })).es_admin,
    ).toBe(true);
  });

  it('068-E3: no se puede borrar al último admin', async () => {
    const cookieAdmin = await entrarComo('unico@club.com', 'admin');
    const id = await idDe('unico@club.com');

    const { status } = await borrarUsuario(id, cookieAdmin);

    expect(status).toBe(409);
    expect(await prisma.usuario.findUnique({ where: { id } })).not.toBeNull();
  });

  it('068-E4: tras borrar, el correo se puede volver a dar de alta como cuenta nueva', async () => {
    const cookieAdmin = await entrarComo('admin@club.com', 'admin');
    await entrarComo('reciclado@club.com', 'entrenador', 'femenino');
    await borrarUsuario(await idDe('reciclado@club.com'), cookieAdmin);

    await fetch(`${base}/api/lista-blanca`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: cookieAdmin },
      body: JSON.stringify({ email: 'reciclado@club.com', rol: 'usuario', equipoId: null }),
    });
    const registro = await fetch(`${base}/api/auth/registro`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'reciclado@club.com', contrasena: 'otraclave123' }),
    });

    expect(registro.status).toBe(201);
    const nueva = await prisma.usuario.findUniqueOrThrow({
      where: { email: 'reciclado@club.com' },
    });
    expect(nueva.es_admin).toBe(false);
    // equipoId: null en la invitación da membresía en ambos equipos con rol "usuario" — nada que
    // ver con el equipo "femenino" que tenía la cuenta borrada, así que no hereda nada de ella.
    const membresias = await prisma.membresia.findMany({ where: { usuario_id: nueva.id } });
    expect(membresias.every((m) => m.rol === 'usuario')).toBe(true);
  });

  it('068-E5: el admin ve la lista de cuentas', async () => {
    const cookieAdmin = await entrarComo('admin@club.com', 'admin');
    await entrarComo('jugador@club.com', 'usuario', 'masculino');

    const { status, cuerpo } = await listarUsuarios(cookieAdmin);

    expect(status).toBe(200);
    const correos = cuerpo.map((u: { email: string }) => u.email);
    expect(correos).toContain('admin@club.com');
    expect(correos).toContain('jugador@club.com');
  });

  it('068-E6: un entrenador o un usuario no pueden listar ni borrar cuentas', async () => {
    const cookie = await entrarComo('entrenador@club.com', 'entrenador', 'masculino');
    const idPropio = await idDe('entrenador@club.com');

    const ver = await listarUsuarios(cookie);
    const borrado = await borrarUsuario(idPropio, cookie);

    expect(ver.status).toBe(403);
    expect(borrado.status).toBe(403);
  });

  it('068-E7: sin sesión no se puede listar ni borrar', async () => {
    const ver = await listarUsuarios();
    const borrado = await borrarUsuario('00000000-0000-0000-0000-000000000000');

    expect(ver.status).toBe(401);
    expect(borrado.status).toBe(401);
  });
});
