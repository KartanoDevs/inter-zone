# Contexto para asistentes de IA — InterZone

Este fichero no repite la documentación: apunta a ella y añade lo que un modelo no puede
deducir leyendo el repositorio. Si algo aquí contradice a `docs/`, manda `docs/`.

## Qué es esto

InterZone, pizarra táctica de recepción de voleibol. Aplicación Angular sin backend.
Lee `README.md` antes de proponer nada.

Antes de tocar reglas del juego: `docs/dominio.md`.
Antes de crear ficheros o mover código: `docs/arquitectura.md`.
Antes de escribir código: `docs/flujo-de-trabajo.md`.

---

## Protocolo de arranque: "implementa la spec NNN"

Cuando el usuario diga **"implementa la spec NNN"**, **"desarrolla la spec NNN"** o
equivalente, sin más instrucciones, sigue este protocolo completo sin que haga falta
repetirlo. No empieces a programar antes del paso 0.

### Paso 0 — Comprobaciones antes de tocar nada

1. Abre `docs/especificaciones/NNN-*.md`. Si su `Estado` no es `Congelada`, para y dilo:
   no se implementa una spec en `Borrador`.
2. Si la sección `Preguntas abiertas` de la spec no está vacía, para y dilo: hay que
   resolverlas con el usuario antes de escribir un test.
3. Relee `CLAUDE.md`, `docs/dominio.md` y `docs/arquitectura.md` enteros, aunque ya los
   hayas leído antes en la conversación. Las reglas de negocio no se recuerdan de memoria,
   se consultan.
4. Anuncia cuántos escenarios tiene la spec y en qué fichero(s) de `domain/` van a vivir el
   test y el código. Un escenario por commit lógico, nunca varios a la vez.

### Paso 1 a N — Un escenario cada vez, sin excepción

Por cada escenario, en este orden exacto:

1. **Rojo.** Escribe el test de un único escenario en el `.spec.ts` correspondiente, con el
   id del escenario en el nombre del test (`it('E4: ...')`). Ejecuta `npm test` y muestra el
   resultado. Si falla por `ReferenceError` (la función o el tipo no existe), créala vacía o
   con un `throw` y vuelve a ejecutar: el fallo válido es una aserción, nunca un error de
   referencia.
2. **Código mínimo.** Escribe solo lo necesario para que ese test pase. Prohibido adelantar
   trabajo de escenarios futuros, añadir parámetros, ramas o casos que ningún test pida
   todavía.
3. **Verde.** Ejecuta `npm test` sobre la suite entera (no solo el test nuevo) y muestra que
   todo pasa, incluidos los escenarios anteriores.
4. **Refactor si hace falta**, con la suite en verde. Nunca se toca un test en este paso; si
   hiciera falta cambiar uno, eso es un cambio de comportamiento, no un refactor, y hay que
   pararse a discutirlo.
5. **Parar y esperar confirmación explícita del usuario antes de pasar al siguiente
   escenario.** No autoavanzar aunque el siguiente escenario parezca trivial o evidente.

### Paso final — Cerrar la spec

Cuando el último escenario esté en verde:

1. Ejecuta la suite completa una vez más y confirma cobertura 100% en `domain/`.
2. Rellena la sección `Al cerrar` de la spec: qué se desvió de lo previsto, qué sorprendió.
   Si no hay ninguna desviación en una spec de más de cinco escenarios, dilo explícitamente
   y pregunta al usuario si de verdad no hubo sorpresas — puede ser señal de que la spec se
   escribió mirando ya la solución.
3. Cambia el `Estado` de la spec a `Completada`.
4. Si algo aprendido corrige una regla de voleibol, actualiza `docs/dominio.md` y dilo.
5. Si algo aprendido es una decisión estructural nueva, añade entrada en `docs/decisiones.md`
   (append-only, nunca edites una entrada existente) y dilo.
6. No empieces la siguiente spec sin que el usuario lo pida explícitamente.

### Qué hacer si el usuario solo pega una spec nueva sin pedir "implementa"

Si el usuario pega o escribe una especificación nueva sin decir "implementa", tu trabajo es
**revisarla, no programarla**: comprobar que tiene escenarios con casos límite y no solo el
camino feliz, señalar si detectas una regla de voleibol dudosa o un hueco, y esperar a que
el usuario la congele. No escribas código a partir de una spec en `Borrador`.

---

## Invariantes que no se negocian

1. **Nunca píxeles en el modelo.** Las posiciones son metros. Los píxeles solo existen
   dentro del componente que renderiza el SVG.
2. **`domain/` no importa nada externo.** Ni Angular, ni RxJS, ni el DOM, ni utilidades de
   terceros. Solo TypeScript y otros ficheros de `domain/`.
3. **Ningún código de producción antes de un test que falle.** Y el fallo debe ser una
   aserción, no un error de referencia por función inexistente.
4. **La posición rotacional se deriva, nunca se almacena.** Se calcula desde el orden de
   saque y la rotación.
5. **La etiqueta de un jugador se deriva, nunca se almacena.** Se calcula desde el rol, la
   configuración de roles y el índice.
6. **Huecos y conflictos se derivan, nunca se almacenan.** Se calculan desde la asignación
   de celdas.
7. **Sin Fabric.js, sin Canvas, sin librerías de gráficos.** SVG nativo desde signals.
8. **Sin backend, sin base de datos, sin autenticación.** Ver decisión 0001.

## Errores que ya se han cometido y no hay que repetir

- Proponer PostgreSQL, Prisma o Express porque "un proyecto serio los lleva". No lleva.
- Meter un patrón Adapter para el renderizado. No hay dos implementaciones ni se esperan.
- Crear una interfaz con una única implementación por si acaso. La única excepción
  aceptada es `SistemaRepository`, y está justificada en `docs/arquitectura.md`.
- Tratar las seis rotaciones como seis conjuntos independientes de posiciones.
- Modelar la zona de responsabilidad como un círculo con un radio ajustable por slider.
- Confundir **rol** (colocador, receptor…, permanente) con **posición rotacional**
  (P1..P6, cambia en cada rotación). Son cosas distintas y ambas aparecen en el modelo.
- Dar por hecho que la abreviatura del central es "C". Es "M": la C es del colocador.
- Escribir todos los tests de una spec de golpe y luego la función completa. Eso es generar
  tests, no hacer TDD. Ver el protocolo de arranque más arriba.

## Convenciones

- **Idioma del dominio: castellano.** `colocador`, `rotacion`, `formacion`, `libero`,
  `ordenSaque`, `etiqueta`. Es el vocabulario del entrenador y evita traducciones que
  confunden (`setter` / `colocador` / `passer` se mezclan con facilidad).
- Idioma de la infraestructura y de las APIs del framework: lo que use el framework.
- Los identificadores de rol son estables y en minúscula: `colocador`, `receptor`,
  `central`, `opuesto`, `libero`. Los nombres visibles y las abreviaturas son
  configuración, y pueden cambiar sin romper nada.
- Nombres de test en lenguaje de voleibol, con el id del escenario delante:
  `it('E4: falta si P1 está por delante de P2', ...)`.
- Tests junto al fichero que prueban, no en carpeta paralela.
- Comentarios: solo para explicar un porqué no evidente. Nunca para narrar lo que el código
  ya dice.

## Cómo ayudar bien aquí

- Si una petición choca con una decisión de `docs/decisiones.md`, decirlo antes de hacerla.
- Si falta información para escribir un test correcto, preguntar en vez de suponer una
  regla de voleibol. Las reglas inventadas son el peor fallo posible en este proyecto:
  parecen razonables y enseñan cosas falsas a jugadores reales.
- Implementar un escenario cada vez. No escribir los tests de toda una spec y luego toda
  la función: eso es escribir tests, no TDD.
- Preferir menos código y menos ficheros. La deuda aquí no es técnica, es de andamiaje.
