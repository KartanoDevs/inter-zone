# 039 — Variantes de defensa por número de bloqueadores

**Estado:** Congelada
**Paso de la hoja de ruta:** 7 (sistemas de defensa)

**Depende de:** spec 038 (defensa por caso de colocador), congelada e implementada antes de
congelar esta.

## Problema

Contra la misma situación de ataque, el entrenador defiende distinto según cuántos jugadores
llegan al bloqueo: no es lo mismo defender un ataque por 4 con doble bloqueo que con uno solo, o
sin ninguno. Hoy, tras la spec 038, cada (caso, situación) solo admite una colocación; no hay
sitio para enseñar esas variantes por separado.

## Objetivo

Cada combinación de caso, situación y número de bloqueadores (0 a 3) es una defensa guardada
independiente, con su propia colocación de los seis puestos y su propia zona de responsabilidad.
Solo existen las variantes que el entrenador cree.

**Esta spec toca `application/`, `infrastructure/`, `server/` y `ui/`, además de `domain/`**, por
el mismo motivo que la 038: no hay forma de añadir un selector de bloqueadores y guardar por él
sin tocar esas capas.

## Fuera de alcance

- La sombra de bloqueo (spec 040): esta spec solo añade el eje de variación; que se vea qué tapa
  el bloqueo es la spec siguiente.
- Cambiar cómo se decide quién bloquea más allá de "los puestos delanteros más cercanos a la
  red": el criterio se fija aquí, pero de dónde sale el polígono de sombra es la 040.
- Cualquier cambio en recepción.

## Escenarios

**E1 — Contra una situación de ataque se puede defender con 0, 1, 2 o 3 bloqueadores**
- Dado: una situación de ataque activa (no la inicial)
- Cuando: se mira el selector de bloqueadores
- Entonces: ofrece las cuatro opciones, 0 a 3

**E2 — Cada número de bloqueadores guarda su propia colocación y sus propias zonas**
- Dado: una defensa guardada con 2 bloqueadores para una situación
- Cuando: se cambia a 3 bloqueadores en la misma situación y se coloca y guarda algo distinto
- Entonces: la variante de 2 bloqueadores conserva exactamente lo que tenía; nada se arrastra de
  una variante a otra

**E3 — Cambiar a un número de bloqueadores nunca guardado deja el campo vacío**
- Dado: una situación con solo la variante de 2 bloqueadores guardada
- Cuando: se selecciona 1 bloqueador
- Entonces: el campo aparece sin ningún puesto colocado, no una copia de la variante de 2

**E4 — La posición inicial no admite variantes**
- Dado: la situación "posición inicial" activa
- Cuando: se mira el selector de bloqueadores
- Entonces: no se ofrece; la inicial es siempre de 0 bloqueadores

**E5 — Guardar la posición inicial con bloqueadores declarados se rechaza en el dominio**
- Dado: un intento de guardar una variante con `situacion: 'inicial'` y `bloqueadores` distinto
  de 0, construido directamente contra la función de dominio (sin pasar por el selector de UI,
  que ya lo impide)
- Cuando: se intenta guardar
- Entonces: se rechaza — la regla vive en `domain/`, no solo en que la pantalla no ofrezca la
  opción

**E6 — Cambiar de número de bloqueadores con cambios sin guardar pide confirmar**
- Dado: se ha colocado, movido o quitado algún puesto en la variante activa desde su último
  guardado
- Cuando: se intenta cambiar de número de bloqueadores
- Entonces: mismo aviso de cambios sin guardar que al cambiar de caso o de situación; confirmar
  descarta y cambia, cancelar mantiene todo tal cual

**E7 — El selector distingue las variantes ya creadas de las vacías**
- Dado: una situación con las variantes de 0 y 2 bloqueadores guardadas, y 1 y 3 sin crear nunca
- Cuando: se mira el selector
- Entonces: se puede distinguir cuáles existen y cuáles no (por ejemplo, visualmente); elegir una
  vacía no falla, simplemente empieza en blanco (E3)

**E8 — Rehacer una variante no toca las demás de la misma situación**
- Dado: las variantes de 0 y 2 bloqueadores guardadas para una situación
- Cuando: se vuelve a colocar y guardar la de 0
- Entonces: la de 2 permanece exactamente como estaba

### Quién bloquea, derivado

**E9 — Quién bloquea se deduce de quién está pegado a la red**
- Dado: una variante con 2 bloqueadores declarados y los tres puestos de la línea delantera
  colocados a distinta distancia de la red
- Cuando: se calcula quién bloquea
- Entonces: son los dos puestos delanteros con menor distancia a la red; el tercero no bloquea

**E10 — Descolgar a un delantero a los tres metros lo saca del bloqueo sin tocar el número declarado**
- Dado: la variante del escenario anterior
- Cuando: se mueve uno de los dos bloqueadores hacia el fondo, más allá de la línea de 3 metros
- Entonces: deja de contar como bloqueador y el puesto que antes quedaba tercero pasa a serlo, sin
  que el número declarado de bloqueadores (2) cambie

**E11 — Declarar tres bloqueadores con solo dos delanteros colocados no inventa un tercero**
- Dado: una variante con 3 bloqueadores declarados pero solo dos puestos de la línea delantera
  colocados en el campo (el tercero sin colocar)
- Cuando: se calcula quién bloquea
- Entonces: bloquean los dos que hay; no se inventa ni se cuenta un tercero inexistente

**E12 — Clonar un sistema de defensa se lleva todas sus variantes**
- Dado: un sistema de defensa con varias combinaciones de caso, situación y bloqueadores
  guardadas
- Cuando: se clona (spec 026)
- Entonces: el clon tiene exactamente las mismas variantes, independientes del original

**E13 — El sistema de defensa sembrado trae doble bloqueo contra las bandas y el centro, e individual contra la pipe**
- Dado: un catálogo recién sembrado
- Cuando: se mira la variante sembrada de cada situación cubierta por
  `docs/voley/sistema_defensivo_unificado.md`
- Entonces: el ataque por 4, el ataque por 3 y el ataque por 2 (donde exista) están sembrados con
  2 bloqueadores; la pipe está sembrada con 1; no se siembra ninguna otra variante (0, o las no
  mencionadas) para no inventar contenido que el documento no cubre

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **Cada número de bloqueadores es una variante guardada aparte**, no un cálculo sobre una única
  colocación.
- **La posición inicial nunca admite variantes.**
- **Quién bloquea se deriva** de la posición de los puestos delanteros, nunca se declara jugador
  a jugador.
- **El sembrado solo trae la variante que describe el documento de referencia** (2 bloqueadores
  en bandas y centro, 1 en la pipe); las demás nacen vacías.

## Al cerrar

Pendiente — se completa cuando la spec esté implementada.
