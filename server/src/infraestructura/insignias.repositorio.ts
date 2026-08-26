import type { TipoExamen } from '../../../src/app/domain/examen';
import type { InsigniaGanada } from '../../../src/app/domain/insignias';
import { prisma } from './prisma';

/** `titular_id` vacío representa "sin titular" (examen por sistema) — forma parte de la clave
 * primaria compuesta de `insignia_examen`, así que no puede ser `null` (spec 056, ver el CHECK
 * de la migración). */
function titularColumna(titularId: string | null): string {
  return titularId ?? '';
}

/** Guarda que `usuarioId` ganó la insignia de `tipo` sobre `sistemaId` (y `titularId` si el tipo
 * lo exige). Idempotente: repetir el mismo examen y volver a superarlo no crea una segunda fila
 * ni mueve `obtenida_en` (spec 056, E3) — el `@@id` compuesto ya lo impide, así que basta con
 * ignorar el conflicto. */
export async function registrarInsignia(usuarioId: string, sistemaId: string, tipo: TipoExamen, titularId: string | null): Promise<void> {
  await prisma.insignia_examen.upsert({
    where: {
      usuario_id_sistema_id_tipo_titular_id: {
        usuario_id: usuarioId,
        sistema_id: sistemaId,
        tipo,
        titular_id: titularColumna(titularId),
      },
    },
    update: {},
    create: {
      usuario_id: usuarioId,
      sistema_id: sistemaId,
      tipo,
      titular_id: titularColumna(titularId),
    },
  });
}

/** Las insignias de una cuenta (spec 056, E4-E5): lista vacía si nunca ganó ninguna, nunca un
 * error. */
export async function insigniasDe(usuarioId: string): Promise<readonly InsigniaGanada[]> {
  const filas = await prisma.insignia_examen.findMany({
    where: { usuario_id: usuarioId },
    orderBy: { obtenida_en: 'asc' },
  });
  return filas.map((fila) => ({
    sistemaId: fila.sistema_id,
    tipo: fila.tipo,
    titularId: fila.titular_id === '' ? null : fila.titular_id,
    obtenidaEn: fila.obtenida_en.toISOString(),
  }));
}
