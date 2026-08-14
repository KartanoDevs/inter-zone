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

**Estado:** Precisada por 0010

**Contexto.** El planteamiento inicial trataba R1..R6 como seis dibujos independientes.

**Decisión.** El equipo define un único orden de saque. La posición rotacional de cada
jugador en cada rotación se calcula rotando ese orden; nunca se almacena.

**Consecuencias.** Es imposible guardar un estado incoherente en el que un jugador ocupe dos
posiciones distintas. Y sobre todo, hace posible la validación de falta posicional, que es la
funcionalidad más didáctica del proyecto: sin conocer el orden, no hay nada que validar.

---

## 0006 — Roles con nombre y abreviatura configurables, etiqueta derivada

**Estado:** Sustituida por 0009

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

---

## 0009 — El central usa C como abreviatura; la colisión se compara por etiqueta, no por letra

**Estado:** Aceptada

**Contexto.** El equipo quiere `C1`/`C2` para el central en vez de `M1`/`M2`. La decisión
0006 prohibía que dos roles compartieran abreviatura, precisamente para que colocador y
central no coincidieran en "C". Pero esa regla era más estricta de lo necesario: compara
letras sueltas, no las etiquetas que de verdad se pintan en la ficha.

**Decisión.** El colocador nunca lleva índice (siempre hay exactamente uno en pista), así que
su etiqueta es siempre la letra suelta `C`. El central sí lleva índice siempre, así que sus
etiquetas son siempre `C1` o `C2`. Una etiqueta con índice nunca es textualmente igual a una
sin índice, así que ambos roles pueden compartir la letra base `C` sin que ninguna ficha
resulte ambigua. El central pasa a usar `C` como abreviatura por defecto. El invariante de
colisión se corrige: dos roles solo colisionan si comparten abreviatura **y** coinciden en si
llevan índice o no (ambos con índice, o ninguno). `validarConfiguracionRoles` compara el par
`(abreviatura, llevaIndice)` en vez de la abreviatura sola.

**Consecuencias.** Sustituye a la decisión 0006 en lo relativo a la abreviatura del central y
al criterio de colisión; el resto de 0006 (identificadores estables, nombre/abreviatura
configurables, convención de índice cerca/lejos) sigue vigente. La spec 002 (`Completada`) se
revisa para reflejar el nuevo valor por defecto y un ejemplo de colisión real bajo la regla
nueva.

---

## 0010 — `Rn` se numera anclada al colocador, no al orden de saque tal cual se definió

**Estado:** Aceptada

**Contexto.** La decisión 0005 deriva las rotaciones rotando el orden de saque, pero no fija
qué desplazamiento corresponde a cada `Rn`. El código lo resolvía numerando desde el orden tal
cual se escribió (`rotacion=0` era el propio orden). El equipo quiere `Rn` con el significado
habitual del sistema 5-1: "el colocador ocupa Pn". Si el orden de saque no arrancaba con el
colocador en P1, las dos numeraciones daban formaciones distintas para el mismo `Rn`.

**Decisión.** `Rn` significa siempre "el colocador ocupa la posición rotacional Pn", con
independencia de cómo se definió el orden de saque. Esto corrige también `validarFormacion`
(spec 001): su parámetro `rotacion` pasa a interpretarse igual, así que un mismo concepto de
rotación vale en todo el dominio, sin que convivan dos numeraciones distintas bajo el mismo
nombre `Rn`. La derivación reutiliza el mismo mecanismo de "rotar desde el colocador" que ya
usaba `plantilla.ts::asignarIndices` (decisión 0008) para asignar índices de receptor/central.

**Consecuencias.** Precisa la decisión 0005: el orden de saque se sigue definiendo una única
vez y las rotaciones se siguen derivando, pero ahora con una numeración concreta y sin
ambigüedad. Los escenarios E1–E15 de la spec 001 (ya `Completada`) cambian el valor de
`rotacion` que pasan a `validarFormacion` para seguir probando las mismas formaciones bajo la
numeración correcta; ninguna regla de falta posicional cambia, solo qué número de rotación le
corresponde a cada una. Anotado en el "Al cerrar" de la spec 001.

---

## 0011 — `crearSistema` vive en `catalogo-sistemas.ts`, no en `sistema-recepcion.ts`

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
