# 0021 — El sistema de recepción por defecto se siembra, no se guarda como dato fijo

**Estado:** Aceptada

**Contexto.** La pizarra arrancaba vacía: sin nada guardado en el navegador, no había ningún
sistema que mostrar, y no existía dónde vivía la descripción general de un sistema (solo había
explicación por rotación y por jugador). La spec 025 añade un sistema de recepción a 3 en 5-1
de ejemplo, siguiendo `docs/voley/Guia_Sistema_Recepcion_3_Esquema_5-1.md`, y un campo
`descripcion` en `Sistema`. Había que decidir cómo entregar ese sistema de ejemplo: como un
registro más en el payload persistido desde el primer arranque, o como algo que el código
construye cuando hace falta.

**Decisión.** `domain/sistema-por-defecto.ts` expone una factoría, `sistemaPorDefecto(plantilla)`,
no una constante fija de datos serializados. `LocalStorageSistemaRepository.listar()` la llama
solo cuando `leerPayload()` devuelve `null` — nada guardado, JSON roto o versión distinta a la
actual — y la distingue de "el usuario guardó un catálogo vacío a propósito" (un payload válido
con `sistemas: []`), que no siembra nada. Añadir `descripcion` a `Sistema` sube la versión
persistida de 4 a 5, sin migración — mismo criterio que las subidas anteriores (spec 021: sin
`migrar()` real, una versión distinta se trata como no legible en vez de interpretarse a ciegas).

**Consecuencias.** El sistema por defecto es un sistema corriente en cuanto se siembra: editable,
renombrable, borrable, y si se borra no reaparece al recargar (el catálogo guardado, aunque esté
vacío, ya es un payload legible). No hay ningún caso especial en `SistemaStore` ni en la UI para
distinguirlo de uno creado a mano. La factoría deriva el roster de cada rotación con
`jugadoresEnPista` en vez de declarar jugadores a mano, así que el líbero sale ya colocado donde
corresponde sin lógica adicional. Como con la spec 021, subir la versión sin migración implica
que cualquier catálogo guardado en el navegador antes de esta spec deja de leerse — al abrir tras
actualizar, se siembra el sistema por defecto igual que en un navegador nuevo.
