import { PLANTILLA_GLOBAL } from '../../../src/app/domain/plantilla-global';
import { sistemaPorDefecto } from '../../../src/app/domain/sistema-por-defecto';
import { sistemaDefensaPorDefecto } from '../../../src/app/domain/sistema-defensa-por-defecto';
import type { EquipoId } from '../../../src/app/domain/modelos';
import { normalizarEmail } from '../../../src/app/domain/acceso';
import { prisma } from './prisma';
import { cambiarEstadoSistema, crear } from './sistema.repositorio';

const EQUIPOS: readonly { readonly clave: EquipoId; readonly nombre: string }[] = [
  { clave: 'masculino', nombre: 'Senior masculino' },
  { clave: 'femenino', nombre: 'Senior femenino' },
];

/** Los siete huecos fijos del dominio, copia literal de `PLANTILLA_GLOBAL`
 * (docs/modelo-de-datos.md §5). */
const JUGADORES = [
  { id: 'colocador', rol: 'colocador' as const, indice: null, orden_saque: 1 },
  { id: 'receptor1', rol: 'receptor' as const, indice: 1, orden_saque: 2 },
  { id: 'central2', rol: 'central' as const, indice: 2, orden_saque: 3 },
  { id: 'opuesto', rol: 'opuesto' as const, indice: null, orden_saque: 4 },
  { id: 'receptor2', rol: 'receptor' as const, indice: 2, orden_saque: 5 },
  { id: 'central1', rol: 'central' as const, indice: 1, orden_saque: 6 },
  { id: 'libero', rol: 'libero' as const, indice: null, orden_saque: null },
];

/** Equipo y jugador (spec 033): datos de referencia que tienen que existir antes que
 * cualquier sistema, porque `sistema.equipo_id` y `colocacion.jugador_id` los referencian.
 * Idempotente: se puede volver a llamar sin duplicar nada. */
export async function sembrarCatalogoBase(): Promise<void> {
  for (const equipo of EQUIPOS) {
    await prisma.equipo.upsert({
      where: { clave: equipo.clave },
      update: { nombre: equipo.nombre },
      create: equipo,
    });
  }
  for (const jugador of JUGADORES) {
    await prisma.jugador.upsert({
      where: { id: jugador.id },
      update: { rol: jugador.rol, indice: jugador.indice, orden_saque: jugador.orden_saque },
      create: jugador,
    });
  }
}

/** Los dos sistemas de ejemplo (specs 025, 038), del equipo masculino (spec 032, spec 033 E10:
 * no hay guía de referencia para inventar contenido del femenino). Invoca las factorías del
 * dominio en vez de copiar sus datos a mano — así nunca pueden desincronizarse. La guarda es
 * por tipo, no "el equipo tiene algo guardado": tras la spec 038, un equipo puede tener sistemas
 * de recepción con trabajo real del entrenador (que nunca se resiembra encima) y a la vez no
 * tener ningún sistema de defensa (por ejemplo, justo después de la migración que los borró) —
 * si la guarda fuera "cualquier sistema", el de defensa no volvería a sembrarse nunca.
 *
 * Las factorías traen un id literal (`'sistema-por-defecto'`) pensado para `localStorage`, no
 * un UUID — aquí se sustituye por uno real antes de guardar; el resto del contenido (nombre,
 * formaciones, colocaciones, explicaciones) es exactamente el que produce el dominio.
 *
 * Nacen ya validados (spec 051, E7): sin esto, Teoría no mostraría nada hasta que un
 * entrenador validara algo a mano — y el objetivo de sembrarlos es precisamente tener algo que
 * enseñar desde el principio. `validado_por` queda `null`: los validó la semilla, no una cuenta. */
export async function sembrarEjemplos(): Promise<void> {
  const recepcionExistente = await prisma.sistema.count({ where: { equipo: { clave: 'masculino' }, tipo: 'recepcion' } });
  if (recepcionExistente === 0) {
    const id = crypto.randomUUID();
    await crear({ ...sistemaPorDefecto(PLANTILLA_GLOBAL, 'masculino'), id });
    await cambiarEstadoSistema(id, 'validado', null);
  }
  const defensaExistente = await prisma.sistema.count({ where: { equipo: { clave: 'masculino' }, tipo: 'defensa' } });
  if (defensaExistente === 0) {
    const id = crypto.randomUUID();
    await crear({ ...sistemaDefensaPorDefecto(PLANTILLA_GLOBAL, 'masculino'), id });
    await cambiarEstadoSistema(id, 'validado', null);
  }
}

/** El primer admin nace de una invitación sembrada, no de una fila escrita a mano (spec 035,
 * E17): `ADMIN_EMAIL_INICIAL` fija el correo, que queda invitado con rol `admin` y completa su
 * alta por el registro normal — su contraseña nunca pasa por ningún fichero. Idempotente: si
 * ya hay una invitación para ese correo (usada o no), no la toca. Sin la variable, no hace nada. */
export async function sembrarPrimerAdmin(): Promise<void> {
  const emailBruto = process.env['ADMIN_EMAIL_INICIAL'];
  if (!emailBruto) {
    return;
  }
  const email = normalizarEmail(emailBruto);
  const yaInvitado = await prisma.lista_blanca.findUnique({ where: { email } });
  if (yaInvitado) {
    return;
  }
  await prisma.lista_blanca.create({ data: { email, rol: 'admin', equipo_id: null } });
}

async function main(): Promise<void> {
  await sembrarCatalogoBase();
  await sembrarEjemplos();
  await sembrarPrimerAdmin();
}

// Solo se ejecuta como script (`npm run seed` / `prisma db seed`), nunca al importar desde
// los tests, que llaman a `sembrarCatalogoBase`/`sembrarEjemplos` por separado.
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => prisma.$disconnect())
    .catch(async (error: unknown) => {
      console.error(error);
      await prisma.$disconnect();
      process.exit(1);
    });
}
