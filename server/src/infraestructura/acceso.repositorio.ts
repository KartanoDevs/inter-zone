import { randomUUID } from 'node:crypto';
import type { EquipoId, RolId } from '../../../src/app/domain/modelos';
import {
  LONGITUD_MINIMA_CONTRASENA,
  dorsalValido,
  esRolAccesoValido,
  normalizarEmail,
  normalizarNombre,
  resolverAltaDesdeInvitacion,
  type DatosPerfil,
  type RolAcceso,
} from '../../../src/app/domain/acceso';
import { esRolIdValido } from '../../../src/app/domain/roles';
import { prisma } from './prisma';
import { hashContrasena, necesitaRehash, verificarContrasena } from './contrasena';
import { DURACION_SESION_MS, generarTestigoSesion, huellaTestigo } from './sesion';

export class InvitacionNoDisponible extends Error {}
export class CorreoYaRegistrado extends Error {}
export class ContrasenaDemasiadoCorta extends Error {}
export class CredencialesInvalidas extends Error {}
export class PosicionFavoritaInvalida extends Error {}
export class DorsalInvalido extends Error {}
export class RolAccesoInvalido extends Error {}

export interface InvitacionListada {
  readonly email: string;
  readonly rol: RolAcceso;
  readonly equipoId: EquipoId | null;
  readonly creadaEn: Date;
  readonly usadaEn: Date | null;
}

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
  readonly nombre: string | null;
  readonly posicionFavorita: RolId | null;
  readonly dorsal: number | null;
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
  readonly nombre: string | null;
  readonly posicion_favorita: string | null;
  readonly dorsal: number | null;
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

function usuarioIdentificadoDeFila(
  fila: FilaUsuarioConMembresias,
  porId: Map<string, EquipoId>,
): UsuarioIdentificado {
  return {
    id: fila.id,
    email: fila.email,
    esAdmin: fila.es_admin,
    membresias: fila.membresias.map((membresia) => ({
      equipoId: porId.get(membresia.equipo_id) as EquipoId,
      rol: membresia.rol as Exclude<RolAcceso, 'admin'>,
    })),
    nombre: fila.nombre,
    posicionFavorita: fila.posicion_favorita as RolId | null,
    dorsal: fila.dorsal,
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
  const equipoIdInvitacion =
    invitacion.equipo_id === null ? null : (porId.get(invitacion.equipo_id) ?? null);
  const alta = resolverAltaDesdeInvitacion(
    { rol: invitacion.rol as RolAcceso, equipoId: equipoIdInvitacion },
    EQUIPOS,
  );

  const usuarioId = randomUUID();
  const contrasenaHash = await hashContrasena(contrasena);
  await prisma.$transaction([
    prisma.usuario.create({
      data: {
        id: usuarioId,
        email,
        contrasena_hash: contrasenaHash,
        es_admin: alta.esAdmin,
      },
    }),
    ...alta.membresias.map((membresia) =>
      prisma.membresia.create({
        data: {
          usuario_id: usuarioId,
          equipo_id: porClave.get(membresia.equipoId) as string,
          rol: membresia.rol,
        },
      }),
    ),
    prisma.lista_blanca.update({ where: { email }, data: { usada_en: new Date() } }),
  ]);
}

async function abrirSesion(usuarioId: string): Promise<SesionCreada> {
  const testigo = generarTestigoSesion();
  const expiraEn = new Date(Date.now() + DURACION_SESION_MS);
  await prisma.sesion.create({
    data: {
      id: randomUUID(),
      usuario_id: usuarioId,
      testigo_hash: huellaTestigo(testigo),
      expira_en: expiraEn,
    },
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
  if (!fila || !(await verificarContrasena(contrasena, fila.contrasena_hash))) {
    throw new CredencialesInvalidas();
  }
  // Rehash al vuelo (endurecimiento OWASP A02): si el hash guardado es de un formato o coste
  // viejo, ahora que se tiene la contraseña en claro se regenera con los parámetros actuales.
  // Sin migración ni reseteo: cada cuenta se actualiza sola la próxima vez que entra.
  if (necesitaRehash(fila.contrasena_hash)) {
    await prisma.usuario.update({
      where: { id: fila.id },
      data: { contrasena_hash: await hashContrasena(contrasena) },
    });
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
    prisma.usuario.findUniqueOrThrow({
      where: { id: sesion.usuario_id },
      include: { membresias: true },
    }),
    prisma.sesion.update({ where: { id: sesion.id }, data: { expira_en: nuevaExpiracion } }),
  ]);
  const { porId } = await mapaEquipos();
  return { usuario: usuarioIdentificadoDeFila(usuario, porId), expiraEn: nuevaExpiracion };
}

/** Invalida la sesión al instante (spec 035, E14): borra la fila, no espera a que caduque sola. */
export async function salir(testigo: string): Promise<void> {
  await prisma.sesion.deleteMany({ where: { testigo_hash: huellaTestigo(testigo) } });
}

/** Guarda los tres campos de perfil de una cuenta (spec 053): siempre los tres juntos, nunca el
 * correo ni el rol — ni aunque `datos` los trajera, esta función no los toca porque ni siquiera
 * los lee. Un nombre en blanco lo borra (`normalizarNombre`); `posicionFavorita`/`dorsal` nulos
 * también se guardan tal cual (E6). Rechaza una posición o un dorsal fuera de rango antes de
 * tocar la base. */
export async function actualizarPerfil(usuarioId: string, datos: DatosPerfil): Promise<void> {
  if (datos.posicionFavorita !== null && !esRolIdValido(datos.posicionFavorita)) {
    throw new PosicionFavoritaInvalida();
  }
  if (datos.dorsal !== null && !dorsalValido(datos.dorsal)) {
    throw new DorsalInvalido();
  }
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: {
      nombre: datos.nombre === null ? null : normalizarNombre(datos.nombre),
      posicion_favorita: datos.posicionFavorita,
      dorsal: datos.dorsal,
    },
  });
}

/** Cambia la contraseña, exigiendo acertar la actual (spec 053, E7) y que la nueva llegue al
 * mínimo (E8) — mismas reglas que al darse de alta. */
export async function cambiarContrasena(
  usuarioId: string,
  actual: string,
  nueva: string,
): Promise<void> {
  const fila = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  if (!(await verificarContrasena(actual, fila.contrasena_hash))) {
    throw new CredencialesInvalidas();
  }
  if (nueva.length < LONGITUD_MINIMA_CONTRASENA) {
    throw new ContrasenaDemasiadoCorta();
  }
  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { contrasena_hash: await hashContrasena(nueva) },
  });
}

/** Todas las invitaciones, pendientes y ya usadas (spec 054, E6). */
export async function listarInvitaciones(): Promise<readonly InvitacionListada[]> {
  const [invitaciones, { porId }] = await Promise.all([
    prisma.lista_blanca.findMany({ orderBy: { creado_en: 'desc' } }),
    mapaEquipos(),
  ]);
  return invitaciones.map((fila) => ({
    email: fila.email,
    rol: fila.rol as RolAcceso,
    equipoId: fila.equipo_id === null ? null : (porId.get(fila.equipo_id) ?? null),
    creadaEn: fila.creado_en,
    usadaEn: fila.usada_en,
  }));
}

/** Invita un correo, o actualiza su rol y equipo si ya estaba invitado y sin usar (spec 054,
 * E1-E2). Rechaza si el rol no es válido (E1) o si el correo ya tiene cuenta (E3) — el rol de
 * una cuenta ya creada no se toca desde aquí, solo desde el registro que ya la creó. */
export async function invitar(
  emailBruto: string,
  rol: string,
  equipoClave: EquipoId | null,
  invitadoPor: string,
): Promise<void> {
  if (!esRolAccesoValido(rol)) {
    throw new RolAccesoInvalido();
  }
  const email = normalizarEmail(emailBruto);
  const yaExiste = await prisma.usuario.findUnique({ where: { email } });
  if (yaExiste) {
    throw new CorreoYaRegistrado();
  }
  const { porClave } = await mapaEquipos();
  const equipoId = equipoClave === null ? null : porClave.get(equipoClave);
  await prisma.lista_blanca.upsert({
    where: { email },
    create: { email, rol, equipo_id: equipoId, invitado_por: invitadoPor },
    update: { rol, equipo_id: equipoId },
  });
}

/** Retira una invitación (spec 054, E4-E5): si ya se usó, no toca la cuenta que salió de
 * ella — la fila de `lista_blanca` es historia a partir de ahí, no la fuente de verdad de esa
 * cuenta. No falla si el correo no estaba invitado; simplemente no hace nada. */
export async function retirarInvitacion(emailBruto: string): Promise<void> {
  await prisma.lista_blanca.deleteMany({ where: { email: normalizarEmail(emailBruto) } });
}
