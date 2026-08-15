# 023 — Ver todas las zonas de responsabilidad a la vez

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

## Problema

La spec 022 deja pintar la zona de un jugador cada vez, pero no hay forma de ver el reparto
completo del campo de un vistazo: qué cubre cada uno de los seis, y si entre todos dejan algo
sin cubrir a simple vista.

## Objetivo

Un interruptor muestra a la vez las zonas pintadas de los seis jugadores de la formación activa,
cada uno con un color propio y estable, con una leyenda que dice qué color es cada jugador.

**Esta spec toca `application/` y `ui/`, además de `domain/`.** El interruptor de vista de
conjunto y el color por jugador son estado y render de pantalla; no hay forma de construirlos
sin tocar esas capas. Queda autorizado explícitamente aquí, igual que las specs 021 y 022.

## Fuera de alcance

- Detectar y señalar huecos o conflictos automáticamente: sigue siendo de las specs 014-015,
  sin escribir. Esta spec solo pinta lo que ya existe, sin analizarlo.
- Editar zonas mientras la vista de conjunto está activa: para pintar se vuelve a la vista de un
  jugador (spec 022).
- Elegir el color de cada jugador a mano: el color se deriva igual que hoy se deriva la etiqueta
  o la posición rotacional, no se declara.

## Escenarios

**E1 — Activar la vista de conjunto pinta las zonas de todos**
- Dado: una formación completa donde varios jugadores tienen zona pintada (spec 022)
- Cuando: se activa la vista de conjunto
- Entonces: se ven a la vez todas las celdas pintadas, cada una con el color del jugador o
  jugadores que la cubren

**E2 — Un jugador sin zona pintada no aporta color**
- Dado: una formación donde algún jugador no tiene ninguna celda pintada
- Cuando: se activa la vista de conjunto
- Entonces: ese jugador aparece en la leyenda pero no pinta ninguna celda

**E3 — Una celda compartida se distingue de una celda de un solo jugador**
- Dado: una celda marcada como responsabilidad de dos jugadores (spec 022, E6)
- Cuando: se activa la vista de conjunto
- Entonces: esa celda se ve visiblemente distinta de una celda de un único responsable — no
  hace falta decidir aquí el tratamiento exacto (partir el color, un patrón, un borde); solo que
  no se puede confundir con una celda de un solo dueño

**E4 — El color de un jugador es estable entre rotaciones y vías**
- Dado: un mismo jugador con zona pintada en varias rotaciones (o, en defensa, varias vías)
- Cuando: se activa la vista de conjunto en cada una
- Entonces: ese jugador siempre aparece con el mismo color

**E5 — Desactivar la vista de conjunto vuelve al modo de un jugador**
- Dado: la vista de conjunto activa
- Cuando: se desactiva
- Entonces: se vuelve al comportamiento de la spec 022 — seleccionar un jugador para ver y
  pintar solo su zona

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de congelar esta spec:

- **E3, celda compartida:** se pinta en franjas diagonales, una por cada jugador que la cubre
  (el color de cada uno ya es el suyo; no hace falta ningún elemento gráfico nuevo aparte de las
  franjas).
- **E4, color estable:** se deriva del orden fijo de roles que ya usan el banquillo y la
  leyenda de etiquetas (`claveOrdenRol`, `ui/comun/orden-roles.ts`), indexando una paleta fija.
  Nada nuevo que declarar ni guardar: dos jugadores con el mismo rol e índice en plantillas
  distintas comparten color, igual que hoy comparten posición en el banquillo.
- **Persistencia del interruptor:** no se guarda. Es estado de trabajo efímero, igual que la
  leyenda o el jugador seleccionado — cada carga de la app empieza en modo pintar de un
  jugador, nunca en vista de conjunto.

## Al cerrar

Los 5 escenarios se verificaron a mano con el servidor de desarrollo y Playwright, sin tests
unitarios: es una spec puramente de interacción y render (interruptor, color, patrón visual),
justo lo que `docs/flujo-de-trabajo.md` marca como "qué NO se testea" (nada de dominio ni de
transformación de datos aquí — el color y el patrón son decisiones de pantalla). Partida y
cierre: 175 tests, sin cambios, porque esta spec no tocó `domain/` ni `application/` con nada
que ameritara un test nuevo — todo lo que necesitaba (celdas por jugador, guardado) ya lo dejó
listo la spec 022.

**Verificado en el navegador:** activar la vista de conjunto con dos jugadores pintados
—incluida una celda que ambos comparten— muestra cada uno con su color y la celda compartida
con un patrón de franjas diagonales cyan/verde, distinguible de un vistazo de una celda de un
solo dueño; la leyenda lista a los dos con su muestra de color; intentar pintar mientras la
vista de conjunto está activa no añade ninguna celda (el guard en `iniciarPintado` funciona);
y desactivarla vuelve exactamente al estado anterior (sin nadie seleccionado, sin celdas
visibles).

**Por qué esta spec no llevó tests unitarios, a diferencia de las tres anteriores.** Las specs
021 y 022 tenían piezas de dominio y de aplicación genuinas (derivar la vía, guardar por rotación
y vía, `pintarCelda`/`borrarCelda`, la comparación de cambios pendientes) que sí son reglas o
transformaciones de datos. Esta spec, en cambio, es enteramente "cómo se ve": un interruptor
efímero, un índice de color derivado de un orden que ya existía (`claveOrdenRol`) y un patrón
SVG. No hay ninguna regla de voleibol ni ninguna transformación que proteger con un test — forzar
uno habría sido "perseguir cobertura en la UI", que `docs/flujo-de-trabajo.md` señala
explícitamente como contraproducente.

**Decisión de implementación no anticipada en la spec:** las franjas diagonales se construyen
con un `<pattern>` SVG por cada combinación de colores que aparece en alguna celda (no uno por
celda) — con seis jugadores como mucho, el número de combinaciones reales que puede haber en una
formación es pequeño, así que no compensaba generar un patrón por celda. El ángulo de 45° sale
de `patternTransform="rotate(45)"` sobre un mosaico de franjas horizontales iguales.

**Lo que no se desvió:** las tres respuestas dadas al congelar (franjas diagonales, color por
`claveOrdenRol`, interruptor sin persistir) se implementaron tal cual, sin ningún ajuste
posterior.
