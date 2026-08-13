# Registro de decisiones

Append-only. Una decisión existente no se edita: si cambia, se añade una nueva que la
sustituye y se marca la anterior como *Sustituida por NNNN*.

Fichero único a propósito: para un proyecto de una persona, un ADR por archivo es ceremonia.
Se parte en `docs/decisiones/` cuando haya más de quince entradas.

Formato: contexto, decisión, consecuencias. Corto. Lo importante es el **porqué**, que es lo
único que no se puede deducir leyendo el código dentro de seis meses.

---

## 0001 — Sin backend en la v1

**Estado:** Aceptada

**Contexto.** El objetivo es doble: que el equipo tenga una herramienta útil pronto y que el
código sea de buena calidad. Un backend con Node, Express, PostgreSQL y Prisma añade semanas
de trabajo antes de que un jugador pueda ver nada, y no aporta nada al aprendizaje del
voleibol.

**Decisión.** La v1 es una SPA sin servidor. Los sistemas se guardan en `localStorage` y se
comparten exportando JSON o PNG.

**Consecuencias.** No hay usuarios, ni roles de acceso, ni sincronización entre dispositivos.
El "modo jugador" es la misma aplicación con un flag de solo lectura. La persistencia queda
detrás de un puerto para que añadir un adaptador HTTP más adelante no toque el dominio. Si el
equipo pide editar desde varios dispositivos, esa petición justificará el backend.

---

## 0002 — Sistema de coordenadas en metros, origen en la esquina

**Estado:** Aceptada

**Contexto.** Guardar posiciones en píxeles ata los datos al tamaño del lienzo: al cambiar
la resolución, los sistemas guardados dejan de significar nada. Sobre el origen se valoraron
dos opciones: el centro de la red o una esquina.

**Decisión.** Metros. Origen en la esquina donde la red corta la línea lateral izquierda,
vista desde el fondo del propio campo mirando a la red. `x` de 0 a 9 hacia la derecha, `y`
de 0 a 9 hacia el fondo.

**Consecuencias.** El índice de celda de la rejilla es `floor(coord / 0.5)` sin traslación, y
el render en SVG es un escalado puro sin sumar offsets. Se pierde la simetría fácil que daba
el origen central: reflejar una formación pasa a ser `x → 9 - x` en lugar de `x → -x`, lo
que se aísla en una única función. El campo rival, cuando llegue la defensa, será `y < 0`.

---

## 0003 — SVG en lugar de Canvas y Fabric.js

**Estado:** Aceptada

**Contexto.** La propuesta inicial usaba Fabric.js sobre Canvas, con un patrón Adapter para
desacoplar Angular de la librería.

**Decisión.** SVG nativo, renderizado desde signals. Sin Fabric.js y sin adaptador de
renderizado.

**Consecuencias.** El responsive sale gratis con `viewBox`. Los elementos están en el DOM:
estilables con CSS, inspeccionables y accesibles. Al derivarse el SVG del estado, desaparece
el problema de sincronizar dos representaciones, que era lo que el adaptador venía a
resolver. A cambio, si algún día hace falta dibujo libre a mano alzada, capas o texto
editable, habrá que reevaluar: ahí Canvas gana.

---

## 0004 — Zonas de responsabilidad como rejilla de 0,5 m

**Estado:** Aceptada

**Contexto.** Se valoraron cuatro representaciones: círculo con radio, elipse orientada,
polígono de vértices arrastrables y rejilla de celdas pintables.

**Decisión.** Rejilla de celdas cuadradas de 0,5 m, pintadas a mano por el entrenador.

**Consecuencias.** Los huecos y conflictos se calculan contando responsables por celda: sin
geometría computacional, sin librerías, en dos bucles. Se pinta con el dedo en tablet, que es
el contexto de uso real. A cambio, el resultado es menos estilizado que una elipse; si hiciera
falta, se puede suavizar el contorno al renderizar sin tocar el modelo de datos.

Se descartó 0,25 m: a un ancho típico de lienzo, la celda quedaría en unos 19 px, por debajo
del mínimo táctil recomendado, y el entrenador fallaría el objetivo con el dedo. Además, ni
el ojo ni el criterio táctico razonan con esa precisión. `TAMANO_CELDA` es una constante del
dominio, así que la resolución se reajusta con un cambio de una línea si el uso real lo pide.

---

## 0005 — El orden de saque se define una vez; las rotaciones se derivan

**Estado:** Aceptada

**Contexto.** El planteamiento inicial trataba R1..R6 como seis dibujos independientes.

**Decisión.** El equipo define un único orden de saque. La posición rotacional de cada
jugador en cada rotación se calcula rotando ese orden; nunca se almacena.

**Consecuencias.** Es imposible guardar un estado incoherente en el que un jugador ocupe dos
posiciones distintas. Y sobre todo, hace posible la validación de falta posicional, que es la
funcionalidad más didáctica del proyecto: sin conocer el orden, no hay nada que validar.

---

## 0006 — Roles con nombre y abreviatura configurables, etiqueta derivada

**Estado:** Aceptada

**Contexto.** Cada equipo nombra los roles a su manera: receptor o punta, central o
bloqueador. Además, en pista hay dos receptores y dos centrales, que necesitan distinguirse.

**Decisión.** Cinco roles con identificador estable (`colocador`, `receptor`, `central`,
`opuesto`, `libero`) y con nombre y abreviatura configurables en un único fichero de
`domain/`. Los roles `receptor` y `central` llevan índice 1 o 2. La etiqueta que se pinta en
la ficha se **deriva** de abreviatura más índice; nunca se almacena.

Abreviaturas por defecto: C, R, M, O, L. El central usa **M** de "medio" porque C ya la usa
el colocador, y una ficha ambigua entre colocador y central es precisamente la peor
ambigüedad posible en una pizarra de recepción.

Convención del índice: recorriendo el orden de saque en sentido de rotación desde el
colocador, el primer jugador de ese rol lleva el 1 (el "cerca") y el segundo el 2 (el
"lejos").

**Consecuencias.** El identificador es estable, así que renombrar "Receptor" a "Punta" no
rompe ni los datos guardados ni la lógica. La convención de índice es una decisión del
proyecto, no una regla FIVB: si el equipo entiende "cerca" y "lejos" respecto a la red en
lugar de respecto al colocador, hay que cambiar `docs/dominio.md` y esta decisión antes que
el código. Se añade la invariante de que dos roles no comparten abreviatura.

---

## 0007 — `validarFormacion` devuelve infracciones y avisos por separado

**Estado:** Aceptada

**Contexto.** Al implementar la spec 001, `docs/arquitectura.md` sugería la firma
`validarFormacion(formacion, orden, equipo): Infraccion[]`. Pero `docs/dominio.md` distingue
tres estados por comparación (`valida`, `al_limite`, `falta`) y dice explícitamente que
`al_limite` "no es una infracción: es información para el entrenador". Un `Infraccion[]`
plano no puede representar "esto no es infracción pero hay que marcarlo" sin inventarse un
estado falso dentro del propio tipo `Infraccion`.

**Decisión.** `validarFormacion(formacion, orden, rotacion): ResultadoValidacion`, donde
`ResultadoValidacion = { infracciones: Infraccion[]; avisos: Aviso[] }`. Se elimina también
el parámetro `equipo`: `OrdenSaque` ya es un array de `Jugador` con su `rol`, así que la
regla del líbero no necesita un roster aparte.

**Consecuencias.** El consumidor (más adelante, `application/`) distingue sin ambigüedad qué
bloquea la formación (`infracciones`) de qué es solo informativo (`avisos`). Si en el futuro
aparece un motivo real para pasar el roster completo (por ejemplo, para las etiquetas de la
spec 002), se añadirá entonces, no antes.

---

## 0008 — `plantilla.ts` como fichero de dominio aparte de `roles.ts`

**Estado:** Aceptada

**Contexto.** Al implementar la spec 002, `docs/arquitectura.md` solo preveía `roles.ts` para
la configuración de roles y `etiquetaDe()`. Los escenarios E7–E15 validan algo distinto: que
un `OrdenSaque` completo (seis jugadores) tenga índices consistentes, una composición de roles
válida (con o sin líbero) y ningún jugador repetido. Mezclarlo en `roles.ts` habría juntado
"cómo se nombra y abrevia un rol" con "es válida esta plantilla de seis jugadores", dos
preguntas distintas con consumidores distintos.

**Decisión.** `src/app/domain/plantilla.ts`, con `validarPlantilla(orden, configuracion)` y
`asignarIndices(orden, configuracion)`. Reutiliza `rotar()` de `rotacion.ts` para recorrer el
orden de saque en sentido de rotación desde el colocador, tal como describe la convención de
índice en `docs/dominio.md` y la decisión 0006.

**Consecuencias.** `roles.ts` queda centrado solo en configuración y etiqueta. Se asume que
`Jugador.indice` es un dato almacenado (no derivado): `validarPlantilla` necesita poder
recibir plantillas con índices ya asignados, incluidos casos inválidos a propósito (E7–E9), lo
que no tiene sentido si el índice fuera siempre correcto por construcción. `asignarIndices` es
una utilidad para poblarlo según la convención, no la única fuente de verdad. Si más adelante
se decide que el índice debe derivarse siempre (como la posición rotacional o la etiqueta),
esta decisión y `validarPlantilla` habrá que revisarlas juntas.
