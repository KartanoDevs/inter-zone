-- Spec 038: la defensa deja de ir por rotación y vía; pasa a ir por caso del colocador rival
-- (delantero/trasero) y situación de ataque. Los puestos son genéricos (1..6), no jugadores.
--
-- Las defensas guardadas con el modelo antiguo NO se migran, se descartan
-- (docs/especificaciones/038-*.md, sección "Migración de datos"; ADR 0030): la clave vieja
-- (rotación, vía) no tiene una imagen razonable en (caso, situación), y el puesto que ocupaba
-- un jugador colocado a mano es indecidible fuera del sistema sembrado.
--
-- Esto SOLO alcanza a sistemas de tipo 'defensa'. Ningún sistema de tipo 'recepcion' se toca:
-- verificado en vivo contra el catálogo real antes de aplicar (ver "Al cerrar" de la spec 038).

-- 1) Borrar las defensas antiguas ANTES de tocar el esquema. Si se dropeara la columna `via`
--    con filas de defensa todavía dentro, colisionarían con la formación de recepción de la
--    misma rotación en el nuevo UNIQUE(sistema_id, rotacion) — via ya no las distingue.
DELETE FROM "formacion" WHERE "via" IS NOT NULL;
DELETE FROM "sistema" WHERE "tipo" = 'defensa';

-- 2) `formacion` deja de tener vía: en recepción, (sistema, rotación) ya es único de por sí.
DROP INDEX "formacion_sistema_id_rotacion_via_key";
ALTER TABLE "formacion" DROP COLUMN "via";
CREATE UNIQUE INDEX "formacion_sistema_id_rotacion_key" ON "formacion"("sistema_id", "rotacion");
DROP TYPE "via_ataque";

-- 3) Los dos ejes nuevos del lado de defensa.
CREATE TYPE "caso_colocador" AS ENUM ('delantero', 'trasero');
CREATE TYPE "situacion_defensa" AS ENUM ('inicial', 'z4', 'z3', 'z2', 'z1', 'pipe');

-- 4) Una defensa guardada para (caso, situación, bloqueadores). Cuelga de `sistema`
--    directamente, no de `sistema_rotacion`: en defensa ya no hay rotación.
CREATE TABLE "formacion_defensa" (
    "id" UUID NOT NULL,
    "sistema_id" UUID NOT NULL,
    "caso" "caso_colocador" NOT NULL,
    "situacion" "situacion_defensa" NOT NULL,
    "bloqueadores" SMALLINT NOT NULL DEFAULT 0,
    "explicacion" TEXT,
    -- Retoque manual de la sombra de bloqueo (spec 040): ambos nulos o ambos presentes.
    "sombra_dx" DOUBLE PRECISION,
    "sombra_dy" DOUBLE PRECISION,

    CONSTRAINT "formacion_defensa_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "formacion_defensa" ADD CONSTRAINT "formacion_defensa_sistema_id_fkey"
  FOREIGN KEY ("sistema_id") REFERENCES "sistema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "formacion_defensa_sistema_id_caso_situacion_bloqueadores_key"
  ON "formacion_defensa"("sistema_id", "caso", "situacion", "bloqueadores");

ALTER TABLE "formacion_defensa"
  ADD CONSTRAINT "formacion_defensa_bloqueadores_valido" CHECK ("bloqueadores" BETWEEN 0 AND 3),
  ADD CONSTRAINT "formacion_defensa_inicial_sin_bloqueo" CHECK ("situacion" <> 'inicial' OR "bloqueadores" = 0),
  ADD CONSTRAINT "formacion_defensa_sombra_ambas_o_ninguna" CHECK (("sombra_dx" IS NULL) = ("sombra_dy" IS NULL));

-- 5) Un puesto genérico ocupado en una formación de defensa: sin jugador, sin FK a `jugador`
--    (spec 038 — el catálogo fijo de siete huecos sigue siendo solo para recepción).
CREATE TABLE "colocacion_defensa" (
    "formacion_id" UUID NOT NULL,
    "puesto" SMALLINT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "explicacion" TEXT,
    -- Mismos tres estados que colocacion.celdas (docs/modelo-de-datos.md §5): null = nunca
    -- tocada, [] = vaciada a propósito, con valores = zona pintada.
    "celdas" INTEGER[],

    CONSTRAINT "colocacion_defensa_pkey" PRIMARY KEY ("formacion_id", "puesto")
);

ALTER TABLE "colocacion_defensa" ADD CONSTRAINT "colocacion_defensa_formacion_id_fkey"
  FOREIGN KEY ("formacion_id") REFERENCES "formacion_defensa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reutiliza celdas_validas() de la migración inicial (0..323 = 18x18 celdas de 0,5 m), no se
-- recrea.
ALTER TABLE "colocacion_defensa"
  ADD CONSTRAINT "colocacion_defensa_puesto_valido" CHECK ("puesto" BETWEEN 1 AND 6),
  ADD CONSTRAINT "colocacion_defensa_x_en_zona" CHECK ("x" BETWEEN -2.5 AND 11.5),
  ADD CONSTRAINT "colocacion_defensa_y_en_zona" CHECK ("y" BETWEEN 0 AND 12),
  ADD CONSTRAINT "colocacion_defensa_celdas_en_rejilla" CHECK ("celdas" IS NULL OR celdas_validas("celdas"));
