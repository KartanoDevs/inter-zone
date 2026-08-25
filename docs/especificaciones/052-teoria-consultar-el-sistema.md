# 052 — Teoría: consultar el sistema

**Estado:** Completada
**Paso de la hoja de ruta:** 4 (consulta) y 8 (acceso)

## Problema

Un jugador que entra a la aplicación no tiene nada que hacer: el editor es para el entrenador,
y no hay ningún sitio donde estudiar un sistema ya hecho sin arriesgarse a tocarlo.

## Objetivo

Cualquier cuenta puede abrir una pestaña "Teoría" y recorrer los sistemas validados del equipo
— rotación a rotación en recepción, por caso/situación/bloqueadores en defensa — viendo
exactamente lo mismo que ve el entrenador en el editor (fichas, zonas, sombra, explicaciones),
sin poder cambiar nada.

## Fuera de alcance

- Sistemas en borrador: Teoría solo lista los validados (spec 051). Un equipo sin ninguno
  validado ve la pestaña vacía con un aviso, no un error.
- El examen con nota — specs 012-013, siguen sin escribir.
- Restringir la pestaña Editor por rol — spec 037. Hoy Teoría se suma a lo que ya existe, no
  quita nada.
- Crear, renombrar, clonar o borrar un sistema desde Teoría.
- Pintar celdas, mover fichas, retocar la sombra o cambiar la explicación — todo de solo
  lectura.
- Compartir el borrador o la navegación (rotación, caso, situación) con el Editor: Teoría tiene
  su propia navegación, independiente de la del entrenador, para no interferir con un cambio sin
  guardar que tuviera a medias.

## Escenarios

**E1 — Teoría lista los sistemas validados del equipo activo**
- Dado: un equipo con sistemas validados y otros en borrador
- Cuando: se abre Teoría
- Entonces: solo aparecen los validados

**E2 — Un equipo sin ningún sistema validado muestra un aviso, no una pista vacía**
- Dado: un equipo sin ningún sistema validado
- Cuando: se abre Teoría
- Entonces: se explica que todavía no hay nada validado, en vez de una pista en blanco

**E3 — Abrir un sistema de recepción muestra su descripción y permite recorrer sus rotaciones**
- Dado: un sistema de recepción validado
- Cuando: se abre y se recorren R1 a R6
- Entonces: se ven las seis fichas colocadas de cada rotación, con su etiqueta, y la
  explicación de esa rotación (o la de la ficha seleccionada, si hay una)

**E4 — Abrir un sistema de defensa permite recorrer caso, situación y bloqueadores**
- Dado: un sistema de defensa validado
- Cuando: se cambia el caso del colocador rival, la situación de ataque y el número de
  bloqueadores
- Entonces: se ven los seis puestos de esa variante, o un aviso de que esa combinación no está
  trabajada si no hay ninguna variante guardada

**E5 — Las zonas de responsabilidad y de finta se ven con su leyenda de colores**
- Dado: un sistema de defensa con celdas pintadas
- Cuando: se selecciona un puesto
- Entonces: sus zonas de defensa y de finta se ven resaltadas, las de los demás atenuadas, con
  la misma leyenda de colores que en el editor

**E6 — La sombra del bloqueo se ve, con el retoque que tuviera guardado**
- Dado: una variante con bloqueadores y un desplazamiento de sombra guardado
- Cuando: se abre esa variante
- Entonces: la sombra se ve en su posición retocada, sin poder arrastrarla

**E7 — Nada se puede arrastrar, pintar ni editar**
- Dado: cualquier sistema abierto en Teoría
- Cuando: se intenta arrastrar una ficha, pintar una celda o editar una explicación
- Entonces: no ocurre nada — no hay gesto de arrastre, ni modo de pintado, ni botón de editar

**E8 — Cambiar de equipo cambia la lista y cierra el sistema abierto**
- Dado: Teoría abierta con un sistema de un equipo
- Cuando: se cambia de equipo
- Entonces: la lista pasa a la del nuevo equipo, y se activa su primer sistema validado (o
  ninguno, si no tiene)

**E9 — Volver al editor conserva su trabajo sin guardar**
- Dado: el editor con cambios sin guardar en una rotación
- Cuando: se abre Teoría y se vuelve al editor
- Entonces: el cambio sin guardar sigue ahí, intacto

## Preguntas abiertas

Ninguna.

## Al cerrar

E1, E2, E3, E4, E8 y E9 tienen test en `application/teoria.store.spec.ts` (7 tests, verde).
E5, E6 y E7 se verifican mirando: `ui/` no lleva test automático en este proyecto (misma
convención que las specs 050/051), y una zona pintada, una sombra o la ausencia total de
arrastre no son cosas que un test unitario mida bien. Se comprobó compilando y sirviendo la
aplicación entera con el dev server de Angular, sin errores — **sin comprobación visual en
navegador**, misma nota que las dos specs anteriores. Suite de dominio/application/
infrastructure: 388/388. `npm run typecheck` limpio.

**Desviación real del ciclo rojo-verde, y por qué:** `TeoriaStore` se escribió entero antes que
su test, no escenario a escenario. La spec exigía nueve piezas que encajan unas con otras
(navegación, formación activa, explicación, celdas, sombra) y trocearlas en TDD estricto habría
significado escribir y desechar tipos intermedios varias veces. Se optó por construirlo de una
vez, imitando el diseño ya verificado de `SistemaStore`, y escribir el test inmediatamente
después contra el código ya terminado — un desvío consciente del ciclo que las specs 035, 050 y
051 sí siguieron estrictamente escenario a escenario. Se anota aquí en vez de disimularlo.

**Imprevisto real, encontrado al construir la UI:** reutilizar en `TeoriaTablero` las funciones
de etiqueta/color que ya existían en `tablero.ts` (`idOcupanteDe`, `indiceColorDe`...) habría
creado un import circular entre los dos componentes. Se resolvió extrayéndolas a
`ui/comun/ficha-vista.ts`, sin estado, importable desde los dos sin ciclo — documentado en la
ADR 0039 junto a la decisión de fondo (que Teoría no comparta store con el editor).

**Segundo imprevisto, detectado por el propio compilador de plantillas de Angular, no por
`tsc`:** `SelectorRotacion.seleccionar` emite `number` a secas; `TeoriaStore.seleccionarRotacion`
exige `RotacionValida`. `tsc --noEmit` no lo vio (no tipa plantillas), pero
`ng build`/`devserver_wait_for_build` sí — confirma por qué el flujo de trabajo pide levantar el
dev server antes de dar por bueno un cambio de UI, no solo el typecheck. Se resolvió con el mismo
patrón que ya usaba `Tablero`: un método intermedio que acota el tipo.

**Decisión de producto tomada al escribir la spec, no anticipada en el encargo original:** una
rotación o variante nunca guardada muestra un aviso explícito ("todavía no está colocada" /
"todavía no está trabajada") en vez de, como hace el editor, arrancar con una formación de
partida ya colocada. Tiene sentido en Teoría porque no hay nada que "empezar a colocar" en una
vista de solo lectura — mostrar la formación de partida del editor habría hecho parecer
trabajado algo que el entrenador nunca llegó a tocar.
