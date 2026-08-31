import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../infraestructura/prisma';
import { crearServidor } from './servidor';

/**
 * Tests de integración contra un Postgres real (spec 056) — requieren `npm run db:up` y la
 * migración aplicada. No entran en el `npm test` de la raíz.
 */

let servidor: Server;
let base: string;

beforeAll(async () => {
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
  await prisma.insignia_examen.deleteMany({});
  await prisma.usuario.deleteMany({});
  await prisma.sistema.deleteMany({});
  await prisma.equipo.deleteMany({});
  await prisma.lista_blanca.deleteMany({});
  // `registrar` afilia a un rol sin equipo (invitación con equipo_id null) a TODOS los equipos
  // conocidos por el dominio (acceso.ts: EQUIPOS) — hacen falta los dos sembrados, o falla al
  // buscar el id del que falte.
  await prisma.equipo.upsert({
    where: { clave: 'masculino' },
    update: {},
    create: { clave: 'masculino', nombre: 'Masculino' },
  });
  await prisma.equipo.upsert({
    where: { clave: 'femenino' },
    update: {},
    create: { clave: 'femenino', nombre: 'Femenino' },
  });
});

async function entrarComo(email: string): Promise<string> {
  await prisma.lista_blanca.create({ data: { email, rol: 'usuario', equipo_id: null } });
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

async function crearSistema(nombre: string): Promise<string> {
  const equipo = await prisma.equipo.upsert({
    where: { clave: 'masculino' },
    update: {},
    create: { clave: 'masculino', nombre: 'Masculino' },
  });
  const validador = await prisma.usuario.create({
    data: { email: `validador-${randomUUID()}@club.com`, contrasena_hash: 'x', es_admin: false },
  });
  const sistema = await prisma.sistema.create({
    data: {
      equipo_id: equipo.id,
      tipo: 'recepcion',
      nombre,
      estado: 'validado',
      validado_por: validador.id,
      validado_en: new Date(),
    },
  });
  return sistema.id;
}

interface RespuestaJson {
  readonly status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly cuerpo: any;
}

async function registrarInsignia(cuerpo: unknown, cookie?: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/examen/insignias`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(cuerpo),
  });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

async function listarInsignias(cookie?: string): Promise<RespuestaJson> {
  const respuesta = await fetch(`${base}/api/examen/insignias`, {
    headers: cookie ? { cookie } : {},
  });
  return { status: respuesta.status, cuerpo: await respuesta.json().catch(() => null) };
}

describe('API de insignias del examen (spec 056)', () => {
  it('056-E1: ganar un examen guarda su insignia en la cuenta', async () => {
    const cookie = await entrarComo('alumno@club.com');
    const sistemaId = await crearSistema('Recepción 4-2');

    const { status } = await registrarInsignia(
      { sistemaId, tipo: 'puesto', titularId: 'receptor1' },
      cookie,
    );

    expect(status).toBe(201);
    const filas = await prisma.insignia_examen.findMany();
    expect(filas).toHaveLength(1);
    expect(filas[0]?.tipo).toBe('puesto');
    expect(filas[0]?.titular_id).toBe('receptor1');
  });

  it('056-E1b: el examen por sistema no lleva titular', async () => {
    const cookie = await entrarComo('alumno@club.com');
    const sistemaId = await crearSistema('Recepción 4-2');

    const { status } = await registrarInsignia(
      { sistemaId, tipo: 'sistema', titularId: null },
      cookie,
    );

    expect(status).toBe(201);
    const fila = await prisma.insignia_examen.findFirstOrThrow();
    expect(fila.titular_id).toBe('');
  });

  it('056-E3: repetir un examen ya superado no duplica ni pierde la insignia', async () => {
    const cookie = await entrarComo('alumno@club.com');
    const sistemaId = await crearSistema('Recepción 4-2');
    await registrarInsignia({ sistemaId, tipo: 'linea', titularId: 'central1' }, cookie);
    const primera = await prisma.insignia_examen.findFirstOrThrow();

    await registrarInsignia({ sistemaId, tipo: 'linea', titularId: 'central1' }, cookie);

    const filas = await prisma.insignia_examen.findMany();
    expect(filas).toHaveLength(1);
    expect(filas[0]?.obtenida_en).toEqual(primera.obtenida_en);
  });

  it('056-E4: las insignias de una cuenta se pueden consultar', async () => {
    const cookie = await entrarComo('alumno@club.com');
    const sistemaId = await crearSistema('Recepción 4-2');
    await registrarInsignia({ sistemaId, tipo: 'puesto', titularId: 'receptor1' }, cookie);

    const { status, cuerpo } = await listarInsignias(cookie);

    expect(status).toBe(200);
    expect(cuerpo).toHaveLength(1);
    expect(cuerpo[0].sistemaId).toBe(sistemaId);
    expect(cuerpo[0].tipo).toBe('puesto');
    expect(cuerpo[0].titularId).toBe('receptor1');
  });

  it('056-E5: una cuenta sin ninguna insignia no da error al consultarlas', async () => {
    const cookie = await entrarComo('sinnada@club.com');

    const { status, cuerpo } = await listarInsignias(cookie);

    expect(status).toBe(200);
    expect(cuerpo).toEqual([]);
  });

  it('056-E6: solo la propia cuenta ve sus insignias', async () => {
    const cookieUno = await entrarComo('uno@club.com');
    const cookieDos = await entrarComo('dos@club.com');
    const sistemaId = await crearSistema('Recepción 4-2');
    await registrarInsignia({ sistemaId, tipo: 'puesto', titularId: 'receptor1' }, cookieUno);

    const { cuerpo } = await listarInsignias(cookieDos);

    expect(cuerpo).toEqual([]);
  });

  it('056-E7: guardar una insignia exige sesión iniciada', async () => {
    const sistemaId = await crearSistema('Recepción 4-2');

    const { status } = await registrarInsignia({
      sistemaId,
      tipo: 'puesto',
      titularId: 'receptor1',
    });

    expect(status).toBe(401);
  });

  it('056-E7b: consultar insignias también exige sesión', async () => {
    const { status } = await listarInsignias();

    expect(status).toBe(401);
  });
});
