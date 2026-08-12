# 001 — Validación de falta posicional

**Estado:** Congelada
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

_(pendiente)_
