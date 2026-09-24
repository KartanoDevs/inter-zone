# 073 — El central enemigo entra en el diagrama

**Estado:** Descartada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

**Depende de:** spec 072 (el punto del atacante se persiste), completada e implementada antes de
congelar esta. Reutiliza su patrón: campo suelto opcional en `VarianteDefensa`, no un tipo
`MarcadorRival` genérico (ver "Al cerrar" de la 072 — se descartó generalizar sin que ningún
escenario lo exigiera todavía).

## Problema

Cuando el entrenador arma la postura inicial de una defensa (antes de marcar ningún ataque
concreto), lo hace mirando dónde suele colocarse el central rival — es la referencia que usa en
pista real para decidir cómo repartir a sus seis defensores de partida. Hoy el diagrama no tiene
ninguna ficha para eso: la situación `inicial` no tiene ni siquiera ficha "A" (no hay ataque que
marcar todavía), y no existe ninguna ficha de central rival en ningún punto del editor. El
entrenador no tiene manera de dejar esa referencia dibujada ni guardada.

## Objetivo

En defensa (nunca en recepción), se puede colocar una ficha del central rival en cualquier punto
del campo rival, y su posición se guarda con la variante de defensa activa — incluida la postura
`inicial`, que es la situación donde más falta hace.

## Fuera de alcance

- **El banquillo rival** (sacar y volver a traer la ficha): es la spec 074.
- **Cualquier efecto del central rival sobre el cálculo de la defensa.** No cuenta como
  bloqueador, no afecta a `sombraDeBloqueo`, no cambia `puestosQueBloquean`. Es una ficha de
  referencia visual y didáctica, nada más — la sombra sigue calculándose exactamente igual que
  hoy, solo con los puestos propios que bloquean.
- **Un punto por defecto para el central.** No hay ninguna regla de voleibol ni convención
  documentada en `docs/dominio.md` sobre dónde arma un central rival por defecto — depende del
  sistema del equipo contrario (5-1, 6-2…), no es un dato del reglamento. Sin fuente que lo
  respalde, no se inventa (decidido con el entrenador antes de congelar esta spec): la ficha
  nace sin colocar, el entrenador la arrastra a mano la primera vez que la quiere usar.
- **Generalizar a un tipo `MarcadorRival` compartido con el atacante.** Se usa el mismo patrón
  de campo suelto que `marcadorAtacante` (spec 072) y `desplazamientoSombra` (spec 040): un campo
  `marcadorCentral?: Punto` más en `VarianteDefensa`. Ningún escenario de esta spec exige
  unificar los dos en un tipo paralelo.
- **Marcar al central como bloqueador ni participar en el cálculo del bloqueo.** El bloqueo
  (spec 039) sigue siendo exclusivamente cosa de los puestos propios.
- **Cambiar qué situaciones existen por caso, ni el cálculo de la sombra, ni la postura base de
  los seis puestos propios** (`sistema-defensa-por-defecto.ts`): nada de eso se toca.

**Esta spec toca `application/`, `infrastructure/`, `server/` y `ui/`, además de `domain/`**,
mismo alcance que la 072.

## Escenarios

### Colocar y persistir

**E1 — El central rival se puede arrastrar a cualquier punto del campo rival**
- Dado: una variante de defensa activa, cualquier situación (incluida `inicial`)
- Cuando: se arrastra la ficha del central rival a un punto del campo rival y se suelta
- Entonces: la ficha se queda en ese punto exacto

**E2 — El punto del central se guarda con la variante**
- Dado: el central rival colocado en una variante y guardada
- Cuando: se recarga la página y se vuelve a esa variante
- Entonces: el central rival aparece en el mismo punto donde se dejó

**E3 — Cada variante guarda su propio punto del central**
- Dado: dos variantes distintas (p. ej. `inicial` y `z4` con 2 bloqueadores), cada una con el
  central rival en un punto distinto
- Cuando: se alterna entre ellas
- Entonces: cada una muestra su propio central, sin mezclarse — mismo criterio que ya demuestra
  la spec 072, E3, para el atacante

**E4 — El central rival está disponible también en la postura inicial**
- Dado: la situación `inicial` (sin ficha "A", spec 038, E11)
- Cuando: se mira el campo rival
- Entonces: la ficha del central rival se puede colocar igual que en cualquier otra situación —
  es la única ficha rival de esa postura

**E5 — Una variante sin central rival colocado no lo dibuja**
- Dado: una variante que nunca ha tenido el central rival movido
- Cuando: se entra a ella
- Entonces: no aparece ninguna ficha de central rival en el campo — nace sin colocar (ver
  "Fuera de alcance": no hay punto por defecto)

**E6 — El punto guardado queda acotado al campo rival**
- Dado: un intento de soltar la ficha del central fuera de los límites del campo rival
- Cuando: se suelta
- Entonces: el punto que se guarda es el acotado a esos límites, igual que ya hace
  `acotarPuntoRival` con la ficha "A"

### Nunca en recepción, nunca afecta al cálculo

**E7 — El central rival no existe en un sistema de recepción**
- Dado: un sistema de tipo `recepcion`
- Cuando: se edita cualquier rotación
- Entonces: no hay ninguna ficha de central rival disponible ni pintada — mismo criterio que la
  ficha "A" y la "CR" del colocador rival, que tampoco existen fuera de defensa

**E8 — Colocar o mover al central rival no cambia la sombra de bloqueo**
- Dado: una variante con bloqueo activo y sombra visible
- Cuando: se arrastra el central rival a cualquier punto
- Entonces: la sombra de bloqueo no cambia en ningún momento del arrastre ni al soltar

**E9 — El central rival no cuenta como bloqueador**
- Dado: una variante con `bloqueadores` declarados
- Cuando: se calcula `puestosQueBloquean`
- Entonces: el resultado no depende en ningún caso de dónde esté el central rival — sigue
  derivándose solo de los puestos propios delanteros (spec 039, sin cambios)

### Leyenda

**E10 — El central rival tiene su propia entrada en la leyenda de defensa**
- Dado: el modo defensa
- Cuando: se abre la leyenda
- Entonces: aparece una entrada nueva `{ etiqueta: 'CeR', nombre: 'Central rival' }` en
  `ENTRADAS_LEYENDA_DEFENSA` (`ui/pista/pista.ts`), además de las ya existentes (`A`, `CR`, y las
  de los seis puestos propios)

**E11 — La etiqueta "CeR" no se confunde con la "Ce" del central propio**
- Dado: una variante con el central rival colocado cerca de la red, y algún puesto propio "Ce"
  también cerca de la red (caso trasero, situaciones con central adelantado)
- Cuando: se mira el campo
- Entonces: las dos etiquetas son distinguibles a simple vista por su texto (`Ce` vs `CeR`) y por
  estar siempre en lados distintos del campo (central propio con `y > 0`, central rival con
  `y < 0`) — no hace falta ningún color ni marca adicional para diferenciarlas

## Preguntas abiertas

Ninguna: resuelta con el entrenador antes de redactar los escenarios finales — la ficha usa la
etiqueta `CeR` y el nombre "Central rival" (mismo patrón que `CR` para el colocador rival: añade
"R" al identificador del central propio, `Ce`).

## Al cerrar

**Descartada tras probarla en `develop`.** Se implementó, se desplegó, y el entrenador decidió
que el central rival no aportaba lo que esperaba de esta mejora — solo necesitaba poder mover al
atacante rival (spec 072), no una segunda ficha de referencia. Se revirtió por completo: modelo,
store, UI y esquema de base de datos (columnas `central_x`/`central_y`, eliminadas con la
migración `20260924140000_revierte_punto_central_rival`, sin tocar ni borrar la migración
original que las creó). La spec 072 y su ADR (0047) siguen intactas. Lo que sigue debajo describe
cómo se implementó en su momento; se conserva como registro, no como estado actual del código.

**Sin desviaciones respecto a lo especificado.** El campo suelto `marcadorCentral?: Punto` en
`VarianteDefensa` replicó literalmente el patrón fijado por la spec 072 (mismo criterio de
opcionalidad, mismo octavo/noveno parámetro en `guardarVarianteDefensa`, misma signal
`marcadorCentralEdicion`/`moverCentral` en el store, mismas columnas en pareja con `CHECK` en el
servidor). Dicho de otra forma: esta spec fue la prueba de que la decisión tomada al cerrar la
072 (no generalizar a `MarcadorRival` sin que un tercer caso lo pidiera) era la correcta — el
tercer caso llegó y el patrón de campo suelto escaló sin fricción, sin duplicar lógica más allá
de lo mecánico.

**Único punto donde el central rival se aparta del patrón del atacante:** no deriva ninguna
situación al soltarse (`moverCentral` no llama a `seleccionarSituacion`, a diferencia de
`onAgarrarRival`) y no participa en el cálculo de la sombra ni del bloqueo — ambas cosas ya
estaban previstas en el objetivo y no fueron una sorpresa durante la implementación.

**E6 (acotado) y E8/E9 (sin efecto en la sombra) no generaron test nuevo**, mismo motivo que en
la 072: el acotado se reutiliza sin cambios (`acotarPuntoRival`) y la ausencia de efecto en la
sombra se demuestra por construcción — `arrastreCentral` no aparece en ninguna lectura del
`computed sombra` de `tablero.ts` (comprobado con `grep`, no solo por inspección). E11 (no
confusión visual con "Ce") tampoco generó test de componente, mismo motivo que E11 de la 072: el
proyecto no tiene tests de componentes Angular; se verificó por diseño (etiquetas de distinto
texto, y el propio SVG ya separa campo propio de campo rival por el signo de `y`).

**Persistencia real:** columnas `central_x`/`central_y` en `formacion_defensa` (migración
`20260924130000_punto_central_rival`), mismo `CHECK` en pareja que `atacante_x`/`atacante_y` y
`sombra_dx`/`sombra_dy`. Misma limitación que en el cierre de la 072: no se pudo ejecutar
`sistemas.rutas.spec.ts` contra una base real en esta sesión (Docker Desktop no disponible);
queda pendiente de verificación con el stack real antes de darla por probada de extremo a
extremo — se comprobará junto con la de la spec 072 en el mismo relanzamiento.

**Cobertura:** no existe el script `test:coverage`; no se inventa (mismo aviso que la 072).
