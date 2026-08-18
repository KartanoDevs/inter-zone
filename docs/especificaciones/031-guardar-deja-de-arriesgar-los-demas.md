# 031 — Guardar un sistema deja de arriesgar los demás

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

Hoy, crear, renombrar, clonar, borrar, guardar una rotación, cambiar una explicación o cambiar
un ajuste hacen todos lo mismo por dentro: reescriben de golpe el catálogo completo, no solo lo
que cambió. Mientras todo vive en el navegador de una sola persona esto nunca se nota.

En cuanto el catálogo empiece a leerse y escribirse por red —lo que traen las specs siguientes
de esta misma tanda—, deja de ser inofensivo: si alguien pulsa «crear» antes de que termine de
llegar el catálogo desde el servidor, esa escritura reemplazaría ahí el trabajo de todo el
equipo por una lista de un solo sistema.

**Esta spec no cambia nada que un entrenador vea o note en la pizarra.** Es la que hace posible,
sin sorpresas, que las siguientes sí cambien algo.

## Objetivo

Cada acción que guarda algo toca solo lo que esa acción cambió. Ninguna acción reescribe, de
paso, sistemas o ajustes que no tocó. Desde fuera, la pizarra se comporta exactamente igual que
hoy.

## Fuera de alcance

- Cualquier cambio visible en pantalla: ni un botón, ni un mensaje, ni una espera nueva. No hay
  red todavía, así que no hay nada que esperar.
- Qué pasa cuando una escritura falla de verdad (sin conexión, error del servidor, choque con
  otra edición). No puede pasar mientras se sigue guardando en el navegador; se aborda cuando
  exista un servidor de verdad que pueda fallar (spec 034).
- Que un sistema pertenezca a un equipo, o que existan varios equipos: eso es la spec 032.
- Cualquier servidor, base de datos o red. Se sigue guardando exactamente donde se guarda hoy.

**Esta spec toca `application/`, `infrastructure/` y `app.config.ts`, además de `domain/`.** No
hay forma de que cada acción guarde solo lo suyo sin cambiar cómo se relaciona la aplicación con
sus dos repositorios (el del catálogo de sistemas y el de los ajustes globales). Queda
autorizado explícitamente aquí, igual que las specs 008, 017 y 021.

## Escenarios

**E1 — Guardar una rotación no reescribe los demás sistemas**
- Dado: un catálogo con varios sistemas ya guardados
- Cuando: se guarda un cambio en uno de ellos
- Entonces: solo ese sistema queda escrito de nuevo; los demás permanecen exactamente como
  estaban antes de guardar

**E2 — Crear un sistema no reescribe los que ya existían**
- Dado: un catálogo con sistemas ya guardados
- Cuando: se crea uno nuevo con éxito
- Entonces: los sistemas existentes no se tocan; solo se añade el nuevo

**E3 — Borrar un sistema no reescribe los que quedan**
- Dado: un catálogo con varios sistemas
- Cuando: se borra uno de ellos
- Entonces: los sistemas restantes no se reescriben; solo desaparece el borrado

**E4 — Un nombre repetido se rechaza sin escribir nada**
- Dado: ya existe un sistema con un nombre, de un tipo
- Cuando: se intenta crear, renombrar o clonar otro con ese mismo nombre y tipo
- Entonces: se rechaza igual que hoy, y no se escribe nada en el almacén

**E5 — Cambiar un ajuste no toca el catálogo de sistemas**
- Dado: un catálogo de sistemas ya guardado
- Cuando: se cambia un ajuste (por ejemplo, desactivar la validación de posiciones)
- Entonces: el ajuste queda guardado y el catálogo de sistemas no se reescribe

**E6 — Al abrir la pizarra, el catálogo ya está ahí**
- Dado: un catálogo guardado de una sesión anterior
- Cuando: se abre la aplicación
- Entonces: el catálogo aparece completo desde el primer instante, igual que hoy — en ningún
  momento se ve vacío antes de poblarse

**E7 — Todo lo demás se comporta exactamente igual que hoy**
- Dado: cualquier interacción existente con la pizarra (crear, renombrar, clonar, borrar,
  guardar una formación, guardar una explicación, cambiar el sustituto del líbero)
- Cuando: se realiza
- Entonces: el resultado observable —qué queda guardado, qué se rechaza, qué aparece en
  pantalla— es idéntico al de antes de esta spec

## Preguntas abiertas

Ninguna. Decisión de alcance tomada antes de congelar: esta spec convierte a la vez el
repositorio del catálogo de sistemas y el de los ajustes globales, porque los dos necesitarán el
mismo tipo de adaptador por red en las specs 033-034 y dejar uno a medias no ahorra nada.

## Al cerrar

Los 7 escenarios pasan. Partida: 245 tests; al cerrar, 254 — 9 nuevos (7 en
`sistema.store.spec.ts` para E1-E7, 2 más en `local-storage-sistema.repository.spec.ts` para
fijar comportamiento de infraestructura que no tenía dueño claro entre los siete). No existe
`npm run test:coverage`; no se reporta cobertura numérica, mismo motivo que en specs anteriores.
`npm run build` compila limpio — no hay cambio visible que verificar a ojo (E7 lo dice
explícitamente), así que no se ha usado el navegador, mismo criterio que las specs 026 y 029.

**El cambio de forma del puerto obligó a migrar los ~88 tests que ya dependían de él** (60 del
store, 22 y 6 de los dos repositorios de infraestructura). No fue un simple añadir `await`:
varios tests de `local-storage-sistema.repository.spec.ts` simulaban "borrar y volver a guardar
el catálogo filtrado" porque esa era la única forma que tenía el puerto anterior de expresar un
borrado; con `borrar(id)` como operación propia, esos tests pasaron a expresar directamente lo
que su escenario siempre dijo, sin el rodeo. Eso no es tocar la spec 008 (que sigue firme): es
que la forma de *ejercitar* la misma garantía cambió con el puerto, igual que ya le pasó a la
sección "Al cerrar" de la spec 021 con el orden de implementación.

**Un fallo real, no solo mecánico, apareció al escribir el código mínimo para E1-E3.** La primera
versión de `LocalStorageSistemaRepository.listar()` sembraba los dos sistemas de ejemplo y los
escribía de inmediato siempre que no hubiera nada legible — también cuando lo ilegible era una
versión futura desconocida. Eso rompía la garantía de la spec 008-E4 («nunca se sobrescribe a
ciegas una versión futura desconocida»): con el código nuevo, `listar()` la habría sobrescrito.
Se detectó escribiendo primero el test 008-E4 migrado (que ya exigía justo eso) y viéndolo fallar
por el motivo correcto, no por una casualidad. La corrección distingue dos casos que antes se
trataban igual: nada guardado nunca (`bruto === null`, sí se siembra y se persiste) frente a algo
presente pero ilegible — JSON roto o versión desconocida — que se siembra solo en memoria, sin
tocar el almacén. Documentado también en la ADR 0024.

**E7 quedó cubierto por construcción, no por un mecanismo nuevo**: ninguna llamada de
`ui/tablero/tablero.ts` al store usaba el valor de retorno de `crear`/`clonar`/`renombrarActivo`
ni esperaba a que terminaran (comprobado con una búsqueda antes de tocar nada), así que
convertirlas a `Promise` no obligó a cambiar `ui/` ni una línea. Como `localStorage` resuelve la
promesa esencialmente al instante, el comportamiento observable no se movió. El único test de E7
es un recorrido de humo (crear, renombrar, clonar, borrar); la garantía real la sostienen los 60
tests migrados de `sistema.store.spec.ts`, que siguen verdes sin haber cambiado su intención.

**Lo que sorprendió:** que preservar la garantía de arranque «el catálogo está listo antes de que
se muestre la pizarra» (E6) no necesitara ningún estado de carga nuevo. `provideAppInitializer`
bloquea el `bootstrapApplication` hasta que `cargar()` resuelve, así que la invariante de siempre
—ningún consumidor ve nunca el estado a medio poblar— se mantiene con el mismo efecto que daba el
constructor síncrono, solo que logrado de otra forma.

**Lo que no se desvió:** ninguna regla de `docs/dominio.md` resultó incorrecta — esta spec no
toca voleibol. El límite conocido de la spec 008 (una escritura que sigue a una lectura de
versión no legible sí sobrescribe) sigue sin resolverse a propósito: ahora hay un test que lo fija
como comportamiento conocido en vez de dejarlo solo anotado en prosa; resolverlo de verdad
—con un testigo de concurrencia— es trabajo de la spec 033, cuando haya un servidor real.
