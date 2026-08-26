# 013 — La nota del examen y las insignias

**Estado:** Congelada
**Paso de la hoja de ruta:** 4

## Problema

La spec 012 dice si la colocación del alumno es legal, pero no cuánto se acerca a la del
entrenador — y no hay nada que reconozca haber superado un examen.

## Objetivo

Cada entrega de un examen (spec 012) recibe una nota de 0 a 10 según lo cerca que quedaron las
fichas del modelo, y si la supera se concede la insignia que corresponde a su tipo: bronce por
puesto, plata por línea, oro por sistema.

## Fuera de alcance

- **Guardar la nota o la insignia.** Esta spec calcula ambas; no las persiste, no lleva
  histórico y no las asocia a una cuenta todavía. Eso es una spec futura, sin numerar, que toca
  `application/`, `infrastructure/` y `server/` — el modelo de datos que hará falta
  (`intento_examen` / `intento_colocacion`) ya está previsto en `docs/modelo-de-datos.md` como
  tabla nueva, sin `ALTER` de las tablas existentes.
- **Pantallas, comparación visual y animaciones.** Cómo se le muestra al alumno su nota o su
  insignia es trabajo de `ui/`, sin spec propia, igual que el resto de la interacción de examen
  (spec 012, "Fuera de alcance").
- **Comparar notas entre jugadores o llevar una clasificación.**
- **La nota de un examen de defensa.** No existe examen de defensa todavía (spec 012).
- **Cambiar el umbral de aprobado o los radios de la curva de nota una vez fijados aquí.** Si el
  entrenador pide afinarlos más adelante, es una spec de ajuste, no una reinterpretación de esta.

## Escenarios

### La curva de nota por ficha

**E1 — Colocar la ficha en el sitio exacto del entrenador es un diez**
- Dado: una ficha del alumno en el mismo punto que la del modelo
- Cuando: se calcula su nota
- Entonces: es 10

**E2 — Si tu ficha tapa el punto del entrenador, sigue siendo un diez**
- Dado: una ficha del alumno a menos de 0,45 m del punto del modelo — el radio de una ficha en la
  pizarra
- Cuando: se calcula su nota
- Entonces: es 10

**E3 — Cuanta más distancia al sitio, menos nota, hasta perderla entera a partir de tres metros**
- Dado: fichas del alumno a distancias crecientes del punto del modelo, entre 0,45 m y 3 m
- Cuando: se calcula la nota de cada una
- Entonces: baja de forma proporcional a la distancia, y a partir de 3 m la nota es 0

### De la ficha a la rotación, y de la rotación al examen

**E4 — La nota de una rotación es la media de las fichas que le tocaba colocar al alumno; las
que venían dadas no cuentan**
- Dado: una rotación de un examen por puesto o por línea, con algunas fichas dadas y otras
  colocadas por el alumno
- Cuando: se calcula la nota de esa rotación
- Entonces: es la media de la nota de las fichas que le tocaba colocar, sin contar las dadas

**E5 — Una ficha sin colocar es un cero, y esa rotación no se juzga de falta**
- Dado: una rotación en la que el alumno no coloca alguna de las fichas que le tocaban
- Cuando: se calcula la nota y las faltas de esa rotación
- Entonces: la ficha sin colocar cuenta como 0 en la media, y no se evalúa ninguna falta de
  posición en esa rotación

**E6 — Una rotación con falta suya vale cero, aunque las fichas estén casi en su sitio**
- Dado: una rotación donde el alumno comete una falta de posición imputable a él (spec 012)
- Cuando: se calcula la nota de esa rotación
- Entonces: es 0, sin pasar por la distancia de sus fichas

**E7 — Una falta en una rotación no hunde las otras cinco: las seis pesan lo mismo**
- Dado: un examen completo con falta en una única rotación y el resto colocado con precisión
- Cuando: se calcula la nota final del examen
- Entonces: es la media de las seis rotaciones, cada una con el mismo peso — la falta cuesta la
  parte que le corresponde a una rotación, no arrastra a las demás a cero

**E8 — Estar en regla por pocos centímetros no quita nota**
- Dado: una rotación legal por menos del margen de tolerancia de la regla de posición (un aviso,
  no una falta)
- Cuando: se calcula su nota
- Entonces: no se penaliza por eso — solo cuenta la distancia de las fichas al modelo

### Superación e insignias

**E9 — Se supera el examen a partir de un siete, y cada tipo da su insignia: bronce, plata u
oro**
- Dado: un examen por puesto, uno por línea y uno por sistema, cada uno con nota final de al
  menos 7 y sin ninguna falta
- Cuando: se corrige cada uno
- Entonces: el de puesto concede bronce, el de línea plata y el de sistema oro

**E10 — Con una falta en cualquiera de las seis rotaciones no hay insignia, aunque la nota
llegue a siete**
- Dado: un examen con una única falta y el resto de rotaciones perfectas
- Cuando: se corrige
- Entonces: no se concede ninguna insignia, aunque la nota final sea igual o mayor que 7

**E11 — El examen por puesto y por línea se pueden corregir rotación a rotación; el de sistema
solo al completar las seis**
- Dado: un examen de cada uno de los tres tipos, con solo parte de las rotaciones entregadas
- Cuando: se pide la corrección
- Entonces: el de puesto y el de línea devuelven la nota de las rotaciones ya entregadas; el de
  sistema no devuelve corrección hasta que las seis estén entregadas

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- **Radios de la curva:** 0,45 m para el diez (el radio de una ficha en la pizarra — si la tapa,
  acierta) y 3 m para el cero (la línea de ataque, un tercio de campo). No se usa el margen de
  tolerancia de 0,05 m de la validación de posición porque mide otra cosa: el orden relativo
  entre dos jugadores a ojos del árbitro, no cuánto se acerca el alumno al modelo.
- **Decaimiento lineal, no exponencial:** una curva exponencial nunca llega a cero y necesita un
  segundo parámetro para recortarla; la lineal se explica en una frase y con un único radio de
  referencia a cada lado.
- **Falta vs. nota:** una rotación con falta vale 0 en la nota, pero eso no arrastra la media de
  las otras cinco. La insignia, en cambio, exige cero faltas en las seis — la nota informa, la
  insignia no negocia.
- **Umbral de aprobado:** 7, igual para los tres tipos.
- **Insignia por tipo, no acumulativa entre sí:** bronce, plata y oro son tres logros
  independientes, uno por tipo de examen superado, no una escalera donde el oro incluye a los
  otros dos. Si el alumno quiere las tres, tiene que superar los tres exámenes.

## Al cerrar

Pendiente — se rellena al completar la spec.
