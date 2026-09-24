-- Revierte la spec 073 (central rival): se decidió no mantener esa ficha, solo el atacante
-- movible (spec 072). No se edita ni se borra la migración 20260924130000_punto_central_rival
-- que introdujo estas columnas (append-only, ya pusheada a develop) — se añade la que deshace
-- el cambio, siguiendo el mismo criterio que docs/decisiones/.
ALTER TABLE "formacion_defensa" DROP CONSTRAINT "formacion_defensa_central_ambas_o_ninguna";
ALTER TABLE "formacion_defensa" DROP COLUMN "central_x";
ALTER TABLE "formacion_defensa" DROP COLUMN "central_y";
