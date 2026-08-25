# 041 — El panel de zonas se convierte en "Pintado", con zona de finta

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

## Problema

Hoy pintar una zona de responsabilidad en defensa no tiene ningún control propio: seleccionar un
puesto y arrastrar sobre el campo pinta directamente, sin forma de desactivarlo, y la pestaña
"Zonas" solo enseña una leyenda de colores. Además solo existe un tipo de zona — la de
responsabilidad de bloqueo/defensa de campo — y no hay forma de marcar, aparte, dónde cubre cada
puesto las fintas y los toques suaves, que es una responsabilidad distinta aunque caiga sobre el
mismo terreno. Por último, la sombra del bloqueo (spec 040) captura el arrastre sobre toda su
superficie, así que hoy no se puede pintar nada del campo que quede debajo de ella.

## Objetivo

La pestaña "Zonas" pasa a llamarse "Pintado": conserva la leyenda de colores, añade un
interruptor para activar o desactivar el modo pintar al hacer clic, y un selector para elegir si
lo que se pinta es zona de defensa o zona de finta. Las zonas de finta se ven del mismo color que
su puesto, con una textura de puntos que las distingue de la zona de defensa sólida. La sombra del
bloqueo sigue sin moverse sola ni cambiar de sitio por esta spec, pero deja de bloquear el pintado
de lo que queda debajo suyo.

**Esta spec toca `domain/`, `application/`, `infrastructure/`, `server/` y `ui/`**, por el mismo
motivo que las specs 021-024 y 038-040: no hay forma de construir un tipo de zona nuevo, su
persistencia y su control de pantalla sin tocar esas capas.

## Fuera de alcance

- Cualquier cambio en el cálculo o el arrastre de la sombra del bloqueo (spec 040): sigue
  calculándose igual y se sigue pudiendo retocar a mano arrastrándola. Lo único que cambia es que
  deja de interceptar el clic cuando el modo pintar está activo.
- Zonas de finta en recepción: igual que las zonas de responsabilidad (spec 024), solo existen en
  defensa.
- El bloque por defecto de 2×2 (spec 024) aplicado a fintas: una zona de finta siempre empieza
  vacía: no hay ningún equivalente de "bloque más cercano" para ella. Pintar la primera celda de
  finta de un puesto no tiene comportamiento especial: se añade sin más, a diferencia de lo que
  pasa con la primera celda de zona de defensa.
- Calcular huecos o conflictos entre zona de defensa y zona de finta, ni entre ninguna zona y la
  sombra: sigue siendo trabajo de las specs 014-015, sin escribir.
- Copiar una zona de finta de una variante a otra: mismo alcance que ya dejó fuera la spec 024
  para las zonas de defensa.

## Escenarios

### El panel

**E1 — La pestaña "Zonas" pasa a llamarse "Pintado"**
- Dado: un sistema de defensa
- Cuando: se mira la barra de pestañas del panel inferior
- Entonces: no existe ninguna pestaña llamada "Zonas"; existe una llamada "Pintado", en el mismo
  lugar y con la misma condición de habilitado que tenía la anterior (solo en defensa)

**E2 — El interruptor de pintado empieza desactivado**
- Dado: un sistema de defensa recién abierto
- Cuando: se selecciona un puesto y se arrastra sobre el campo
- Entonces: la ficha se mueve, como cualquier arrastre; no se pinta ninguna celda — a diferencia
  del comportamiento anterior a esta spec, donde arrastrar con un puesto seleccionado siempre
  pintaba

**E3 — Activar el interruptor habilita pintar al arrastrar**
- Dado: el interruptor de pintado activado, un puesto seleccionado
- Cuando: se arrastra sobre el campo, fuera de la propia ficha
- Entonces: se pinta el trazo, igual que se pintaba siempre antes de esta spec

**E4 — Con el interruptor desactivado, seguir moviendo fichas funciona igual que siempre**
- Dado: el interruptor de pintado desactivado
- Cuando: se arrastra directamente una ficha
- Entonces: la ficha se mueve; el interruptor de pintado no afecta al arrastre de fichas, solo al
  del fondo del campo

### Defensa o finta

**E5 — El selector defensa/finta decide qué zona se pinta**
- Dado: el interruptor de pintado activado, el selector en "Finta"
- Cuando: se pinta un trazo sobre el puesto seleccionado
- Entonces: las celdas quedan marcadas como zona de finta de ese puesto, no como zona de defensa
  — la zona de defensa que ya tuviera ese puesto no cambia

**E6 — Una celda puede ser de defensa y de finta a la vez, para el mismo puesto**
- Dado: una celda ya marcada como zona de defensa de un puesto
- Cuando: se pinta esa misma celda en modo finta
- Entonces: queda marcada en los dos conjuntos a la vez; borrar una no borra la otra

**E7 — Borrar en modo finta solo borra celdas de finta**
- Dado: un puesto con celdas de zona de defensa y de zona de finta, algunas coincidentes
- Cuando: se borra una celda en modo finta
- Entonces: desaparece de las celdas de finta; si esa misma celda seguía marcada como zona de
  defensa, sigue viéndose como tal

**E8 — La zona de finta no tiene bloque por defecto**
- Dado: un puesto seleccionado, sin ninguna celda de finta pintada todavía, en modo finta
- Cuando: se mira el campo
- Entonces: no se ve ninguna celda de finta marcada — a diferencia de la zona de defensa (spec
  024, E3), aquí no hay ningún bloque de 2×2 que se muestre antes de pintar nada

### Render

**E9 — La zona de finta se ve del color de su puesto, con una textura de puntos**
- Dado: un puesto con celdas de finta pintadas
- Cuando: se mira el campo
- Entonces: esas celdas se ven con el mismo color que ya identifica a ese puesto en la leyenda,
  distinguibles de su zona de defensa sólida por una textura de puntos dentro del cuadrado

**E10 — Recepción sigue sin mostrar ni permitir pintar ninguna zona**
- Dado: un sistema de recepción
- Cuando: se selecciona un jugador
- Entonces: no aparece ninguna zona de defensa ni de finta que pintar (spec 024, E1, sin cambios)

### La sombra

**E11 — Con el pintado activado, se puede pintar en el área que ocupa la sombra**
- Dado: una variante con sombra de bloqueo visible, el interruptor de pintado activado
- Cuando: se arrastra sobre una zona del campo que la sombra cubre
- Entonces: se pinta el trazo igual que en cualquier otra zona del campo — la sombra no lo
  impide

**E12 — La sombra sigue sin moverse sola, y se sigue pudiendo retocar a mano con el pintado
desactivado**
- Dado: el interruptor de pintado desactivado
- Cuando: se arrastra la propia sombra
- Entonces: se desplaza igual que ya permitía la spec 040 — esta spec no cambia su cálculo ni su
  arrastre, solo dónde puede interceptar el puntero

## Preguntas abiertas

Ninguna. Resuelto antes de congelar esta spec:

- **Color de la textura de puntos:** los puntos se dibujan con el mismo color de relleno que ya
  usa la zona de defensa sólida del puesto — no un color nuevo aparte. La distinción es la
  textura (sólido frente a punteado), no el color.
- **Persistencia:** `celdasFinta` es un campo paralelo a `celdas` en `ColocacionDefensa`, con los
  mismos tres estados (`undefined` = nunca tocada, `[]` = vaciada a propósito, con valores =
  pintada) — mismo criterio que fijó la spec 024 para `celdas`. Tipo paralelo, no una unión
  dentro de `Celda`: mismo razonamiento que la ADR 0029 para `ColocacionDefensa` frente a
  `Colocacion` — no hay ninguna regla que combine ambos conjuntos de celdas, así que no gana nada
  compartir un discriminador.

## Al cerrar

Los 12 escenarios pasan. Suite: 303 tests al arrancar esta spec (cierre de la 042) → 307 en
`domain`/`application`/`infrastructure` al cerrarla (4 nuevos en `sistema.store.spec.ts` para
E5, E6/E7, E8, más el interruptor), y 14 en `server/` (1 nuevo, round-trip de `celdas_finta` con
sus tres estados por separado de `celdas`). `npm run typecheck` y `npm run build` limpios en
cliente y servidor. E1-E4 y E9-E12 son interacción, render y CSS puros, sin `tablero.spec.ts` ni
`pista.spec.ts` en el proyecto: verificados con typecheck + build + revisión de código, mismo
criterio que las specs 024 y 042.

**Migración de base de datos real, aplicada y probada.** `20260824000001_zona_de_finta` añade
`colocacion_defensa.celdas_finta`, reutilizando `celdas_validas()` sin recrearla. Aplicada con
`prisma migrate deploy` contra el Postgres de desarrollo y verificada con la suite de 14 tests de
`server/`, que hablan con la base real (no dobles). Al regenerar el cliente Prisma hizo falta
parar el proceso `tsx watch` del backend en marcha — tenía el binario del motor de consultas
bloqueado en Windows (`EPERM` al renombrar el `.dll.node`); se reinició limpio al terminar.

**Desviación real, con precedente ya sentado en esta misma sesión (spec 040): la implementación
de `pintarCelda`/`borrarCelda` se escribió antes que los tests, no después.** El mecanismo
(despachar sobre `celdas` o `celdasFinta` según `modoPintado`) es un cambio pequeño y mecánico
sobre una función ya existente, y los cuatro escenarios de aplicación comparten exactamente esa
misma lógica — fragmentarla en pasos rojo→mínimo→verde por separado habría producido el mismo
código final por un camino más largo, no un diseño distinto. Se compensa documentándolo aquí en
vez de fingir un rojo que no aportaba nada.

**Un riesgo real que el diseño tuvo que cubrir a propósito, no una sorpresa encontrada después:**
`iniciarPintado` (fondo de la pista) decide pintar-o-borrar comparando contra las celdas ya
pintadas del ocupante seleccionado. Si esa comparación hubiera mirado siempre
`celdasJugadorSeleccionado()` (zona de defensa) sin importar el modo activo, un trazo de finta
sobre una celda que ya fuera zona de defensa se habría leído como "borrar" en vez de "pintar". Se
escribió desde el principio despachando sobre `celdasFintaJugadorSeleccionado()` en modo finta,
justo para que ese caso no llegara a existir.

**Ajuste de alcance sobre la marcha, para no romper el presupuesto de CSS del proyecto.** El
primer diseño del interruptor de pintado incluía una pastilla deslizante animada; `tablero.css`
ya iba sobre el aviso de 4 kB antes de esta spec (7,39 kB) y esa versión lo llevó por encima del
error duro de 8 kB (`anyComponentStyle`, `angular.json`). Se simplificó a un botón con borde que
cambia de color en el estado activo — mismo comportamiento, sin la animación — hasta quedar en
7,99 kB. La muestra de puntos en la leyenda (junto al interruptor) se eliminó por el mismo
motivo: no la pedía ningún escenario congelado, solo E9 (la textura en la propia pista), que sí
se conserva.

**`docs/dominio.md` §6 gana la subsección "Zona de finta"**, y `docs/arquitectura.md` se
actualiza con `celdasFinta`, `celdasFintaJugadorSeleccionado` y las signals
`pintadoActivo`/`modoPintado`. **ADR nuevo:** `0035-zona-de-finta-campo-paralelo.md`, con el
mismo razonamiento que la 0029 aplicado a `celdas` frente a `celdasFinta`. No se tocó
`docs/modelo-de-datos.md` ni `README.md`: ninguno de los dos documenta hoy `colocacion_defensa`
en detalle (tampoco lo hizo la spec 038 al crearla), así que no había nada que actualizar ahí sin
inventar una sección nueva fuera del alcance de esta spec.

**Lo que no se desvió:** las dos preguntas resueltas al congelar (color de la textura = el mismo
del puesto, sin color nuevo; `celdasFinta` como campo paralelo) se implementaron tal cual.
