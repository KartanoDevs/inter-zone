# Dominio

Fuente de verdad del proyecto. Si el código y este documento discrepan, discrepa el código.

Este documento describe **voleibol**, no software. No menciona Angular, componentes ni
ficheros. Cambia solo si cambian las reglas del juego o si descubrimos que habíamos
entendido mal una.

---

## 1. Vocabulario

Se usa el vocabulario del entrenador, no una traducción libre. Estos términos son los
que aparecen en el código.

| Término | Significado |
|---|---|
| **Posición rotacional** | Uno de los seis lugares P1..P6 que ocupa un jugador en el momento del saque. No es dónde está de verdad: es su obligación reglamentaria. |
| **Rol** | La función del jugador en el equipo: colocador, receptor, central, líbero, opuesto. No cambia al rotar. |
| **Rotación** | Estado del equipo identificado por en qué posición rotacional está el **colocador**. `Rn` significa "el colocador ocupa Pn". R1..R6. Solo coincide con "quién saca" (P1) en R1. |
| **Orden de saque** | Los seis jugadores ordenados P1, P2, P3, P4, P5, P6 en la rotación inicial. Se define **una sola vez** por equipo. De él se derivan las otras cinco rotaciones. |
| **Formación** | Dónde se coloca realmente cada jugador en el momento del saque contrario, para una rotación concreta. Es lo que diseña el entrenador. |
| **Falta posicional** | Infracción por no respetar el orden relativo entre posiciones rotacionales en el instante del saque. |
| **Zona de responsabilidad** | Superficie del campo que un receptor se compromete a cubrir. |
| **Hueco** | Superficie dentro del campo que ningún receptor cubre. |
| **Conflicto** | Superficie que dos o más receptores cubren a la vez. |

**Rol y posición rotacional son cosas distintas y no hay que confundirlas.** El rol es
permanente (un central es central toda la temporada); la posición rotacional cambia en cada
punto ganado al resto. Un central puede estar en P3, y en la rotación siguiente en P2.

---

## 2. Roles y etiquetas

### Los cinco roles

| Identificador | Nombre por defecto | Abreviatura por defecto | ¿Lleva índice? |
|---|---|---|---|
| `colocador` | Colocador | C | No |
| `receptor` | Receptor | R | Sí |
| `central` | Central | C | Sí |
| `opuesto` | Opuesto | O | No |
| `libero` | Líbero | L | No |

**Nombres y abreviaturas son configurables.** Cada equipo llama a las cosas como quiere:
"punta" en vez de receptor, "bloqueador" en vez de central. Se cambian en un único fichero
de configuración del dominio, sin tocar lógica.

**Sobre la abreviatura del central.** Colocador y Central comparten la misma letra base, C,
pero eso no genera ambigüedad: en pista solo hay un colocador, y el colocador nunca lleva
índice, así que su etiqueta siempre es la letra suelta `C`. El central sí lleva índice
siempre, así que sus etiquetas siempre son `C1` o `C2`. Una etiqueta con índice nunca puede
coincidir textualmente con una sin índice, así que no hay ficha ambigua en la pizarra aunque
la letra base sea la misma.

### Índice: receptores y centrales van numerados

Hay dos receptores y dos centrales en pista, así que necesitan distinguirse: `R1` y `R2`,
`C1` y `C2`.

**El índice se declara, no se deriva (spec 018).** No existe una regla de recorrido del orden
de saque que lo calcule: se intentó dos veces (specs 006 y 017, ambas con un recorrido distinto)
y las dos veces resultó incorrecto, porque la convención real del entrenador no sale de un único
recorrido — cuenta los receptores contando hacia delante desde el colocador, y los centrales
contando hacia atrás. Que un jugador sea `R1` o `C2` es una decisión del entrenador al declarar
su plantilla, igual que su nombre; la app solo la guarda y la pinta. `validarPlantilla` sigue
comprobando que los índices declarados sean coherentes (un rol con índice tiene exactamente un
1 y un 2 en pista), pero no impone ningún orden de asignación.

Este apartado existe para que quede escrito que **no** hay que volver a intentar derivarlo: es
la tercera vez que se prueba y la tercera que se descarta.

### Etiqueta

La etiqueta es lo que se pinta en la ficha: abreviatura seguida del índice si lo lleva.
`C`, `R1`, `R2`, `C1`, `C2`, `O`, `L`. Es **siempre derivada** del rol, la configuración y
el índice; nunca se almacena.

### Composición válida de la plantilla en pista

Los seis titulares son: 1 colocador, 2 receptores, 2 centrales y 1 opuesto. El líbero es un
séptimo jugador declarado aparte del orden de saque.

**El líbero puede sustituir a cualquiera de los seis titulares que esté en zona zaguera** en el
momento del saque — no solo al central. Es la regla FIVB 19.3.1.1: *"The Libero is allowed to
replace any player in a back row position"*. Que en el sistema 5-1 sustituya casi siempre al
central es una decisión táctica del entrenador (suele ser el peor receptor y defensor de
perímetro de los seis), no una obligación del reglamento. Sustituir a otro titular es igual de
legal.

Consecuencia de diseño: como la posición rotacional del titular sustituido cambia en cada
rotación, el líbero **entra y sale**. Está en pista solo en las rotaciones donde el sustituido
sería zaguero; en las que sería delantero, juega el titular. Por eso el líbero nunca puede
ocupar P2, P3 ni P4 (regla R4, sección 5): no es una restricción aparte, es consecuencia directa
de cuándo entra.

**A quién sustituye se declara rotación a rotación, no una sola vez para las seis (spec 017).**
No hace falta que sea el mismo titular siempre: el caso típico del 5-1 es que en cada rotación
sustituya al central que esté en zaga en ella, y como los dos centrales se alternan entre zaga y
delantera según la rotación, ese defecto hace que el líbero juegue las seis rotaciones — no solo
las tres en las que un único titular fijo estaría en zaga (que era el comportamiento, incompleto,
de la spec 011).

---

## 3. Sistema de coordenadas

**Punto de vista canónico:** desde el fondo del propio campo, mirando hacia la red.
Con ese punto de vista, P4 queda a la izquierda y P2 a la derecha.

- **Origen (0, 0):** esquina donde la red se cruza con la línea lateral **izquierda**.
- **Eje X:** hacia la derecha. `0 ≤ x ≤ 9` dentro de la pista.
- **Eje Y:** hacia el fondo del propio campo. `0` es la red, `9` la línea de fondo.
- **Unidad: metros.** Siempre. Nunca píxeles en el modelo.
- **Zona libre:** se admite `-2.5 ≤ x ≤ 11.5` y `0 ≤ y ≤ 12`. Un jugador puede estar
  fuera de las líneas en el momento del saque; es legal.
- **Campo rival:** `y < 0`. No se usa en la v1, se reserva para los sistemas de defensa.

Referencias útiles: línea de ataque en `y = 3`. Centro del campo propio en `(4.5, 4.5)`.

Un jugador se representa por **un solo punto**. La regla real habla del pie más adelantado
de cada jugador; para el propósito didáctico de esta herramienta, un punto por jugador es
suficiente y evita un modelo mucho más complicado sin ganancia pedagógica.

---

## 4. Disposición de las posiciones rotacionales

Vista canónica (red arriba):

```
              RED  (y = 0)
   P4          P3          P2        ← línea delantera
   P5          P6          P1        ← línea zaguera
             FONDO (y = 9)
```

El que saca es siempre P1. Al ganar el punto al resto, el equipo rota: quien estaba en
P2 pasa a P1, quien estaba en P3 pasa a P2, y así sucesivamente. Es decir, **la rotación
gira en el sentido P2 → P1 → P6 → P5 → P4 → P3 → P2**.

Consecuencia de diseño: dado el orden de saque, la posición rotacional de cada jugador en
cualquier rotación es **derivable**. Nunca se almacena; se calcula.

### Numeración de las rotaciones

`Rn` significa siempre **"el colocador ocupa Pn"**, con independencia de cómo se definió el
orden de saque. Es la convención habitual del sistema 5-1: R1 es la rotación en la que el
colocador saca (zaga derecha), R3 es su posición natural de armado en la red, etc.

Esto es distinto de "rotar el orden de saque tal cual se definió", que depende de dónde
empezó el entrenador a escribir la lista. Si el orden de saque no arranca con el colocador en
P1, ambas numeraciones divergen. Ver `docs/decisiones/0010-rn-anclada-al-colocador.md`.

---

## 5. Reglas de falta posicional

Estas reglas son las de la **fase de recepción**: se evalúan una única vez, en el instante en
que el contrario golpea el saque, sobre las posiciones de la formación. Una vez el balón está
en juego, los jugadores son libres de moverse por la pista; la falta de posición no se vuelve
a comprobar en ataque ni en defensa.

Sean `x(Pn)` e `y(Pn)` las coordenadas del jugador que ocupa la posición rotacional `Pn`.

**R1 — Zaguero detrás de su delantero correspondiente:**
- `y(P1) > y(P2)`
- `y(P6) > y(P3)`
- `y(P5) > y(P4)`

**R2 — Orden lateral de la línea delantera:**
- `x(P4) < x(P3) < x(P2)`

**R3 — Orden lateral de la línea zaguera:**
- `x(P5) < x(P6) < x(P1)`

**R4 — Restricción del líbero:**
- El jugador cuyo rol es `libero` no puede ocupar P2, P3 ni P4.

Notas importantes:

- Las comparaciones son **estrictas**. Dos jugadores exactamente a la misma altura o a la
  misma coordenada lateral constituyen falta: no hay orden distinguible.
- La regla **no** exige estar dentro del campo, ni que los delanteros estén por delante de
  la línea de ataque, ni ninguna distancia mínima entre jugadores.
- Los zagueros solo se comparan entre zagueros y con su delantero directo. `y(P5)` frente
  a `y(P2)` es irrelevante.
- Las reglas R1, R2 y R3 dependen solo de la posición rotacional. R4 es la única que depende
  del **rol** del jugador.

**Tolerancia.** El árbitro juzga a ojo. La herramienta distingue tres estados en vez de dos,
con un margen `ε = 0.05 m`:

| Estado | Condición |
|---|---|
| `valida` | La comparación se cumple con margen mayor que `ε`. |
| `al_limite` | Se cumple, pero por menos de `ε`. |
| `falta` | No se cumple. |

`al_limite` no es una infracción: es información para el entrenador. Que un receptor esté
legal por tres centímetros es exactamente lo que hay que enseñarle.

---

## 6. Zonas de responsabilidad

Se modelan como una **rejilla de celdas cuadradas de 0,5 m**, no como círculos ni polígonos.
Motivo en `docs/decisiones/0004-rejilla-de-responsabilidad.md`.

- La rejilla cubre la zona jugable, incluida la zona libre.
- Cada celda puede estar asignada a cero, uno o varios jugadores.
- Solo los jugadores que reciben tienen asignación de celdas.
- **Hueco:** celda dentro de las líneas del campo con cero jugadores asignados.
- **Conflicto:** celda con dos o más jugadores asignados.

Las celdas de la zona libre no cuentan como hueco. Nadie tiene la obligación de cubrir
fuera del campo, aunque una recepción pueda producirse ahí.

Huecos y conflictos son **siempre derivados** de la asignación. No se almacenan.

---

## 7. Invariantes

Se cumplen siempre, en cualquier estado del sistema. Son candidatos naturales a test.

1. Un sistema tiene exactamente 6 formaciones, una por rotación, sin repetir rotación.
2. Cada formación coloca exactamente a 6 jugadores.
3. Los 6 jugadores de una formación son los que estén en pista en esa rotación —los seis
   titulares, o el líbero en el sitio de a quien sustituya si le toca zaga—, sin repetidos.
4. La posición rotacional de un jugador se deriva del orden de saque y de la rotación;
   nunca se asigna a mano. Quién está en pista (titular o líbero) se deriva igual: de a quién
   sustituye el líbero y de la rotación; nunca se asigna a mano.
5. La etiqueta de un jugador se deriva del rol, la configuración y el índice; nunca se
   almacena.
6. Dos roles distintos nunca producen la misma etiqueta final. Si comparten abreviatura, se
   distinguen porque uno lleva índice y el otro no; si ambos llevan índice, o ninguno lo
   lleva, no pueden compartir abreviatura.
7. Un rol que lleva índice tiene exactamente dos jugadores en pista, con índices 1 y 2.
8. Un rol que no lleva índice no tiene índice asignado.
9. Toda posición está dentro de los límites de la zona jugable.
10. Un jugador que no recibe no tiene celdas asignadas.
11. Rotar seis veces devuelve el equipo al orden de partida.
