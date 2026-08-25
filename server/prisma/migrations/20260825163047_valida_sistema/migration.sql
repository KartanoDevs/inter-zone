-- Nota: `prisma migrate dev --create-only` volvía a proponer un `DROP INDEX` sobre
-- "jugador_orden_saque_key"/"jugador_rol_indice_key" — el mismo drift falso que en la migración
-- de la spec 035 (son invariantes de las specs 017/018 escritos a mano con `NULLS NOT
-- DISTINCT`, que Prisma no ve). Se quitan de aquí también, sin relación con validar sistemas.

-- AlterTable
ALTER TABLE "sistema" ADD COLUMN     "validado_en" TIMESTAMPTZ,
ADD COLUMN     "validado_por" UUID;

-- AddForeignKey
ALTER TABLE "sistema" ADD CONSTRAINT "sistema_validado_por_fkey" FOREIGN KEY ("validado_por") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CHECK a mano (Prisma no lo expresa): validado_en solo cuando estado es 'validado'
-- (docs/modelo-de-datos.md §5, spec 051). Seguro frente a UPDATE: cambiar de estado siempre
-- toca validado_en en la misma escritura (cambiarEstadoSistema en sistema.repositorio.ts).
ALTER TABLE "sistema"
  ADD CONSTRAINT "sistema_validado_con_fecha" CHECK (("estado" = 'validado') = ("validado_en" IS NOT NULL));
