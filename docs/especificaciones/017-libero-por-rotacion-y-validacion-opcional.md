# 017 — El líbero se declara rotación a rotación, y la validación se puede desactivar

**Estado:** Completada
**Paso de la hoja de ruta:** 3 (corrección de la spec 011, descubierta al usar la pizarra en la
práctica; ver nota en `README.md` sobre por qué esta spec no es la 012)

## Problema

Tres fricciones aparecen al usar la pizarra con un equipo real de 5-1:

Primera: el líbero de la spec 011 sustituye siempre al **mismo** titular en las seis rotaciones.
En un partido real el líbero entra cada vez que un jugador de zaga necesita salir, y eso puede
ser un central distinto según la rotación — con el modelo actual, el líbero solo juega en tres de
las seis rotaciones (las que le tocan a ese único titular en zaga) y en las otras tres juega el
titular, cuando en la pista real el líbero jugaría las seis.

Segunda: la etiqueta que hoy lleva cada central no coincide con lo que espera el entrenador. El
índice se asigna recorriendo el orden de saque desde el colocador (`P1→P2→P3→P4→P5→P6`), pero
`docs/dominio.md` §2 dice literalmente que el recorrido es "en sentido de rotación" — que es
`P1→P6→P5→P4→P3→P2`, el sentido contrario. El código no sigue su propia documentación, y el
resultado es que hoy `C1` es el central que juega delantero en R1 y zaguero en R3/R4/R5, cuando
para el entrenador `C1` (el central "cercano") debería ser el que arranca en zaga en R1.

Tercera: no hay forma de guardar una formación con falta posicional a propósito — por ejemplo
para enseñar con la pizarra qué aspecto tiene un error, o para anotar una formación de una jugada
real que no respetó la regla.

## Objetivo

El líbero puede sustituir a un titular distinto en cada una de las seis rotaciones, y su defecto
(el central que esté en zaga en cada rotación) hace que juegue las seis. Las etiquetas de central
y receptor cuentan el índice en el mismo sentido en que gira la rotación, tal como ya decía
`docs/dominio.md`. Y la validación de posiciones se puede desactivar para guardar cualquier
formación completa, con o sin falta.

## Fuera de alcance

- Todo lo que ya excluía la spec 011: cuándo se puede hacer el cambio de líbero en pista durante
  el punto, el límite de un cambio por punto, un segundo líbero. Ninguna de esas reglas afecta a
  la formación en el momento del saque.
- Esta spec **sustituye** una decisión de la 011: allí se dijo explícitamente que a quién
  sustituye el líbero "se elige al crear o editar la plantilla, no rotación a rotación". Aquí se
  invierte a propósito: el sustituto se declara por rotación. No es un error de la 011 — era la
  decisión correcta con la información de entonces — se anota el cambio en "Al cerrar".
- Desactivar la validación no toca la comprobación de que los seis colocados son exactamente
  quienes están en pista en esa rotación (el roster). Esa comprobación **nunca** se desactiva:
  seguiría sin tener sentido guardar una formación con un jugador que no juega esa rotación.
- Nada de `ui/`: el checkbox de validación, el popup de ajustes, el selector "líbero sustituye a"
  en pantalla y su orden de opciones son trabajo aparte, sin spec, porque no cambian ninguna regla
  del dominio.
- **Esta spec sí autoriza tocar `application/` e `infrastructure/`.** La forma persistida de un
  sistema cambia: `sustitutoLibero` deja de ser una cadena única y pasa a ser un valor por
  rotación. Hace falta subir la versión del esquema persistido, igual que hizo la spec 011, y
  añadir un repositorio pequeño para el ajuste nuevo de validación (que es global a la app, no de
  cada sistema).

## Escenarios

### Convención del índice de rol

**E1 — El índice se cuenta en el sentido en que gira la rotación**
- Dado: un orden de saque válido con dos jugadores del mismo rol (por ejemplo los dos centrales)
- Cuando: se asignan los índices
- Entonces: lleva el índice 1 el primero de ese rol al recorrer las posiciones en el orden
  `P1, P6, P5, P4, P3, P2` desde el colocador — el mismo sentido en que avanza la rotación
  (`P2→P1→P6→P5→P4→P3→P2`); el otro lleva el 2

**E2 — Con la plantilla típica del 5-1, C1 es el central que arranca en zaga**
- Dado: la plantilla global, con el colocador en P1 en R1
- Cuando: se consulta la etiqueta del central que ocupa P6 (zaga) y la del que ocupa P3
  (delantera) en R1
- Entonces: el central de P6 es `C1` y el central de P3 es `C2`

**E3 — El índice es del jugador, no de la casilla: rotar no lo cambia**
- Dado: un jugador con índice ya asignado
- Cuando: se calcula su etiqueta en cada una de las seis rotaciones
- Entonces: su etiqueta (letra + índice) es la misma en todas — la etiqueta sigue siendo derivada
  y estable; el cambio de sentido del recorrido no rompe ese invariante

### Sustituto del líbero por rotación

**E4 — El defecto, rotación a rotación, es el central que cae en zaga en esa rotación**
- Dado: una plantilla con líbero, sin sustitutos declarados explícitamente (el caso de la
  pantalla de creación)
- Cuando: se deriva el sustituto por defecto para cada una de las seis rotaciones
- Entonces: en cada rotación el sustituto por defecto es el central que en esa rotación ocupa
  P1, P5 o P6

**E5 — Con el defecto, el líbero juega las seis rotaciones**
- Dado: una plantilla con líbero y el sustituto por defecto en las seis rotaciones (E4)
- Cuando: se recorren las seis rotaciones
- Entonces: el líbero está en pista en las seis — a diferencia de la spec 011, donde con un único
  sustituto para todas las rotaciones el líbero solo jugaba en tres

**E6 — Elegir "ninguno" en una rotación deja jugando a los seis titulares en esa rotación**
- Dado: una plantilla con líbero
- Cuando: se declara que en una rotación concreta el líbero no sustituye a nadie
- Entonces: en esa rotación juegan los seis titulares y el líbero no entra; las demás rotaciones
  no se ven afectadas

**E7 — Elegir un titular que en esa rotación juega de delantero no mete al líbero en pista**
- Dado: una plantilla con líbero
- Cuando: se declara que en una rotación concreta sustituye a un titular que en esa rotación
  ocupa P2, P3 o P4
- Entonces: la elección se acepta, pero en esa rotación juega el titular, no el líbero — igual
  que en la spec 011, entrar depende de en qué línea cae el sustituido, no de la elección en sí

**E8 — Cambiar el sustituto de una rotación solo toca la formación guardada de esa rotación**
- Dado: un sistema con formaciones guardadas en varias rotaciones donde juega el líbero
- Cuando: se cambia a quién sustituye el líbero en una única rotación
- Entonces: solo la formación guardada de esa rotación cambia; las formaciones de las demás
  rotaciones quedan intactas
- **Corregido por la spec 043:** esta redacción original decía que la formación "pierde a los
  jugadores que ya no corresponden" — es decir, que se purgaba sin reponer a quien entra, y
  quedaba en cinco. Contradecía el invariante 2 de `docs/dominio.md` ("cada formación coloca
  exactamente a 6 jugadores") desde el día en que se escribió, y el servidor la rechazaba con
  `RosterInvalido` en cuanto existía backend (spec 033). La spec 043 corrige el comportamiento:
  quien entra hereda el punto exacto de quien sale, así que la formación se queda siempre en
  seis.

**E9 — Sustituir a alguien que no es titular se rechaza, rotación a rotación**
- Dado: seis titulares y un líbero
- Cuando: se intenta declarar, para cualquiera de las seis rotaciones, que el líbero sustituye a
  un jugador que no es ninguno de los seis titulares
- Entonces: se rechaza

**E10 — Un sistema con líbero por rotación guarda sus seis rotaciones sin ninguna bloqueada**
- Dado: un sistema ligado a una plantilla con líbero, con el sustituto por defecto (E4) y una
  formación legal para cada una de las seis rotaciones, colocando en cada una a quien esté en
  pista de verdad
- Cuando: se guardan las seis
- Entonces: ninguna se rechaza por roster incorrecto — las seis llevan al líbero, no al titular
  sustituido, corrigiendo el caso que dejaba tres rotaciones jugando siempre con el titular

### Guardar sin validar

**E11 — Guardar con la validación desactivada acepta una formación con falta posicional**
- Dado: una formación completa (los seis jugadores que corresponden a esa rotación) con una falta
  de profundidad o de orden lateral
- Cuando: se guarda con la validación desactivada
- Entonces: se acepta y queda guardada tal cual, con la falta

**E12 — Desactivar la validación no permite guardar a un jugador ajeno al roster de la rotación**
- Dado: una formación en la que uno de los seis colocados no es quien está en pista de verdad en
  esa rotación (por ejemplo, el titular en una rotación donde le toca jugar al líbero)
- Cuando: se intenta guardar con la validación desactivada
- Entonces: se rechaza igual que con la validación activada — desactivarla afecta solo a la falta
  posicional, nunca a quién puede estar en pista

**E13 — Con la validación activada, nada cambia respecto a hoy**
- Dado: la misma formación con falta posicional del E11
- Cuando: se intenta guardar con la validación activada
- Entonces: se rechaza, igual que antes de esta spec

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **El defecto del sustituto es "el central que cae en zaga en esa rotación", no un central fijo
  (C1 o C2) para todas.** Con la plantilla típica esto reproduce lo que el entrenador espera
  (central1 en R3/R4/R5, central2 en R1/R2/R6), pero la regla en sí no menciona índices: se
  deriva de la posición, no de la etiqueta. La etiqueta que le toque a cada uno es consecuencia
  del cambio de convención (E1-E3), no de esta regla.
- **Girar la convención del índice cambia también la etiqueta de los receptores**, no solo la de
  los centrales — es el mismo recorrido para todos los roles con índice. Aceptado explícitamente:
  el receptor que hoy se pinta `R1` pasará a pintarse `R2` y viceversa. Los identificadores de
  jugador (`receptor1`, `receptor2`, etc.) no cambian, solo la etiqueta que se pinta.

## Al cerrar

Los 13 escenarios pasan (140 tests en total en `domain/`, `application/` e `infrastructure/`,
frente a los 124 con los que arrancó esta spec).

**El defecto por rotación no siempre encuentra un central en zaga.** `sustitutosLiberoPorDefecto`
busca, para cada rotación, el central que ocupa P1/P5/P6. Nada en `composicionValida` exige que
los dos centrales de una plantilla estén separados tres posiciones en el orden de saque — es así
en un 5-1 real, pero el dominio no lo comprueba. Con dos centrales adyacentes en vez de opuestos,
hay rotaciones donde **ninguno** de los dos está en zaga, y la función ya devuelve `null` para
esas sin reventar. Se descubrió escribiendo el primer test de guardar-las-seis-con-el-defecto
(E10): el fixture `ordenValidoEstandar()`, compartido por varios ficheros de test desde specs
anteriores, tiene los centrales adyacentes, así que con él el líbero solo llegaba a jugar cuatro
de las seis rotaciones, no seis. No es un bug de esta spec: es una propiedad no garantizada del
dominio que ningún test anterior necesitaba, porque ninguna regla anterior dependía de que
*siempre* hubiera un central en zaga. El test de E10 se escribió con un orden de saque nuevo, con
la separación real de un 5-1 (la misma forma que `PLANTILLA_GLOBAL`), en vez de forzar esa
garantía en `composicionValida` — no hay escenario que la pida, y añadirla sin que nadie la
pidiera habría sido inventar una regla de voleibol no verificada.

**El alcance real en `application/` e `infrastructure/` fue el previsto, pero más extenso de lo
habitual.** La spec ya autorizaba tocar esas capas por el cambio de forma persistida. En la
práctica: `SistemaStore.cambiarSustitutoLibero` gana un parámetro de rotación;
`LocalStorageSistemaRepository` sube de versión 2 a 3 y cambia `sustitutoLibero?: string` por
`sustitutosLibero?: Record<string, string | null>`; y se añadió un puerto y adaptador nuevos,
`AjustesRepository` / `LocalStorageAjustesRepository`, porque "si la validación está desactivada"
es un ajuste global de la app, no de un sistema — no encajaba en `SistemaRepository` sin forzarlo.

**El trabajo de `ui/` se hizo en la misma sesión, sin spec propia, tal como decía "Fuera de
alcance".** El selector "líbero sustituye a" se movió de la barra superior a un popup nuevo
(`DialogoAjustes`, sobre un componente `Modal` genérico) con el checkbox de validación al lado,
en el orden pedido por el entrenador (`C1, C2, Ninguno, O, R1, R2, C`) y contextualizado a la
rotación activa — corrige de paso una limitación real del selector antiguo (con `@if` sobre el
sustituto actual, la opción "ninguno" hacía desaparecer el selector entero). Ninguno de estos
cambios se testeó (regla del proyecto: `ui/` no se testea) ni cambia ninguna regla de dominio.

**Lo que no se desvió:** los 13 escenarios se implementaron tal como se escribieron, sin
descubrir que alguno pedía una regla de voleibol incorrecta. `docs/dominio.md` §2 y el líbero
en §2 se corrigieron para que el texto ya no sea ambiguo sobre el sentido del recorrido del
índice y para reflejar el sustituto por rotación; el invariante 3 de §7 no necesitó cambios —
ya estaba escrito en términos lo bastante generales.
