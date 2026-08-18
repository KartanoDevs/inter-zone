# 033 — El servidor guarda los sistemas

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

Todo lo que la pizarra guarda vive en el navegador de una sola persona. Para que dos
entrenadores editen el mismo catálogo desde dos sitios hace falta un sitio compartido donde
vivan los sistemas: una base de datos real, detrás de una API.

## Objetivo

Nace `server/`: una API que guarda y sirve sistemas en PostgreSQL, con el esquema de
`docs/modelo-de-datos.md`. Un cliente puede pedir el catálogo de un equipo, crear un sistema,
actualizarlo y borrarlo, y lo que queda escrito respeta las mismas reglas de forma que ya respeta
el navegador — más las que solo una base de datos compartida puede exigir de verdad.

## Fuera de alcance

- **Cualquier cambio en `src/`.** La pizarra sigue hablando con `localStorage`; conectarla al
  servidor es la spec 034.
- **Login, sesiones, roles.** El servidor no comprueba quién pregunta. Specs 035-037.
- **Las tres tablas de acceso** (`usuario`, `lista_blanca`, `membresia`) de
  `docs/modelo-de-datos.md`. Sin login que las use, crearlas ahora sería tabla sin dueño; entran
  con la spec 035, en una migración nueva — el propio documento garantiza que añadir una tabla
  nunca toca las que ya existen.
- **El estado validado/borrador.** Mismo motivo que en la spec 032: sin nadie que valide, no
  tiene efecto. La columna `estado` de `sistema` se crea igualmente —quitarla ahora y añadirla
  luego sería la migración que el documento promete no hacer falta—, pero ningún endpoint la
  toca todavía; nace siempre en `'borrador'`. `creado_por`, `validado_por` y `validado_en` —y
  con ellos el `CHECK sistema_validado_con_fecha`— no se crean en esta migración: referencian
  `usuario`, que no existe hasta la spec 035, y sin esas columnas el `CHECK` no tendría a qué
  aplicarse. Llegan juntos, en la migración que también trae `usuario`.
- **Validar la legalidad de una formación (`validarFormacion`).** No es un `CHECK` ni tampoco
  una comprobación de servidor: `docs/modelo-de-datos.md` §6 ya explica por qué una formación
  con falta es un dato legítimo. El servidor sí comprueba que el **roster** de una formación sea
  el correcto —los seis jugadores que tocan en esa rotación, ni más ni menos—, que es estructura,
  no legalidad.
- **Desplegar en ningún sitio.** Corre en local, con Postgres en Docker para desarrollar y para
  los tests de integración.

**Esta spec no toca `src/`, pero crea `server/` entero: `package.json`, esquema, migraciones,
semilla y rutas HTTP.** Es la primera vez que el repositorio tiene un segundo proyecto Node
además del de Angular.

## Escenarios

Todos se verifican con la API HTTP contra una base de datos Postgres real (contenedor
desechable), no contra un doble en memoria: lo que hace valiosa esta spec es precisamente que
haya una base de datos de verdad detrás.

### El catálogo

**E1 — Un catálogo vacío devuelve una lista vacía**
- Dado: una base de datos recién migrada, sin nada sembrado
- Cuando: se pide el catálogo de un equipo
- Entonces: se obtiene una lista vacía, sin error

**E9 — El catálogo se filtra por equipo**
- Dado: sistemas guardados en los dos equipos
- Cuando: se pide el catálogo de uno de ellos
- Entonces: solo aparecen los suyos

### Crear

**E2 — Crear un sistema lo persiste con sus seis rotaciones ya creadas**
- Dado: un equipo sin sistemas
- Cuando: se crea un sistema de recepción con nombre y tipo
- Entonces: al releer el catálogo aparece, con sus seis rotaciones vacías listas para guardar
  una formación en cualquiera de ellas

**E3 — Un nombre repetido en el mismo equipo y tipo se rechaza**
- Dado: un sistema de recepción llamado «5-1» en un equipo
- Cuando: se intenta crear otro sistema de recepción con ese mismo nombre, en el mismo equipo
- Entonces: se rechaza

**E4 — El mismo nombre en equipos distintos se acepta**
- Dado: un sistema de recepción llamado «5-1» en el equipo masculino
- Cuando: se crea otro sistema de recepción llamado «5-1» en el equipo femenino
- Entonces: se acepta

### Guardar una formación

**E5 — Una formación con el roster equivocado se rechaza**
- Dado: un sistema recién creado y su rotación 1
- Cuando: se intenta guardar en ella una formación que no trae exactamente los seis jugadores
  que tocan en esa rotación (falta uno, sobra otro, o hay un id que no existe)
- Entonces: se rechaza, sin escribir nada

**E11 — Las celdas de una colocación sobreviven con sus tres estados**
- Dado: una formación de defensa donde un jugador no tiene celdas pintadas, otro las tiene
  vaciadas a propósito, y un tercero tiene una zona pintada
- Cuando: se guarda y se vuelve a leer
- Entonces: los tres estados —ausente, lista vacía, lista con celdas— llegan intactos y
  distinguibles

### Actualizar y concurrencia

**E6 — Actualizar con el testigo correcto se acepta**
- Dado: un sistema guardado, con su marca de última modificación
- Cuando: se actualiza aportando esa misma marca
- Entonces: se acepta, y la marca de modificación avanza

**E7 — Actualizar con un testigo caducado se rechaza**
- Dado: un sistema que alguien más modificó después de que este cliente lo leyera por última vez
- Cuando: se intenta actualizar aportando la marca antigua
- Entonces: se rechaza — el cambio de ese cliente no se aplica, y lo guardado por el otro no se
  pierde

### Borrar

**E8 — Borrar un sistema lo hace desaparecer, con todo lo suyo**
- Dado: un sistema guardado con formaciones y colocaciones
- Cuando: se borra
- Entonces: deja de aparecer en el catálogo, y nada de lo que colgaba de él queda huérfano

### Semilla

**E10 — La semilla reproduce exactamente lo que produce el dominio**
- Dado: una base de datos recién migrada
- Cuando: se siembra
- Entonces: el equipo masculino tiene los dos sistemas de ejemplo (recepción y defensa),
  idénticos formación a formación a los que ya produce `sistemaPorDefecto` y
  `sistemaDefensaPorDefecto`; el equipo femenino no tiene ninguno

## Preguntas abiertas

Ninguna. Decisiones tomadas antes de congelar:

- **De las nueve tablas del documento, esta spec crea seis**: `equipo`, `jugador`, `sistema`,
  `sistema_rotacion`, `formacion`, `colocacion`. Las tres de acceso llegan con la spec 035, en su
  propia migración.
- El servidor reutiliza `jugadoresEnPista` de `src/app/domain/rotacion.ts` para comprobar el
  roster de una formación (E5) — no reimplementa esa regla. No reutiliza `crearSistema` para la
  unicidad del nombre (E3, E4): la comprueba directamente la restricción `UNIQUE` de Postgres,
  más simple que reconstruir el catálogo entero solo para preguntarle al dominio.
- La API vive bajo `/api`: `GET /api/sistemas?equipoId=`, `POST /api/sistemas`,
  `PUT /api/sistemas/:id`, `DELETE /api/sistemas/:id`.
- El testigo de concurrencia (E6, E7) viaja como cabecera `If-Match` con el valor de
  `actualizado_en`, siguiendo el mecanismo HTTP estándar para esto — no un campo de negocio
  inventado.

## Al cerrar

Los 11 escenarios pasan contra un Postgres real en Docker, más un escenario de refuerzo
(«borrar un id que no existe devuelve 404, no 500») encontrado probando la API a mano después
de que la suite automática ya estuviera en verde. `npm test` en la raíz — 268 tests — y
`npm run build` siguen intactos: esta spec no tocó `src/`. Dentro de `server/`, `npm test` corre
12 tests de integración contra Postgres real; no hay `test:coverage` ni se inventa un número.

**El precio real de esta spec fue de infraestructura, no de lógica.** Tres fallos genuinos
aparecieron antes de escribir el primer test, todos por chocar con algo que la documentación
previa no podía prever porque dependía del entorno o de versiones concretas de herramientas:

1. **`postgres:18-alpine` cambió su punto de montaje esperado** de `/var/lib/postgresql/data` a
   `/var/lib/postgresql` (docker-library/postgres#1259). El contenedor no arrancaba —salía con
   error, no con datos corruptos— hasta corregir `docker-compose.yml`.
2. **Prisma 7 exige un `prisma.config.ts` con adaptador de driver**; el `datasource { url =
   env(...) }` clásico, el que usa toda la documentación que se conoce de Prisma, deja de
   validar. Se resolvió fijando `prisma`/`@prisma/client` en `6.19.3` (la última 6.x estable) en
   vez de perseguir la API nueva sin poder verificarla contra documentación actual. Queda una
   vulnerabilidad `high` conocida y sin parchear en `deepmerge-ts` (dependencia transitiva de
   `prisma`, vía `@prisma/config`, afecta a toda la serie 6.13-7.10): es una única CLI de
   desarrollo, no llega a `@prisma/client` en producción, y no hay ninguna versión publicada que
   la corrija todavía. Anotado, no ignorado en silencio.
3. **Prisma no admite listas opcionales** (`Int[]?` es un error de validación de esquema, no
   solo "no recomendado"). `colocacion.celdas` —que necesita distinguir `NULL` de `[]` de verdad
   (spec 028)— no se puede escribir con el cliente tipado de Prisma aunque la columna de
   Postgres sí lo permita: se escribe y se lee con `$queryRaw`/`$executeRaw` a mano, documentado
   en el propio `schema.prisma`.

**Un fallo de diseño, no de herramienta, apareció escribiendo el código: `comprobarRoster`
validaba el roster de una formación contra la plantilla que traía el propio cuerpo de la
petición.** Un payload adversario podría haber mentido sobre su plantilla para colar cualquier
roster como «válido». Se corrigió con `plantillaConfiable`: el servidor reconstruye la plantilla
desde el catálogo `jugador` de la base de datos, y del cuerpo de la petición solo toma el dato
que es legítimamente del entrenador —a quién sustituye el líbero en cada rotación—. Documentado
en la ADR 0025.

**Un hueco de diseño real, no anticipado en la spec: `Sistema` de dominio no lleva fechas (ADR
0012), pero un cliente HTTP necesita `actualizado_en` para el `If-Match` de su próxima
escritura.** Se resolvió sin tocar el tipo de dominio: `listar`/`crear`/`actualizar` devuelven
`Sistema & { actualizadoEn }`, un tipo propio de la frontera HTTP (`SistemaConMetadatos`) que
nunca cruza hacia `application/` ni `ui/`. La ADR 0012 sigue intacta.

**Otro fallo encontrado a mano, no por ningún escenario formal:** `npm start` fallaba con
«DATABASE_URL no encontrada» pese a tener `.env`, porque los imports estáticos de ESM ya habían
instanciado `PrismaClient` (dentro de `infraestructura/prisma.ts`) antes de que cualquier código
de `main.ts` pudiera cargar el `.env`. Cargar variables de entorno en código llega sistemáticamente
tarde en ESM cuando la dependencia que las necesita se importa de forma estática. Se resolvió con
la flag nativa de Node `--env-file=.env` en los scripts `dev`/`start`/`seed`, no con código —
`vitest.setup.ts` no tiene este problema porque los `setupFiles` de Vitest se ejecutan en una
fase aparte, antes de que se carguen los ficheros de test.

**Los ids de las factorías del dominio (`'sistema-por-defecto'`, `'sistema-defensa-por-defecto'`)
no son UUID**, y `sistema.id` sí lo es en la base de datos. La semilla del servidor genera un
UUID nuevo con `crypto.randomUUID()` y conserva el resto del `Sistema` que produce la factoría
sin tocarlo — el contenido es idéntico, solo cambia el identificador, coherente con que esos ids
siempre fueron un detalle de `localStorage`, no una regla del dominio.

**Lo que no se desvió:** ninguna regla de `docs/dominio.md` resultó incorrecta. El esquema de
`docs/modelo-de-datos.md` se aplicó tal cual estaba documentado, sin ningún ajuste — los tres
`CHECK` y las dos restricciones `UNIQUE NULLS NOT DISTINCT` que Prisma no genera se comprobaron
uno a uno con SQL directo, al margen de la aplicación, y todos rechazaron lo que tenían que
rechazar.
