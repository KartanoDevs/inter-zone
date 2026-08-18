# 0025 — El servidor importa `src/app/domain/` directamente

**Estado:** Aceptada

**Contexto.** `server/` (spec 033) necesita las mismas reglas de voleibol que ya usa la pizarra:
qué jugadores están en pista en cada rotación (`jugadoresEnPista`, para comprobar el roster de
una formación antes de guardarla), la plantilla global, y las dos factorías que siembran los
sistemas de ejemplo (`sistemaPorDefecto`, `sistemaDefensaPorDefecto`). Reescribir esas reglas en
el servidor las duplicaría — con el riesgo real de que las dos copias diverjan con el tiempo, o
de que la semilla del servidor deje de coincidir con lo que ve un cliente que se conecta a él.

`docs/arquitectura.md` ya lo anticipaba: *«sabemos que habrá un segundo adaptador (HTTP)»*. Lo
que no estaba resuelto es SI ese adaptador podría alcanzar el dominio directamente, o si tendría
que hablar con él por otra vía (una API interna, un paquete publicado, código copiado).

**Decisión.** `server/` importa ficheros de `src/app/domain/` con rutas relativas, tal cual.
Es viable porque el invariante 2 de `CLAUDE.md` — *«`domain/` no importa nada externo»* — lleva
treinta y tantas specs sosteniéndose sin excepciones: se comprobó antes de aceptar esta spec que
`domain/` tiene cinco imports y los cinco apuntan a sí mismo, y que no usa `window`, `document`,
`localStorage`, `crypto`, `process`, `Date` ni `Math.random`. Es TypeScript puro, y por tanto
portable a Node tal cual, sin ningún adaptador intermedio.

La flecha va en un solo sentido: `server/` puede importar `src/app/domain/`, nunca al revés, y
`server/` no importa nada de `application/`, `infrastructure/` ni `ui/` — esas capas son del
cliente Angular, y el servidor no las necesita ni las conoce. `CLAUDE.md` (invariante 8, ADR
0023) ya fijaba esta regla antes de que existiera el primer fichero de `server/`; esta ADR
documenta que la primera spec que la ejercita la sigue tal cual estaba escrita.

**Consecuencias.** `server/tsconfig.json` incluye `../src/app/domain/**/*.ts` además de
`src/**/*.ts`, con `moduleResolution: "bundler"` — no `NodeNext` — porque los ficheros de
`domain/` importan sin extensión (`from './modelos'`), un estilo que `NodeNext` rechaza en
tiempo de tipado aunque `tsx` (el runtime elegido, spec 033) lo resuelva sin problema.

Reutilizar el dominio tiene un límite deliberado: el servidor solo llama a funciones **puras**
que no necesitan nada del cliente (`jugadoresEnPista`, las dos factorías de semilla). No
reutiliza `crearSistema`/`renombrarSistema`/`clonarSistema` de `catalogo-sistemas.ts` para la
unicidad de nombre — esa comprobación la hace directamente la restricción `UNIQUE` de Postgres,
porque reconstruir el catálogo completo en memoria solo para preguntarle al dominio sería más
caro y no más seguro que dejar que la base de datos lo resuelva.

Un riesgo que esta decisión no elimina, y que conviene dejar anotado: la plantilla que llega en
el cuerpo de una petición HTTP **no es de fiar** — un cliente podría enviar cualquier cosa en
`sistema.plantilla`. Por eso el servidor nunca valida un roster contra la plantilla que le
mandan: la reconstruye él mismo desde el catálogo `jugador` de la base de datos, tomando del
cuerpo de la petición solo el dato que sí es legítimamente del entrenador —a quién sustituye el
líbero en cada rotación— y descartando el resto. Ver `plantillaConfiable` en
`server/src/infraestructura/sistema.repositorio.ts`.
