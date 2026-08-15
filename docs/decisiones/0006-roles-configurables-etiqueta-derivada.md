# 0006 — Roles con nombre y abreviatura configurables, etiqueta derivada

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
