# 001 — Validación de falta posicional

**Estado:** Completada
**Paso de la hoja de ruta:** 1

## Problema

Un jugador puede memorizar una formación de recepción que le pitarían en partido, y no
enterarse hasta que el árbitro la señala. El entrenador, dibujando en una pizarra, tampoco
detecta a ojo que un receptor se ha adelantado veinte centímetros de más.

## Objetivo

Dada una formación y el orden de saque del equipo, saber si esa colocación es legal en el
momento del saque, y si no lo es, exactamente qué pareja de jugadores la incumple y por qué.

## Fuera de alcance

- Cualquier interfaz. Esto es dominio puro, sin pintar nada.
- Las etiquetas visibles de los jugadores (`R1`, `M2`...). Ver spec 002. Aquí solo importa
  el rol en un caso: el líbero.
- Comprobar que los jugadores estén dentro del campo. Estar fuera de las líneas en el
  momento del saque es legal.
- El instante posterior al saque, en el que las posiciones dejan de importar.
- Faltas que no sean posicionales (rotación incorrecta, invasión, toques).
- Sistemas de defensa.

## Escenarios

### Casos válidos

**E1 — Formación estándar legal**
- Dado: un orden de saque conocido y una formación donde cada zaguero está claramente
  detrás de su delantero y las dos líneas respetan el orden lateral
- Cuando: se valida la formación
- Entonces: no se devuelve ninguna infracción

**E2 — Legal aunque un zaguero esté fuera de las líneas laterales**
- Dado: una formación por lo demás legal en la que P5 está en la zona libre lateral
- Cuando: se valida
- Entonces: no se devuelve ninguna infracción

**E3 — Legal aunque un delantero esté por detrás de la línea de ataque**
- Dado: una formación en la que P3 recibe desde 5 m de la red, con P6 aún más atrás
- Cuando: se valida
- Entonces: no se devuelve ninguna infracción

### Regla de zaguero tras delantero

**E4 — Zaguero adelantado a su delantero**
- Dado: una formación en la que P1 está más cerca de la red que P2
- Cuando: se valida
- Entonces: se devuelve una infracción de tipo zaguero-delantero que implica a P1 y P2

**E5 — Zagueros y delanteros no emparejados no se comparan**
- Dado: una formación legal en la que P5 está más cerca de la red que P2
- Cuando: se valida
- Entonces: no se devuelve ninguna infracción

### Reglas de orden lateral

**E6 — Delanteros cruzados**
- Dado: una formación en la que P3 está a la izquierda de P4
- Cuando: se valida
- Entonces: se devuelve una infracción de tipo orden-lateral que implica a P4 y P3

**E7 — Zagueros cruzados**
- Dado: una formación en la que P1 está a la izquierda de P6
- Cuando: se valida
- Entonces: se devuelve una infracción de tipo orden-lateral que implica a P6 y P1

### Empates y tolerancia

**E8 — Misma altura exacta es falta**
- Dado: una formación en la que P6 y P3 tienen idéntica coordenada de profundidad
- Cuando: se valida
- Entonces: se devuelve una infracción: no hay orden distinguible

**E9 — Dentro del margen de tolerancia**
- Dado: una formación en la que P6 está 3 cm por detrás de P3, con el margen fijado en 5 cm
- Cuando: se valida
- Entonces: no es infracción, pero se marca como al límite

**E10 — Justo por encima del margen**
- Dado: una formación en la que P6 está 8 cm por detrás de P3
- Cuando: se valida
- Entonces: es válida y no se marca como al límite

### Líbero

**E11 — Líbero en posición zaguera**
- Dado: una formación legal en la que el jugador con rol líbero ocupa P5
- Cuando: se valida
- Entonces: no se devuelve ninguna infracción

**E12 — Líbero en posición delantera**
- Dado: una formación en la que el jugador con rol líbero ocupa P3
- Cuando: se valida
- Entonces: se devuelve una infracción de tipo libero-delantero

**E13 — Un no-líbero en posición delantera no infringe nada**
- Dado: una formación legal en la que un central ocupa P3
- Cuando: se valida
- Entonces: no se devuelve ninguna infracción

### Acumulación

**E14 — Varias infracciones a la vez**
- Dado: una formación con delanteros cruzados y además un zaguero adelantado
- Cuando: se valida
- Entonces: se devuelven ambas infracciones, no solo la primera detectada

### Derivación de la rotación

**E15 — La misma formación cambia de veredicto según la rotación**
- Dado: un orden de saque y unas coordenadas fijas
- Cuando: se validan esas coordenadas en dos rotaciones distintas
- Entonces: los veredictos pueden diferir, porque cambia quién ocupa cada posición

**E16 — Seis rotaciones vuelven al inicio**
- Dado: un orden de saque
- Cuando: se rota seis veces
- Entonces: se obtiene el orden de partida

## Preguntas abiertas

Ninguna. La spec está congelada.

## Al cerrar

Los 16 escenarios pasan. No hizo falta correr `npm run test:coverage`: ese script no existe
en `package.json`, así que no se reporta cobertura numérica (no se ha inventado el dato).

**Desviación respecto a `docs/arquitectura.md`.** El documento sugería
`validarFormacion(formacion, orden, equipo): Infraccion[]`. La implementación final es
`validarFormacion(formacion, orden, rotacion): ResultadoValidacion`, con
`ResultadoValidacion = { infracciones, avisos }`. Dos motivos:

- No hace falta un `equipo` aparte: `OrdenSaque` ya es un array de `Jugador` con su `rol`,
  así que la regla del líbero (R4) se resuelve sin un roster adicional.
- `Infraccion[]` no basta para expresar `al_limite` (E9/E10): `docs/dominio.md` dice
  explícitamente que `al_limite` "no es una infracción", pero el entrenador necesita verla.
  Un array plano de infracciones no puede representar "esto no es infracción pero se marca"
  sin inventarse un estado falso. Separar `avisos` de `infracciones` evita esa ambigüedad.
  Se registra como decisión estructural en
  `docs/decisiones/0007-validarformacion-infracciones-y-avisos.md`.

**Lo que no se desvió:** ninguna regla de voleibol de `docs/dominio.md` resultó incorrecta o
incompleta durante la implementación; no hizo falta tocarlo.

**Lo que sorprendió:** varios escenarios (E2, E3, E5, E8, E10, E11, E13, E16) pasaron en
verde sin escribir código nuevo, porque el "código mínimo" de un escenario anterior ya los
cubría (el diseño por parejas de comparación nunca compara posiciones no emparejadas, y la
comparación estricta `margen <= 0` ya cubre el empate exacto). Es el comportamiento esperado
que describe `docs/flujo-de-trabajo.md`, no un atajo: cada uno de esos escenarios se escribió
y ejecutó igualmente, confirmando el comportamiento en vez de forzarlo.

**Corrección posterior (spec 003, decisión 0010).** El parámetro `rotacion` de
`validarFormacion` interpretaba "0" como "el orden de saque tal cual se definió", sin mirar
dónde estaba el colocador. La spec 003 corrigió esto: `rotacion` pasa a significar `Rn` =
"el colocador ocupa Pn". Los escenarios E1–E15 de esta spec siguen probando las mismas
formaciones y las mismas reglas; solo cambió qué valor de `rotacion` había que pasarles para
seguir describiendo la misma rotación con el nuevo significado (E1–E14: de `0` a `2`; E15:
`enR1`/`enR2` pasan a `1`/`2` respectivamente, coherentes con el nuevo nombre). Ninguna regla
de falta posicional cambió.
