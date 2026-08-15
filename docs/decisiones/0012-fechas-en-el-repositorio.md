# 0012 — `creadoEn`/`actualizadoEn` viven en el repositorio, no en `Sistema`

**Estado:** Aceptada

**Contexto.** La spec 008 pide fecha de creación y de última modificación por sistema. Pero
`docs/arquitectura.md` dice sin rodeos que `domain/` va "sin fechas": ninguna función de
`domain/` puede depender de `Date.now()` sin dejar de ser pura y determinista, que es lo que
permite que la suite de `domain/` corra en milisegundos y sin mocks.

**Decisión.** Las fechas no se añaden a `Sistema`. Viven únicamente en la forma que persiste
`LocalStorageSistemaRepository` (`SistemaPersistido`, un tipo privado de `infrastructure/`), que
las gestiona internamente: fija `creadoEn` la primera vez que ve un `id`, y actualiza
`actualizadoEn` en cada `guardar()`. El puerto `SistemaRepository` (`domain/puertos.ts`) sigue
devolviendo y aceptando `Sistema[]` puro, sin fechas. Por el mismo motivo —que en la v1 la
plantilla es una constante fija de la aplicación, no un dato de dominio— el repositorio recibe
las dos variantes de plantilla (central2/líbero) inyectadas por constructor en vez de conocerlas
de antemano.

**Consecuencias.** Ni `application/` ni `ui/` verán nunca `creadoEn`/`actualizadoEn` a través del
puerto; si en el futuro hace falta mostrarlas, `SistemaRepository` tendrá que ganar un método
propio para exponerlas (algo como `metadatosDe(id)`), sin tocar `Sistema`. Los escenarios 008-E9
y 008-E10 no pueden verificarse contra el puerto: inspeccionan el JSON crudo que escribe el
repositorio en su almacén, que es el único sitio donde esas fechas existen. `vitest.config.ts`
se amplió para recoger `src/app/infrastructure/**/*.spec.ts`, que hasta ahora no incluía.
