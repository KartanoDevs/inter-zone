# 0023 — Se cierra la v1: entran backend, base de datos y cuentas

**Estado:** Aceptada

**Contexto.** La ADR 0001 decidió que la v1 fuera una SPA sin servidor, y lo justificó bien: un
backend añadía semanas de trabajo antes de que un jugador pudiera ver nada, y no aportaba nada al
aprendizaje del voleibol. Cumplió su función — treinta specs cerradas y una pizarra que se usa en
entrenamientos. Esa misma ADR dejó escrita la condición para revisarla: *«si el equipo pide editar
desde varios dispositivos, esa petición justificará el backend»*.

La petición ha llegado, y trae más cosas dentro: editar desde varios dispositivos, tres tipos de
usuario con permisos distintos, una lista blanca de correos que controla quién entra, y separar los
sistemas del equipo masculino de los del femenino.

**Decisión.** Se cierra la v1 y empieza la v2. Hay backend (Node y Express, en `server/`), base de
datos (PostgreSQL con Prisma) y autenticación (con Google o con correo y contraseña, siempre contra
la lista blanca). El esquema vive en `docs/modelo-de-datos.md`. La ADR 0001 pasa a *Sustituida por
0023*: no estaba equivocada, se ha agotado.

**Esto no cambia cómo se construye el proyecto.** Las reglas que abarataron la v1 siguen todas en
pie: `domain/` no importa nada, lo derivado no se almacena, ningún código de producción sin un test
que falle antes. Se añade una sola regla de capas: **`server/` solo puede importar de
`src/app/domain/`**, nunca de `application/`, `infrastructure/` ni `ui/`.

**Consecuencias.** El invariante 8 de `CLAUDE.md` (*«sin backend, sin base de datos, sin
autenticación»*) y la sección «Qué NO hace (deliberadamente)» del README dejan de ser ciertos: se
reescriben para describir la v2, no para tachar la v1. `localStorage` **no se queda como modo sin
conexión**: se sustituye, porque un modo offline con sincronización es un problema bastante más
difícil y nadie lo ha pedido.

Que `server/` pueda importar `src/app/domain/` no es una casualidad afortunada: es el cobro del
invariante 2, mantenido durante treinta specs sin excepciones. `domain/` tiene cinco imports y los
cinco apuntan a sí mismo, y no usa `window`, `document`, `localStorage`, `crypto`, `process`, `Date`
ni `Math.random`. Corre en Node igual que en el navegador. De ahí salen dos cosas que valen por sí
solas: el servidor valida las mismas reglas de voleibol que la pizarra sin duplicar una línea —lo
que importará el día que una IA escriba sistemas contra la API—, y la semilla de la base de datos
invoca las factorías que ya existen en vez de copiar treinta formaciones y ciento ochenta
colocaciones que se desincronizarían a la primera.

La contrapartida honesta: el puerto `SistemaRepository` era síncrono y escribía el catálogo entero
de golpe, y contra una red no vale ninguna de las dos cosas. Pasa a asíncrono y granular, y eso
toca `application/`, no solo `infrastructure/`. Es un cambio con su propia decisión asociada, que
se documentará al hacerlo.
