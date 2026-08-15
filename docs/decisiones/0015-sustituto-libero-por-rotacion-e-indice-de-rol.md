# 0015 — El sustituto del líbero se declara por rotación; el índice de rol cuenta en sentido de rotación

**Estado:** Aceptada

**Contexto.** Usar la pizarra con un equipo real de 5-1 (tras la spec 011) reveló dos problemas
concretos, no anticipados en el diseño. Primero: `PlantillaEquipo.libero.sustituidoId` era una
única cadena para las seis rotaciones, así que el líbero solo jugaba en las tres rotaciones donde
ese único titular estaba en zaga — en un partido real el líbero entra cada vez que un jugador de
zaga necesita salir, y con dos centrales alternándose entre zaga y delantera, eso significa las
seis rotaciones, no tres. Segundo: `asignarIndices` (`domain/plantilla.ts`) recorría el orden de
saque en el sentido en que se escribió la lista (`P1→P2→P3→P4→P5→P6`), pero `docs/dominio.md` §2
decía desde la spec 002 que el recorrido debía ser "en sentido de rotación" — que es
`P1→P6→P5→P4→P3→P2`, el sentido contrario. El código nunca implementó lo que su propia
documentación decía; el síntoma para el entrenador era que `C1` resultaba ser el central que
juega delantero en R1, cuando esperaba que `C1` (el central "cercano") fuera el que arranca en
zaga.

**Decisión.** `SustitucionLibero.sustituidoId: string` pasa a
`sustitutosPorRotacion: Record<1|2|3|4|5|6, string | null>`: un valor por rotación, `null` si en
esa rotación el líbero no sustituye a nadie. `cambiarSustitutoLibero(sistema, sustituidoId)` pasa
a `cambiarSustitutoLibero(sistema, rotacion, sustituidoId)` y purga solo la formación guardada de
esa rotación, no las seis. Una nueva función, `sustitutosLiberoPorDefecto(orden)`, deriva el
defecto natural para cada rotación (el central que en ella cae en zaga) — es una conveniencia
para la pantalla de creación, no una regla que el dominio imponga; el entrenador puede cambiarlo
rotación a rotación después. `asignarIndices` pasa a recorrer `[P1, P6, P5, P4, P3, P2]` en vez
de `[P1..P6]` en orden — el cambio mínimo que hace que el código siga lo que ya decía
`docs/dominio.md` §2, que se amplió para dejar la secuencia explícita y no depender de que
"sentido de rotación" se interprete bien sin más contexto.

**Consecuencias.** El cambio de índice invierte la etiqueta de los cuatro jugadores con índice
(los dos receptores, los dos centrales) frente a antes — un receptor que se pintaba `R1` pasa a
pintarse `R2` y viceversa; los identificadores de jugador no cambian, solo la etiqueta. Tocó un
test de la spec 002 (`plantilla.spec.ts`, "el primer jugador del rol tras el colocador...") que
verificaba el recorrido antiguo; sus aserciones se invirtieron, mismo patrón que la ADR 0014 con
002-E13. `LocalStorageSistemaRepository` cambia de forma otra vez: `sustitutoLibero?: string` →
`sustitutosLibero?: Record<string, string | null>`; sube la versión persistida de 2 a 3, mismo
motivo y mismo patrón que la subida de 1 a 2 en la ADR 0014. Se añade `AjustesRepository` /
`LocalStorageAjustesRepository`, un puerto y adaptador nuevos y pequeños para un ajuste global de
la app (si la validación de posiciones está desactivada) que no pertenece a ningún sistema
concreto, así que no encajaba en `SistemaRepository`. Al escribir el test de guardado con el
defecto por rotación se descubrió que `sustitutosLiberoPorDefecto` puede devolver `null` en
alguna rotación si los dos centrales no están separados tres posiciones en el orden de saque
(nada en `composicionValida` lo exige): el código ya lo maneja sin reventar, y algunos fixtures
de test compartidos entre specs (con los centrales adyacentes) tuvieron que sustituirse por un
orden con la separación real de un 5-1 para probar el caso "el líbero juega las seis".
