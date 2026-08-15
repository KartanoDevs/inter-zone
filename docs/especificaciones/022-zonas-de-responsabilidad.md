# 022 — Pintar la zona de responsabilidad de un jugador

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

## Problema

`docs/dominio.md` §6 describe la zona de responsabilidad desde la spec 001 — una rejilla de
celdas de 0,5 m que el entrenador pinta a mano (ADR 0004) — pero nunca se ha implementado. Ni en
recepción ni en la defensa de la spec 021 hay forma de decir "esta zona del campo es
responsabilidad de este jugador".

## Objetivo

Con un jugador seleccionado, se puede pintar sobre el campo propio qué celdas de 0,5 m son su
responsabilidad, arrastrando el dedo o el ratón. La zona pintada se guarda junto con la
formación: por rotación en recepción, por rotación y vía en defensa.

**Esta spec toca `application/` y `ui/`, además de `domain/`.** El modo pintar (E1-E3) y el
arrastre que marca celdas (E4-E7) no existen sin tocar el store y el gestor de arrastre de
`Tablero`. Queda autorizado explícitamente aquí, igual que la spec 021.

## Fuera de alcance

- Ver las zonas de varios jugadores a la vez, con un color por jugador: spec 023.
- Huecos (celdas sin nadie) y conflictos (celdas con varios): specs 014-015 de la hoja de ruta,
  todavía sin escribir. Esta spec solo pinta y guarda, no analiza.
- Cambiar el tamaño de la celda: se queda en 0,5 m, la constante de la ADR 0004.
- Pintar fuera del campo propio (zona libre incluida no, solo dentro de las 9×9 líneas — ver
  Preguntas abiertas).
- Deshacer/rehacer trazos de pintado.

## Escenarios

### Entrar y salir del modo pintar

**E1 — Seleccionar un jugador entra en modo pintar**
- Dado: un jugador colocado en la formación activa, sin seleccionar
- Cuando: se selecciona
- Entonces: arrastrar sobre el campo deja de mover fichas y empieza a pintar celdas para ese
  jugador

**E2 — Deseleccionar sale del modo pintar**
- Dado: un jugador seleccionado, en modo pintar
- Cuando: se deselecciona (mismo gesto que hoy quita la selección, spec 010)
- Entonces: arrastrar sobre el campo vuelve a mover fichas, como antes de seleccionar

**E3 — Seleccionar otro jugador cambia de quién se pinta**
- Dado: un jugador seleccionado, en modo pintar, con celdas ya pintadas
- Cuando: se selecciona un jugador distinto
- Entonces: arrastrar ahora pinta celdas para el jugador recién seleccionado; las celdas del
  primero no se tocan

### Pintar y borrar celdas

**E4 — Arrastrar en modo pintar marca un trazo de celdas**
- Dado: un jugador seleccionado, en modo pintar
- Cuando: se arrastra por varias celdas seguidas
- Entonces: todas las celdas recorridas quedan marcadas como suyas

**E5 — Pintar una celda ya pintada por el mismo jugador la despinta**
- Dado: una celda ya marcada como responsabilidad del jugador seleccionado
- Cuando: se pinta esa misma celda otra vez
- Entonces: deja de estar marcada para él

**E6 — Dos jugadores pueden compartir la misma celda**
- Dado: una celda ya marcada como responsabilidad de un jugador
- Cuando: se selecciona otro jugador y se pinta la misma celda
- Entonces: queda marcada para los dos a la vez — compartir celda es una defensa válida, no un
  error que la app deba impedir

**E7 — No se pinta fuera del campo**
- Dado: un jugador seleccionado, en modo pintar
- Cuando: el arrastre pasa por un punto fuera de las líneas del campo propio
- Entonces: no se marca ninguna celda ahí

### Guardar

**E8 — La zona pintada se guarda junto con la formación**
- Dado: una formación completa con celdas pintadas para varios de sus jugadores
- Cuando: se guarda
- Entonces: las celdas quedan asociadas a esa formación y sobreviven a recargar la página

**E9 — Cambiar de rotación (o de vía, en defensa) sin guardar pide confirmar, igual que mover fichas**
- Dado: celdas pintadas o despintadas desde el último guardado, sin ningún jugador movido
- Cuando: se intenta cambiar de rotación o de vía
- Entonces: cuenta como cambio pendiente igual que mover una ficha (spec 009, E6-E8) — pintar
  también es un cambio sin guardar

**E10 — La zona se guarda igual en recepción y en defensa**
- Dado: una formación de defensa completa (rotación y vía) con celdas pintadas
- Cuando: se guarda
- Entonces: queda asociada a esa rotación y esa vía concreta, sin afectar a otras vías ni a otras
  rotaciones — mismo criterio de clave que ya fija la spec 021

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **Cualquiera de los seis puede tener zona pintada**, no solo quien recibe. Esto contradice lo
  que dice hoy `docs/dominio.md` §6 ("solo los jugadores que reciben tienen asignación de
  celdas") y el invariante 10 de §7 — se corrigen al cerrar esta spec.
- **Solo el campo propio (9×9 → 18×18 celdas de 0,5 m), sin la zona libre.** Aunque §6 hoy dice
  que la rejilla "cubre la zona jugable, incluida la zona libre", el usuario ha pedido acotarla
  al campo por ahora; se corrige la misma frase al cerrar.
- **Modo pintar activado por selección**, no un botón aparte ni pintado celda a celda sin
  arrastre: seleccionar un jugador ya redirige el arrastre a pintar en vez de mover.

## Al cerrar

Los 10 escenarios pasan. Partida: 169 tests (tras cerrar la spec 021); al cerrar, 175. No existe
`npm run test:coverage`. Verificado también con el servidor de desarrollo y Playwright: pintar
un trazo, que las fichas no se mueven mientras se pinta, que no se pinta fuera del campo, y que
deseleccionar deja de mostrar (aunque no borra) la zona.

**Cuatro de los diez escenarios quedaron cubiertos por construcción**, sin cambio de código
propio, una vez el mecanismo general estuvo bien diseñado — mismo patrón que ya describieron las
specs 009, 011 y 021: E6 (compartir celda: cada colocación tiene su propio array `celdas`, así
que dos jugadores nunca se pisan), E8 y E10 (guardar conserva las celdas: `Colocacion.celdas`
viaja entero a través de `guardarFormacion`/`guardarFormacionDefensa` sin que ninguna de las dos
funciones necesitara enterarse de que existe).

**Un fallo real apareció al escribir E9** (pintar sin guardar cuenta como cambio pendiente):
`formacionesIguales`, la función que decide si hay cambios sin guardar, solo comparaba
`punto.x`/`punto.y` de cada colocación — nunca miró `celdas`. Pintar o despintar, sin mover
ningún jugador, no activaba el aviso de cambios sin guardar. Se detectó con el test antes de
tocar código (rojo genuino, no cubierto por construcción) y se corrigió comparando también las
celdas como conjuntos (`celdasIguales`, orden-independiente).

**Decisión de arquitectura tomada durante la implementación, no anticipada en el plan**: `Celda`
se define en `modelos.ts`, no en `rejilla.ts` donde se escribió primero. `rejilla.ts` ya
importaba `Punto` de `modelos.ts`; si `Colocacion.celdas` hubiera importado `Celda` de
`rejilla.ts`, habría sido una dependencia circular entre dos ficheros de `domain/`. Se movió el
tipo a `modelos.ts` (el registro central de tipos compartidos, igual que `Punto` o `Jugador`) y
`rejilla.ts` pasó a importarlo de ahí, como hace el resto de `domain/`.

**Dos decisiones de interacción, no anticipadas en la spec** (la spec no describe
implementación, per `docs/flujo-de-trabajo.md`, así que esto vivía fuera de su alcance):

1. **El primer punto tocado decide si un trazo pinta o borra.** Sin esto, arrastrar por una
   celda ya pintada la borraría y la siguiente (sin pintar) la pintaría, produciendo un patrón
   errático en vez de un trazo limpio. Es una decisión de UX de pintado estándar, no una regla
   de voleibol.
2. **`FichaJugador` y la ficha rival paran la propagación de su propio `pointerdown`.** El fondo
   de la pista necesitaba un `pointerdown` propio para arrancar el modo pintar, pero por defecto
   ese evento burbujea desde cualquier ficha hasta el `<svg>` raíz — sin cortarlo ahí, tocar una
   ficha habría disparado a la vez su propio arrastre/selección y el modo pintar del fondo. Se
   detectó razonando sobre el DOM antes de escribir código, no como un bug encontrado después.

**`docs/dominio.md` §6 y el invariante 10 de §7 se corrigieron**, tal y como se anticipó al
congelar la spec: "solo quien recibe tiene celdas" pasó a "cualquiera de los seis", y "la
rejilla cubre la zona libre" pasó a "solo el campo propio, 9×9 m".

**Lo que no se desvió:** ninguna decisión tomada al congelar la spec (modo pintar por selección,
sin huecos ni conflictos, solo campo propio) resultó incorrecta al implementarla.
