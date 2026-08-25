# 048 — Crear un sistema a la vez en masculino y en femenino

**Estado:** Completada
**Paso de la hoja de ruta:** 8 (backend, cuentas y equipos)

## Problema

Un sistema pertenece siempre a un único equipo (spec 032). Si el entrenador quiere el mismo
5-1 de recepción para masculino y femenino, hoy tiene que crearlo en uno y luego clonarlo al
otro a mano, cambiando de equipo activo entre medias.

## Objetivo

Al crear un sistema, se puede marcar más de un equipo a la vez. Se crea una copia independiente
en cada equipo marcado — mismo nombre, mismo tipo, misma plantilla de partida — que a partir de
ahí se edita por separado en cada uno, exactamente igual que si se hubiera creado y clonado a
mano.

**Esta spec toca `application/` y `ui/`.** No toca `domain/` (`crearSistema` no cambia; se llama
una vez por equipo marcado, ya autorizado desde que existe) ni `server/` ni el esquema de base
de datos: cada copia es un `Sistema` normal, con su propio `equipoId`, creado con la misma
llamada `POST /api/sistemas` que ya existe.

## Fuera de alcance

- **Un sistema compartido entre equipos** (una sola fila, editar desde uno cambia lo que ve el
  otro): se valoró y se descartó explícitamente al congelar esta spec — exige una relación
  sistema-equipo nueva y una migración de base de datos que nadie ha pedido. Lo que se entrega
  son copias independientes.
- **Editar el equipo de un sistema ya creado**: sigue fijo, como ya fijaba la spec 032. Esta
  spec solo afecta al momento de creación.
- **Clonar a otro equipo** (spec 026, "Clonar"): sigue clonando dentro del mismo equipo del
  original. Esta spec no le añade selector de equipo.

## Escenarios

**E1 — Marcar los dos equipos crea dos sistemas independientes**
- Dado: el diálogo de crear sistema, con nombre y tipo elegidos
- Cuando: se marcan los dos equipos y se confirma
- Entonces: existe un sistema con ese nombre y tipo en el catálogo de cada equipo, cada uno con
  su propio id

**E2 — Marcar solo un equipo crea solo ahí, como hasta ahora**
- Dado: el diálogo de crear sistema con un único equipo marcado
- Cuando: se confirma
- Entonces: se crea un único sistema, en ese equipo — mismo comportamiento que antes de esta
  spec

**E3 — El nombre debe estar libre en todos los equipos marcados**
- Dado: un nombre que ya existe, para ese tipo, en uno de los equipos marcados
- Cuando: se intenta crear
- Entonces: no se crea nada en ningún equipo — ni siquiera en el equipo donde el nombre sí
  estaba libre

**E4 — El sistema activo tras crear es el del primer equipo marcado**
- Dado: dos equipos marcados, en el orden en que aparecen en el formulario (masculino, femenino)
- Cuando: se confirma
- Entonces: el equipo activo pasa a ser masculino y el sistema recién creado en masculino queda
  activo — femenino queda creado pero no en pantalla, se ve al cambiar de equipo

**E5 — No se puede confirmar sin ningún equipo marcado**
- Dado: el diálogo de crear sistema
- Cuando: se desmarcan los dos equipos
- Entonces: no se puede confirmar

## Preguntas abiertas

Ninguna.

## Al cerrar

Los 5 escenarios pasan. Suite: 330 tests al arrancar esta spec (cierre de la 047) → 335 al
cerrarla — 5 nuevos en `application/sistema.store.spec.ts`. `npm run typecheck` y `npm run build`
limpios; servidor de desarrollo recompiló sin errores.

**Decisión tomada con el usuario antes de escribir la spec:** se valoraron dos diseños — copias
independientes por equipo (la elegida) frente a un sistema compartido con una relación
sistema-equipo nueva. La segunda habría exigido migración de base de datos y decidir qué pasa
con la unicidad de nombre y con editar desde un equipo viendo el otro; se descartó explícitamente
por sobredimensionada para lo que se pedía. Queda documentado en "Fuera de alcance" para que no
se reabra por sorpresa en una spec futura.

**`crear()` pasó de un único `equipoId` a `readonly EquipoId[]`, sin overload de compatibilidad.**
Se evaluó mantener la firma antigua como atajo para el caso de un solo equipo, y se descartó: un
único punto de llamada real (`Tablero.confirmarDialogoSistema`) y siete en los tests, todos
mecánicos de adaptar (`'masculino'` → `['masculino']`), no justificaban mantener dos formas de
llamar a lo mismo. `crearSistema` (dominio) no cambió: se llama una vez por equipo marcado,
exactamente como ya se llamaba una vez antes de esta spec.

**Todo o nada, validado antes de escribir nada** (E3): la validación de los `n` equipos ocurre
en un bucle que construye la lista completa de sistemas candidatos antes de tocar
`ejecutarEscritura`; si `crearSistema` devuelve `null` en cualquier iteración, la función
devuelve `false` de inmediato sin haber llamado al repositorio ni una vez. Evita el caso raro de
"se creó en masculino pero no en femenino" que habría dejado el catálogo a medias.

**Límite conocido, heredado del `crear()` de un solo equipo y ahora doblado:** si la escritura
falla a mitad de una creación en dos equipos (spec 034) y el entrenador reintenta, el reintento
genera ids nuevos para las dos copias — si una de las dos ya había llegado al servidor antes del
fallo, el reintento crea una copia de más ahí. Ya era un límite aceptado con un solo equipo (lo
dice el propio comentario de `crear()` desde antes de esta spec); esta spec no lo resuelve, solo
lo hereda para el caso de varios equipos.

**Ningún ADR nuevo ni cambio en `docs/dominio.md`:** no es una regla de voleibol ni una decisión
de arquitectura de las que necesitan explicarse fuera del propio código — es una ampliación de un
flujo ya existente (crear un sistema), documentada en el comentario de cabecera de `crear()`.

**Lo que no se desvió:** el diseño (copias independientes, todo-o-nada, primer equipo activo)
se implementó tal cual se decidió al congelar la spec.
