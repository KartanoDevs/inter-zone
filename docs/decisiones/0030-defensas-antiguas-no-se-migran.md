# 0030 — Las defensas guardadas por rotación y vía no se migran

**Estado:** Aceptada

**Contexto.** La spec 038 sustituye la clave de guardado de una defensa, de
`(rotación, vía de ataque)` a `(caso del colocador rival, situación de ataque)`. Antes de
escribir la migración de base de datos había que decidir qué pasa con las defensas ya guardadas
bajo la clave vieja: traducirlas a la clave nueva, o descartarlas.

**Decisión.** Se descartan. No se escribe ninguna función de traducción.

**Por qué no hay traducción posible, no solo por qué no se hizo una.**

1. **La clave vieja no tiene una imagen razonable en la nueva.** Seis rotaciones colapsan a dos
   casos del colocador rival; no hay ninguna regla de voleibol que decida, para una defensa
   guardada en R3, si pertenece al caso delantero o al trasero — depende de dónde estuviera el
   colocador rival en esa jugada concreta, un dato que el modelo antiguo nunca guardó porque no
   existía el concepto.
2. **El puesto que ocupaba un jugador es indecidible fuera del sistema sembrado.** El sembrado
   (`sistemaDefensaPorDefecto`) reparte por rol de forma determinista (líbero siempre a la zona
   5, receptor zaguero siempre a la 6…), así que ahí sí se podría reconstruir el puesto desde el
   rol. Pero en una defensa que el entrenador colocó a mano —moviendo fichas libremente, spec
   021, E11: sin ninguna validación de posición— "qué puesto ocupaba este receptor" no es un dato
   que el modelo antiguo registrara en absoluto.

Es la misma política que `LocalStorageSistemaRepository` llevó aplicando desde la v1 en cada
subida de versión (spec 008, E4: una versión distinta a la actual se trata como no legible, nunca
se intenta interpretar con las reglas nuevas) y la que ya usaron los cinco saltos de versión
anteriores de ese mismo adaptador.

**Alcance del descarte.** Solo afecta a sistemas de **tipo `defensa`**. La migración
(`server/prisma/migrations/20260823000001_defensa_por_caso_y_situacion/migration.sql`) empieza
con `DELETE FROM formacion WHERE via IS NOT NULL` y `DELETE FROM sistema WHERE tipo = 'defensa'`,
en ese orden — antes de tocar el esquema, porque si se dropeara la columna `via` con esas filas
todavía dentro, colisionarían con la formación de recepción de la misma rotación en el nuevo
`UNIQUE(sistema_id, rotacion)`, que ya no tiene `via` para distinguirlas.

**Verificación antes de ejecutar contra datos reales.** Antes de escribir la migración se
comprobó contra el catálogo del servidor de desarrollo que el único sistema con contenido real de
entrenador era de tipo `recepcion` ("Sistema Base Joaking"), y se confirmó explícitamente con el
usuario que el descarte no lo alcanza. Los dos sistemas de tipo `defensa` que sí existían (el
sembrado, y uno vacío) no contenían datos de entrenador que preservar. El contenido del sembrado
se documentó aparte, en `docs/voley/referencia-test-defensa-zonas-2026-08.md`, como referencia
para generar sistemas de prueba con el modelo nuevo al cerrar la spec 040 — no como intento de
migración automática.

**`LocalStorageSistemaRepository` se retira en la misma spec**, con sus 26 tests (ver ADR 0031):
no tenía sentido mantenerlo al día con una tercera forma de `defensas` cuando ya no está en
producción desde la spec 034.

**Consecuencias.** Cualquier defensa que un entrenador tuviera guardada antes de esta spec
desaparece al aplicar la migración; queda vacía, lista para rellenarse de nuevo con el caso y la
situación que corresponda. `semilla.ts` cambia su guarda de "el equipo tiene algún sistema" a
"el equipo tiene algún sistema de este tipo", para que la resiembra automática del sistema de
defensa de ejemplo se dispare tras el borrado, sin dejar de sembrar dos veces la recepción si ya
existe.
