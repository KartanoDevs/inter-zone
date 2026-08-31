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

async function invitar(
  email: string,
  rol: 'admin' | 'entrenador' | 'usuario',
  equipoClave?: 'masculino' | 'femenino',
) {
  const equipoId = equipoClave
    ? (await prisma.equipo.findUniqueOrThrow({ where: { clave: equipoClave } })).id
    : null;
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

async function put(ruta: string, cuerpo: unknown, cookie?: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(cuerpo),
  });
  return {
    status: respuesta.status,
    cuerpo: await respuesta.json().catch(() => null),
    cookie: extraerCookie(respuesta),
  };
}

/** Invita, registra y entra con un correo nuevo (spec 053): devuelve la cookie de sesión lista
 * para usar en la siguiente petición. */
async function crearYEntrar(email: string): Promise<string> {
  await invitar(email, 'usuario');
  await post('/api/auth/registro', { email, contrasena: 'contrasena123' });
  const { cookie } = await post('/api/auth/entrar', { email, contrasena: 'contrasena123' });
  if (!cookie) {
    throw new Error('No se obtuvo cookie de sesión');
  }
  return cookie;
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
      const { status } = await post('/api/auth/registro', {
        email: 'nadie@club.com',
        contrasena: 'contrasena123',
      });

      expect(status).toBe(403);
      expect(await prisma.usuario.findUnique({ where: { email: 'nadie@club.com' } })).toBeNull();
    });

    it('035-E6: la invitación se sella al usarse y no sirve una segunda vez', async () => {
      await invitar('sellada@club.com', 'usuario');
      const primera = await post('/api/auth/registro', {
        email: 'sellada@club.com',
        contrasena: 'contrasena123',
      });
      expect(primera.status).toBe(201);

      const segunda = await post('/api/auth/registro', {
        email: 'sellada@club.com',
        contrasena: 'otra12345',
      });

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

      const { status } = await post('/api/auth/registro', {
        email: 'corta@club.com',
        contrasena: 'abc123',
      });

      expect(status).toBe(400);
      expect(await prisma.usuario.findUnique({ where: { email: 'corta@club.com' } })).toBeNull();
    });
  });

  describe('entrar y sesión', () => {
    it('035-E10: entrar con la contraseña correcta abre una sesión con caducidad', async () => {
      await invitar('entra@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'entra@club.com', contrasena: 'contrasena123' });

      const { status, cookie } = await post('/api/auth/entrar', {
        email: 'entra@club.com',
        contrasena: 'contrasena123',
      });

      expect(status).toBe(200);
      expect(cookie).not.toBeNull();
      const sesion = await prisma.sesion.findFirstOrThrow({
        where: { usuario: { email: 'entra@club.com' } },
      });
      expect(sesion.expira_en.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
    });

    it('035-E11: entrar con la contraseña equivocada, y entrar con un correo inexistente, responden igual', async () => {
      await invitar('valida@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'valida@club.com', contrasena: 'contrasena123' });

      const contrasenaEquivocada = await post('/api/auth/entrar', {
        email: 'valida@club.com',
        contrasena: 'mala-clave',
      });
      const correoInexistente = await post('/api/auth/entrar', {
        email: 'nadie@club.com',
        contrasena: 'contrasena123',
      });

      expect(contrasenaEquivocada.status).toBe(correoInexistente.status);
      expect(contrasenaEquivocada.cuerpo).toEqual(correoInexistente.cuerpo);
      expect(contrasenaEquivocada.cookie).toBeNull();
    });

    it('035-E12: usar la sesión la renueva', async () => {
      await invitar('renueva@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'renueva@club.com', contrasena: 'contrasena123' });
      const { cookie } = await post('/api/auth/entrar', {
        email: 'renueva@club.com',
        contrasena: 'contrasena123',
      });
      const antes = await prisma.sesion.findFirstOrThrow({
        where: { usuario: { email: 'renueva@club.com' } },
      });
      await prisma.sesion.update({
        where: { id: antes.id },
        data: { expira_en: new Date(Date.now() + 1000) },
      });

      const { status } = await get('/api/auth/quien-soy', cookie as string);

      expect(status).toBe(200);
      const despues = await prisma.sesion.findUniqueOrThrow({ where: { id: antes.id } });
      expect(despues.expira_en.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
    });

    it('035-E13: una sesión caducada deja de identificar a nadie', async () => {
      await invitar('caduca@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'caduca@club.com', contrasena: 'contrasena123' });
      const { cookie } = await post('/api/auth/entrar', {
        email: 'caduca@club.com',
        contrasena: 'contrasena123',
      });
      const sesion = await prisma.sesion.findFirstOrThrow({
        where: { usuario: { email: 'caduca@club.com' } },
      });
      await prisma.sesion.update({
        where: { id: sesion.id },
        data: { expira_en: new Date(Date.now() - 1000) },
      });

      const { status, cuerpo } = await get('/api/auth/quien-soy', cookie as string);

      expect(status).toBe(200);
      expect(cuerpo).toEqual({ usuario: null });
    });

    it('035-E14: salir invalida la sesión al instante', async () => {
      await invitar('sale@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'sale@club.com', contrasena: 'contrasena123' });
      const { cookie } = await post('/api/auth/entrar', {
        email: 'sale@club.com',
        contrasena: 'contrasena123',
      });

      const salida = await post('/api/auth/salir', {}, cookie as string);
      expect(salida.status).toBe(204);

      const { cuerpo } = await get('/api/auth/quien-soy', cookie as string);
      expect(cuerpo).toEqual({ usuario: null });
      expect(
        await prisma.sesion.findFirst({ where: { usuario: { email: 'sale@club.com' } } }),
      ).toBeNull();
    });

    it('035-E15: preguntar quién ha entrado sin tener sesión responde que nadie, no un error', async () => {
      const { status, cuerpo } = await get('/api/auth/quien-soy');

      expect(status).toBe(200);
      expect(cuerpo).toEqual({ usuario: null });
    });

    it('035-E16: el testigo de sesión no se guarda tal cual, solo su huella', async () => {
      await invitar('huella@club.com', 'usuario');
      await post('/api/auth/registro', { email: 'huella@club.com', contrasena: 'contrasena123' });
      const { cookie } = await post('/api/auth/entrar', {
        email: 'huella@club.com',
        contrasena: 'contrasena123',
      });
      const testigo = valorTestigo(cookie as string);

      const sesion = await prisma.sesion.findFirstOrThrow({
        where: { usuario: { email: 'huella@club.com' } },
      });

      expect(sesion.testigo_hash).not.toBe(testigo);
      expect(sesion.testigo_hash).toBe(createHash('sha256').update(testigo).digest('hex'));
    });
  });

  describe('alta por rol e invitación', () => {
    it('035-E4: un correo invitado como entrenador de un equipo nace entrenador solo de ese equipo', async () => {
      await invitar('entrenadora@club.com', 'entrenador', 'femenino');
      await post('/api/auth/registro', {
        email: 'entrenadora@club.com',
        contrasena: 'contrasena123',
      });

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

      expect(usuario.membresias.map((m) => m.equipo.clave).sort()).toEqual([
        'femenino',
        'masculino',
      ]);
    });

    it('035-E17: el primer admin nace de una invitación sembrada al arrancar el servidor', async () => {
      process.env['ADMIN_EMAIL_INICIAL'] = 'admin-inicial@club.com';

      await sembrarPrimerAdmin();
      delete process.env['ADMIN_EMAIL_INICIAL'];

      const invitacion = await prisma.lista_blanca.findUniqueOrThrow({
        where: { email: 'admin-inicial@club.com' },
      });
      expect(invitacion.rol).toBe('admin');
      expect(invitacion.equipo_id).toBeNull();
      expect(invitacion.usada_en).toBeNull();

      const registro = await post('/api/auth/registro', {
        email: 'admin-inicial@club.com',
        contrasena: 'contrasena123',
      });
      expect(registro.status).toBe(201);
      const usuario = await prisma.usuario.findUniqueOrThrow({
        where: { email: 'admin-inicial@club.com' },
      });
      expect(usuario.es_admin).toBe(true);
    });
  });

  describe('perfil (spec 053)', () => {
    it('053-E1: quien-soy incluye los campos de perfil ya guardados', async () => {
      const cookie = await crearYEntrar('perfil1@club.com');
      await put(
        '/api/auth/perfil',
        { nombre: 'Ana', posicionFavorita: 'colocador', dorsal: 7 },
        cookie,
      );

      const { cuerpo } = await get('/api/auth/quien-soy', cookie);

      expect(cuerpo.usuario).toMatchObject({
        nombre: 'Ana',
        posicionFavorita: 'colocador',
        dorsal: 7,
      });
    });

    it('053-E2: un nombre guardado sigue ahí en una petición posterior', async () => {
      const cookie = await crearYEntrar('perfil2@club.com');

      await put(
        '/api/auth/perfil',
        { nombre: 'Bea', posicionFavorita: null, dorsal: null },
        cookie,
      );
      const { cuerpo } = await get('/api/auth/quien-soy', cookie);

      expect(cuerpo.usuario.nombre).toBe('Bea');
    });

    it('053-E3: una posición favorita que no es un rol de voleibol se rechaza', async () => {
      const cookie = await crearYEntrar('perfil3@club.com');

      const { status } = await put(
        '/api/auth/perfil',
        { nombre: null, posicionFavorita: 'entrenador', dorsal: null },
        cookie,
      );

      expect(status).toBe(400);
    });

    it('053-E4: un dorsal fuera de 1-99 se rechaza y no cambia el guardado', async () => {
      const cookie = await crearYEntrar('perfil4@club.com');
      await put('/api/auth/perfil', { nombre: null, posicionFavorita: null, dorsal: 10 }, cookie);

      const { status } = await put(
        '/api/auth/perfil',
        { nombre: null, posicionFavorita: null, dorsal: 150 },
        cookie,
      );

      expect(status).toBe(400);
      const { cuerpo } = await get('/api/auth/quien-soy', cookie);
      expect(cuerpo.usuario.dorsal).toBe(10);
    });

    it('053-E5: guardar los tres campos en blanco no da error', async () => {
      const cookie = await crearYEntrar('perfil5@club.com');

      const { status } = await put(
        '/api/auth/perfil',
        { nombre: null, posicionFavorita: null, dorsal: null },
        cookie,
      );

      expect(status).toBe(200);
    });

    it('053-E6: vaciar un dorsal ya guardado lo borra', async () => {
      const cookie = await crearYEntrar('perfil6@club.com');
      await put('/api/auth/perfil', { nombre: null, posicionFavorita: null, dorsal: 23 }, cookie);

      await put('/api/auth/perfil', { nombre: null, posicionFavorita: null, dorsal: null }, cookie);

      const { cuerpo } = await get('/api/auth/quien-soy', cookie);
      expect(cuerpo.usuario.dorsal).toBeNull();
    });

    it('053-E7: cambiar la contraseña exige acertar la actual', async () => {
      const cookie = await crearYEntrar('perfil7@club.com');

      const { status } = await put(
        '/api/auth/contrasena',
        { actual: 'mala-clave', nueva: 'nuevaclave123' },
        cookie,
      );

      expect(status).toBe(401);
    });

    it('053-E7: cambiar la contraseña con la actual correcta funciona, y sirve para entrar después', async () => {
      const cookie = await crearYEntrar('perfil7b@club.com');

      const { status } = await put(
        '/api/auth/contrasena',
        { actual: 'contrasena123', nueva: 'nuevaclave123' },
        cookie,
      );
      expect(status).toBe(204);

      const entrada = await post('/api/auth/entrar', {
        email: 'perfil7b@club.com',
        contrasena: 'nuevaclave123',
      });
      expect(entrada.status).toBe(200);
    });

    it('053-E8: la nueva contraseña también tiene que llegar al mínimo', async () => {
      const cookie = await crearYEntrar('perfil8@club.com');

      const { status } = await put(
        '/api/auth/contrasena',
        { actual: 'contrasena123', nueva: 'corta' },
        cookie,
      );

      expect(status).toBe(400);
    });

    it('053-E9: el correo y el rol no cambian aunque se manden en la petición', async () => {
      const cookie = await crearYEntrar('perfil9@club.com');

      await put(
        '/api/auth/perfil',
        {
          email: 'otro@club.com',
          rol: 'admin',
          nombre: null,
          posicionFavorita: null,
          dorsal: null,
        },
        cookie,
      );

      const { cuerpo } = await get('/api/auth/quien-soy', cookie);
      expect(cuerpo.usuario.email).toBe('perfil9@club.com');
      expect(cuerpo.usuario.esAdmin).toBe(false);
    });

    it('sin sesión no se puede guardar el perfil ni cambiar la contraseña', async () => {
      const perfil = await put('/api/auth/perfil', {
        nombre: 'X',
        posicionFavorita: null,
        dorsal: null,
      });
      const contrasena = await put('/api/auth/contrasena', { actual: 'a', nueva: 'contrasena123' });

      expect(perfil.status).toBe(401);
      expect(contrasena.status).toBe(401);
    });
  });
});
