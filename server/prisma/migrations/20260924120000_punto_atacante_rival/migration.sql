-- Punto exacto donde se suelta la ficha "A" del atacante (spec 072). Mismo criterio que
-- sombra_dx/sombra_dy (spec 040): ambos nulos o ambos presentes, columna nula = nunca movida de
-- su punto canónico. Ausente de una fila = variante guardada antes de esta spec (sin migrar,
-- ver docs/decisiones/, sustituye parcialmente a la 0020/0033).
ALTER TABLE "formacion_defensa" ADD COLUMN "atacante_x" DOUBLE PRECISION;
ALTER TABLE "formacion_defensa" ADD COLUMN "atacante_y" DOUBLE PRECISION;

ALTER TABLE "formacion_defensa"
  ADD CONSTRAINT "formacion_defensa_atacante_ambas_o_ninguna"
  CHECK (("atacante_x" IS NULL) = ("atacante_y" IS NULL));
