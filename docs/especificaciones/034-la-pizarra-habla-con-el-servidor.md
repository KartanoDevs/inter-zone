# 034 — La pizarra habla con el servidor

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

El servidor de la spec 033 ya guarda sistemas de verdad, pero la pizarra todavía no lo sabe:
sigue hablando con `localStorage`, así que dos entrenadores en dos sitios distintos siguen sin
ver el mismo catálogo.

## Objetivo

La pizarra lee y escribe contra el servidor. Dos personas que la abren en dispositivos distintos
ven el mismo catálogo. Cuando el servidor no responde, se avisa por qué y se ofrece reintentar —
nunca se pierde en silencio lo que el entrenador estaba escribiendo.

## Fuera de alcance

- **Los ajustes** (validación desactivada, ayuda de posición…) siguen en `localStorage`, por
  dispositivo. No hay tabla de servidor para ellos todavía —`docs/modelo-de-datos.md` los
  convierte en columnas de `usuario`, que no existe hasta la spec 035— y son preferencias de
  pantalla, no trabajo que perder.
- **Login y autenticación.** El servidor sigue sin comprobar quién pregunta (specs 035-037).
- **Reintentar solo, sin que el entrenador lo pida.** Ni reconexión automática, ni reintentos en
  segundo plano. El reintento es siempre un clic explícito.
- **Trabajar sin conexión de verdad**: cola de cambios pendientes, sincronizar al reconectar.
  Sin red, se avisa y se espera; no se guarda nada localmente para mandarlo después.
- **Cualquier sistema de configuración de entornos.** La URL de la API es una constante fija,
  igual que `PLANTILLA_GLOBAL` es hoy una constante fija — no existe `environments/` en este
  proyecto y esta spec no lo crea.

**Esta spec toca `domain/`, `infrastructure/`, `application/`, `ui/`, `app.config.ts` y
`server/`, además de crear el adaptador HTTP.** No hay forma de conectar la pizarra a una API
sin tocar esas capas. Queda autorizado explícitamente aquí, igual que las specs 009, 021, 025 y
031.

## Escenarios

### El repositorio traduce lo que dice el servidor

**E1 — El catálogo se lee del servidor, de los dos equipos a la vez**
- Dado: sistemas guardados en el servidor, en los dos equipos
- Cuando: se pide el catálogo completo
- Entonces: aparecen todos, sin que quien pide el catálogo tenga que pedirlo equipo a equipo

**E2 — Un fallo de conexión se distingue de un fallo del servidor**
- Dado: el servidor no responde (sin red, o caído)
- Cuando: se intenta cualquier escritura
- Entonces: el fallo se señala como «sin conexión», no como un error genérico

**E3 — Un rechazo del servidor se distingue de un fallo de conexión**
- Dado: el servidor rechaza la escritura con un motivo (por ejemplo, nombre duplicado o roster
  inválido)
- Cuando: se intenta esa escritura
- Entonces: el fallo se señala como error del servidor, con el motivo que dio

**E4 — Un conflicto de edición se distingue de los otros dos**
- Dado: el servidor rechaza una actualización porque alguien más guardó ese mismo sistema
  mientras tanto
- Cuando: se intenta esa actualización
- Entonces: el fallo se señala específicamente como conflicto de edición

### La pizarra no pierde trabajo cuando falla

**E5 — Un fallo al guardar una formación no descarta el borrador**
- Dado: una formación completa en el borrador, sin guardar todavía
- Cuando: falla el guardado
- Entonces: el borrador sigue ahí, tal cual estaba, listo para reintentar

**E6 — El fallo se avisa con el motivo, y se puede reintentar**
- Dado: un guardado que acaba de fallar
- Cuando: se mira la pizarra
- Entonces: hay un aviso legible que explica por qué falló y ofrece reintentar

**E7 — Reintentar con éxito aplica el cambio y hace desaparecer el aviso**
- Dado: un guardado que falló, y el servidor que ahora vuelve a responder
- Cuando: se pulsa reintentar
- Entonces: el cambio se aplica y el aviso desaparece

**E8 — Cerrar el aviso sin reintentar no aplica el cambio, pero tampoco lo descarta**
- Dado: un guardado que falló
- Cuando: se cierra el aviso sin reintentar
- Entonces: el aviso desaparece, el borrador sigue sin guardar, y nada se pierde

### El mismo mecanismo cubre todas las escrituras

**E9 — Crear, renombrar, clonar y borrar un sistema se avisan y se reintentan igual**
- Dado: cualquiera de esas acciones
- Cuando: falla al escribir
- Entonces: se comporta igual que guardar una formación — mismo aviso, mismo reintento, nada
  perdido

## Preguntas abiertas

Ninguna. Decisiones tomadas antes de congelar:

- **El adaptador HTTP usa `fetch` nativo, no `HttpClient` de Angular.** `HttpClient` obligaría a
  probar el adaptador con `TestBed`/`HttpClientTestingModule`, que es justo lo que
  `docs/flujo-de-trabajo.md` señala como síntoma de estar en la capa equivocada («si un test de
  esta carpeta necesita jsdom o TestBed…»). Con `fetch` nativo el test sustituye la función
  global y sigue corriendo en `environment: 'node'`, igual que ya hacen los tests del propio
  `server/`. No hace falta `provideHttpClient` en `app.config.ts`.
- El testigo de concurrencia (`actualizadoEn`) vive dentro del adaptador, no en `Sistema` de
  dominio — mismo patrón que `creadoEn`/`actualizadoEn` en `LocalStorageSistemaRepository` (ADR
  0012).
- Los tres motivos de fallo se modelan como tres clases de error (`ErrorDeRed`,
  `ErrorDelServidor`, `ConflictoDeEdicion`) declaradas en `domain/puertos.ts`, junto al puerto
  que las puede señalar — no en `infrastructure/`, porque son parte del contrato que cualquier
  adaptador de `SistemaRepository` puede cumplir, no un detalle de cómo lo cumple el HTTP.
- El servidor gana CORS mínimo (un origen permitido, configurable) para que el navegador pueda
  llamarlo desde otro puerto en desarrollo. No es un sistema de configuración, es la línea
  imprescindible para que esta spec funcione de verdad.

## Al cerrar

**Suite.** `npm test` en la raíz: 281/281 (17 ficheros), incluidos los 81 de
`sistema.store.spec.ts` (75 previos + E5, E6, E6b, E7, E8, E9) y los 7 de
`http-sistema.repository.spec.ts` (E1-E4 más tres sobre el testigo de concurrencia). `npm run
build` en la raíz, correcto. `npm test` en `server/` contra Postgres real: 12/12, sin regresión
tras añadir CORS. No existe `test:coverage`; no se inventa una cifra.

**Desviación real, no prevista al congelar: la pizarra tenía UI optimista sin haberlo decidido
nunca.** Varios métodos de `SistemaStore` mutaban sus signals *antes* de esperar al repositorio,
inofensivo mientras detrás solo hubo `localStorage` (nunca falla), pero con un adaptador HTTP real
un fallo de red habría dejado `sistemas`/`borrador` mostrando un cambio que nunca llegó al
servidor — en `guardar()` en concreto, el entrenador habría visto su formación como guardada justo
antes de perderla. Se corrigió reordenando los ocho métodos de escritura para que la llamada al
repositorio vaya siempre primero, a través de un helper común (`ejecutarEscritura`). Documentado en
la ADR 0026 por ser un cambio de disciplina que aplica a cualquier adaptador futuro, no solo al
HTTP de esta spec.

**Otra decisión tomada durante la implementación, no en las preguntas abiertas:** el mismo
`RepositorioFake` que ya usaban los 75 tests anteriores del store ganó un método
`fallarProximaVez(error)` en vez de crear una clase doble paralela — menos ficheros, y los tests
existentes siguen sin saber que la capacidad existe.

**CORS se escribió a mano** (`servidor.ts`), sin añadir la dependencia `cors`: tres cabeceras y una
respuesta corta a `OPTIONS`. El origen permitido sale de `ORIGEN_PERMITIDO` (`.env`), con
`http://localhost:4200` como valor por defecto para desarrollo.

**Pendiente, con intención: la verificación manual de "dos navegadores, mismo catálogo"
(sección Verificación del plan) no se ha hecho en esta sesión.** No se automatiza navegador salvo
que se pida explícitamente. Si se quiere esa comprobación, hay que pedirla aparte —arrancar
`server/` (`npm run db:up`, `npm start`) y `ng serve`, y abrir la pizarra en dos pestañas.

Nada de esto corrige una regla de voleibol; no toca `docs/dominio.md`.
