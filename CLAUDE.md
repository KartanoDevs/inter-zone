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
repetirlo. No escribas código antes de terminar el paso 0.

### Paso 0 — Comprobaciones previas

1. Abre `docs/especificaciones/NNN-*.md`. Si su `Estado` no es `Congelada`, **para y dilo**:
   una spec en `Borrador` no se implementa.
2. Si su sección `Preguntas abiertas` no está vacía, **para y dilo**: hay que resolverlas con
   el usuario antes de escribir un solo test.
3. Lee `docs/dominio.md`, `docs/arquitectura.md` y `docs/flujo-de-trabajo.md` en esta sesión,
   aunque creas recordarlos. Las reglas de voleibol se consultan, no se recuerdan.
4. Anuncia, antes de tocar nada: cuántos escenarios tiene la spec, en qué ficheros de
   `src/app/domain/` van a vivir el test y el código, y en qué orden vas a recorrer los
   escenarios (por defecto, el de la spec; si alguno depende de otro, dilo y justifícalo).

### Alcance: qué NO se toca

Salvo que la spec lo pida explícitamente:

- No se crean componentes ni se toca `src/app/ui/`, `application/` o `infrastructure/`.
- No se modifica `app.ts`, `app.config.ts`, `app.html` ni `angular.json`.
- No se instalan dependencias. Si crees que hace falta una, **pregunta primero** y explica
  por qué no se puede resolver con TypeScript a secas.
- **No se edita la spec durante la implementación.** Está congelada. Si descubres que dice
  algo incorrecto, para y dilo; la corrige el usuario, y solo entonces se sigue.

### El ciclo, un escenario cada vez

Por cada escenario, en este orden exacto:

1. **Rojo.** Escribe el test de **un único** escenario en el `.spec.ts` correspondiente, con
   el id del escenario en el nombre (`it('E4: ...')`). Ejecuta `npm test` y muestra el
   resultado. Si falla con `ReferenceError` porque la función o el tipo no existe, créalos
   vacíos y vuelve a ejecutar: el fallo válido es una **aserción**, nunca un error de
   referencia. Un test que revienta porque falta la función no ha demostrado nada.
2. **Código mínimo.** Solo lo necesario para que ese test pase. Prohibido adelantar trabajo
   de escenarios futuros o añadir ramas que ningún test pida todavía. En los primeros
   escenarios lo mínimo puede ser devolver una constante: **eso es correcto y esperado**, no
   un atajo del que haya que disculparse. Serán los siguientes tests los que fuercen la
   lógica real.
3. **Verde.** Ejecuta `npm test` sobre la suite **entera**, no solo el test nuevo, y muestra
   que pasan también todos los escenarios anteriores.
4. **Refactor**, si hace falta, con la suite en verde. **Los tests no se tocan en este paso.**
   Si para que algo pase hubiera que cambiar un test, no es un refactor: es un cambio de
   comportamiento, y hay que parar y discutirlo.
5. **Para y espera confirmación explícita del usuario** antes del siguiente escenario. No
   autoavances aunque el siguiente parezca trivial.

**Commits.** El repositorio está en Git. Cuando el usuario confirme un escenario y toque
pasar al siguiente, sugiere un commit con el escenario en el mensaje, por ejemplo
`git commit -m "E4: falta si el zaguero esta por delante de su delantero"`. No hagas el
commit tú solo sin que el usuario lo pida o lo apruebe: proponlo, no lo ejecutes por tu
cuenta. Un commit por escenario deja un historial que documenta el propio ciclo rojo-verde,
que es la parte más valiosa de tener esto versionado. Antes de cualquier commit, carga la
skill `caveman-commit`.

**Ramas y merge.** El flujo es local, sin Pull Requests (no hay `gh` instalado y el
historial se mantiene lineal):

- Las ramas de trabajo salen de `main` actualizada y vuelven a `main` por **merge
  fast-forward** (`git checkout main && git merge --ff-only <rama> && git push origin main`).
  Si la rama se ha quedado atrás, se rebasa sobre `main` antes.
- **Nunca borres una rama, local ni remota, sin que el usuario te lo pida explícitamente.**
  Tampoco tras un merge: propón el borrado, no lo ejecutes.
- Antes de pushear `main`: `npm test` y `npm run typecheck` en verde, y si se tocó UI,
  relanzar la app (skill `relanzar-app`).
- No hagas `push --force`, `reset --hard` sobre trabajo no versionado, ni reescribas
  historia ya pusheada sin pedirlo.

**Válvula de escape:** si el usuario dice explícitamente algo como "sigue hasta E8 sin
parar" o "encadena los que queden", puedes hacerlo — pero manteniendo el ciclo
rojo → mínimo → verde en cada escenario por separado y mostrando el resultado de cada uno.
Lo que nunca se hace es escribir todos los tests juntos y después la función entera.

### Paso final — Cerrar la spec

Cuando el último escenario esté en verde:

1. Ejecuta la suite completa una vez más y muestra el resultado. Si existe el script
   `test:coverage`, ejecútalo y reporta la cobertura de `src/app/domain/`; si no existe, no
   lo inventes: dilo y sigue.
2. Rellena la sección `Al cerrar` de la spec con lo que realmente pasó: qué se desvió de lo
   previsto, qué te sorprendió, qué resultó más difícil de lo esperado. **No inventes
   desviaciones para rellenar el hueco.** Si de verdad no hubo ninguna, escribe "ninguna" y
   dilo abiertamente; es un dato útil, no un suspenso.
3. Cambia el `Estado` de la spec a `Completada`.
4. Si algo aprendido corrige o precisa una regla de voleibol, actualiza `docs/dominio.md` y
   avisa de qué has cambiado.
5. Si algo aprendido es una decisión estructural nueva, añade un fichero nuevo en
   `docs/decisiones/` con el siguiente número (`NNNN-slug.md`) y su entrada en
   `docs/decisiones/README.md` (append-only: nunca edites ni borres una decisión existente) y
   avisa.
6. Si la spec cambió qué capas existen, qué adaptador está en uso, o qué hace la aplicación en
   producción —no solo cómo lo hace por dentro—, actualiza también `docs/arquitectura.md` y
   `README.md` (ADR 0027) y avisa de qué has cambiado. La mayoría de specs no mueven nada de
   eso; si no es el caso, no hay nada que tocar aquí.
7. **No empieces la siguiente spec** sin que el usuario lo pida.

### Si el usuario pega una spec nueva sin pedir que la implementes

Tu trabajo es **revisarla, no programarla**: comprobar que los escenarios cubren casos límite
y no solo el camino feliz, señalar reglas de voleibol dudosas o huecos, y proponer los
escenarios que falten. Después espera a que el usuario la congele. No se escribe código a
partir de una spec en `Borrador`.

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
8. **`server/` solo importa de `src/app/domain/`.** Nunca de `application/`, `infrastructure/`
   ni `ui/`, y jamás al revés: el dominio no sabe que existe un servidor. Desde la v2 hay
   backend y base de datos (decisión 0023, que sustituye a la 0001). La autenticación, que esa
   misma decisión anunciaba y la 0028 aplazó, se retoma en la decisión 0036: lista blanca,
   cuentas con contraseña y sesión (spec 035) ya existen en `/api/auth`. **`/api/sistemas`
   sigue sin exigir sesión** — cerrar esa puerta según el rol de quien pregunta es la spec 037,
   todavía sin hacer, así que hoy sigue siendo pertinente no exponer el servidor a una red que
   no sea de confianza. Lo que permite compartir el dominio entre navegador y servidor es el
   invariante 2, así que romperlo ahora cuesta el doble que antes.

## Errores que ya se han cometido y no hay que repetir

- Tratar las seis rotaciones como seis conjuntos independientes de posiciones.
- Modelar la zona de responsabilidad como un círculo con un radio ajustable por slider.
- Confundir **rol** (colocador, receptor…, permanente) con **posición rotacional**
  (P1..P6, cambia en cada rotación). Son cosas distintas y ambas aparecen en el modelo.
- Dar por hecho que el central y el colocador no pueden compartir letra base. Desde el ADR
  0009 el central usa "C" igual que el colocador; se distinguen porque el colocador nunca
  lleva índice (`C`) y el central siempre lo lleva (`C1`/`C2`).
- Escribir todos los tests de una spec de golpe y luego la función completa. Eso es generar
  tests, no hacer TDD.
- Empezar a implementar una spec que toca `ui/`, `application/` o `infrastructure/` sin que
  su sección "Fuera de alcance" lo autorice explícitamente. La regla por defecto de este
  fichero es no tocar esas capas; una spec que sí necesita hacerlo tiene que decirlo con
  todas las letras, o el protocolo de arranque debe pararse a preguntarlo.
- Confundir una convención táctica con una regla de reglamento. `docs/dominio.md` afirmó
  durante las specs 002-010 que "el líbero sustituye a un central", y de ahí salió un modelo
  (líbero con plaza fija en el orden de saque) que bloqueaba tres de cada seis rotaciones con
  una falta que en un partido real no existe. La regla FIVB real (19.3.1.1) es que el líbero
  sustituye a **cualquier** jugador de zaga; que en el 5-1 sea casi siempre el central es
  decisión del entrenador, no del reglamento. Antes de escribir una regla de voleibol en
  `docs/dominio.md`, comprobar la fuente — sobre todo si "siempre se hace así" empieza a sonar
  a costumbre más que a reglamento.

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

- Si una petición choca con una decisión de `docs/decisiones/`, decirlo antes de hacerla.
- Si falta información para escribir un test correcto, preguntar en vez de suponer una
  regla de voleibol. Las reglas inventadas son el peor fallo posible en este proyecto:
  parecen razonables y enseñan cosas falsas a jugadores reales.
- Implementar un escenario cada vez.
- Preferir menos código y menos ficheros. La deuda aquí no es técnica, es de andamiaje.

## graphify

This project has a knowledge graph at `graphify-out/` (incluye `graph.json`) con god nodes,
estructura de comunidades y relaciones entre ficheros.

**Obligatorio: consulta graphify antes de explorar el código a mano.** Antes de leer código
fuente para responder una pregunta sobre el proyecto —qué depende de qué, dónde vive algo,
cómo se relacionan dos piezas—, usa graphify primero. No sustituye a `docs/`, pero sí a
explorar el repo a ciegas con grep o abriendo ficheros al azar.

Rules:
- Para preguntas sobre el código, ejecuta primero `graphify query "<pregunta>"` (existe
  `graphify-out/graph.json`). Usa `graphify path "<A>" "<B>"` para relaciones entre dos
  piezas y `graphify explain "<concepto>"` para un concepto concreto. Devuelven un subgrafo
  acotado, normalmente mucho más pequeño que GRAPH_REPORT.md o que grep en crudo.
- Si existe `graphify-out/wiki/index.md`, úsalo para navegación amplia en vez de explorar el
  código fuente directamente.
- Lee `graphify-out/GRAPH_REPORT.md` solo para revisión de arquitectura amplia o cuando
  query/path/explain no den suficiente contexto.
- Después de modificar código, ejecuta `graphify update .` para mantener el grafo al día
  (solo AST, sin coste de API).
- Esta regla también aplica a subagentes: si delegas exploración de código en un Agent,
  incluye esta instrucción de graphify en su prompt.
