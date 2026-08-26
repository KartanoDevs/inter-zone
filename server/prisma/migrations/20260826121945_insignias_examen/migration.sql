-- Nota: `prisma migrate dev --create-only` volvía a proponer un `DROP INDEX` sobre
-- "jugador_orden_saque_key"/"jugador_rol_indice_key" — el mismo drift falso que en las
-- migraciones de las specs 035 y 051 (son invariantes de las specs 017/018 escritos a mano con
-- `NULLS NOT DISTINCT`, que Prisma no ve). Se quitan de aquí también, sin relación con las
-- insignias.

-- CreateEnum
CREATE TYPE "tipo_examen" AS ENUM ('puesto', 'linea', 'sistema');

-- CreateTable
CREATE TABLE "insignia_examen" (
    "usuario_id" UUID NOT NULL,
    "sistema_id" UUID NOT NULL,
    "tipo" "tipo_examen" NOT NULL,
    "titular_id" TEXT NOT NULL DEFAULT '',
    "obtenida_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insignia_examen_pkey" PRIMARY KEY ("usuario_id","sistema_id","tipo","titular_id")
);

-- AddForeignKey
ALTER TABLE "insignia_examen" ADD CONSTRAINT "insignia_examen_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insignia_examen" ADD CONSTRAINT "insignia_examen_sistema_id_fkey" FOREIGN KEY ("sistema_id") REFERENCES "sistema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK a mano (Prisma no lo expresa): titular_id vacío si y solo si el tipo es 'sistema'
-- (spec 012: el examen por sistema coloca a los seis, no examina a un titular; los otros dos
-- tipos siempre examinan a uno). `titular_id` es TEXT NOT NULL DEFAULT '' en vez de nullable
-- porque forma parte de la clave primaria compuesta, donde Postgres trataría cada NULL como
-- distinto de los demás y permitiría duplicar la insignia de tipo 'sistema' de un mismo sistema.
ALTER TABLE "insignia_examen"
  ADD CONSTRAINT "insignia_examen_titular_segun_tipo" CHECK (("tipo" = 'sistema') = ("titular_id" = ''));
