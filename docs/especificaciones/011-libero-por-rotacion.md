# 011 — El líbero entra y sale según la rotación

**Estado:** Congelada
**Paso de la hoja de ruta:** 3

## Problema

Hoy la plantilla trata al líbero como si ocupara una plaza fija dentro del orden de saque, igual
que cualquier otro jugador. Eso es incorrecto en dos sentidos. Primero, la app solo permite que
sustituya al central — el reglamento permite que sustituya a cualquier jugador de zaga, y en el
5-1 sustituir al central es una decisión táctica del entrenador, no una obligación. Segundo, y
más grave: como su plaza fija recorre las seis posiciones al rotar, cae en línea delantera en
tres de las seis rotaciones, y ahí la formación se marca con falta y no se puede guardar —
aunque en un partido real esas tres rotaciones sean perfectamente legales, porque el líbero
simplemente sale y entra el titular.

## Objetivo

El líbero puede sustituir a cualquiera de los seis titulares. En las rotaciones donde ese
titular jugaría en zaga, está en pista el líbero; en las que jugaría en delantera, está el
titular. Un sistema con líbero guarda sus seis rotaciones sin que ninguna quede bloqueada por
una falta que en realidad no existe.

## Fuera de alcance

- Todo lo que no ocurra en el instante del saque: cuándo se puede hacer el cambio en pista
  durante el punto, el límite de un cambio por punto, que solo pueda volver a entrar el mismo
  jugador al que sustituyó. Ninguna de esas reglas afecta a la formación en el momento del
  saque, que es lo único que valida esta herramienta.
- Que el líbero saque, bloquee o remate: no está modelado el saque ni el ataque en absoluto.
- Un segundo líbero (el reglamento permite declarar dos en competiciones grandes). La v1 sigue
  modelando un único líbero por plantilla.
- Cambiar la persona a la que sustituye el líbero **a mitad de partido** por decisión táctica en
  vivo: se elige al crear o editar la plantilla, no rotación a rotación.

## Escenarios

### Declarar el líbero y a quién sustituye

**E1 — Una plantilla con líbero declara también a quién sustituye**
- Dado: seis titulares válidos y un líbero
- Cuando: se declara que el líbero sustituye a uno de los seis titulares
- Entonces: se acepta

**E2 — Los seis titulares siguen siendo 1+2+2+1**
- Dado: una plantilla con líbero
- Cuando: se cuentan los roles de los seis titulares (sin contar al líbero)
- Entonces: son 1 colocador, 2 receptores, 2 centrales y 1 opuesto, igual que sin líbero

**E3 — Una plantilla sin líbero se sigue aceptando**
- Dado: seis titulares válidos, sin líbero
- Cuando: se declara la plantilla
- Entonces: se acepta, y los seis titulares juegan siempre, en todas las rotaciones

**E4 — El líbero puede sustituir a cualquier titular, no solo al central**
- Dado: seis titulares válidos y un líbero
- Cuando: se declara que sustituye al opuesto (o a un receptor)
- Entonces: se acepta igual que si sustituyera a un central

### Quién está en pista en cada rotación

**E5 — El líbero entra cuando el sustituido sería zaguero**
- Dado: una plantilla con líbero sustituyendo a un titular concreto
- Cuando: se consulta quién juega en una rotación donde ese titular ocuparía P1, P5 o P6
- Entonces: en esa posición está el líbero, no el titular

**E6 — El titular juega cuando le tocaría estar en delantera**
- Dado: la misma plantilla
- Cuando: se consulta quién juega en una rotación donde el sustituido ocuparía P2, P3 o P4
- Entonces: en esa posición está el titular, no el líbero

**E7 — El líbero está en pista en tres de las seis rotaciones**
- Dado: una plantilla con líbero
- Cuando: se recorren las seis rotaciones
- Entonces: el líbero juega en exactamente tres y el titular sustituido en las otras tres

**E8 — El líbero nunca es delantero**
- Dado: una plantilla con líbero
- Cuando: se recorren las seis rotaciones
- Entonces: el líbero no ocupa P2, P3 ni P4 en ninguna — es la misma regla de la sección 5 de
  `docs/dominio.md`, pero aquí se comprueba que sale de la formación en vez de saltarla

### Guardar formaciones

**E9 — Guardar exige a quien está en pista de verdad, no a los seis titulares fijos**
- Dado: una rotación donde el líbero está en pista (sustituye a un zaguero)
- Cuando: se intenta guardar una formación con el titular en vez del líbero
- Entonces: se rechaza, igual que hoy se rechaza un jugador ajeno a la plantilla

**E10 — Un sistema con líbero guarda sus seis rotaciones**
- Dado: un sistema ligado a una plantilla con líbero, con una formación legal para cada una de
  las seis rotaciones (colocando en cada una a quien esté en pista de verdad)
- Cuando: se guardan las seis
- Entonces: ninguna se rechaza por falta — ni siquiera las tres donde juega el líbero

**E11 — Cambiar a quién sustituye el líbero purga lo que deja de valer**
- Dado: un sistema con formaciones guardadas en rotaciones donde juega el líbero
- Cuando: se cambia a qué titular sustituye
- Entonces: esas formaciones pierden a los jugadores que ya no corresponden (el líbero en
  rotaciones donde ya no entra, o el titular antiguo en las que ahora sí entra el líbero)

**E12 — Sustituir a alguien que no es titular se rechaza**
- Dado: seis titulares y un líbero
- Cuando: se intenta declarar que sustituye a un jugador que no es ninguno de los seis
- Entonces: se rechaza

### En pantalla

**E13 — El banquillo muestra a quien esté libre en cada rotación**
- Dado: un sistema con líbero, sin nadie colocado todavía en la rotación activa
- Cuando: se mira el banquillo
- Entonces: aparece el líbero en las rotaciones donde le toca jugar, y el titular sustituido en
  las que no; nunca aparecen los dos a la vez para la misma plaza

**E14 — Se puede elegir a quién sustituye el líbero**
- Dado: una plantilla con líbero
- Cuando: se cambia, desde la pantalla, a cuál de los seis titulares sustituye
- Entonces: el cambio se ve reflejado de inmediato en qué rotaciones juega cada uno

## Preguntas abiertas

Ninguna. Resueltas con el usuario:

- **Una plantilla con líbero siempre declara explícitamente a quién sustituye.** No existe un
  estado "líbero declarado, sustituido sin decidir": se rechaza igual que se rechazaría una
  composición inválida. El dominio nunca supone nada por su cuenta.
- **"Central 2 por defecto" es una conveniencia de la pantalla de creación, no del dominio.**
  Cuando se crea una plantilla con líbero desde la pantalla, el formulario pre-rellena "sustituye
  al central 2" porque es el caso típico del 5-1 — pero sigue siendo un valor explícito que se
  envía al dominio y que se puede cambiar antes de confirmar, no un hueco que el dominio rellene
  si falta. Esto no contradice el punto anterior: la función de dominio que crea la plantilla
  sigue exigiendo el sustituido siempre, sea cual sea su origen.

## Al cerrar

Pendiente. Se rellena cuando la spec se cierre.
