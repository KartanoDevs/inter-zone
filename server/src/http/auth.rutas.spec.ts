import type { Server } from 'node:http';
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../infraestructura/prisma';
import { sembrarCatalogoBase, sembrarPrimerAdmin } from '../infraestructura/semilla';
import { crearServidor } from './servidor';

/**
 * Tests de integración contra un Postgres real (spec 035) — requieren `npm run db:up` y la
 * migración aplicada (`npx prisma migrate deploy`). No entran en el `npm test` de la raíz.
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
  // Cascada de FK: borrar usuario se lleva membresia y sesion. lista_blanca no cuelga de
  // usuario (invitado_por es SET NULL), así que se borra aparte. equipo y jugador se quedan.
  await prisma.usuario.deleteMany({});
  await prisma.lista_blanca.deleteMany({});
});

async function invitar(email: string, rol: 'admin' | 'entrenador' | 'usuario', equipoClave?: 'masculino' | 'femenino') {
  const equipoId = equipoClave ? (await prisma.equipo.findUniqueOrThrow({ where: { clave: equipoClave } })).id : null;
  await prisma.lista_blanca.create({ data: { email, rol, equipo_id: equipoId } });
}

interface RespuestaJson {
  readonly status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly cuerpo: any;
  readonly cookie: string | null;
}

async function post(ruta: string, cuerpo: unknown, cookie?: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(cuerpo),
  });
  return {
    status: respuesta.status,
    cuerpo: await respuesta.json().catch(() => null),
    cookie: extraerCookie(respuesta),
  };
}

async function get(ruta: string, cookie?: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}${ruta}`, { headers: cookie ? { cookie } : {} });
  return {
    status: respuesta.status,
    cuerpo: await respuesta.json().catch(() => null),
    cookie: extraerCookie(respuesta),
  };
}

function extraerCookie(respuesta: globalThis.Response): string | null {
  const cabecera = respuesta.headers.get('set-cookie');
  if (!cabecera) {
    return null;
  }
  const testigo = /iz_sesion=([^;]*)/.exec(cabecera)?.[1];
  return testigo ? `iz_sesion=${testigo}` : null;
}

function valorTestigo(cookie: string): string {
  return cookie.split('=')[1] as string;
}

describe('API de acceso (spec 035)', () => {
  describe('registro', () => {
    it('035-E2: un correo que no está en la lista blanca no puede darse de alta', async () => {
      const { status } = await post('/api/auth/registro', { email: 'nadie@club.com', contrasena: 'contrasena123' });

      expect(status).toBe(403);
      expect(await prisma.usuario.findUnique({ where: { email: 'nadie@club.com' } })).toBeNull();
    });

    it('035-E6: la invitación se sella al usarse y no sirve una segunda vez', async () => {
      await invitar('sellada@club.com', 'usuario');
      const primera = await post('/api/auth/registro', { email: 'sellada@club.com', contrasena: 'contrasena123' });
      expect(primera.status).toBe(201);

      const segunda = await post('/api/auth/registro', { email: 'sellada@club.com', contrasena: 'otra12345' });

      expect(segunda.status).toBe(403);
    });

    it('035-E7: darse de alta dos veces con el mismo correo se rechaza', async () => {
      await invitar('doble@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'doble@club.com', contrasena: 'contrasena123' });

      await post('/api/auth/registro', { email: 'DOBLE@club.com  ', contrasena: 'otra12345' });

      expect(await prisma.usuario.count({ where: { email: 'doble@club.com' } })).toBe(1);
    });

    it('035-E8: la contraseña nunca se guarda en claro', async () => {
      await invitar('hash@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'hash@club.com', contrasena: 'contrasena123' });

      const fila = await prisma.usuario.findUniqueOrThrow({ where: { email: 'hash@club.com' } });

      expect(fila.contrasena_hash).not.toContain('contrasena123');
      expect(fila.contrasena_hash).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
    });

    it('035-E9: una contraseña más corta que el mínimo se rechaza al darse de alta', async () => {
      await invitar('corta@club.com', 'usuario');

      const { status } = await post('/api/auth/registro', { email: 'corta@club.com', contrasena: 'abc123' });

      expect(status).toBe(400);
      expect(await prisma.usuario.findUnique({ where: { email: 'corta@club.com' } })).toBeNull();
    });
  });

  describe('entrar y sesión', () => {
    it('035-E10: entrar con la contraseña correcta abre una sesión con caducidad', async () => {
      await invitar('entra@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'entra@club.com', contrasena: 'contrasena123' });

      const { status, cookie } = await post('/api/auth/entrar', { email: 'entra@club.com', contrasena: 'contrasena123' });

      expect(status).toBe(200);
      expect(cookie).not.toBeNull();
      const sesion = await prisma.sesion.findFirstOrThrow({ where: { usuario: { email: 'entra@club.com' } } });
      expect(sesion.expira_en.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
    });

    it('035-E11: entrar con la contraseña equivocada, y entrar con un correo inexistente, responden igual', async () => {
      await invitar('valida@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'valida@club.com', contrasena: 'contrasena123' });

      const contrasenaEquivocada = await post('/api/auth/entrar', { email: 'valida@club.com', contrasena: 'mala-clave' });
      const correoInexistente = await post('/api/auth/entrar', { email: 'nadie@club.com', contrasena: 'contrasena123' });

      expect(contrasenaEquivocada.status).toBe(correoInexistente.status);
      expect(contrasenaEquivocada.cuerpo).toEqual(correoInexistente.cuerpo);
      expect(contrasenaEquivocada.cookie).toBeNull();
    });

    it('035-E12: usar la sesión la renueva', async () => {
      await invitar('renueva@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'renueva@club.com', contrasena: 'contrasena123' });
      const { cookie } = await post('/api/auth/entrar', { email: 'renueva@club.com', contrasena: 'contrasena123' });
      const antes = await prisma.sesion.findFirstOrThrow({ where: { usuario: { email: 'renueva@club.com' } } });
      await prisma.sesion.update({ where: { id: antes.id }, data: { expira_en: new Date(Date.now() + 1000) } });

      const { status } = await get('/api/auth/quien-soy', cookie as string);

      expect(status).toBe(200);
      const despues = await prisma.sesion.findUniqueOrThrow({ where: { id: antes.id } });
      expect(despues.expira_en.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
    });

    it('035-E13: una sesión caducada deja de identificar a nadie', async () => {
      await invitar('caduca@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'caduca@club.com', contrasena: 'contrasena123' });
      const { cookie } = await post('/api/auth/entrar', { email: 'caduca@club.com', contrasena: 'contrasena123' });
      const sesion = await prisma.sesion.findFirstOrThrow({ where: { usuario: { email: 'caduca@club.com' } } });
      await prisma.sesion.update({ where: { id: sesion.id }, data: { expira_en: new Date(Date.now() - 1000) } });

      const { status, cuerpo } = await get('/api/auth/quien-soy', cookie as string);

      expect(status).toBe(200);
      expect(cuerpo).toEqual({ usuario: null });
    });

    it('035-E14: salir invalida la sesión al instante', async () => {
      await invitar('sale@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'sale@club.com', contrasena: 'contrasena123' });
      const { cookie } = await post('/api/auth/entrar', { email: 'sale@club.com', contrasena: 'contrasena123' });

      const salida = await post('/api/auth/salir', {}, cookie as string);
      expect(salida.status).toBe(204);

      const { cuerpo } = await get('/api/auth/quien-soy', cookie as string);
      expect(cuerpo).toEqual({ usuario: null });
      expect(await prisma.sesion.findFirst({ where: { usuario: { email: 'sale@club.com' } } })).toBeNull();
    });

    it('035-E15: preguntar quién ha entrado sin tener sesión responde que nadie, no un error', async () => {
      const { status, cuerpo } = await get('/api/auth/quien-soy');

      expect(status).toBe(200);
      expect(cuerpo).toEqual({ usuario: null });
    });

    it('035-E16: el testigo de sesión no se guarda tal cual, solo su huella', async () => {
      await invitar('huella@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'huella@club.com', contrasena: 'contrasena123' });
      const { cookie } = await post('/api/auth/entrar', { email: 'huella@club.com', contrasena: 'contrasena123' });
      const testigo = valorTestigo(cookie as string);

      const sesion = await prisma.sesion.findFirstOrThrow({ where: { usuario: { email: 'huella@club.com' } } });

      expect(sesion.testigo_hash).not.toBe(testigo);
      expect(sesion.testigo_hash).toBe(createHash('sha256').update(testigo).digest('hex'));
    });
  });

  describe('alta por rol e invitación', () => {
    it('035-E4: un correo invitado como entrenador de un equipo nace entrenador solo de ese equipo', async () => {
      await invitar('entrenadora@club.com', 'entrenador', 'femenino');
      await post('/api/auth/registro', { email: 'entrenadora@club.com', contrasena: 'contrasena123' });

      const usuario = await prisma.usuario.findUniqueOrThrow({
        where: { email: 'entrenadora@club.com' },
        include: { membresias: { include: { equipo: true } } },
      });

      expect(usuario.es_admin).toBe(false);
      expect(usuario.membresias.map((m) => ({ equipo: m.equipo.clave, rol: m.rol }))).toEqual([
        { equipo: 'femenino', rol: 'entrenador' },
      ]);
    });

    it('035-E5: un correo invitado sin equipo asignado nace con el rol invitado en los dos equipos', async () => {
      await invitar('ambos@club.com', 'entrenador');
      await post('/api/auth/registro', { email: 'ambos@club.com', contrasena: 'contrasena123' });

      const usuario = await prisma.usuario.findUniqueOrThrow({
        where: { email: 'ambos@club.com' },
        include: { membresias: { include: { equipo: true } } },
      });

      expect(usuario.membresias.map((m) => m.equipo.clave).sort()).toEqual(['femenino', 'masculino']);
    });

    it('035-E17: el primer admin nace de una invitación sembrada al arrancar el servidor', async () => {
      process.env['ADMIN_EMAIL_INICIAL'] = 'admin-inicial@club.com';

      await sembrarPrimerAdmin();
      delete process.env['ADMIN_EMAIL_INICIAL'];

      const invitacion = await prisma.lista_blanca.findUniqueOrThrow({ where: { email: 'admin-inicial@club.com' } });
      expect(invitacion.rol).toBe('admin');
      expect(invitacion.equipo_id).toBeNull();
      expect(invitacion.usada_en).toBeNull();

      const registro = await post('/api/auth/registro', { email: 'admin-inicial@club.com', contrasena: 'contrasena123' });
      expect(registro.status).toBe(201);
      const usuario = await prisma.usuario.findUniqueOrThrow({ where: { email: 'admin-inicial@club.com' } });
      expect(usuario.es_admin).toBe(true);
    });
  });
});
