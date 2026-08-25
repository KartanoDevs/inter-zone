import { randomUUID } from 'node:crypto';
import type { EquipoId } from '../../../src/app/domain/modelos';
import {
  LONGITUD_MINIMA_CONTRASENA,
  normalizarEmail,
  resolverAltaDesdeInvitacion,
  type RolAcceso,
} from '../../../src/app/domain/acceso';
import { prisma } from './prisma';
import { hashContrasena, verificarContrasena } from './contrasena';
import { DURACION_SESION_MS, generarTestigoSesion, huellaTestigo } from './sesion';

export class InvitacionNoDisponible extends Error {}
export class CorreoYaRegistrado extends Error {}
export class ContrasenaDemasiadoCorta extends Error {}
export class CredencialesInvalidas extends Error {}

const EQUIPOS: readonly EquipoId[] = ['masculino', 'femenino'];

export interface MembresiaUsuario {
  readonly equipoId: EquipoId;
  readonly rol: Exclude<RolAcceso, 'admin'>;
}

export interface UsuarioIdentificado {
  readonly id: string;
  readonly email: string;
  readonly esAdmin: boolean;
  readonly membresias: readonly MembresiaUsuario[];
}

export interface SesionCreada {
  readonly testigo: string;
  readonly expiraEn: Date;
}

export interface QuienSoyResultado {
  readonly usuario: UsuarioIdentificado;
  readonly expiraEn: Date;
}

interface FilaUsuarioConMembresias {
  readonly id: string;
  readonly email: string;
  readonly es_admin: boolean;
  readonly membresias: readonly { readonly equipo_id: string; readonly rol: string }[];
}

async function mapaEquipos(): Promise<{
  readonly porId: Map<string, EquipoId>;
  readonly porClave: Map<EquipoId, string>;
}> {
  const equipos = await prisma.equipo.findMany();
  return {
    porId: new Map(equipos.map((equipo) => [equipo.id, equipo.clave as EquipoId])),
    porClave: new Map(equipos.map((equipo) => [equipo.clave as EquipoId, equipo.id])),
  };
}

function usuarioIdentificadoDeFila(fila: FilaUsuarioConMembresias, porId: Map<string, EquipoId>): UsuarioIdentificado {
  return {
    id: fila.id,
    email: fila.email,
    esAdmin: fila.es_admin,
    membresias: fila.membresias.map((membresia) => ({
      equipoId: porId.get(membresia.equipo_id) as EquipoId,
      rol: membresia.rol as Exclude<RolAcceso, 'admin'>,
    })),
  };
}

/** Da de alta una cuenta a partir de una invitación de la lista blanca (spec 035). Rechaza si
 * no hay invitación disponible (E2, E6), si el correo ya tiene cuenta (E7) o si la contraseña
 * no llega al mínimo (E9). La invitación se sella dentro de la misma transacción que crea la
 * cuenta y sus membresías, para que las dos cosas queden o no queden juntas. */
export async function registrar(emailBruto: string, contrasena: string): Promise<void> {
  const email = normalizarEmail(emailBruto);
  const invitacion = await prisma.lista_blanca.findUnique({ where: { email } });
  if (!invitacion || invitacion.usada_en !== null) {
    throw new InvitacionNoDisponible();
  }
  const yaExiste = await prisma.usuario.findUnique({ where: { email } });
  if (yaExiste) {
    throw new CorreoYaRegistrado();
  }
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
    throw new ContrasenaDemasiadoCorta();
  }

  const { porId, porClave } = await mapaEquipos();
  const equipoIdInvitacion = invitacion.equipo_id === null ? null : (porId.get(invitacion.equipo_id) ?? null);
  const alta = resolverAltaDesdeInvitacion(
    { rol: invitacion.rol as RolAcceso, equipoId: equipoIdInvitacion },
    EQUIPOS,
  );

  const usuarioId = randomUUID();
  await prisma.$transaction([
    prisma.usuario.create({
      data: { id: usuarioId, email, contrasena_hash: hashContrasena(contrasena), es_admin: alta.esAdmin },
    }),
    ...alta.membresias.map((membresia) =>
      prisma.membresia.create({
        data: { usuario_id: usuarioId, equipo_id: porClave.get(membresia.equipoId) as string, rol: membresia.rol },
      }),
    ),
    prisma.lista_blanca.update({ where: { email }, data: { usada_en: new Date() } }),
  ]);
}

async function abrirSesion(usuarioId: string): Promise<SesionCreada> {
  const testigo = generarTestigoSesion();
  const expiraEn = new Date(Date.now() + DURACION_SESION_MS);
  await prisma.sesion.create({
    data: { id: randomUUID(), usuario_id: usuarioId, testigo_hash: huellaTestigo(testigo), expira_en: expiraEn },
  });
  return { testigo, expiraEn };
}

/** Entrar con correo y contraseña (spec 035, E10). E11: una contraseña incorrecta y un correo
 * inexistente lanzan exactamente el mismo error — nunca se revela cuál de los dos pasó. */
export async function entrar(
  emailBruto: string,
  contrasena: string,
): Promise<{ readonly usuario: UsuarioIdentificado; readonly sesion: SesionCreada }> {
  const email = normalizarEmail(emailBruto);
  const fila = await prisma.usuario.findUnique({ where: { email }, include: { membresias: true } });
  if (!fila || !verificarContrasena(contrasena, fila.contrasena_hash)) {
    throw new CredencialesInvalidas();
  }
  const { porId } = await mapaEquipos();
  const sesion = await abrirSesion(fila.id);
  return { usuario: usuarioIdentificadoDeFila(fila, porId), sesion };
}

/** Quién ha entrado, a partir del testigo de la cookie (spec 035). `null` si no hay sesión, si
 * el testigo no corresponde a ninguna, o si ya caducó (E13, E15) — nunca un error. Si la sesión
 * es válida, la renueva otros 30 días (E12) en la misma transacción con la que se lee. */
export async function quienSoy(testigo: string): Promise<QuienSoyResultado | null> {
  const huella = huellaTestigo(testigo);
  const sesion = await prisma.sesion.findUnique({ where: { testigo_hash: huella } });
  if (!sesion || sesion.expira_en <= new Date()) {
    return null;
  }
  const nuevaExpiracion = new Date(Date.now() + DURACION_SESION_MS);
  const [usuario] = await prisma.$transaction([
    prisma.usuario.findUniqueOrThrow({ where: { id: sesion.usuario_id }, include: { membresias: true } }),
    prisma.sesion.update({ where: { id: sesion.id }, data: { expira_en: nuevaExpiracion } }),
  ]);
  const { porId } = await mapaEquipos();
  return { usuario: usuarioIdentificadoDeFila(usuario, porId), expiraEn: nuevaExpiracion };
}

/** Invalida la sesión al instante (spec 035, E14): borra la fila, no espera a que caduque sola. */
export async function salir(testigo: string): Promise<void> {
  await prisma.sesion.deleteMany({ where: { testigo_hash: huellaTestigo(testigo) } });
}
