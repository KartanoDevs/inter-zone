import { PrismaClient } from '../../generated/prisma/client';

/** Instancia única de PrismaClient para todo el proceso. `main.ts` y los tests de
 * integración la comparten; nadie más crea una propia. */
export const prisma = new PrismaClient();
