import { fileURLToPath } from 'node:url';
import type { Sistema } from '../../../src/app/domain/modelos';
import { normalizarEmail } from '../../../src/app/domain/acceso';
import { sistemasDeDesarrollo } from './datos-desarrollo';
import { prisma } from './prisma';
import { actualizar, cambiarEstadoSistema, crear } from './sistema.repositorio';
import { registrar } from './acceso.repositorio';

/** Correo de la cuenta demo (README §4.5) — fija, a diferencia de `ADMIN_EMAIL_INICIAL`, que
 * cada despliegue elige por su cuenta. Solo se usa en desarrollo (ADR 0045): nunca se invita ni
 * se registra en producción, donde este script no se ejecuta. */
const DEMO_EMAIL = 'admin@cvinter.com';
const DEMO_CONTRASENA = process.env['DEMO_CONTRASENA'] ?? '12345678';

/** Crea el sistema si no existe (por `equipo_id, tipo, nombre`, la `@@unique` del esquema) o lo
 * sustituye entero si ya existe — a diferencia de `sembrarEjemplos` (`semilla.ts`), que nunca
 * pisa un sistema ya sembrado. Este script es explícitamente destructivo: su objetivo es dejar
 * el entorno de desarrollo con un juego de datos de prueba conocido, no conservar cambios que
 * alguien le hiciera a mano entre dos ejecuciones. Siempre nace validado (spec 051): un sistema
 * de prueba sin validar no aparecería en Teoría ni en Examen, que es donde sirve de algo. */
async function sembrarOSustituirSistema(datos: Omit<Sistema, 'id'>): Promise<void> {
  const equipoRow = await prisma.equipo.findUniqueOrThrow({ where: { clave: datos.equipoId } });
  const existente = await prisma.sistema.findFirst({
    where: { equipo_id: equipoRow.id, tipo: datos.tipo, nombre: datos.nombre },
  });
  let id: string;
  if (!existente) {
    id = crypto.randomUUID();
    await crear({ ...datos, id });
  } else {
    id = existente.id;
    await actualizar({ ...datos, id }, existente.actualizado_en.toISOString());
  }
  await cambiarEstadoSistema(id, 'validado', null);
}

/** Los seis sistemas de prueba de `datos-desarrollo.ts` (ADR 0045). */
export async function sembrarSistemasDeDesarrollo(): Promise<void> {
  for (const datos of sistemasDeDesarrollo()) {
    await sembrarOSustituirSistema(datos);
  }
}

/** La cuenta con la que el tribunal del TFM entra a la web de desarrollo (README §4.5).
 * Idempotente en el sentido contrario al resto de este script: si la cuenta ya existe, NO se
 * toca — ni su contraseña ni su rol — para no invalidar una sesión abierta ni sorprender a
 * quien la esté usando. Solo si no existe se invita y se registra, exactamente por el mismo
 * camino que un alta real (`registrar`, en `acceso.repositorio.ts`): la contraseña pasa por
 * `scrypt` igual que cualquier otra.
 *
 * Se comprueba `usuario.findUnique` antes de llamar a `registrar`, en vez de capturar su error:
 * `registrar` sella la invitación en la misma transacción que crea la cuenta, así que en la
 * segunda ejecución la invitación ya está usada y `registrar` lanza `InvitacionNoDisponible`
 * —no `CorreoYaRegistrado`— antes de llegar a comprobar si el usuario existe. */
async function sembrarCuentaDemo(): Promise<void> {
  const email = normalizarEmail(DEMO_EMAIL);
  await prisma.lista_blanca.upsert({
    where: { email },
    update: {},
    create: { email, rol: 'admin', equipo_id: null },
  });
  const yaExiste = await prisma.usuario.findUnique({ where: { email } });
  if (yaExiste) {
    return;
  }
  await registrar(email, DEMO_CONTRASENA);
}

async function main(): Promise<void> {
  await sembrarSistemasDeDesarrollo();
  await sembrarCuentaDemo();
}

// Mismo patrón que `semilla.ts`: solo se ejecuta como script, nunca al importar desde los tests.
const esScript =
  process.argv[1] &&
  fileURLToPath(import.meta.url).endsWith(
    process.argv[1].replace(/\\/g, '/').split('/').pop() || '',
  );
if (esScript) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
