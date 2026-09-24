# 074 — El banquillo rival

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

**Depende de:** specs 072 (marcador del atacante) y 073 (marcador del central rival),
completadas e implementadas antes de congelar esta.

## Problema

Con las specs 072 y 073, el atacante y el central rival ya se pueden colocar y guardar en el
campo rival. Pero solo se pueden arrastrar **hacia** el campo: si el entrenador saca una ficha
de la pista (arrastrándola fuera, o si nunca la ha colocado en una variante nueva), no hay ningún
sitio del que volver a cogerla — desaparece de la interfaz hasta que se le ocurra soltarla en el
punto exacto donde estaba. El banquillo propio (spec 042) ya resuelve este mismo problema para
los seis puestos de defensa; los marcadores rivales no tienen su equivalente.

## Objetivo

Un marcador rival (atacante o central) que no tiene punto en la variante activa aparece como una
ficha en el banquillo, arrastrable al campo rival igual que cualquier otro chip. Al colocarlo,
desaparece del banquillo y aparece en el campo; al sacarlo del campo, vuelve al banquillo.

## Fuera de alcance

- **Cualquier jugador o plantilla rival de verdad.** El banquillo rival contiene como máximo dos
  chips fijos — "Atacante" y "Central rival" —, nunca una lista de jugadores con nombre, rol o
  configuración. Esto es deliberado (ver `docs/decisiones/0029-*.md`): un "banquillo rival" que
  se pareciera a una plantilla repetiría el error que esa ADR ya descartó por escrito.
- **Añadir más marcadores rivales de los que ya existen** (atacante, central). Si en el futuro
  se añade un tercero, el banquillo rival lo mostrará automáticamente en cuanto ese marcador
  exista en el modelo — no hace falta ninguna spec nueva para el banquillo en sí, pero
  introducir ese marcador sí es trabajo aparte.
- **Cambiar el banquillo de puestos propios** (spec 042). Sigue funcionando exactamente igual;
  esta spec añade una sección nueva junto a la existente, no la modifica.
- **Un botón o gesto de "quitar" nuevo.** E4 reutiliza el mecanismo que ya existe para los
  puestos propios (spec 042, `tablero.ts`: `store.quitar(jugadorId)` cuando `pista.contiene(e)`
  es `false` al soltar, es decir, se suelta fuera del `<svg>` completo — no solo fuera del
  rectángulo del campo, que es lo que `acotarPuntoRival` ya acota). No se diseña ninguna
  interacción nueva.

**Esta spec toca `application/` y `ui/`.** No toca `domain/` (`VarianteDefensa` no cambia:
`marcadorAtacante`/`marcadorCentral` ya son opcionales desde las specs 072/073, que es
exactamente lo que "está en el banquillo" significa), ni `infrastructure/` ni `server/` (nada
nuevo que persistir: un marcador sin punto ya se guarda como ausente).

## Escenarios

### Aparecer y desaparecer del banquillo

**E1 — Un marcador sin punto en edición aparece en el banquillo rival**
- Dado: una variante de defensa activa donde el atacante nunca se ha colocado (`marcadorAtacante`
  ausente) y el central rival tampoco
- Cuando: se mira el banquillo
- Entonces: aparecen dos chips, "Atacante" y "Central rival"

**E2 — Un marcador con punto en edición no aparece en el banquillo**
- Dado: el atacante ya colocado en la variante activa (con o sin guardar todavía)
- Cuando: se mira el banquillo
- Entonces: solo aparece el chip del central rival — el del atacante no está, porque ya está en
  el campo

**E3 — Arrastrar un chip del banquillo lo coloca en el campo**
- Dado: el chip "Central rival" en el banquillo
- Cuando: se arrastra al campo rival y se suelta
- Entonces: el central rival aparece en el punto soltado (mismo mecanismo que `moverCentral`,
  spec 073, E1) y el chip deja de estar en el banquillo

**E4 — Sacar un marcador del campo lo devuelve al banquillo**
- Dado: el atacante colocado en el campo, con o sin guardar
- Cuando: se arrastra fuera del `<svg>` de la pista y se suelta (mismo gesto que ya vacía un
  puesto propio, spec 042: `pista.contiene(e)` da `false`)
- Entonces: el marcador en edición se borra (`marcadorAtacanteEdicion` vuelve a `null`) y su chip
  vuelve a aparecer en el banquillo

**E5 — El banquillo rival solo existe en defensa**
- Dado: un sistema de tipo `recepcion`
- Cuando: se mira el panel de banquillo
- Entonces: no aparece ninguna sección de banquillo rival — mismo criterio que las fichas del
  campo rival, que tampoco existen fuera de defensa (specs 038, 072, 073)

### Independencia entre variantes

**E6 — El banquillo refleja la variante activa, no el sistema entero**
- Dado: dos variantes de defensa, una con el atacante colocado y otra sin colocar
- Cuando: se cambia de una variante a otra
- Entonces: el banquillo se actualiza para reflejar solo la variante activa — mismo criterio que
  ya demuestran las specs 072 (E3) y 073 (E3) para el resto del estado en edición

### El banquillo de puestos propios no cambia

**E7 — El banquillo propio y el rival conviven sin mezclarse**
- Dado: una variante de defensa con puestos propios sin colocar y con el atacante sin colocar
- Cuando: se mira el panel
- Entonces: los chips de puestos propios (`p1`..`p6`, spec 042) y los chips rivales (`Atacante`,
  `Central rival`) aparecen en secciones distintas, sin mezclarse en la misma lista

## Preguntas abiertas

Ninguna: resuelta con el entrenador antes de redactar los escenarios finales — E4 reutiliza el
gesto de "soltar fuera del SVG" que ya usa el banquillo de puestos propios (spec 042), sin
diseñar ninguna interacción nueva.

## Al cerrar

**Una desviación real respecto a lo previsto:** `moverAtacante`/`moverCentral` (specs 072/073)
solo aceptaban `Punto`, nunca `null`. E4 exigía poder borrar el marcador en edición sin pasar por
`guardar()`, así que ambas firmas se ampliaron a `Punto | null` — un cambio pequeño pero real en
dos funciones ya cerradas en specs anteriores. No rompió ningún test existente porque el
`null` es un caso nuevo, aditivo.

**El test de E4 no demostró nada la primera vez que se escribió.** `moverAtacante(null)` compiló
y pasó incluso antes de ampliar la firma a `Punto | null`, porque `tsconfig.json` no tiene
`"strict": true` en la raíz y `strictNullChecks` no estaba bloqueando esa llamada. Se amplió la
firma de todas formas, por corrección de tipos, pero queda anotado: en este proyecto, un test
que pasa a la primera sin haber visto antes su rojo no es evidencia por sí solo — hay que mirar
también si el compilador debería haberlo rechazado.

**E1, E2, E5, E6, E7 no tienen test automático.** Son sobre qué contiene el banquillo
(`pendientesChipsRivales`, un `computed` de `tablero.ts`), y el proyecto no tiene tests de
componentes Angular — mismo motivo ya documentado en el cierre de las specs 072 y 073. Se
verificaron por diseño: `pendientesChipsRivales` deriva directamente de
`marcadorAtacanteEdicion`/`marcadorCentralEdicion` (ya probadas) y de `esDefensa()` (ya probada
en otros escenarios), sin estado propio que pudiera desincronizarse.

**Reutilización total del mecanismo de arrastre.** `onAgarrarRival`/`onAgarrarCentral` (specs
072/073) ya recibían un `PointerEvent` genérico, sin depender de que el evento viniera del `<g>`
de la ficha en el campo — así que arrancarlos desde el chip del banquillo (`onAgarrarPaleta`) no
necesitó ningún cambio en esos dos métodos, solo un despacho nuevo por `chip.id`. Sorprendió lo
poco que costó: la sesión de diseño previa a la 072 había anticipado que reutilizar el mecanismo
del banquillo propio (`iniciarArrastre`) sería directo, pero el mecanismo real que encajó fue el
del arrastre rival existente, no `iniciarArrastre`.

**Verificado:** `npm run typecheck` limpio y `ng build --configuration=production` compila sin
errores nuevos (un único warning preexistente en `dialogo-instalar.html`, sin relación con esta
spec, confirmado con `git diff --stat`).

**Persistencia:** ninguna. Esta spec no toca `domain/`, `infrastructure/` ni `server/` — un
marcador sin punto ya se guardaba como ausente desde las specs 072/073, que es exactamente lo
que "estar en el banquillo" significa. Nada nuevo que migrar ni persistir.

**Pendiente de verificación visual**, igual que las specs 072 y 073: no se pudo relanzar el
stack Docker en esta sesión (Docker Desktop no disponible). El entrenador confirmará las tres
juntas en el mismo relanzamiento.

**Cobertura:** no existe el script `test:coverage`; no se inventa.
