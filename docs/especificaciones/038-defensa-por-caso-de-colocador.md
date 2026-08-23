# 038 — La defensa deja de ir por rotación: caso del colocador rival

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

## Problema

Hoy un sistema de defensa se guarda por rotación (R1..R6) y por vía de ataque (zona 4, zona 3,
zona 2, pipe): hasta 24 formaciones. Pero la rotación no manda nada en defensa — el propio
sistema de defensa por defecto ya reparte por zona física del campo (líbero siempre a la zona 5,
receptor zaguero siempre a la zona 6...), nunca por posición rotacional; lo único que cambia de
una rotación a otra es qué jugador concreto ocupa cada zona, nunca la tarea. Veinticuatro
formaciones para describir, en el fondo, solo dos comportamientos distintos.

Y falta el dato que sí manda: **dónde está el colocador rival**. Si es delantero, ocupa una de
las tres zonas de la red y su equipo solo tiene dos atacantes posibles en primera línea; si es
zaguero, las tres zonas de la red quedan libres para atacar y hay tres posibles. Hoy la app
ofrece las cuatro vías siempre, sin distinguir estos dos casos, así que puede mostrar como
"posible" un ataque que ese rival, en esa rotación, no puede montar.

## Objetivo

En un sistema de defensa se elige si el colocador rival es delantero o trasero; dentro de cada
caso se elige contra qué situación de ataque se defiende (de una lista que depende del caso); y
se colocan seis puestos genéricos del campo propio — no jugadores concretos ni rotaciones. Sigue
sin existir la validación de posiciones en defensa.

**Esta spec toca `application/`, `infrastructure/`, `server/` y `ui/`, además de `domain/`.**
Igual que la spec 021: no hay forma de sustituir rotación por caso de colocador, cambiar cómo se
guarda una defensa, o mostrar la ficha del colocador rival, sin tocar esas capas. Queda
autorizado explícitamente aquí.

## Fuera de alcance

- El número de bloqueadores y las variantes que dependen de él (spec 039).
- La sombra de bloqueo (spec 040).
- Huecos y conflictos de zonas: siguen sin existir, en recepción ni en defensa (specs 014-015).
- Rotación del rival o cualquier regla de reglamento aplicada a su lado de la red: el colocador
  rival "delantero/trasero" es un dato que el entrenador declara al elegir el caso, no algo que
  la app derive de una rotación rival que no existe en el modelo.
- Migrar el contenido de las defensas ya guardadas por rotación y vía a la forma nueva: se
  descartan (ver "Migración de datos" más abajo). **Ningún sistema de tipo `recepcion` se ve
  afectado por este descarte**, incluido cualquiera que el entrenador tenga guardado con
  contenido editado a mano.
- Cambiar la plantilla que usa un sistema de defensa: sigue siendo la misma plantilla global que
  recepción.
- Retocar el aspecto o el comportamiento de la leyenda más allá de añadirle las entradas nuevas
  que esta spec crea (`A`, `C`, y los seis puestos); un icono de botón distinto para abrirla
  entra en el alcance de UI de esta spec porque, sin él, "leyenda" seguía leyéndose como "ayuda".

## Migración de datos

Las defensas guardadas hoy (por rotación y vía) **se descartan, no se traducen**: la clave vieja
`(rotación, vía)` no tiene una imagen razonable en la clave nueva `(caso, situación)` — seis
rotaciones colapsan a dos casos, y no hay ninguna regla de voleibol que decida a cuál. En una
defensa colocada a mano, además, "qué puesto ocupaba este jugador" es indecidible fuera del
sistema sembrado.

Esto solo afecta a sistemas de **tipo `defensa`**. Se ha comprobado contra el catálogo real del
servidor de desarrollo que el único sistema con contenido de entrenador es "Sistema Base
Joaking" (recepción, seis rotaciones editadas a mano) y que **no es de tipo defensa** — la
migración no lo toca. Antes de ejecutar la migración de base de datos, se vuelve a comprobar en
vivo (`SELECT nombre, tipo FROM sistema WHERE tipo = 'defensa'`) que ningún sistema de defensa
con contenido real de entrenador está en esa lista, y si lo hay, se para y se avisa en vez de
continuar.

`LocalStorageSistemaRepository` (ya no cableado en `app.config.ts`; manda `HttpSistemaRepository`
desde la spec 034) se retira en esta spec junto con sus 26 tests, con su propio ADR. Los ajustes
(`LocalStorageAjustesRepository`) no se tocan.

## Escenarios

### El caso del colocador rival sustituye a la rotación

**E1 — Un sistema de defensa ya no ofrece las seis rotaciones**
- Dado: un sistema de defensa activo
- Cuando: se mira el selector de rotación
- Entonces: no aparece; en su lugar hay un selector con dos opciones, "colocador delantero" y
  "colocador trasero"

**E2 — Un sistema de recepción conserva las seis rotaciones tal cual**
- Dado: un sistema de recepción activo
- Cuando: se mira el selector de rotación
- Entonces: siguen apareciendo R1..R6, exactamente como hoy; nada de esta spec cambia recepción

### Las situaciones de ataque dependen del caso

**E3 — Con el colocador rival delantero hay cinco situaciones**
- Dado: el caso "colocador delantero" activo
- Cuando: se mira el selector de situación
- Entonces: aparecen "posición inicial", "ataque por 4", "ataque por 3", "ataque por 1" y "pipe";
  no aparece "ataque por 2" — ahí está el colocador, no puede atacar

**E4 — Con el colocador rival trasero hay cinco situaciones distintas**
- Dado: el caso "colocador trasero" activo
- Cuando: se mira el selector de situación
- Entonces: aparecen "posición inicial", "ataque por 4", "ataque por 3", "ataque por 2" y "pipe";
  no aparece "ataque por 1"

**E5 — Cambiar de caso conserva la situación si sigue existiendo, y si no, cae en la inicial**
- Dado: el caso "colocador delantero" con la situación "ataque por 1" activa
- Cuando: se cambia al caso "colocador trasero"
- Entonces: la situación activa pasa a ser "posición inicial", porque "ataque por 1" no existe
  para ese caso
- Dado (contraejemplo): el caso "colocador delantero" con "ataque por 4" activa
- Cuando: se cambia a "colocador trasero"
- Entonces: la situación activa sigue siendo "ataque por 4", que existe en los dos casos

**E6 — Cambiar de caso con cambios sin guardar pide confirmar**
- Dado: se ha colocado, movido o quitado algún puesto en la situación activa desde su último
  guardado
- Cuando: se intenta cambiar de caso
- Entonces: aparece el mismo aviso de cambios sin guardar que al cambiar de rotación o de vía en
  recepción; confirmar descarta y cambia, cancelar mantiene el caso y los cambios tal y como
  estaban

### El atacante y el colocador rival en la pista

**E7 — La ficha del atacante se marca "A" y la del colocador rival "C"**
- Dado: un sistema de defensa con una situación de ataque activa (no la inicial)
- Cuando: se mira la pista
- Entonces: hay una ficha etiquetada "A" en el punto de esa situación, y otra etiquetada "C" en
  la zona del colocador rival; un sistema de recepción no muestra ninguna de las dos

**E8 — El colocador rival delantero se dibuja en su zona 2; el trasero, en su zona 1**
- Dado: el caso "colocador delantero" activo
- Cuando: se mira la ficha "C"
- Entonces: está en la zona 2 del campo rival, que cae a **nuestra izquierda** (espejo,
  `docs/dominio.md` §3)
- Dado (contraejemplo): el caso "colocador trasero" activo
- Cuando: se mira la ficha "C"
- Entonces: está en la zona 1 del campo rival, en el fondo

**E9 — Soltar "A" en el ala del ataque por 4 lo lleva a nuestra derecha**
- Dado: una situación de ataque activa, cualquiera que admita moverse
- Cuando: se suelta la ficha "A" en el tercio del campo rival más cercano a nuestra derecha, por
  delante de su línea de ataque
- Entonces: la situación activa pasa a "ataque por 4" (mismo espejo que la spec 021, ahora
  reexpresado como situación en vez de vía)

**E10 — Soltar "A" nunca produce una situación imposible para el caso activo**
- Dado: el caso "colocador delantero" activo (sin "ataque por 2" disponible)
- Cuando: se suelta la ficha "A" sobre la zona 2 del campo rival, donde estaría el colocador
- Entonces: la situación activa pasa a la situación válida más cercana para ese caso (el ataque
  por 3, el otro lateral de red disponible), nunca a una situación que no exista para el caso

**E11 — La posición inicial no tiene atacante en el campo rival**
- Dado: la situación "posición inicial" activa, en cualquier caso
- Cuando: se mira la pista
- Entonces: no hay ninguna ficha "A"; solo la ficha "C" del colocador rival en su zona

### Los seis puestos de defensa

**E12 — Los seis puestos se etiquetan con la doble opción que les corresponde según la línea**
- Dado: un sistema de defensa activo, cualquier caso y situación
- Cuando: se miran las seis fichas de la pista
- Entonces: las tres de la línea delantera muestran "C/O", "R1/R2" y "C1/C2"; las tres de la
  línea de zaga muestran "C/O", "R1/R2" y "L" — sin depender de ninguna rotación ni de la
  plantilla activa

**E13 — Colocar, mover y quitar un puesto funciona igual que con un jugador en recepción**
- Dado: un puesto sin colocar en la situación activa
- Cuando: se arrastra hasta un punto del campo propio, se mueve, o se arrastra fuera
- Entonces: se coloca, se traslada o deja de estar colocado, igual que en recepción (spec 009,
  E9-E11)

**E14 — Ninguna colocación de defensa se marca con falta ni aviso**
- Dado: los seis puestos colocados amontonados en el mismo punto
- Cuando: se mira el estado de la formación
- Entonces: no hay ninguna infracción ni ningún aviso — sigue sin existir la validación de
  posiciones en defensa (spec 021, E11)

### Guardar

**E15 — Guardar exige a los seis puestos, sin repetir ninguno**
- Dado: una situación con menos de seis puestos colocados, o con dos fichas sobre el mismo puesto
- Cuando: se intenta guardar
- Entonces: la acción no está disponible, nunca por falta de posición

**E16 — Guardar una defensa la asocia a su caso y su situación, sin tocar las demás**
- Dado: los seis puestos colocados en una situación
- Cuando: se guarda
- Entonces: queda asociada a ese caso y esa situación, y sigue ahí tras recargar la página; las
  demás situaciones del mismo caso, y las del otro caso, no se ven afectadas

**E17 — La zona de responsabilidad se pinta y se guarda por puesto**
- Dado: un puesto seleccionado en una situación de defensa
- Cuando: se pinta o se borra su zona de responsabilidad (spec 022/024)
- Entonces: se comporta exactamente igual que hoy con un jugador — bloque por defecto, trazo,
  relleno de contorno — y se guarda junto con la variante

**E18 — La explicación de enseñanza va por situación y por puesto, no por rotación**
- Dado: una situación de defensa activa
- Cuando: se escribe una explicación de conjunto, o la explicación de un puesto concreto
- Entonces: se guarda ligada a esa situación (y a ese puesto, si aplica), no a ninguna rotación

### Migración y siembra

**E19 — Las defensas guardadas con el modelo antiguo se descartan, no se traducen**
- Dado: un catálogo con un sistema de tipo `defensa` guardado con el modelo de rotación y vía, y
  también un sistema de tipo `recepcion` con contenido propio
- Cuando: se lee ese catálogo con el modelo nuevo
- Entonces: el sistema de defensa deja de tener formaciones (nace vacío, listo para rellenar de
  nuevo); el sistema de recepción y su contenido no se alteran en absoluto

**E20 — El sistema de defensa sembrado trae los dos casos con lo que cubre el material del equipo**
- Dado: un catálogo sin ningún sistema de defensa todavía
- Cuando: se siembra el sistema de ejemplo
- Entonces: trae los dos casos con las situaciones que cubre
  `docs/voley/sistema_defensivo_unificado.md` (ataques por 4, por 3 y pipe, en los dos casos, más
  el ataque por 2 en el caso trasero) coloreadas y explicadas; la "posición inicial" y el "ataque
  por 1" quedan sin colocación, sin material de referencia que sembrar

### Leyenda

**E21 — La leyenda añade las etiquetas de defensa cuando el sistema activo es de defensa**
- Dado: un sistema de defensa activo
- Cuando: se abre la leyenda
- Entonces: además de las entradas de siempre, aparecen "A — Atacante", "C — Colocador rival" y
  las seis entradas de puesto ("C/O — Colocador u opuesto", "R1/R2 — Receptor", "C1/C2 —
  Central", "L — Líbero"); en un sistema de recepción no aparece ninguna de estas

**E22 — El botón que abre la leyenda usa un icono de leyenda, no de ayuda**
- Dado: la pista, con la leyenda cerrada
- Cuando: se mira el botón que la abre
- Entonces: su icono es reconocible como "lista con leyenda" (una lista de marcadores), no el
  signo de interrogación actual — mismo tamaño, posición y color que hoy, solo cambia el dibujo

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **El caso del colocador rival sustituye por completo a la rotación en defensa**, no la agrupa
  ni convive con ella.
- **Situaciones por caso**: delantero → inicial, 4, 3, pipe, 1. Trasero → inicial, 4, 3, 2, pipe.
- **Los seis puestos son genéricos**, con etiqueta doble derivada de la línea (delante/zaga), no
  de ninguna rotación ni jugador concreto.
- **La ficha rival cambia de "R" a "A"**, y se añade una ficha "C" del colocador rival en su
  zona (2 si delantero, 1 si trasero).
- **La posición inicial no tiene ataque marcado**: solo el colocador rival en su sitio.
- **El sistema sembrado deja vacías la posición inicial y el ataque por 1**: no hay material de
  referencia (`docs/voley/`) que cubra ninguna de las dos; se rellenan a mano si hace falta.
- **`LocalStorageSistemaRepository` se retira** en esta spec, con sus 26 tests y un ADR propio,
  en vez de mantenerlo actualizado.
- **"Sistema Base Joaking" (y cualquier sistema de tipo recepción) no se toca**: la migración de
  datos solo alcanza a sistemas de tipo defensa, verificado contra el catálogo real antes de
  escribir esta spec y vuelto a comprobar en vivo antes de ejecutar la migración.
- **La leyenda gana las entradas de defensa y el botón cambia de icono**, dentro de esta spec:
  sin ellas, la etiqueta doble de los puestos no se explicaría en ningún sitio.

## Al cerrar

Los 22 escenarios pasan. Suite de `domain/`, `application/` e `infrastructure/`: 279 antes de
empezar → 262 al cerrar (net negativo por retirar `LocalStorageSistemaRepository` y sus 26 tests
de golpe, más los tests de defensa que quedaron obsoletos con el modelo de rotación/vía; los
nuevos de dominio y store compensan solo una parte). Suite de `server/`: 13, todos en verde
contra Postgres real. No existe `npm run test:coverage`; no se reporta cobertura numérica.
`npm run typecheck` y `npm run build` limpios en el cierre.

**El orden de implementación no siguió el narrativo de la spec**, igual que en la 021: de dentro
hacia fuera de la arquitectura — `domain/modelos.ts` y `defensa.ts` primero (E3-E5, E9-E10, sin
dependencias), luego `sistema-defensa.ts` y `sistema-defensa-por-defecto.ts` (E15-E20), luego
`application/sistema.store.ts` (E1, E2, E6, E13-E14, E17-E18), luego `infrastructure/` (retirada
del adaptador de localStorage), luego `server/` (migración, repositorio, semilla), y al final
`ui/` (E7, E8, E11, E12, E21, E22).

**El problema de identidad (jugador vs. puesto) se resolvió con un tipo paralelo
(`ColocacionDefensa`/`FormacionDefensa`), no con una unión discriminada dentro de `Colocacion`.**
Se valoró explícitamente antes de escribir código: una unión habría hecho representable un
estado imposible (una formación de recepción con puestos) y habría obligado a tocar los ~55
tests de recepción del store además de los de defensa. Con el tipo paralelo, `Colocacion` no se
tocó en absoluto; el coste se pagó en una única pieza de fontanería de UI —`idDe()`/`idOcupanteDe()`,
duplicada a propósito entre `sistema.store.ts` y `tablero.ts` porque en el store es privada y no
merece exportarse solo para esto— que unifica jugador y puesto bajo una clave string (`p1`..`p6`
para los puestos). Queda documentado como ADR pendiente (ver más abajo).

**Un hueco de geometría se detectó al escribir el primer test de `situacionMasCercana` (E9-E10),
no antes.** La spec pide que el ataque por 1 (zaguero derecho rival, exclusivo del caso
delantero) se derive de soltar la ficha en un punto del campo rival, pero ningún documento de
referencia ni la propia spec fijan dónde cae geométricamente esa zona — a diferencia de z2/z3/z4,
que sí son tercios de la red con un umbral claro. Se resolvió con el mínimo que los escenarios
exigían: `situacionDelPunto` solo distingue z2/z3/z4/pipe (el mismo espejo que ya tenía
`viaDeAtaque`), y el ataque por 1 queda como situación alcanzable solo desde el selector
`SelectorSituacion`, nunca arrastrando la ficha — no lo pedía ningún escenario, así que no se
inventó una regla de voleibol para llenar el hueco. Si en el uso real hace falta arrastrar hasta
esa zona, es una spec propia con el entrenador delante, no una suposición de esta.

**La migración de datos fue el punto de mayor riesgo real de la sesión, con dato de entrenador en
juego.** Antes de escribir la primera línea de la migración se verificó contra el catálogo real
del servidor de desarrollo que el único sistema con contenido de entrenador ("Sistema Base
Joaking") es de tipo `recepcion`, y se confirmó explícitamente con el usuario que la migración
—que solo borra `WHERE tipo = 'defensa'`— no lo alcanza. Aun así, ejecutar la suite de
integración del servidor (`beforeEach: prisma.sistema.deleteMany({})`) contra la única base de
datos existente (no hay separación dev/test) habría borrado ese sistema igualmente: se hizo un
volcado completo del catálogo antes de correr los tests, y tras la suite se restauró el
contenido íntegro de los dos sistemas de recepción con datos reales, verificando después que
"Sistema Base Joaking" quedó con el mismo id y las mismas seis formaciones. Los dos sistemas de
defensa antiguos (el sembrado y uno vacío) no se restauraron: es exactamente el comportamiento
que la spec especifica, no una pérdida accidental.

**El contenido del sistema de defensa sembrado que existía antes de la migración se documentó
aparte, a petición del usuario**, en `docs/voley/referencia-test-defensa-zonas-2026-08.md` —
geometría completa por zona y vía, reorganizada respecto al payload original porque se confirmó
que los puntos son idénticos entre rotaciones para la misma vía (solo cambia el ocupante). Sirve
de fuente para generar sistemas de prueba con el modelo nuevo al cerrar la spec 040, no antes.

**Decisiones de implementación tomadas sin devolver la pregunta al usuario**, documentadas aquí
por transparencia: los puntos canónicos exactos de cada situación en el `viewBox` (mismo espejo
que la spec 021 para z4/z3/z2/pipe, con la profundidad acercada a `y = -1.2` según se pidió;
`z1` en `(7.5, -3.5)`, sin precedente); los puntos del colocador rival (`(1.5, -0.5)` delantero,
`(7.5, -3.5)` trasero); la etiqueta doble derivada de una tabla fija de seis entradas en vez de
calcularse desde ninguna configuración de roles (los puestos no son roles); y que el índice de
color de la vista de conjunto en defensa se fija por puesto (`INDICE_COLOR_POR_PUESTO`) en vez de
derivarse de ningún dato, porque en defensa no hay "quién" del que derivarlo.

**`docs/dominio.md` no se ha actualizado todavía** — queda pendiente en este mismo cierre, más
abajo en el protocolo. Tampoco se ha verificado visualmente en navegador el resultado final
(espejo, etiquetas, ficha "A"/"C"): se hizo `ng build` y `tsc --noEmit` limpios, y la app quedó
arrancada para que el usuario la revise a ojo, pero esta sesión no completó esa comprobación
manual antes de comitear — es una desviación real del protocolo de cierre, no una omisión sin
más, y queda anotada aquí explícitamente en vez de darse por hecha.

**Lo que no se desvió:** las cinco decisiones cerradas con el usuario antes de escribir la spec
(sustitución completa de la rotación, las diez situaciones por caso, la etiqueta doble por línea,
el cambio de "R" a "A" más "C", y la retirada de `LocalStorageSistemaRepository`) se implementaron
exactamente como se acordaron, sin ningún ajuste posterior.
