# Referencia — "TEST Defensa zonas" tal y como estaba antes de la spec 038

**Por qué existe este documento.** La spec 038 sustituye el modelo de defensa por
rotación × vía por el de caso del colocador rival × situación. Las defensas guardadas con el
modelo antiguo se descartan, no se traducen (`docs/especificaciones/038-*.md`, sección
"Migración de datos"): la clave `(rotación, vía)` no tiene una imagen razonable en
`(caso, situación)`. Este documento vuelca **exactamente** lo que el sistema sembrado
"TEST Defensa zonas" (id `0800cd2c-87a7-470d-b8f8-9b7834c816ac`, equipo masculino) tenía en el
servidor de desarrollo el 2026-08-23, antes de esa migración, para poder generar sistemas de
prueba equivalentes bajo el modelo nuevo al cerrar la spec 040.

**No es contenido nuevo.** Es el mismo contenido que ya produce
[`sistema-defensa-por-defecto.ts`](../../src/app/domain/sistema-defensa-por-defecto.ts) a partir
de [`sistema_defensivo_unificado.md`](sistema_defensivo_unificado.md) — se confirmó, comparando
los puntos de dos rotaciones distintas para la misma vía (R3 y R5, vía z3), que son idénticos:
lo único que cambia entre rotaciones es **qué jugador** ocupa cada zona, nunca la geometría ni el
texto. Por eso este documento se organiza por **zona física × vía de ataque** (la estructura real
del contenido), no por las 6 rotaciones × 4 vías = 24 combinaciones del payload original, que
son redundantes entre sí salvo por el ocupante.

## Descripción general del sistema

> Defensa especializada por zonas, no por rotación: el líbero defiende siempre en la zona 5, el
> receptor zaguero siempre en la zona 6, y el colocador o el opuesto —el que esté en zaga— en la
> zona 1. Contra los ataques por los extremos el central sube siempre al doble bloqueo con el
> jugador de banda, y el delantero que queda libre se descuelga a la línea de 3 metros a cubrir
> las fintas. Contra la pipe solo bloquea el central: las dos bandas quedan libres para barrer
> los toques suaves y toda la zaga pivota hacia la zona 5, donde el sistema anticipa el remate.

## Quién ocupa cada zona (independiente de la vía)

Zaga: zona 5 = líbero · zona 6 = receptor zaguero · zona 1 = colocador u opuesto, el que esté en
zaga. Delantera: zona 3 = central · zona 4 = receptor delantero · zona 2 = colocador u opuesto,
el que esté delante.

**Bajo el modelo nuevo (spec 038), esta tabla es directamente el reparto por línea**: los tres
puestos delanteros (zonas 2, 3, 4) llevan la etiqueta `C/O`, `C1/C2`, `R1/R2`; los tres de zaga
(zonas 1, 5, 6) llevan `C/O`, `L`, `R1/R2` — es la misma correspondencia, sin el jugador concreto.

## Geometría por vía y zona

Coordenadas en metros (`docs/dominio.md` §3: origen en la esquina red-lateral izquierda propia,
campo 9×9). "Celdas" es el tamaño del bloque de responsabilidad ya pintado en el sembrado
original (a 0,5 m por celda); no se reproduce la lista completa de celdas aquí, solo el conteo,
porque la forma exacta del bloque no es la información táctica — se puede repintar sin más al
recrear el sistema de prueba.

### Vía z4 — ataque rival por su zona 4 (nuestra izquierda del bloqueo)

| Zona | Punto (x, y) | Celdas | Explicación |
|---|---|---|---|
| 2 | (7.6, 0.4) | 12 | Bloqueo exterior: salta con el central y cierra la paralela y la diagonal principal. |
| 3 | (6.1, 0.4) | 10 | El central siempre va al bloqueo en los extremos. Paso cruzado rápido para cerrar el doble por fuera. |
| 4 | (5.0, 2.9) | 18 | Único delantero libre: se descuelga a la línea de 3 metros a barrer fintas y toques suaves detrás del bloqueo. |
| 1 | (8.1, 6.4) | 40 | Cubre la línea, la paralela que baja por nuestra banda derecha. |
| 6 | (3.6, 8.0) | 50 | Receptor, fijo en la 6: cubre la diagonal larga por el centro-fondo y los block-outs. |
| 5 | (1.6, 4.8) | 36 | Líbero, fijo en la 5: aquí no puede quedarse anclado. Primer paso explosivo hacia adelante para interceptar la diagonal corta. |

### Vía z3 — ataque rival por su zona 3 (centro)

| Zona | Punto (x, y) | Celdas | Explicación |
|---|---|---|---|
| 3 | (4.4, 0.4) | 10 | Salta frente al atacante de primer tiempo, sin esperar a leer nada más. |
| 4 | (3.2, 0.4) | 8 | Asiste al central lo más rápido posible para que el bloqueo llegue a ser doble. |
| 2 | (5.8, 2.9) | 15 | No entra al bloqueo: se cierra hacia el centro en la línea de 3 metros. |
| 5 | (2.4, 6.0) | 30 | Líbero: se cierra hacia el centro-izquierda. |
| 6 | (4.5, 8.2) | 24 | Receptor: se queda profundo en el fondo, a por los balones bombeados y los block-outs largos. |
| 1 | (6.6, 6.0) | 30 | Se cierra hacia el centro-derecha. |

### Vía z2 — ataque rival por su zona 2 (nuestra derecha del bloqueo)

| Zona | Punto (x, y) | Celdas | Explicación |
|---|---|---|---|
| 4 | (1.4, 0.4) | 12 | Bloqueo exterior: salta con el central y cierra la línea y la diagonal principal. Ojo: no tapar del todo la paralela, el líbero necesita ver el brazo del atacante para reaccionar al golpe duro. |
| 3 | (2.9, 0.4) | 10 | El central siempre va al bloqueo en los extremos. Paso cruzado rápido para cerrar el doble; si llega tarde, se abre una brecha por el medio. |
| 2 | (4.0, 2.9) | 18 | Único delantero libre: se descuelga a la línea de 3 metros, detrás del hueco del bloqueo, a por las fintas y los toques suaves. |
| 5 | (0.9, 6.4) | 40 | Líbero, fijo en la 5: cubre la línea. Es un ataque duro y directo, así que juega la paralela sin anticipar de más. |
| 6 | (5.4, 8.0) | 50 | Receptor, fijo en la 6: cubre la diagonal larga por el centro-fondo, atento a los rebotes del bloqueo. |
| 1 | (7.4, 4.8) | 36 | Sube ligeramente para cubrir la diagonal corta, el cruzado fuerte que cae por delante de la zona 1. |

### Vía pipe — ataque rival desde su zaga (bloqueo individual)

| Zona | Punto (x, y) | Celdas | Explicación |
|---|---|---|---|
| 3 | (4.5, 0.4) | 10 | Contra la pipe el bloqueo es individual: solo salta el central, en el centro de la red. |
| 4 | (2.6, 2.9) | 18 | Con bloqueo individual las dos bandas quedan libres: se descuelga a los 3 metros a barrer cualquier finta o toque suave. |
| 2 | (6.4, 2.9) | 18 | Con bloqueo individual las dos bandas quedan libres: se descuelga a los 3 metros para tapar lo que pase por encima o por el lado del central. |
| 5 | (1.7, 6.6) | 49 | Toda la zaga pivota a la 5: el líbero se coloca a absorber el remate fuerte, que es lo que el sistema anticipa contra la pipe. |
| 6 | (4.0, 8.2) | 15 | Receptor: profundo, pero basculando a la izquierda para apoyar la zona de mayor probabilidad de impacto. |
| 1 | (7.2, 5.4) | 42 | Mucho más agresivo de lo normal en la diagonal corta y media derecha: el resto de la zaga ha pivotado a la izquierda y este lado queda solo. |

## Cómo se usa esto en la spec 040

Al cerrar la spec 040, generar un sistema de defensa de prueba **por cada caso** (colocador
delantero y colocador trasero), con la variante de bloqueo sembrada que corresponde según la
spec 039 (2 bloqueadores en zonas 4, 3 y 2; 1 bloqueador en la pipe), reutilizando estos puntos y
estas explicaciones re-keyeados a `(caso, situación)` en vez de `(rotación, vía)`:

- Caso **delantero** → situaciones z4, z3, pipe salen directas de las tablas de arriba (mismos
  puntos); el ataque por 1 y la posición inicial no tienen precedente en este volcado, se
  generan a mano.
- Caso **trasero** → situaciones z4, z3, z2, pipe salen directas de las tablas de arriba; la
  posición inicial no tiene precedente, se genera a mano.

No es necesario decidir esto ahora — se retoma al cerrar la spec 040, cuando el número de
bloqueadores y la sombra ya existan y los sistemas de prueba puedan llevar las tres piezas
completas de una vez, en vez de generarlos por partes.
