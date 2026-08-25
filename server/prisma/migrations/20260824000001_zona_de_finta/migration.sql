-- Spec 041: zona de finta, campo paralelo a la zona de defensa de siempre. Solo existe en
-- defensa (colocacion_defensa), igual que las zonas de responsabilidad desde la spec 024.
--
-- Mismos tres estados que colocacion_defensa.celdas (docs/modelo-de-datos.md §5): NULL = nunca
-- tocada, {} = vaciada a propósito, con valores = pintada. Reutiliza celdas_validas() de la
-- migración inicial, no se recrea.
ALTER TABLE "colocacion_defensa" ADD COLUMN "celdas_finta" INTEGER[];

ALTER TABLE "colocacion_defensa"
  ADD CONSTRAINT "colocacion_defensa_celdas_finta_en_rejilla" CHECK ("celdas_finta" IS NULL OR celdas_validas("celdas_finta"));
