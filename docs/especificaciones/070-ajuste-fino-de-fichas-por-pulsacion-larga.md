# 070 — Ajuste fino de una ficha por pulsación larga

**Estado:** Completada
**Paso de la hoja de ruta:** No encaja en ninguno: es una mejora de ergonomía táctil sobre un
mecanismo ya existente, no un hito nuevo (mismo criterio que la spec 067).

## Problema

En el móvil, tanto en el Editor como en el Examen, el alumno o el entrenador arrastra la ficha
con el dedo — pero el dedo tapa justo la ficha y la zona donde hay que soltarla, y la pista real
mide pocos centímetros por celda en pantalla. Corregir un error de un par de centímetros exige
volver a arrastrar la ficha entera, con el riesgo de pasarse otra vez.

## Objetivo

Sin cambiar el arrastre de siempre ni su armado, seleccionar una ficha y luego mantenerla
pulsada abre cuatro flechas alrededor (arriba/abajo/izquierda/derecha) para corregir su
posición paso a paso, con el dedo despejado de la ficha mientras se corrige.

## Fuera de alcance

**Diseño elegido — "cruz con más aire":** las cuatro flechas se separan de la ficha lo bastante
para no tocarla ni tocarse entre sí, agrupadas por un fondo circular sutil que las señala como
un único control; el botón de cerrar (×) queda bien lejos de la flecha superior, no pegado a
ella. Es una corrección de espaciado sobre la primera versión probada con el usuario, que
amontonaba las flechas y el cierre contra la ficha.

**Activación en dos toques, no en un único gesto continuo:** la cruz solo puede abrirse sobre
una ficha que ya estaba seleccionada de antes (un toque previo, aparte). Esto es deliberado:
así el armado del arrastre a 150 ms/8 px (`RETARDO_ARRASTRE_MS`/`UMBRAL_ARRASTRE_PX`,
[tablero.ts:104-105](../../src/app/ui/tablero/tablero.ts#L104-L105)) no se toca en absoluto —
sigue exactamente igual que hoy en el primer toque sobre cualquier ficha. La pulsación larga
de 600 ms solo entra en juego en un segundo toque, sobre una ficha ya seleccionada.

Como Examen no tiene hoy ningún concepto de "ficha seleccionada" (a diferencia del Editor, que
ya usa `jugadorSeleccionadoId` en `SistemaStore`), esta spec añade uno nuevo, local al
componente `ExamenTablero` — un simple id-o-null que un toque corto activa/desactiva
(`toggle`), sin persistir en `ExamenStore` ni en el dominio. Ver E2.

Explícitamente fuera de esta spec:

- **Rediseñar el arrastre continuo en sí.** Esta spec añade un complemento por pulsación larga;
  no toca la fluidez ni el cálculo del arrastre normal, que sigue exactamente igual.
- **Imán o rejilla de cualquier tipo.** Las flechas suman o restan 0,1 m al punto libre actual;
  nunca ajustan a una celda ni a ninguna posición "razonable" (coherente con el
  [ADR 0032](../decisiones/0032-sombra-poligono-no-rejilla.md), que ya rechazó una rejilla para
  un caso análogo).
- **Repetición automática al mantener pulsada una flecha.** Un toque, un paso de 0,1 m. Mantener
  pulsado no repite en esta spec; si se echa en falta, es una spec aparte.
- **Añadir dependencias.** Sigue el mismo patrón de Pointer Events nativos que ya usan
  `Tablero`, `Barra` y `desplazarConElDedo` — ninguna librería de gestos.
- **Soporte de teclado externo** (flechas del teclado físico) para las nuevas flechas en
  pantalla. Trabajo aparte, mismo criterio que ya dejaron dicho las specs 055, 057 y 059. Las
  flechas y el botón de cerrar son `<button>` normales, así que Tab/Enter/Espacio ya funcionan
  por sí solos sin ningún trabajo adicional; lo que no se hace es remapear las flechas del
  teclado a los cuatro pasos.
- **Corregir que el arrastre en Examen no acota hoy al borde del campo.** Es un hueco ya
  existente en `ExamenStore.colocar()`
  ([examen.store.ts:286-299](../../src/app/application/examen.store.ts#L286-L299)), ajeno a esta
  spec. La cruz de flechas nueva sí acota (E6), pero el arrastre de siempre no se toca.
- `src/app/ui/teoria/` — es una vista de solo lectura, sin arrastre ni selección; no aplica.
- `application/` — no hace falta tocarlo. Se reutilizan `colocarOMover()`
  ([sistema.store.ts:792](../../src/app/application/sistema.store.ts#L792)),
  `enfocarJugador()` ([sistema.store.ts:566](../../src/app/application/sistema.store.ts#L566)) y
  `ExamenStore.colocar()` tal cual están.

**Corrección tras congelar la spec:** `vitest.config.ts` solo ejecuta tests bajo `domain/`,
`application/` e `infrastructure/` (deliberado — su comentario dice que un test de `domain/`
que necesite jsdom o `TestBed` está en la capa equivocada). Para que E5-E7 (aritmética pura
sobre un `Punto`: sumar 0,1 m y acotar a los límites del campo) tengan un test que de verdad
corra con `npm test`, hace falta un fichero **pequeño y nuevo en `domain/`** — encaja ahí de
forma natural, es una transformación de datos sin Angular ni DOM. `LIMITE_X`/`LIMITE_Y` de
`ui/tablero/tablero.ts` ([tablero.ts:91-92](../../src/app/ui/tablero/tablero.ts#L91-L92)) no se
tocan ni se mueven — se declaran de nuevo, con los mismos valores, en el fichero de `domain/`,
porque moverlos habría sido un cambio de alcance mayor del que pide esta spec.

Esta spec autoriza explícitamente tocar:

- `src/app/ui/tablero/tablero.ts`, `.html`, `.css`
- `src/app/ui/examen/examen-tablero.ts`, `.html`, `.css`
- Ficheros nuevos en `src/app/ui/comun/`: el helper de arrastre con distinción toque/pulsación
  larga/arrastre, compartido entre los dos tableros, y el componente presentacional de la cruz
  de flechas (siguiendo el patrón de `Barra` — sin estado de dominio, solo emite eventos)
- Un fichero nuevo en `src/app/domain/` (y su `.spec.ts`) solo para el cálculo de E5-E7: sumar
  el paso de 0,1 m en una dirección y acotar el resultado al campo. No toca ninguna regla ni
  fichero de dominio existente.

**Segunda corrección, durante la implementación:** anclar la cruz sobre la ficha exige saber
dónde cae un punto de la pista en pantalla — lo inverso de `Pista.puntoDesde()`, que ya existe.
Se autoriza tocar también `src/app/ui/pista/pista.ts`, solo para añadir ese método nuevo
(`puntoAPantalla`); no se toca nada más de ese fichero, que es compartido con `TeoriaTablero` y
por tanto el de mayor radio de cambio si algo saliera mal.

Ningún otro fichero de `ui/`, y ninguno de `application/` ni `infrastructure/`, queda
autorizado por esta spec.

## Escenarios

### Activación

**E1 — Mantener pulsada una ficha ya seleccionada abre la cruz de flechas**
- Dado: una ficha ya colocada y ya seleccionada (E2 la seleccionó en un toque previo, aparte)
- Cuando: se vuelve a agarrar y se mantiene el puntero sobre ella, sin desplazarse más de 8 px,
  durante 600 ms
- Entonces: aparecen las cuatro flechas y el botón de cerrar alrededor de la ficha, sin haberla
  movido de sitio

**E2 — Un primer toque solo selecciona; nunca abre la cruz, ni corto ni largo**
- Dado: una ficha colocada que todavía no estaba seleccionada
- Cuando: se toca y se suelta sin desplazarse más de 8 px — sea un toque corto o uno que se
  mantiene 600 ms o más, siempre que sea la primera vez que se agarra
- Entonces: la ficha queda seleccionada — en el Editor, exactamente igual que hoy
  (`seleccionarJugador`/`enfocarJugador`, specs 010/027, sin ningún cambio); en Examen, con el
  estado de selección nuevo de esta spec (ver Fuera de alcance) — pero la cruz no aparece en
  este primer toque bajo ninguna circunstancia

**E3 — Sobre una ficha ya seleccionada, moverse antes de los 600 ms sigue siendo un arrastre normal**
- Dado: una ficha ya colocada y ya seleccionada
- Cuando: se vuelve a agarrar y el puntero se desplaza más de 8 px en cualquier momento antes
  de completarse los 600 ms
- Entonces: se arma el arrastre de siempre y la ficha se puede reposicionar arrastrándola; la
  cruz no aparece aunque el puntero se quede quieto después

**E4 — El armado del arrastre a 150 ms/8 px no cambia en ningún caso**
- Dado: cualquier ficha, seleccionada o no
- Cuando: se agarra y se suelta sin que llegue a cumplirse E1 (por ejemplo, se suelta a los
  300 ms sin haberse desplazado)
- Entonces: el resultado es exactamente el de hoy — ni `RETARDO_ARRASTRE_MS` ni
  `UMBRAL_ARRASTRE_PX` se tocan; la pulsación larga nunca interrumpe ni compite con ese armado,
  solo se comprueba aparte, sobre una ficha que ya estaba seleccionada

### Movimiento con las flechas

**E5 — Cada flecha desplaza la ficha 0,1 m en su dirección**
- Dado: la cruz abierta sobre una ficha
- Cuando: se pulsa la flecha arriba, abajo, izquierda o derecha
- Entonces: la ficha se mueve 0,1 m hacia la red, el fondo, la banda izquierda o la banda
  derecha respectivamente, en coordenadas del dominio (metros) — nunca en píxeles de pantalla

**E6 — El desplazamiento respeta los límites del campo**
- Dado: la ficha ya en un borde del campo (por ejemplo, en `x = 9`)
- Cuando: se pulsa la flecha que la empujaría fuera de ese límite
- Entonces: la ficha no se mueve más allá del límite — mismo criterio que ya aplica al arrastre
  en el Editor, y ahora también en Examen para este control nuevo (ver Fuera de alcance)

**E7 — Varios toques seguidos acumulan el desplazamiento**
- Dado: la cruz abierta
- Cuando: se pulsa la misma flecha varias veces, o flechas distintas en cualquier orden
- Entonces: cada toque se suma al punto actual de la ficha, no al punto de cuando se abrió la
  cruz

### Cierre

**E8 — Tocar fuera cierra la cruz**
- Dado: la cruz abierta sobre una ficha
- Cuando: se toca fuera de la cruz y de la ficha
- Entonces: la cruz se cierra; en el Editor, la ficha queda enfocada (mismo criterio que al
  soltar un arrastre, spec 027); en Examen, simplemente se cierra

**E9 — El botón de cerrar hace lo mismo que tocar fuera**
- Dado: la cruz abierta
- Cuando: se pulsa el botón de cerrar (×)
- Entonces: mismo resultado que E8

**E10 — Cambiar de selección cierra la cruz de la ficha anterior**
- Dado: la cruz abierta sobre la ficha A (ya seleccionada)
- Cuando: se selecciona otra ficha B con un toque corto (E2), o se deselecciona la propia A
  tocándola de nuevo (Editor: toggle de `seleccionarJugador`)
- Entonces: la cruz de A se cierra en cuanto A deja de estar seleccionada; abrir la cruz de B
  requiere su propio toque de selección seguido de su propia pulsación larga (E1) — nunca hay
  dos cruces abiertas a la vez

### Paridad Editor / Examen

**E11 — El mismo comportamiento en Examen, con su propia selección**
- Dado: una ficha colocada durante el examen guiado por rotación
- Cuando: se repiten E1, E2 y E5 en la ventana Examen
- Entonces: el resultado es el mismo que en el Editor — aunque hoy `examen-tablero.ts` no
  distingue toque de arrastre, coloca en cuanto hay `pointerdown` y no tiene ningún concepto de
  ficha seleccionada
  ([examen-tablero.ts:285-315](../../src/app/ui/examen/examen-tablero.ts#L285-L315)), esta spec
  añade ahí la selección nueva (local al componente) y la misma distinción
  toque/pulsación-larga/arrastre que el Editor

## Preguntas abiertas

Ninguna. La única que bloqueaba esta spec ya está resuelta:

- **Choque entre el armado del arrastre (150 ms/8 px) y la pulsación larga (600 ms):** se
  resuelve con activación en dos toques (seleccionar, y solo luego pulsación larga sobre la ya
  seleccionada — ver Fuera de alcance y E1-E4). Se descartó tocar el armado del arrastre
  existente por el riesgo de romper un criterio ya fijado en las specs 010/027; el coste
  aceptado es que abrir la cruz necesita dos toques en vez de uno continuo.

## Nota de verificación

Ningún componente de `ui/` en este proyecto lleva test de componente hoy — ni `Tablero`, ni
`ExamenTablero`, ni `Barra` — porque la lógica que importa vive en `domain/`/`application/`, ya
probada allí (`docs/arquitectura.md`). La distinción toque-vs-arrastre que ya existe (spec 010)
es del mismo tipo: interacción, no voleibol, y tampoco tiene test. Esta spec sigue ese mismo
criterio, no crea uno nuevo:

- **E5, E6, E7** (qué le suma cada flecha al punto de la ficha, y el recorte a los límites del
  campo) son una transformación de datos pura sobre un `Punto` — se extraen a una función aparte
  y sí llevan test rojo→verde, como cualquier otra transformación
  (`docs/flujo-de-trabajo.md`).
- **E1-E4, E8-E11** (cuándo se abre la cruz, cuándo se cierra, con qué toques compite o no
  compite el arrastre) son estado de interacción en `ui/`, sin dominio ni aplicación de por
  medio — la misma familia que "que el arrastre se sienta bien", que `docs/flujo-de-trabajo.md`
  excluye explícitamente de lo que se testea. Se implementan y se verifican a mano —
  relanzando la app, en un móvil real o en DevTools en modo responsive — escenario a escenario,
  con confirmación explícita antes de seguir al siguiente. El espaciado visual de la cruz (que
  no se solape con la ficha ni consigo misma) se verifica en el mismo paso.

## Al cerrar

`npm test` (536 tests, 33 ficheros — E5-E7 incluidos), `npm run typecheck` y
`ng build --configuration production` en verde. El helper de gesto se llama
`ui/comun/gesto-tactil.ts`, y la cruz `ui/comun/cruz-ajuste-fino.ts` (además del método nuevo
`Pista.puntoAPantalla`, ya documentado en Fuera de alcance). **No se ha probado en un
dispositivo real ni en el navegador**: el entorno donde se implementó no tiene Docker
disponible para levantar el stack de desarrollo (`start.bat`), así que los escenarios
manuales (E1-E4, E8-E11) están implementados pero no verificados — igual que la spec 059 dejó
sin rellenar su columna "Resultado" por el mismo motivo de fondo (implementado no es lo mismo
que verificado). Queda para quien lo pruebe:

| Escenario | Qué probar | Resultado |
|---|---|---|
| E1 — pulsación larga abre la cruz | Editor y Examen, ficha ya seleccionada | |
| E2 — primer toque solo selecciona | Editor y Examen | |
| E3 — moverse antes de 600 ms sigue siendo arrastre | Editor y Examen | |
| E4 — el armado a 150 ms/8 px no cambia | Editor (comprobar que nada del arrastre normal se siente distinto) | |
| E5 — cada flecha mueve 0,1 m | ya cubierto por test automático | verde |
| E6 — límites del campo | ya cubierto por test automático | verde |
| E7 — acumula desplazamiento | ya cubierto por test automático | verde |
| E8 — tocar fuera cierra | Editor y Examen | |
| E9 — botón de cerrar | Editor y Examen | |
| E10 — cambiar de selección cierra la cruz anterior | Editor y Examen | |
| E11 — paridad Examen | Examen, comparado con Editor | |
| Espaciado visual (Nota de verificación) | que la cruz no se solape con la ficha ni consigo misma, en un móvil real | |

**Desviaciones respecto a lo previsto, además de las dos ya documentadas en Fuera de alcance
(E5-E7 en `domain/`, `Pista.puntoAPantalla` nuevo):**

- **Examen no replica `RETARDO_ARRASTRE_MS` (armado por tiempo) del Editor.** Solo usa el
  umbral de desplazamiento (8 px) para distinguir toque de arrastre. Nada en los escenarios
  depende de esa réplica exacta — es una peculiaridad histórica del Editor (spec 027,
  `enfocarJugador`), no un requisito de esta spec — así que replicarla en Examen habría sido
  copiar comportamiento sin motivo, no paridad.
- **E8 ("tocar fuera cierra") se apoya en la deselección ya existente**, no en un listener
  global de "clic fuera": tocar el fondo de la pista, tocar otra ficha, o tocar la misma ficha
  de nuevo, deselecciona y eso cierra la cruz (vía un `effect` que la cierra siempre que cambia
  la selección). Lo que **no** cierra la cruz es tocar algo del todo ajeno al tablero (un botón
  del nav, por ejemplo) mientras está abierta — caso que ningún escenario pide explícitamente y
  de impacto bajo; se deja así por sencillez en vez de añadir un listener global de documento.
- **Sorpresa real:** al escribir E4 por primera vez no había reparado en que el armado por
  tiempo del Editor (150 ms) ya tenía una consecuencia observable distinta del armado por
  movimiento (`enfocarJugador` frente a `seleccionarJugador` con toggle). Hizo falta una
  variable de desplazamiento aparte (`seDesplazo`), independiente de `armado`, para que la
  pulsación larga se comprobara sin depender de esa mezcla.

**Nada que anotar en `docs/decisiones/`.** No es una decisión estructural: no cambia qué capas
existen ni qué adaptador está en uso. `docs/arquitectura.md` sí recibió un retoque menor —una
entrada nueva para `domain/ajuste-fino.ts` y una mención de `gesto-tactil.ts`,
`CruzAjusteFino` y `Pista.puntoAPantalla` en sus listados de `ui/comun/` y `ui/pista/`—, no una
reescritura: esta spec no cambia qué hace la app en producción a ese nivel, solo añade
ficheros a capas que ya existían. `README.md` no necesita tocarse.
