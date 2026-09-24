-- Punto de la ficha del central rival (spec 073): referencia visual para armar la defensa
-- inicial, sin ningún efecto en el cálculo de bloqueo ni de sombra. Mismo criterio que
-- atacante_x/atacante_y (spec 072): ambos nulos o ambos presentes, columna nula = nunca
-- colocado en esta variante. Sin punto por defecto (spec 073, "Fuera de alcance").
ALTER TABLE "formacion_defensa" ADD COLUMN "central_x" DOUBLE PRECISION;
ALTER TABLE "formacion_defensa" ADD COLUMN "central_y" DOUBLE PRECISION;

ALTER TABLE "formacion_defensa"
  ADD CONSTRAINT "formacion_defensa_central_ambas_o_ninguna"
  CHECK (("central_x" IS NULL) = ("central_y" IS NULL));
