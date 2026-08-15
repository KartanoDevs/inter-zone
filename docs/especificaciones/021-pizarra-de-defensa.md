# 021 — La pizarra de defensa: rival, vía de ataque y colocación libre

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa — nuevo paso, reservado en el README desde
la v1: "Después de la v1: sistemas de defensa (V2), que reutilizan el mismo modelo de pista y de
rejilla pero añaden bloqueo y atacante rival")

## Problema

Hoy la app solo enseña recepción. El tipo "Defensa" existe en el modelo desde el principio, pero
el formulario de alta lo muestra deshabilitado ("Defensa (próximamente)") y no hay pista, ni
banquillo, ni guardado para ella. Un entrenador que quiere enseñar de dónde viene un ataque y
cómo se coloca el bloqueo y la defensa de campo para pararlo no tiene dónde hacerlo.

## Objetivo

Se puede crear un sistema de defensa, marcar por dónde ataca el rival soltando su ficha en el
campo contrario, y colocar y guardar a los seis defensores para cada rotación y cada vía de
ataque. Ninguna formación de defensa se bloquea por falta de posición: en defensa no se valida.

**Esta spec toca `application/` y `ui/`, además de `domain/`.** Como la spec 009: no hay forma
de tener una pista de defensa con ficha rival, pestañas de vía y arrastre sin tocar esas capas.
Queda autorizado explícitamente aquí.

## Fuera de alcance

- Pintar y ver las zonas de responsabilidad de cada defensor (specs 022 y 023).
- Huecos y conflictos de zonas: no existen todavía ni en recepción (specs 014-015 de la hoja de
  ruta, aún sin escribir) ni en defensa.
- Un equipo rival completo con seis jugadores y roles: el rival es una única ficha genérica que
  marca por dónde llega el ataque, no un equipo con posiciones propias.
- Rotación del rival, o cualquier regla de reglamento aplicada a su lado de la red.
- Modo consulta y modo examen (specs 012-013), exportar (spec 016): todos siguen pendientes,
  igual que para recepción.
- Cambiar la plantilla usada por un sistema de defensa: usa la misma plantilla global que
  recepción, como ya hace cualquier sistema hoy.

## Escenarios

### Crear un sistema de defensa

**E1 — El tipo "Defensa" deja de estar deshabilitado**
- Dado: el formulario de alta de un sistema nuevo
- Cuando: se elige el tipo "Defensa" y se confirma con un nombre
- Entonces: se crea un sistema de tipo defensa, ligado a la misma plantilla que cualquier
  sistema de recepción

**E2 — La pista de defensa muestra al rival y las vías; la de recepción no**
- Dado: un sistema de defensa activo
- Cuando: se mira la pista
- Entonces: aparece una ficha de jugador rival en el campo contrario y una fila con las cuatro
  vías de ataque (zona 4, zona 3, zona 2 y pipe); un sistema de recepción activo no muestra
  ninguna de las dos cosas

### La vía de ataque se deriva de dónde se suelta al rival

El rival mira la red desde el lado contrario: su zona 4 (su ala izquierda) cae, vista desde
nuestro fondo, a **nuestra derecha**. Es el espejo de cómo se leen las zonas propias.

**E3 — Soltar al rival en el tercio de nuestra derecha del campo contrario fija la vía zona 4**
- Dado: la ficha rival, y el campo contrario dividido en tres tercios laterales
- Cuando: se suelta en el tercio de nuestra derecha, por delante de la línea de ataque rival
- Entonces: la vía de ataque activa pasa a ser zona 4

**E4 — Soltar al rival en el tercio central fija la vía zona 3**
- Dado: la misma pista
- Cuando: se suelta en el tercio central, por delante de la línea de ataque rival
- Entonces: la vía de ataque activa pasa a ser zona 3

**E5 — Soltar al rival en el tercio de nuestra izquierda fija la vía zona 2**
- Dado: la misma pista
- Cuando: se suelta en el tercio de nuestra izquierda, por delante de la línea de ataque rival
- Entonces: la vía de ataque activa pasa a ser zona 2

**E6 — Soltar al rival por detrás de su línea de ataque fija la vía pipe, sea cual sea el lateral**
- Dado: la misma pista
- Cuando: se suelta por detrás de la línea de ataque rival, en cualquier punto lateral
- Entonces: la vía de ataque activa pasa a ser pipe, incluso si el punto queda alineado con el
  tercio de la zona 3

### Navegar entre las cuatro vías de una rotación

Mismo mecanismo que cambiar de rotación (spec 009, E4-E8): cambiar de vía sin cambios pendientes
es directo; con cambios pendientes, pide confirmar antes de descartarlos.

**E7 — Cambiar de vía sin cambios pendientes**
- Dado: la defensa de la vía activa tal y como quedó guardada, sin tocarla desde entonces
- Cuando: se cambia a otra vía de la misma rotación
- Entonces: se cambia directamente, y la pista muestra lo guardado para la vía recién
  seleccionada (vacía si nunca se guardó nada en ella)

**E8 — Cambiar de vía con cambios sin guardar pide confirmar**
- Dado: se ha colocado, movido o quitado algún defensor en la vía activa desde su último guardado
- Cuando: se intenta cambiar a otra vía, o a otra rotación
- Entonces: aparece el mismo aviso de cambios sin guardar que al cambiar de rotación en
  recepción; confirmar descarta y cambia, cancelar mantiene la vía y los cambios tal y como
  estaban

### Quiénes son los seis defensores

**E9 — El roster de cada rotación es el mismo que en recepción**
- Dado: una rotación donde el líbero está en pista (sustituye a un zaguero) en recepción
- Cuando: se coloca esa misma rotación en defensa, para cualquier vía
- Entonces: quien se puede colocar es exactamente el mismo roster de seis — el líbero incluido
  donde le toque, igual que en recepción

### Colocar y guardar, sin validación de posiciones

**E10 — Colocar, mover y quitar un defensor funciona igual que en recepción**
- Dado: un defensor sin colocar en la vía activa
- Cuando: se arrastra hasta un punto del campo propio, se mueve, o se arrastra fuera
- Entonces: se coloca, se traslada o deja de estar colocado, exactamente como en recepción (spec
  009, E9-E11)

**E11 — Ninguna colocación de defensa se marca con falta ni aviso**
- Dado: los seis defensores colocados amontonados en el mismo punto del campo
- Cuando: se mira el estado de la formación
- Entonces: no hay ninguna infracción ni ningún aviso — en defensa no existe la validación de
  posiciones, no es que esté desactivada

**E12 — Guardar exige a los seis defensores, nada más**
- Dado: una vía con menos de seis defensores colocados
- Cuando: se intenta guardar
- Entonces: la acción no está disponible, igual que en recepción — pero solo por el roster
  incompleto, nunca por una falta de posición

**E13 — Guardar una defensa la asocia a su rotación y su vía**
- Dado: una vía con los seis defensores colocados
- Cuando: se guarda
- Entonces: queda asociada a esa rotación y esa vía, y sigue ahí después de recargar la página;
  las otras tres vías de la misma rotación, y las defensas de las demás rotaciones, no se ven
  afectadas

### Vaciar

**E14 — Vaciar la vía activa**
- Dado: una vía con defensores colocados, guardada o no
- Cuando: se vacía
- Entonces: el campo queda sin ningún defensor colocado, sin afectar a otras vías ni rotaciones
  ni a lo ya guardado hasta que se guarde de nuevo; vaciar cuenta como cambio pendiente (E8) si
  la vía tenía algo guardado

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **Una sola ficha rival genérica**, no un banquillo de varios atacantes: la vía de ataque se
  deriva de dónde se suelta, no de qué ficha se elige.
- **Cuatro vías: zona 4, zona 3, zona 2 y pipe.** No las seis zonas del campo rival.
- **La defensa se guarda por rotación y por vía**, no solo por rotación: en R1 puede haber hasta
  cuatro defensas distintas, una por vía.
- **El campo rival se queda en 4 m** (no se amplía a 6 ni a los 9 reales): el pipe se coloca en
  la banda ya dibujada, por detrás de la línea de ataque rival.
- **El espejo de las zonas del rival, confirmado explícitamente**: su zona 4 cae a nuestra
  derecha, su zona 2 a nuestra izquierda. Ver E3-E5.

Resuelto sin devolver la pregunta al usuario, por ser una decisión de continuidad de pantalla y
no una regla de voleibol: **la vía activa no se reinicia al cambiar de rotación** — son dos ejes
independientes, igual que hoy cambiar de sistema si reinicia la rotación (siempre a R1) pero
cambiar de rotación no reinicia nada más. Si al usarlo resulta molesto, se ajusta sin más ceremonia
que un cambio de comportamiento normal, no una corrección de dominio.

## Al cerrar

Los 14 escenarios pasan. Partida: 149 tests (`domain/`, `infrastructure/`, `application/`); al
cerrar, 165. No existe `npm run test:coverage`; no se reporta cobertura numérica, mismo motivo
que en specs anteriores. Verificado también con el servidor de desarrollo y Playwright: las
cuatro vías (con el espejo), el roster compartido con recepción, la ausencia total de
validación, el guardado por rotación y vía, y que sobrevive a recargar la página.

**El orden de implementación no siguió el de los escenarios.** Se construyó de dentro hacia
fuera de la arquitectura en vez de en el orden narrativo de la spec: primero `viaDeAtaque`
(dominio puro, E3-E6, sin ninguna dependencia), después la persistencia de dominio
(`guardarFormacionDefensa`, E9/E11/E12/E13), después `application/` (`viaActiva`,
`seleccionarVia`, E7/E8/E10/E14) y al final `ui/` (E1/E2). Justificación: cada capa solo
depende de la anterior, nunca al revés, así que construirla en ese orden significa que ningún
paso se queda a medias esperando a uno posterior. `docs/flujo-de-trabajo.md` permite reordenar
si se justifica, y esto ya se anunció así en el paso 0 del protocolo antes de tocar código.

**Dos escenarios quedaron cubiertos por construcción, sin cambio de código propio.** E12 (guardar
exige a los seis) y, después, E10 y E14 (colocar/mover/quitar/vaciar) pasaron en verde nada más
escribir su test: el chequeo de roster de `guardarFormacionDefensa` ya rechazaba una formación
incompleta por el mismo camino que E9, y `colocarOMover`/`quitar`/`vaciar` en el store ya eran
agnósticos de tipo de sistema, porque solo tocan `borrador`. Mismo patrón que ya describieron las
specs 009 y 011 sobre este proyecto: una vez el mecanismo general está bien diseñado, los casos
derivados salen solos.

**Dos fallos genuinos aparecieron al generalizar `resultadoValidacion` a "siempre `null` en
defensa" (E11), ninguno cubierto por un test hasta que se buscó a propósito:**

1. `puedeGuardar` en el store leía `resultadoValidacion()?.infracciones.length === 0`, que con
   `resultadoValidacion` en `null` da `undefined === 0` — `false` siempre, así que defensa nunca
   se podía guardar. Se detectó con un test dedicado (021-E12 store) antes de tocar la UI.
2. El botón "Guardar rotación" de `Tablero` no leía `store.puedeGuardar()`: tenía su propio
   `[disabled]="!completo() || !esLegal()"`, con un `esLegal` local que repetía el mismo cálculo
   —y el mismo fallo— que el store. Este no lo cogió ningún test unitario (la plantilla no se
   testea, por diseño, `docs/flujo-de-trabajo.md`): lo encontró la verificación manual con
   Playwright, colocando a los seis y viendo el botón seguir deshabilitado. Se corrigió
   sustituyendo la condición del botón por `!store.puedeGuardar()` directamente y borrando
   `esLegal`, que se quedó sin ningún otro uso. **Lección:** cuando una regla de negocio se
   duplica en dos sitios (el store y una plantilla), solo hace falta que uno de los dos se
   actualice para que queden desincronizados en silencio; el propio duplicado era la causa raíz,
   no solo el olvido puntual.

**Un hueco de persistencia no estaba en el plan original y se encontró también con verificación
manual, no con un test que ya existiera:** `LocalStorageSistemaRepository` no serializaba
`sistema.defensas` en absoluto — cualquier defensa guardada se habría perdido al recargar la
página. Se escribió el test que lo prueba (021-E13, en la spec de infraestructura) *antes* de
arreglarlo, confirmando el rojo, y se subió la versión persistida de 3 a 4 (ADR de versión, mismo
patrón que las subidas anteriores: sin `migrar()` real, una versión antigua se trata como no
legible). El plan de la sesión sí mencionaba la vía canónica sin posición persistida (ahora ADR
0020), pero no mencionaba explícitamente que `defensas` necesitaba su propio cableado de
serialización — se dio por sentado y no lo estaba.

**Decisiones de implementación tomadas sin devolver la pregunta al usuario**, documentadas aquí
por transparencia: el punto canónico exacto de cada vía en el `viewBox` (z2: `(1.5, -1.5)`, z3:
`(4.5, -1.5)`, z4: `(7.5, -1.5)`, pipe: `(4.5, -3.5)`); que el arrastre de la ficha rival se
acota a su propio campo (`x: [0,9]`, `y: [-4,0]`), no a los límites de arrastre de los
jugadores; y que el fantasma de arrastre existente (`.app-tablero__fantasma`) se reutiliza para
la ficha rival con un id centinela (`'__rival__'`) en vez de crear un mecanismo de arrastre
paralelo.

**`docs/dominio.md` se corrigió y amplió**: §3 dejó de decir que el campo rival "no se usa en la
v1" y ganó una subsección nueva ("Vía de ataque") con la tabla del espejo. No hizo falta tocar
ningún invariante de §7: ninguno de los once asumía que un sistema fuera de tipo recepción.

**Lo que no se desvió:** ninguna regla de voleibol de `docs/dominio.md` resultó incorrecta. Las
cuatro respuestas del usuario sobre el espejo de vías, confirmadas antes de escribir el primer
test de `viaDeAtaque`, coincidieron exactamente con lo implementado sin ningún ajuste posterior.
