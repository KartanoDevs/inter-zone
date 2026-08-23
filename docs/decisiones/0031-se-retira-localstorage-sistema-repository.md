# 0031 — Se retira `LocalStorageSistemaRepository`

**Estado:** Aceptada

**Contexto.** `LocalStorageSistemaRepository` era el adaptador de persistencia de la v1. Desde la
spec 034 dejó de estar cableado en `app.config.ts` —`HttpSistemaRepository` es el adaptador en
producción—, pero se mantuvo en el repositorio: exportaba el tipo `AlmacenClaveValor` (que
`LocalStorageAjustesRepository` seguía usando) y su `.spec.ts` documentaba, dentro de la suite en
verde, el formato histórico de los datos persistidos hasta la spec 034.

La spec 038 cambia la forma de `Sistema.defensas` de un `Record` por rotación y vía a una lista
de variantes por caso y situación (ADR 0029). Mantener `LocalStorageSistemaRepository` al día
habría exigido una tercera subida de versión de su formato persistido (`VERSION_ACTUAL` 6 → 7)
para un adaptador que ningún código de producción usa desde hace cuatro specs.

**Decisión.** Se retira el fichero y su `.spec.ts` completo (26 tests) en la spec 038, en vez de
actualizarlo una vez más.

**Por qué ahora y no antes.** No había necesidad real de tocarlo hasta que un cambio de forma de
`Sistema` lo obligaba. Este es el primero desde la spec 034 que sí lo hace, y actualizarlo habría
sido trabajo puro de mantenimiento sin ningún consumidor al que sirviera — el mismo criterio que
la ADR 0023 ya dejó escrito: *"`localStorage` no se queda como modo sin conexión: se
sustituye"*.

**Qué sobrevive.** El tipo `AlmacenClaveValor` se movió a `local-storage-ajustes.repository.ts`,
su único usuario que queda — `LocalStorageAjustesRepository` sigue siendo, por ADR 0028, el
adaptador definitivo de los `Ajustes` por tiempo indefinido, y no se ve afectado por esta
retirada.

**Consecuencias.** Si algún día se necesitara un modo sin conexión de verdad, no se recupera este
adaptador: se diseñaría de nuevo contra la forma actual de `Sistema`, con lo aprendido de por qué
mantener dos formatos serializados en paralelo (HTTP y localStorage) costaba una migración cada
vez que cambiaba el dominio. No hay ninguna spec que lo pida hoy.
