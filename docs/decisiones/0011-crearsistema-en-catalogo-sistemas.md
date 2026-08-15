# 0011 — `crearSistema` vive en `catalogo-sistemas.ts`, no en `sistema-recepcion.ts`

**Estado:** Aceptada

**Contexto.** La spec 005 definió `crearSistema` dentro de `sistema-recepcion.ts`, con una
comprobación de nombre duplicado que miraba todo el catálogo sin distinguir tipo, porque
`Sistema` no tenía todavía ni `id` ni `tipo`. La spec 006 añade ambos campos y necesita que la
unicidad de nombre se compare **dentro de cada tipo** (recepción o defensa), no de forma
global. `sistema-recepcion.ts` está pensado para "qué es legal guardar dentro de un sistema ya
existente" (`guardarFormacion`, `sistemaCompleto`, `borrarRotacion`); "traer un sistema nuevo
al catálogo" es una pregunta distinta, la que responde `catalogo-sistemas.ts` junto con
`renombrarSistema`, `borrarSistema`, `ordenarCatalogo` y `cambiarPlantilla`.

**Decisión.** `crearSistema` se traslada entero a `catalogo-sistemas.ts`, con la firma
`crearSistema(id, nombre, tipo, plantilla, existentes)` y la comprobación de duplicado
comparando el par `(tipo, nombre)`. No se duplica la función en los dos ficheros.

**Consecuencias.** Los escenarios 005-E1 y 005-E10 (ya `Completada`) se retiran de
`sistema-recepcion.spec.ts`: su intención queda cubierta por 006-E1 (crear se acepta) y
006-E4/E5 (duplicado dentro y fuera del tipo). El resto de tests de la 005 no cambia ninguna
aserción, solo construyen su `Sistema` de partida como literal en vez de llamar a
`crearSistema`. `Sistema.id` y `Sistema.tipo` pasan a ser obligatorios, lo que también obligó
a actualizar la construcción de ejemplo en `src/app/maqueta/datos-ejemplo.ts` (mecánico, sin
cambiar su comportamiento visual). `cambiarPlantilla` se mantiene deliberadamente genérica:
no conoce "central2" ni "líbero", solo sustituye la plantilla de un sistema y filtra de sus
formaciones a quien deja de pertenecer a ella; qué plantillas concretas existen es una decisión
de fuera de `domain/`.
