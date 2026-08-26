# 056 — Insignias del examen

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

Ganar la insignia de un examen (spec 055) no sirve de nada si desaparece al cerrar sesión: nadie
puede presumir de lo que ya ha superado, ni el entrenador ver el progreso de su equipo.

## Objetivo

Ganar una insignia queda guardado en la cuenta que la ganó, para siempre, y se puede consultar
más tarde — al menos, mostrada en la ventana "Cuenta" de quien la ganó.

## Fuera de alcance

- **Guardar la nota, las faltas o las colocaciones del intento.** Solo se guarda el hecho de
  haber ganado la insignia — quién, de qué examen, y cuándo. La nota es un cálculo que puede
  cambiar de fórmula el día de mañana (specs 012-013); un histórico de notas quedaría atado a la
  fórmula con la que se calcularon.
- **Quitar una insignia ya ganada.** No hay borrado ni caducidad.
- **Mostrar las insignias de otra cuenta** (por ejemplo, que el entrenador vea las de todo el
  equipo desde un panel). Esta spec solo cubre que cada cuenta vea las suyas propias.
- **Insignias de examen de defensa.** No existe examen de defensa (spec 012).
- **Cambiar qué insignia corresponde a cada tipo de examen** (bronce/plata/oro) — eso ya lo fija
  la spec 013; aquí solo se persiste el resultado.

## Escenarios

**E1 — Ganar un examen guarda su insignia en la cuenta**
- Dado: una cuenta que corrige un examen y su nota y faltas conceden la insignia del tipo
- Cuando: se corrige
- Entonces: queda guardado que esa cuenta ganó esa insignia, para ese sistema y (si el tipo lo
  exige) ese titular examinado

**E2 — No superarlo no guarda nada**
- Dado: una cuenta que corrige un examen cuya nota o cuyas faltas no conceden la insignia
- Cuando: se corrige
- Entonces: no se guarda ninguna insignia nueva

**E3 — Repetir un examen ya superado no duplica ni pierde la insignia**
- Dado: una cuenta que ya ganó una insignia concreta (mismo sistema, tipo y titular si aplica)
- Cuando: vuelve a superar ese mismo examen
- Entonces: sigue existiendo una sola insignia de ese examen, con la fecha en que se ganó la
  primera vez

**E4 — Las insignias de una cuenta se pueden consultar**
- Dado: una cuenta con alguna insignia ganada
- Cuando: se piden sus insignias
- Entonces: se obtiene la lista de las que tiene, con el sistema, el tipo y (si aplica) el
  titular de cada una

**E5 — Una cuenta sin ninguna insignia no da error al consultarlas**
- Dado: una cuenta que nunca ha superado un examen
- Cuando: se piden sus insignias
- Entonces: se obtiene una lista vacía, no un error

**E6 — Solo la propia cuenta ve sus insignias**
- Dado: dos cuentas distintas, una con insignias ganadas
- Cuando: la otra cuenta pide ver insignias
- Entonces: solo puede pedir y recibir las suyas propias, nunca las de la primera

**E7 — Guardar una insignia exige sesión iniciada**
- Dado: ninguna sesión iniciada
- Cuando: se intenta registrar que se ha ganado una insignia
- Entonces: se rechaza

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de escribir esta spec:

- Lo que se guarda es el logro, no la nota ni el intento — coherente con que el veredicto de
  validación tampoco se persiste hoy (se recalcula siempre al vuelo).
- El alcance de "consultar insignias" en esta spec es solo la propia cuenta; un panel para que el
  entrenador vea las de su equipo es una spec futura, sin numerar todavía.

## Al cerrar

Los 7 escenarios pasan (E1, E1b, E3, E4, E5, E6, E7, E7b — 8 tests de servidor en verde contra
Postgres real, más 4 tests del adaptador HTTP del cliente). No se hizo TDD escenario a escenario
propiamente dicho: como ya observó la spec 054 al cerrarse, esto es CRUD puro sobre Prisma sin
lógica de dominio que aislar (`domain/insignias.ts` solo declara el tipo `InsigniaGanada`, sin
ninguna función). Los tests de servidor se escribieron e hicieron pasar contra la base de datos
real directamente, sin ciclo rojo-verde de dominio.

**Imprevisto real, en el fixture de los tests, no en el código de producción.** Los primeros
tests fallaban con un mensaje de Prisma engañoso ("Argument `usuario` is missing") al registrar
una segunda cuenta con invitación sin equipo. La causa: `resolverAltaDesdeInvitacion` (ya
existente, de la spec 035) afilia a una cuenta sin equipo asignado a **todos** los equipos que
conoce el dominio (`EQUIPOS = ['masculino', 'femenino']`); si solo uno de los dos existe en la
base de datos en ese momento, `mapaEquipos()` no encuentra el id del que falta y la escritura
revienta con un mensaje de validación de Prisma que no delata la causa real. El `beforeEach` de
esta spec no sembraba el equipo femenino porque no lo necesitaba para nada más — se corrigió
sembrando los dos equipos antes de cualquier registro. No es un bug de `acceso.ts` ni de esta
spec: es una precondición implícita de `registrar` que no estaba documentada donde un fixture
nuevo pudiera verla venir.

**Decisión de modelado no anticipada al escribir la spec, tomada al implementar:** `titular_id`
en la tabla no es nullable, sino `TEXT NOT NULL DEFAULT ''`. La clave primaria de
`insignia_examen` es compuesta (`usuario_id`, `sistema_id`, `tipo`, `titular_id`) para que el
`@@id` por sí solo impida duplicar una insignia (E3) sin necesitar un `upsert` con lógica extra.
Postgres trata cada `NULL` de una clave como distinto de los demás, así que un `titular_id`
nullable habría permitido registrar la insignia de tipo `'sistema'` (que nunca lleva titular)
más de una vez para el mismo usuario y sistema. Se resolvió con la cadena vacía como valor
centinela de "sin titular", más un `CHECK` que ata `titular_id = ''` a `tipo = 'sistema'` — igual
de estricto que un `NULL`, pero compatible con la clave compuesta.

**Nada se desvió del resto:** los escenarios se implementaron tal como se escribieron, las rutas
de examen conviven con las ya existentes en `servidor.ts` sin fricción, y el puerto
`InsigniasRepository` no necesitó ningún ajuste sobre lo diseñado en la spec.
