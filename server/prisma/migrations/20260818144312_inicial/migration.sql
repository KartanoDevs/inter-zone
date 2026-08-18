-- CreateEnum
CREATE TYPE "tipo_sistema" AS ENUM ('recepcion', 'defensa');

-- CreateEnum
CREATE TYPE "rol_jugador" AS ENUM ('colocador', 'receptor', 'central', 'opuesto', 'libero');

-- CreateEnum
CREATE TYPE "via_ataque" AS ENUM ('z4', 'z3', 'z2', 'pipe');

-- CreateEnum
CREATE TYPE "estado_sistema" AS ENUM ('borrador', 'validado');

-- CreateTable
CREATE TABLE "equipo" (
    "id" UUID NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jugador" (
    "id" TEXT NOT NULL,
    "rol" "rol_jugador" NOT NULL,
    "indice" SMALLINT,
    "orden_saque" SMALLINT,

    CONSTRAINT "jugador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sistema" (
    "id" UUID NOT NULL,
    "equipo_id" UUID NOT NULL,
    "tipo" "tipo_sistema" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "estado_sistema" NOT NULL DEFAULT 'borrador',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sistema_rotacion" (
    "sistema_id" UUID NOT NULL,
    "rotacion" SMALLINT NOT NULL,
    "explicacion" TEXT,
    "libero_sustituye_a" TEXT,

    CONSTRAINT "sistema_rotacion_pkey" PRIMARY KEY ("sistema_id","rotacion")
);

-- CreateTable
CREATE TABLE "formacion" (
    "id" UUID NOT NULL,
    "sistema_id" UUID NOT NULL,
    "rotacion" SMALLINT NOT NULL,
    "via" "via_ataque",

    CONSTRAINT "formacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "colocacion" (
    "formacion_id" UUID NOT NULL,
    "jugador_id" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "explicacion" TEXT,
    "celdas" INTEGER[],

    CONSTRAINT "colocacion_pkey" PRIMARY KEY ("formacion_id","jugador_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipo_clave_key" ON "equipo"("clave");

-- CreateIndex
CREATE INDEX "sistema_equipo_id_tipo_estado_idx" ON "sistema"("equipo_id", "tipo", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "sistema_equipo_id_tipo_nombre_key" ON "sistema"("equipo_id", "tipo", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "formacion_sistema_id_rotacion_via_key" ON "formacion"("sistema_id", "rotacion", "via");

-- AddForeignKey
ALTER TABLE "sistema" ADD CONSTRAINT "sistema_equipo_id_fkey" FOREIGN KEY ("equipo_id") REFERENCES "equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sistema_rotacion" ADD CONSTRAINT "sistema_rotacion_sistema_id_fkey" FOREIGN KEY ("sistema_id") REFERENCES "sistema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sistema_rotacion" ADD CONSTRAINT "sistema_rotacion_libero_sustituye_a_fkey" FOREIGN KEY ("libero_sustituye_a") REFERENCES "jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formacion" ADD CONSTRAINT "formacion_sistema_id_rotacion_fkey" FOREIGN KEY ("sistema_id", "rotacion") REFERENCES "sistema_rotacion"("sistema_id", "rotacion") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colocacion" ADD CONSTRAINT "colocacion_formacion_id_fkey" FOREIGN KEY ("formacion_id") REFERENCES "formacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "colocacion" ADD CONSTRAINT "colocacion_jugador_id_fkey" FOREIGN KEY ("jugador_id") REFERENCES "jugador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- =====================================================================================
-- A partir de aquí, a mano (spec 033, docs/modelo-de-datos.md §6 "Nota sobre Prisma"):
-- Prisma no expresa CHECK ni UNIQUE NULLS NOT DISTINCT en su lenguaje de esquema. Casi
-- todos los invariantes de voleibol de este modelo viven en estas líneas.
-- =====================================================================================

-- jugador: invariantes del catálogo fijo de siete huecos (ADR 0014, ADR 0017/0022)
ALTER TABLE "jugador"
  ADD CONSTRAINT "jugador_indice_valido" CHECK ("indice" IN (1, 2)),
  ADD CONSTRAINT "jugador_orden_valido" CHECK ("orden_saque" BETWEEN 1 AND 6),
  ADD CONSTRAINT "jugador_libero_fuera_del_orden" CHECK (("rol" = 'libero') = ("orden_saque" IS NULL));

-- "Un colocador, un opuesto, un líbero, R1 <> R2, C1 <> C2" en una sola restricción: con
-- UNIQUE normal no funcionaría, porque dos NULL se consideran distintos y colarían dos
-- colocadores (docs/modelo-de-datos.md §5).
CREATE UNIQUE INDEX "jugador_orden_saque_key" ON "jugador"("orden_saque");
CREATE UNIQUE INDEX "jugador_rol_indice_key" ON "jugador"("rol", "indice") NULLS NOT DISTINCT;

-- sistema: nombre no vacío. `estado` nace siempre en 'borrador' (spec 033: sin nadie que
-- valide todavía). `creado_por`, `validado_por` y `validado_en` —y con ellos el CHECK
-- `sistema_validado_con_fecha` de docs/modelo-de-datos.md— llegan en la migración de la spec
-- 035/037, cuando exista `usuario` al que referenciar: añadirlos ahora sería una columna sin
-- ninguna función, y el CHECK no tiene sentido sin `validado_en`.
ALTER TABLE "sistema"
  ADD CONSTRAINT "sistema_nombre_no_vacio" CHECK (btrim("nombre") <> '');

-- sistema_rotacion: R1..R6, y el líbero nunca se sustituye a sí mismo
ALTER TABLE "sistema_rotacion"
  ADD CONSTRAINT "sistema_rotacion_valida" CHECK ("rotacion" BETWEEN 1 AND 6),
  ADD CONSTRAINT "sistema_rotacion_libero_no_se_sustituye" CHECK ("libero_sustituye_a" <> 'libero');

-- formacion: "sin vía" (recepción) cuenta como un valor más al comprobar unicidad, para que
-- dos formaciones de recepción de la misma rotación (via IS NULL en ambas) sí colisionen.
-- Sustituye al índice único plano que generó Prisma.
DROP INDEX "formacion_sistema_id_rotacion_via_key";
CREATE UNIQUE INDEX "formacion_sistema_id_rotacion_via_key"
  ON "formacion"("sistema_id", "rotacion", "via") NULLS NOT DISTINCT;

-- colocacion: rango de la zona jugable (docs/dominio.md §3) y validez de las celdas de la
-- rejilla de responsabilidad (0..323 = 18x18 celdas de 0,5 m, rejilla.ts), sin duplicados.
CREATE FUNCTION celdas_validas(celdas integer[]) RETURNS boolean
  LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT coalesce(bool_and(c BETWEEN 0 AND 323), true)
       AND count(*) = count(DISTINCT c)
    FROM unnest(celdas) AS c;
  $$;

ALTER TABLE "colocacion"
  ADD CONSTRAINT "colocacion_x_en_zona" CHECK ("x" BETWEEN -2.5 AND 11.5),
  ADD CONSTRAINT "colocacion_y_en_zona" CHECK ("y" BETWEEN 0 AND 12),
  ADD CONSTRAINT "colocacion_celdas_en_rejilla" CHECK ("celdas" IS NULL OR celdas_validas("celdas"));
