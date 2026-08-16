# 025 — Sistema de recepción por defecto (recepción a 3 en 5-1)

**Estado:** Completada
**Paso de la hoja de ruta:** No encaja en ningún paso de la hoja de ruta (como las specs
017–020): siembra un dato de ejemplo, no añade una capacidad nueva a la pizarra.

## Problema

Hoy la pizarra arranca vacía: la primera vez que se abre no hay ningún sistema que consultar,
y para que enseñe algo hay que colocar las 36 fichas (6 rotaciones × 6 jugadores) a mano. Existe
además una guía táctica completa (`docs/voley/Guia_Sistema_Recepcion_3_Esquema_5-1.md`) con las
seis rotaciones del sistema de recepción a 3 en 5-1 — dos receptores y el líbero reciben, el
resto queda liberado —, el reparto de responsabilidades de cada jugador y las notas propias de
cada rotación. Ese contenido no tiene hoy dónde vivir dentro de la app.

## Objetivo

Al abrir la app sin nada guardado en el navegador, aparece ya un sistema de recepción legal,
con las seis rotaciones colocadas, una descripción general del sistema y una explicación de
conjunto y de cada jugador en cada rotación, siguiendo la guía de recepción a 3 en 5-1.

## Fuera de alcance

- **Ningún sistema de defensa por defecto.** La guía describe el Complejo K1 (recepción); no hay
  vías de ataque que sembrar.
- **No se toca `plantilla-global.ts`.** La distribución de la guía coincide, verificada fila a
  fila con `formacionEnRotacion`, con `PLANTILLA_GLOBAL` tal como existe hoy — colocador,
  receptor 1/2, central 1/2, opuesto y el líbero sustituyendo al central en zaga
  (`sustitutosLiberoPorDefecto`). Se reutiliza sin cambios.
- **Un único sistema por defecto.** No hay selección entre varias plantillas tácticas de
  ejemplo.
- **Exportar/importar** sigue siendo la spec 016, sin empezar.
- **La descripción general no se copia ni se sugiere** al crear un sistema nuevo a mano: nace
  vacía, como hoy nace cualquier campo de enseñanza.

**Esta spec toca `application/`, `infrastructure/` y `ui/`, además de `domain/`.** Sembrar el
sistema por defecto es una decisión de qué se le entrega al usuario al arrancar sin datos
(`infrastructure/`, en el repositorio), un campo de descripción nuevo necesita estado y guardado
en el store (`application/`) y un lugar donde mostrarlo y editarlo (`ui/`, un segundo panel de
enseñanza). Queda autorizado explícitamente aquí, igual que las specs 021, 022 y 024.

## Decisiones ya tomadas con el usuario (no reabrir)

1. La descripción general del sistema es un **campo propio** de `Sistema` (`descripcion?:
   string`), editable desde la pizarra.
2. Añadir ese campo **sube la versión persistida a 5, sin migración** — mismo precedente que el
   salto 3→4 de la spec 021: cualquier payload que no sea exactamente la versión actual se trata
   como no legible.
3. El sistema por defecto se siembra **solo cuando no hay nada legible guardado** (primer
   arranque, o versión antigua ya ilegible tras el punto 2). Es un sistema normal desde ese
   instante: editable, renombrable y borrable; si se borra, no reaparece al recargar.
4. Las explicaciones de jugador son **por jugador y por rotación** (36 en total), no una por rol
   repetida seis veces.

## Traducción de numeración: la guía y la app no cuentan igual

La guía numera sus "Rotación N" por el orden cronológico en que el colocador recorre las zonas
(Z1→Z6→Z5→Z4→Z3→Z2). InterZone numera `Rn` = "el colocador ocupa Pn" (`docs/dominio.md` §4, ADR
0010/0019). La tabla de la guía, verificada contra `formacionEnRotacion(PLANTILLA_GLOBAL.ordenSaque,
n)`, se traduce así:

| Guía | App (Rn) | Colocador en |
|---|---|---|
| Rotación 1 | **R1** | P1 |
| Rotación 2 | **R6** | P6 |
| Rotación 3 | **R5** | P5 |
| Rotación 4 | **R4** | P4 |
| Rotación 5 | **R3** | P3 |
| Rotación 6 | **R2** | P2 |

Coinciden también, rotación a rotación, las etiquetas de cada Pn y a quién sustituye el líbero
(columna "Líbero" de la guía vs. `sustitutosLiberoPorDefecto`).

## Escenarios

### El sistema por defecto

**E1 — Con el navegador sin nada guardado, aparece un sistema de recepción ya construido**
- Dado: no hay ningún payload legible en `localStorage`
- Cuando: se abre la app
- Entonces: el catálogo trae un sistema de tipo recepción llamado «Recepción a 3 (5-1)» con las
  seis rotaciones ya guardadas

**E2 — Las seis formaciones son legales**
- Dado: el sistema por defecto
- Cuando: se valida cada una de sus seis formaciones con `validarFormacion`
- Entonces: ninguna tiene infracciones

**E3 — El líbero está en pista donde le corresponde**
- Dado: el sistema por defecto
- Cuando: se mira cada rotación
- Entonces: en cada una juega el líbero, no el central, en la posición que le sustituye —
  coincide con `jugadoresEnPista(PLANTILLA_GLOBAL, rotacion)`

**E4 — Cada rotación coloca la distribución de la guía, traducida a la numeración de la app**
- Dado: la tabla de traducción de más arriba
- Cuando: se mira, por ejemplo, R6 (Rotación 2 de la guía) y R2 (Rotación 6 de la guía)
- Entonces: el jugador que ocupa cada Pn en la formación guardada es el que la guía asigna a esa
  zona en su rotación equivalente

**E5 — Cada rotación trae su explicación de conjunto**
- Dado: el sistema por defecto
- Cuando: se mira la explicación de una rotación (`explicacionesRotacion[n]`)
- Entonces: no está vacía y resume la nota de esa rotación en la guía (ruta del colocador,
  complejidad, qué la caracteriza)

**E6 — Cada jugador de cada rotación trae su propia explicación**
- Dado: el sistema por defecto
- Cuando: se mira la explicación de un jugador colocado en una rotación
- Entonces: no está vacía y describe su función en esa rotación concreta

**E7 — Es un sistema corriente: se puede editar y volver a guardar**
- Dado: el sistema por defecto con R1 seleccionada
- Cuando: se mueve una ficha dentro de los límites legales y se guarda
- Entonces: la formación queda actualizada igual que en cualquier sistema creado a mano

### Descripción del sistema

**E8 — El sistema por defecto trae descripción general**
- Dado: el sistema por defecto
- Cuando: se lee su campo `descripcion`
- Entonces: no está vacío y resume qué es la recepción a 3 y por qué se usa (guía, §1)

**E9 — La descripción se edita y queda guardada**
- Dado: cualquier sistema
- Cuando: se edita su descripción y se confirma
- Entonces: `sistema.descripcion` refleja el texto nuevo y persiste

**E10 — Vaciar el texto borra la descripción**
- Dado: un sistema con descripción
- Cuando: se edita dejando el campo en blanco y se confirma
- Entonces: `sistema.descripcion` queda `undefined`, no cadena vacía (igual que
  `explicarRotacion`)

**E11 — Un sistema creado a mano nace sin descripción**
- Dado: se crea un sistema nuevo desde el diálogo de alta
- Cuando: se mira su campo `descripcion`
- Entonces: es `undefined`

### Siembra y persistencia

**E12 — Con sistemas ya guardados, no se siembra nada**
- Dado: `localStorage` con al menos un sistema legible en la versión actual
- Cuando: se abre la app
- Entonces: el catálogo es exactamente lo que había guardado, sin añadir el sistema por defecto

**E13 — Borrado el sistema por defecto, no reaparece**
- Dado: el sistema por defecto sembrado y luego borrado
- Cuando: se recarga la app
- Entonces: el catálogo sigue sin él — lo que quedó guardado (aunque sea "ningún sistema") no se
  vuelve a sembrar

**E14 — Ida y vuelta por el repositorio conserva todo**
- Dado: el sistema por defecto
- Cuando: se guarda y se vuelve a leer con `LocalStorageSistemaRepository`
- Entonces: descripción, explicaciones de rotación y de jugador, y las seis formaciones
  (posiciones y roster) llegan idénticas

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de congelar esta spec — ver «Decisiones ya tomadas» más
arriba: campo `descripcion` propio y editable, versión 5 sin migración, siembra solo en primer
arranque (no reaparece si se borra), y explicaciones de jugador por jugador y rotación (36).

## Al cerrar

Los 14 escenarios pasan. Partida: 196 tests (tras el commit pendiente de la spec 024); al
cerrar, 213 — 17 nuevos: los 14 de `domain/sistema-por-defecto.spec.ts`,
`domain/catalogo-sistemas.spec.ts` e `infrastructure/local-storage-sistema.repository.spec.ts`,
más 3 en `application/sistema.store.spec.ts` para `descripcionSistemaActivo`/
`guardarDescripcion` (no llevan id de escenario porque cablean acceso a una función de dominio
ya probada, mismo patrón que otros pares explicar-en-dominio/guardar-en-store del proyecto). No
existe `npm run test:coverage`, igual que en specs anteriores.

**Seis escenarios (E3, E4, E7, E11, E12, E13) llegaron en verde sin escribir código nuevo.** No
es una anomalía: E1 y E2 ya habían forzado usar `jugadoresEnPista` para derivar el roster de
cada rotación (nunca declarar jugadores a mano) y distinguir en el repositorio "nada legible"
(`null`) de "catálogo vacío guardado a propósito" (`sistemas: []`). Una vez esas dos decisiones
estaban tomadas, el líbero correcto (E3), el mapeo exacto a la guía (E4), la compatibilidad con
`guardarFormacion` (E7), que un sistema nuevo naciera sin descripción (E11) y que no se sembrara
nada de más (E12, E13) eran consecuencia directa, no trabajo por hacer. Se dejaron como tests
igualmente, para que la garantía quede fijada y no dependa de que nadie se acuerde del porqué.

**Un error real, detectado y corregido antes de ejecutar nada:** al transcribir a
`sistema-por-defecto.ts` la tabla de puntos por rotación (verificada a mano contra
`formacionEnRotacion` antes de escribir código), se cruzaron las filas de R2 y R6. Se detectó
releyendo el fichero recién escrito, antes del primer `npm test` de E2, así que no llegó a
ejecutarse con el dato mal puesto.

**Cambio de comportamiento retrocompatible, previsto desde el paso 0:** implementar E1 (sembrar
cuando no hay nada legible) cambia lo que devuelve `listar()` en cinco casos que la spec 008 ya
cubría (almacén vacío, JSON roto, versión futura, dos formas antiguas incompatibles) — esos
cinco tests, más `008-E8` (la versión escrita, 4→5), se actualizaron para reflejar el
comportamiento nuevo. No es un ajuste del paso de refactor: es la consecuencia directa y
anunciada del escenario E1, con el mismo patrón que ya documentó el cierre de la spec 024 al
introducir el bloque de zona por defecto.

**Se usó la autorización para tocar `application/` y `ui/`:** `SistemaStore` gana
`descripcionSistemaActivo` (computed) y `guardarDescripcion` (acción), con test. `Tablero` monta
un segundo `PanelEnsenanza` para el sistema activo, colapsado por defecto (`abierto = input(true)`
nuevo en el componente, para no empujar el resto de la pantalla) — sin test unitario, verificado
con `npm run build` (compilación estricta de plantillas) y revisión de código, no con el
navegador; mismo criterio que la spec 024, que tampoco tiene `tablero.spec.ts`.

**Lo que no se desvió:** la traducción de numeración guía↔app (tabla de la spec), verificada a
mano contra `formacionEnRotacion` antes de escribir ningún punto, resultó exacta en las seis
rotaciones sin ningún ajuste posterior. `docs/dominio.md` no se tocó: ninguna regla de voleibol
cambió, solo se sembró un dato de ejemplo que ya cumplía las reglas existentes.

**Pendiente:** una pasada visual en el navegador (`npm start`, borrando `interzone.sistemas` de
`localStorage`) no se ha hecho en esta sesión — igual que en el cierre de la spec 024, queda
para cuando se quiera dar la spec por buena en la práctica, no solo en test y build.
