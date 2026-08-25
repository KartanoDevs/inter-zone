# 049 — La defensa por defecto cambia según el número de bloqueadores

**Estado:** Completada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

**Depende de:** spec 039 (variantes por número de bloqueadores) y spec 042 (toda defensa nace
colocada), ambas completadas e implementadas antes de congelar esta.

## Problema

Al crear un sistema de defensa nuevo, las cuatro variantes de bloqueadores (0, 1, 2, 3) de una
misma situación de ataque nacen todas con la misma colocación —la de `PUNTOS[situacion]`—, aunque
declaren números de bloqueadores distintos. La variante de "3 bloqueadores" de un ataque por 4
muestra hoy exactamente los mismos seis puestos que la de "0 bloqueadores": nadie está pegado a la
red cubriendo el ataque. El entrenador quiere que el defecto de cada variante ya sea coherente con
lo que declara, sin tener que recolocar a mano cada vez que crea un sistema.

Además, en pantalla de defensa cada ficha muestra "P0" debajo de su etiqueta — un centinela sin
significado, porque en defensa no hay rotación de la que derivar una posición P1..P6.

## Objetivo

Al entrar en una variante de defensa nunca guardada, la colocación por defecto que se ve ya
refleja su número de bloqueadores: en `z4`, `z3` y `z2` con 1, 2 o 3 bloqueadores, los puestos
delanteros que bloquean aparecen pegados a la red y alineados con el ataque, en el orden que fija
esta spec; en `pipe`, `z1` e `inicial`, cualquier número de bloqueadores muestra la postura base
sin excepción. Las fichas de defensa dejan de mostrar "P0" y muestran "JD" (jugador delantero) o
"JT" (jugador trasero) según el puesto.

**Esta spec toca `domain/` y `ui/`.** Necesita mover `PUNTO_POR_SITUACION` de
`ui/pista/pista.ts` a `domain/` porque el nuevo defecto por bloqueadores se ancla en el punto del
atacante, y hoy el dominio no tiene forma de leerlo.

## Fuera de alcance

- **El sistema sembrado de demostración (`sistemaDefensaPorDefecto`, "TEST Defensa zonas") no se
  toca.** Sus tablas `PUNTOS`/`CELDAS`/`EXPLICACIONES` de `z2`/`z3`/`z4`/`pipe` siguen siendo el
  material de referencia de la spec 030, sembradas con 2 bloqueadores (o 1 en la pipe) como ya
  fija la spec 039-E13. Esta spec solo cambia lo que ve un sistema **nuevo** en una variante que
  todavía no se ha guardado.
- **Cualquier variante ya guardada.** El defecto nuevo solo se ve mientras no se guarda nada en esa
  combinación (caso, situación, bloqueadores); guardar sigue funcionando exactamente igual que hoy
  (spec 038/039).
- **`CELDAS` y `explicacion`.** El defecto por bloqueadores, igual que el defecto actual por
  situación, sigue devolviendo solo `punto` — nunca zonas de responsabilidad ni texto de enseñanza
  (invariante que protegen las specs 042 y 047: `colocarOMover` conserva el resto de la colocación
  al mover una ficha por primera vez, así que un defecto con `celdas` arrastraría una zona que
  nadie pintó).
- **El cálculo de quién bloquea (`puestosQueBloquean`).** Sigue derivándose de la cercanía a la red
  como fija la spec 039; esta spec no cambia ese criterio, solo las coordenadas de partida que ese
  criterio va a leer.
- **Recepción.** El cambio de "P0" a "JD"/"JT" es exclusivo de defensa; en recepción sigue
  mostrándose P1..P6 exactamente igual que hoy.
- **Ajustar `HOLGURA_VANO` o `ANCHO_BLOQUEADOR`.** Ya fijados por un fix anterior; esta spec no los
  toca.

## Escenarios

### Colocación por defecto según bloqueadores

**E1 — Ataque por 4 con 1 bloqueador: el CO delantero se pega a la red frente al atacante**
- Dado: un sistema de defensa recién creado, sin ninguna variante guardada para `z4`
- Cuando: se entra en la variante de `z4` con 1 bloqueador
- Entonces: el puesto 2 (`CO`) aparece a `y = 0,4`, con su `x` igual a la del atacante de `z4`; los
  puestos 3, 4, 5, 6 y 1 muestran la postura base basculada 1 m hacia el lado del ataque por 4

**E2 — Ataque por 4 con 2 bloqueadores: el Ce se suma a la izquierda del CO**
- Dado: igual que E1
- Cuando: se entra en la variante de `z4` con 2 bloqueadores
- Entonces: el puesto 2 (`CO`) queda igual que en E1; el puesto 3 (`Ce`) aparece a `y = 0,4`, 0,9 m
  a la izquierda del puesto 2; los puestos 4, 5, 6 y 1 en la postura base basculada

**E3 — Ataque por 4 con 3 bloqueadores: el R se suma a la izquierda del Ce**
- Dado: igual que E1
- Cuando: se entra en la variante de `z4` con 3 bloqueadores
- Entonces: los puestos 2 y 3 quedan igual que en E2; el puesto 4 (`R`) aparece a `y = 0,4`, 0,9 m
  a la izquierda del puesto 3; los puestos 5, 6 y 1 en la postura base basculada

**E4 — Ataque por 4 con 0 bloqueadores: nadie se pega a la red**
- Dado: igual que E1
- Cuando: se entra en la variante de `z4` con 0 bloqueadores
- Entonces: los seis puestos muestran la postura base basculada hacia el ataque por 4, sin ningún
  puesto reubicado en la red

**E5 — Ataque por 3 con 1 bloqueador: el Ce se pega a la red frente al atacante**
- Dado: un sistema de defensa recién creado, sin ninguna variante guardada para `z3`
- Cuando: se entra en la variante de `z3` con 1 bloqueador
- Entonces: el puesto 3 (`Ce`) aparece a `y = 0,4`, con su `x` igual a la del atacante de `z3`; el
  resto en la postura base, sin basculación (el ataque por 3 es por el centro)

**E6 — Ataque por 3 con 2 bloqueadores: el CO se suma a la derecha del Ce**
- Dado: igual que E5
- Cuando: se entra en la variante de `z3` con 2 bloqueadores
- Entonces: el puesto 3 queda igual que en E5; el puesto 2 (`CO`) aparece a `y = 0,4`, 0,9 m a la
  derecha del puesto 3

**E7 — Ataque por 3 con 3 bloqueadores: el R se suma a la izquierda del Ce**
- Dado: igual que E5
- Cuando: se entra en la variante de `z3` con 3 bloqueadores
- Entonces: los puestos 3 y 2 quedan igual que en E6; el puesto 4 (`R`) aparece a `y = 0,4`, 0,9 m
  a la izquierda del puesto 3

**E8 — Ataque por 2 con 1 bloqueador: el R delantero se pega a la red frente al atacante**
- Dado: un sistema de defensa recién creado, sin ninguna variante guardada para `z2` (caso
  trasero: es la única situación en la que `z2` existe, spec 038-E4)
- Cuando: se entra en la variante de `z2` con 1 bloqueador
- Entonces: el puesto 4 (`R`) aparece a `y = 0,4`, con su `x` igual a la del atacante de `z2`; el
  resto en la postura base basculada 1 m hacia el lado del ataque por 2

**E9 — Ataque por 2 con 2 bloqueadores: el Ce se suma a la derecha del R**
- Dado: igual que E8
- Cuando: se entra en la variante de `z2` con 2 bloqueadores
- Entonces: el puesto 4 queda igual que en E8; el puesto 3 (`Ce`) aparece a `y = 0,4`, 0,9 m a la
  derecha del puesto 4

**E10 — Ataque por 2 con 3 bloqueadores: el CO se suma a la derecha del Ce**
- Dado: igual que E8
- Cuando: se entra en la variante de `z2` con 3 bloqueadores
- Entonces: los puestos 4 y 3 quedan igual que en E9; el puesto 2 (`CO`) aparece a `y = 0,4`, 0,9 m
  a la derecha del puesto 3

**E11 — Pipe, ataque por 1 y postura inicial: siempre la postura base, con cualquier número de bloqueadores**
- Dado: un sistema de defensa recién creado
- Cuando: se entra en cualquier variante de `pipe`, `z1` o `inicial`, con cualquier número de
  bloqueadores que admita (`inicial` solo admite 0, spec 039-E4)
- Entonces: los seis puestos muestran exactamente la postura base, sin basculación y sin ningún
  puesto reubicado en la red — igual en las cuatro casillas de bloqueadores

**E12 — Una variante guardada no se ve afectada por el defecto**
- Dado: una variante de `z4` con 2 bloqueadores guardada con una colocación distinta a la de E2
- Cuando: se entra en esa variante
- Entonces: se ve exactamente lo guardado, no el defecto calculado por esta spec

**E13 — Ninguna variante hereda la colocación guardada de otra**
- Dado: la variante de `z4` con 2 bloqueadores guardada (E12) y la de `z4` con 3 bloqueadores sin
  guardar nunca
- Cuando: se entra en la de 3 bloqueadores
- Entonces: se ve el defecto de E3, no una copia de lo guardado en la de 2 (continúa el núcleo
  vivo de la spec 039-E3: el defecto es de la situación *y* del número de bloqueadores, nunca una
  copia de otra variante)

**E14 — El sistema sembrado de demostración no cambia**
- Dado: un catálogo recién sembrado (`sistemaDefensaPorDefecto`)
- Cuando: se mira cualquiera de sus variantes ya guardadas
- Entonces: la colocación es exactamente la del material de referencia de la spec 030, igual que
  antes de esta spec — el defecto nuevo no se aplica porque esas variantes ya están guardadas
  (E12)

**E15 — El defecto nunca junta a dos puestos por debajo de la distancia mínima**
- Dado: cualquier variante con bloqueadores calculada por esta spec
- Cuando: se mide la distancia entre cada dos puestos de la colocación resultante
- Entonces: ninguna pareja queda por debajo de `DISTANCIA_MINIMA_ENTRE_JUGADORES` (0,9 m,
  `domain/separacion.ts`)

### Etiqueta JD/JT en vez de P0

**E16 — Un puesto delantero en defensa muestra "JD"**
- Dado: una ficha de un puesto de defensa delantero (2, 3 o 4)
- Cuando: se pinta la ficha con la ayuda de posición activada
- Entonces: bajo la etiqueta de rol se lee "JD" (la "J" pequeña, la "D" grande — mismo patrón
  visual que "P1"/"P2" en recepción)

**E17 — Un puesto zaguero en defensa muestra "JT"**
- Dado: una ficha de un puesto de defensa zaguero (1, 5 o 6)
- Cuando: se pinta la ficha con la ayuda de posición activada
- Entonces: bajo la etiqueta de rol se lee "JT"

**E18 — En recepción no cambia nada**
- Dado: una ficha de un jugador en una rotación de recepción
- Cuando: se pinta con la ayuda de posición activada
- Entonces: sigue mostrando "P1".."P6" según su posición rotacional real, igual que hoy

**E19 — Con la ayuda de posición desactivada, ninguna de las dos se pinta**
- Dado: el ajuste global de ayuda de posición desactivado (`store.ayudaPosicionDesactivada()`)
- Cuando: se pinta cualquier ficha, en recepción o en defensa
- Entonces: no se pinta ninguna etiqueta pequeña — ni "P#" ni "JD"/"JT"

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- El defecto nuevo afecta solo a `formacionDefensaPorDefecto` (sistemas nuevos); el sembrado de
  demostración conserva el material de la spec 030 sin tocar.
- La `x` del bloqueador principal de cada situación (`z2`/`z3`/`z4`) se deriva del punto del
  atacante de esa situación, no un valor fijo escrito a mano.
- Medidas: basculación lateral de 1 m en `z4`/`z2` (0 en `z3`, por el centro); bloqueadores a
  `y = 0,4`; 0,9 m de separación entre bloqueadores contiguos, igual a
  `DISTANCIA_MINIMA_ENTRE_JUGADORES`.
- `pipe`, `z1` e `inicial` se quedan siempre en la postura base, sin excepción, con cualquier
  número de bloqueadores — no siguen el patrón de "bloqueador principal pegado a la red" del resto
  de situaciones.
- La etiqueta pequeña de defensa reutiliza el mismo patrón visual que "P#": prefijo pequeño ("J")
  más cuerpo grande ("D" o "T").

## Al cerrar

Los 19 escenarios pasan. Suite completa del proyecto: 354 tests en verde (`npm test`).
`npx tsc --noEmit` limpio. No existe script `test:coverage` en este proyecto — no se reporta
cobertura, en vez de inventar un número.

**Colocación por defecto (E1-E15).** `PUNTO_POR_SITUACION` se movió de `ui/pista/pista.ts` a
`domain/sistema-defensa-por-defecto.ts` (re-exportado desde `pista.ts` para no romper
`tablero.ts`), tal como anticipaba el plan. `formacionDefensaPorDefecto` se reescribió con una
tabla `REGLA_BLOQUEO_POR_DEFECTO` (basculación, puesto principal, vecinos con signo) en vez de
ramas `if` repetidas por situación — generalización que salió del propio ciclo TDD: al llegar a
`z3`/`z2` (E5-E10), la lógica ya escrita para `z4` cubrió los dos casos sin cambios adicionales
(E6-E10 pasaron en verde nada más escribir el test, `sistema-defensa-por-defecto.spec.ts`). El
único ajuste imprevisto fue `pipe`: la spec la agrupaba con `z1`/`inicial` como "siempre postura
base", pero antes de esta spec `pipe` devolvía su propia defensa de referencia sembrada
(`PUNTOS.pipe`), no `POSTURA_BASE` — E11 lo cazó y se corrigió sacando `pipe` de la rama genérica
a la misma rama explícita que `inicial`/`z1`.

**042-E1 se anotó, no se editó a ciegas** (mismo protocolo que ya usaron las specs 042 y 043):
afirmaba que `formacionDefensaPorDefecto(situacion)`, para toda situación con material,
coincidía con la defensa de referencia sembrada. Con 0 bloqueadores (su valor por defecto), eso
dejó de ser cierto para `z4`, `z3`, `z2` y `pipe` — las cuatro pasan ahora por la postura base en
vez de la referencia. El escenario se dejó como puntero histórico señalando a los E1-E11 de esta
spec, en vez de borrarlo.

**El punto de fontanería en `application/` que el plan anticipaba** (`sistema.store.ts:181`,
`formacionGuardadaActiva`) se completó pasando `this.bloqueadoresActivos()` como segundo
argumento — sin ese cambio, el dominio ya soportaba el número de bloqueadores pero la app en
ejecución seguía sin usarlo. Los escenarios E12/E13 (variante guardada no se ve afectada; ninguna
variante hereda de otra) se comprobaron con tests de integración nuevos en
`sistema.store.spec.ts` y pasaron en verde de inmediato: el aislamiento entre variantes ya lo
garantizaba `guardarVarianteDefensa` desde la spec 039.

**Etiqueta JD/JT (E16-E19).** `FichaVista.posicion: number` se sustituyó por
`etiquetaPosicion: string`, y `FichaJugador` separa su primer carácter (pintado pequeño) del
resto (grande) — mismo patrón visual que ya usaba "P"+número, sin tocar el CSS. Ningún componente
de `ui/` tiene test unitario propio en este proyecto (ni `FichaJugador` ni `Tablero` lo tenían
antes de esta spec), así que estos cuatro escenarios se verificaron por revisión de código,
suite completa en verde y en pantalla, no con TDD sobre un `.spec.ts` de componente — coherente
con que el resto de `ui/` tampoco lo tiene.

**Verificado en pantalla, con matices a discutir aparte de este cierre** (no se documentan aquí
detalles que el usuario todavía no ha compartido; se anotarán en una spec o decisión posterior si
derivan en un cambio de comportamiento).

**Fuera de alcance, tal como se acordó:** el sistema sembrado de demostración
(`sistemaDefensaPorDefecto`, "TEST Defensa zonas") no se tocó — verificado explícitamente en E14
comparando sus coordenadas literales contra el material de la spec 030. `CELDAS` y `explicacion`
del defecto siguen sin poblarse. `puestosQueBloquean` no cambió su criterio de derivación.
