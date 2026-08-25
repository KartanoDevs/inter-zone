# 0038 — Validar un sistema se protege antes que el resto de `/api/sistemas`

**Estado:** Aceptada

**Contexto.** La spec 037 (que un rol decida quién edita cada cosa) sigue sin escribir, y hasta
que llegue `/api/sistemas` se queda abierto a cualquiera, con o sin sesión — así lo dejó la ADR
0036. Pero la spec 051 construye la primera acción que el propio encargo ata a un rol concreto
sin ambigüedad: *«el entrenador de ese equipo, o un admin»* (`docs/modelo-de-datos.md` §4,
matriz de permisos). Dejar "validar" abierto a cualquiera mientras se espera a la 037 no sería
prudencia, sería construir la función y no aplicar la única regla que le da sentido.

**Decisión.** `PUT /api/sistemas/:id/estado` exige sesión y rol — reutiliza
`acceso.repositorio.quienSoy()` (ya existente, spec 035) y `domain/acceso.puedeValidar()` (nueva,
pura). El resto de rutas de `sistemas.rutas.ts` (crear, editar, borrar, listar) se queda exactamente
como estaba: abierto, hasta que la spec 037 las cierre todas de una vez con el mismo mecanismo.

**Consecuencias.** Primera vez que `sistemas.rutas.ts` importa algo de la rama de acceso del
dominio — confirma que `puedeValidar` vive en el sitio correcto (`domain/`, reutilizable desde
cualquier ruta) y no atado a `auth.rutas.ts`. Cuando llegue la 037, extenderá este mismo patrón
al resto de acciones en vez de inventar uno nuevo.
