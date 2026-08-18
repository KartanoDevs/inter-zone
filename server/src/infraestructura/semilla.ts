import { PLANTILLA_GLOBAL } from '../../../src/app/domain/plantilla-global';
import { sistemaPorDefecto } from '../../../src/app/domain/sistema-por-defecto';
import { sistemaDefensaPorDefecto } from '../../../src/app/domain/sistema-defensa-por-defecto';
import type { EquipoId } from '../../../src/app/domain/modelos';
import { prisma } from './prisma';
import { crear } from './sistema.repositorio';

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

/** Los dos sistemas de ejemplo (specs 025, 030), del equipo masculino (spec 032, spec 033 E10:
 * no hay guía de referencia para inventar contenido del femenino). Invoca las factorías del
 * dominio en vez de copiar sus datos a mano — así nunca pueden desincronizarse. Solo siembra
 * si el equipo masculino no tiene todavía ningún sistema: no sobrescribe el trabajo de nadie.
 *
 * Las factorías traen un id literal (`'sistema-por-defecto'`) pensado para `localStorage`, no
 * un UUID — aquí se sustituye por uno real antes de guardar; el resto del contenido (nombre,
 * formaciones, colocaciones, explicaciones) es exactamente el que produce el dominio. */
export async function sembrarEjemplos(): Promise<void> {
  const existentes = await prisma.sistema.count({ where: { equipo: { clave: 'masculino' } } });
  if (existentes > 0) {
    return;
  }
  await crear({ ...sistemaPorDefecto(PLANTILLA_GLOBAL, 'masculino'), id: crypto.randomUUID() });
  await crear({ ...sistemaDefensaPorDefecto(PLANTILLA_GLOBAL, 'masculino'), id: crypto.randomUUID() });
}

async function main(): Promise<void> {
  await sembrarCatalogoBase();
  await sembrarEjemplos();
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
