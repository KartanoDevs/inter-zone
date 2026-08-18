# 0024 — El puerto de persistencia es asíncrono y granular

**Estado:** Aceptada

**Contexto.** `SistemaRepository` (`domain/puertos.ts`) era síncrono —`listar(): readonly Sistema[]`,
`guardar(sistemas: readonly Sistema[]): void`— y `guardar()` reescribía el catálogo entero en cada
llamada, sin excepción. Mientras la única implementación era `localStorage`, ambas cosas eran
inofensivas. La ADR 0023 abrió la puerta a un adaptador HTTP, y contra una red las dos dejan de
serlo: una llamada de red no puede ser síncrona, y un *write-all* sobre un catálogo que otro
dispositivo también está editando pisa su trabajo con lo que este cliente tenía en memoria en ese
instante — si, por ejemplo, alguien crea un sistema antes de que termine de llegar el catálogo
remoto, esa escritura reemplazaría en el servidor el trabajo de todo el equipo por una lista de un
solo sistema.

**Decisión.** El puerto pasa a:

```ts
interface SistemaRepository {
  listar(): Promise<readonly Sistema[]>;
  crear(sistema: Sistema): Promise<void>;
  actualizar(sistema: Sistema): Promise<void>;
  borrar(id: string): Promise<void>;
}
```

`AjustesRepository` gana la misma forma asíncrona (`leer()`/`guardar()` devuelven `Promise`), sin
volverse granular: es un único documento de cuatro banderas, no un catálogo, así que no hay nada
que un *write-all* pueda arriesgar.

`SistemaStore` deja de hacer E/S en el constructor: gana un método `cargar()` asíncrono que
`app.config.ts` dispara con `provideAppInitializer`, así que Angular no monta la aplicación hasta
que el catálogo y los ajustes están listos — la misma garantía que antes daba el constructor
síncrono, lograda de otra forma. Cada acción del store que persiste algo (`crear`, `clonar`,
`renombrarActivo`, `borrar`, `guardar`, `guardarExplicacion`, `guardarDescripcion`,
`cambiarSustitutoLibero`, los cuatro `alternarX` de ajustes) llama ahora al método del puerto que
corresponde a lo que tocó, nunca a uno que reescriba todo lo demás.

`LocalStorageSistemaRepository` deja de mantener una copia del catálogo en memoria: `crear`,
`actualizar` y `borrar` leen el almacén tal y como está en el momento de escribir, nunca desde una
lista que el llamador pudiera tener desactualizada. Esto reveló un caso límite real al
implementarlo: sembrar los dos sistemas de ejemplo y escribirlos de inmediato (para que una
escritura granular posterior los encontrara) rompía la garantía de la spec 008-E4 de no sobrescribir
nunca una versión futura desconocida. Se resolvió distinguiendo dos casos — nada guardado nunca
(`bruto === null`, se siembra y se persiste) frente a algo ilegible pero presente (JSON roto o
versión desconocida, se siembra solo en memoria, sin tocar el almacén) — en vez de tratarlos igual
como hacía el código anterior.

**Consecuencias.** Cambio de firma en `domain/puertos.ts`, reescritura de los dos adaptadores de
`infrastructure/` y de `SistemaStore` en `application/`, y `provideAppInitializer` nuevo en
`app.config.ts`. `ui/tablero/tablero.ts` no necesitó ningún cambio: ninguna de sus llamadas al store
usaba el valor de retorno ni esperaba a que terminara, así que convertir esos métodos a `Promise`
sigue siendo válido como llamada sin esperar (*fire-and-forget*), y como `localStorage` resuelve
esencialmente al instante, el comportamiento observable no cambia (spec 031, E7).

Los ~88 tests que dependían de la forma anterior del puerto (60 en `sistema.store.spec.ts`, 22 en
`local-storage-sistema.repository.spec.ts`, 6 en `local-storage-ajustes.repository.spec.ts`) se
migraron a `async`/`await`. Los de infraestructura, además, cambiaron de mecanismo, no solo de
sintaxis: donde antes simulaban "borrar y volver a guardar el catálogo filtrado", ahora llaman a
`borrar(id)` directamente — más fiel al escenario que describían desde el principio.

Un límite ya conocido y documentado en el cierre de la spec 008 sigue intacto y sin resolver aquí a
propósito: una escritura que sigue a una lectura de una versión no legible sí sobrescribe esa
versión. Antes ocurría igual (`guardar()` no comprobaba la versión almacenada); ahora se ha escrito
un test que lo fija como comportamiento conocido (`sistema.repository.spec.ts`, "spec 031 —
granularidad", E4) en vez de dejarlo solo anotado en prosa. Resolverlo de verdad —con un testigo de
concurrencia tipo `If-Match`— es trabajo de la spec 033, donde por fin hay un servidor real contra
el que definir esa semántica.
