# Arquitectura

## La regla que sostiene todo lo demás

**`domain/` no importa nada. Ni Angular, ni el navegador, ni librerías.**

Solo TypeScript. Si un fichero de `domain/` tiene un `import` que no apunta a otro fichero
de `domain/`, está mal. Esto no es purismo: es lo que permite testear todas las reglas del
voleibol en milisegundos, sin `TestBed`, sin DOM y sin arrancar nada.

## Dirección de las dependencias

```
    ui/  ──────────►  application/  ──────────►  domain/
                            │                        ▲
                            ▼                        │
                    infrastructure/  ────────────────┘

    server/  ──────────────────────────────────────►  domain/
```

Las flechas apuntan solo hacia dentro. `domain/` no conoce a nadie. `infrastructure/`
implementa puertos que se **declaran** en `domain/`.

`server/` (spec 033) es un segundo consumidor de `domain/`, con sus propias reglas: importa
`src/app/domain/` con rutas relativas y nunca al revés, y nunca importa de `application/`,
`infrastructure/` ni `ui/` — el dominio no sabe que existe un servidor (ADR 0025, invariante 8
de `CLAUDE.md`). Es exactamente lo que el invariante 2 (`domain/` no importa nada externo) hace
posible: el mismo código de reglas de voleibol corre en el navegador y en Node sin adaptador
intermedio.

## Capas

### `domain/`

Modelos y reglas. Aquí vive el voleibol.

- `modelos.ts` — `Punto`, `Jugador`, `RolId`, `DefinicionRol`, `OrdenSaque`, `PlantillaEquipo`,
  `TipoSistema`, `Celda`, `Sistema` (con `formaciones` para recepción y `defensas` — lista de
  `VarianteDefensa` por caso, situación y número de bloqueadores, spec 038-039 — para defensa, y
  `descripcion?` — descripción general independiente de la rotación, spec 025), `Colocacion`
  (con `celdas?`, la rejilla de responsabilidad de ese jugador en esa formación, solo en defensa
  desde la spec 024), `Formacion`, `Infraccion`, `Aviso`, `ResultadoValidacion`. Desde la spec
  024, `celdas` distingue dos estados que antes eran indistinguibles: `undefined` es "nunca
  tocada" (se muestra el bloque por defecto derivado del punto) y `[]` es "vaciada a propósito"
  (cero celdas, sin defecto). Solo se llega a `[]` borrando la última celda pintada. `celdasFinta?`
  (spec 041) es un campo paralelo, mismos tres estados, sin bloque por defecto en ningún caso —
  responsabilidad de finta, distinta de `celdas` y sin ninguna regla que las combine.
  `CasoColocador`, `SituacionDefensa`, `PuestoDefensa`, `NumeroBloqueadores`, `ColocacionDefensa`
  (con `puesto` en vez de `jugador`), `FormacionDefensa` y `VarianteDefensa` son la contraparte
  de defensa desde la spec 038: la defensa deja de ir por rotación y por vía, pasa a ir por caso
  del colocador rival y situación de ataque, y los seis puestos son genéricos — no hay jugador
  que colocar, así que `ColocacionDefensa` es un tipo paralelo a `Colocacion`, no una unión
  dentro de ella (ADR 0029). `ViaAtaque` desaparece.
- `roles.ts` — configuración de roles por defecto y `etiquetaDe()`.
- `equipos.ts` — los dos equipos fijos (spec 032, `EQUIPOS`, `NOMBRE_EQUIPO`), mismo patrón que
  `roles.ts`: el identificador es estable, el nombre visible es lo único configurable.
- `rotacion.ts` — `rotar`, `formacionEnRotacion`, `rotacionDe`: deriva las posiciones
  rotacionales ancladas al colocador (ADR 0010). `jugadoresEnPista(plantilla, rotacion)`
  deriva quién juega de verdad — el líbero en vez del titular si le toca zaga (ADR 0014).
  `zaguerosEnRotacion(orden, rotacion)` deriva quiénes ocupan P1/P5/P6 en una rotación; la usan
  tanto `sustitutosLiberoPorDefecto` como la UI para filtrar el selector del líbero.
- `defensa.ts` — `situacionesDe(caso): SituacionDefensa[]` (qué situaciones existen para cada
  caso del colocador rival), `situacionTrasCambioDeCaso` (a qué situación cae al cambiar de caso
  si la activa no existe en el nuevo), `situacionMasCercana(punto, caso)` (deriva la situación de
  un punto del campo rival, con el espejo de zonas ya resuelto — spec 038, ver `docs/dominio.md`
  §3; nunca devuelve una situación fuera de `situacionesDe(caso)`). Funciones puras, sin estado.
  Sustituye a `viaDeAtaque` de la spec 021.
- `rejilla.ts` — `TAMANO_CELDA` (0,5 m, ADR 0004), `celdaDe(punto): Celda | null` (`null` fuera
  de las líneas del campo propio) y `centroDe(celda): Punto` (spec 022). `bloquePorDefecto(punto):
  Celda[]` (spec 024): el bloque de hasta 2×2 celdas más cercano a un punto — cerca de una línea
  del campo se recorta a 2×1 o 1×1 en vez de desplazarse entero hacia dentro. `trazoCerrado(trazo):
  boolean`, `rellenarContorno(contorno): Celda[]` (flood fill puro desde fuera de la rejilla) y
  `celdasDeTrazo(trazo): Celda[]` (combina las dos: si el trazo se cierra, rellena; si no, lo
  devuelve tal cual) — pintado por contorno, spec 024. `cobertura.ts` (huecos y conflictos) sigue
  sin existir: llega con las specs 014–015 de la hoja de ruta.
- `separacion.ts` — `DISTANCIA_MINIMA_ENTRE_JUGADORES` (0,9 m) y `separarDeOtros(punto, otros,
  distanciaMinima): Punto` (spec 046): ni en recepción ni en defensa dos fichas pueden quedar en
  el mismo punto exacto. `SistemaStore.colocarOMover` lo aplica en las dos ramas antes de
  guardar el punto de destino. No es una falta posicional — es un límite de arrastre, así que
  nunca se guarda un estado inválido que `validarFormacion` tuviera que rechazar.
- `sistema-defensa.ts` — `guardarVarianteDefensa(sistema, caso, situacion, bloqueadores,
  formacion)`: análogo a `guardarFormacion` pero keyed por (caso, situación, bloqueadores), y
  **nunca** valida posición (spec 021, en defensa la validación no existe). No reutiliza
  `jugadoresEnPista`: en defensa no hay roster de jugadores que comprobar, solo que los seis
  puestos estén cubiertos sin repetir (spec 038); rechaza declarar bloqueadores en la situación
  `'inicial'` (spec 039). `puestosQueBloquean(formacion, bloqueadores)` (spec 039): deriva quién
  bloquea de la distancia a la red de los puestos delanteros, sin pasar de la línea de 3 metros —
  nunca se declara puesto a puesto. Acepta un `desplazamientoSombra?: Punto` opcional (spec 040)
  que se asocia a la variante guardada. `explicarVariante` y `explicarPuesto`: equivalentes de
  `explicarRotacion`/`explicarJugador` para defensa — la explicación de conjunto va por variante,
  no por rotación.
- `sombra-bloqueo.ts` — `sombraDeBloqueo(atacante, bloqueadores, desplazamiento?)` (spec 040):
  calcula la sombra que el bloqueo le proyecta al atacante, como una lista de polígonos (uno por
  pared de bloqueo cerrada; varios si hay un pasillo de luz entre bloqueadores separados). Fusiona
  tramos de red cercanos en una pared, proyecta un cono desde el atacante hasta el fondo del
  campo, y recorta con Sutherland–Hodgman al rectángulo `[0,9]×[0,9]`. El desplazamiento se
  aplica antes de recortar, nunca después. Función pura, sin estado.
- `plantilla.ts` — `validarPlantilla`: composición y coherencia de índices de los seis
  titulares. El índice de cada jugador se declara en la plantilla, no se deriva (ADR 0017); no
  hay ninguna función que lo calcule. El líbero nunca es uno de los seis (ADR 0014); si aparece
  dentro del orden de saque, la composición se rechaza.
- `plantillas-equipo.ts` — `puedeCrearPlantillaEquipo` (con líbero opcional: a quién sustituye
  debe ser uno de los seis titulares), `puedeBorrarPlantillaEquipo`.
- `plantilla-global.ts` — la única plantilla real de la v1: seis titulares con índice declarado
  a mano y un líbero que sustituye, en cada rotación, al central que caiga en zaga en ella (ADR
  0015). Configuración por defecto, igual que `roles.ts`.
- `validacion.ts` — `validarFormacion(formacion, posiciones): ResultadoValidacion`. No deriva
  las posiciones ella misma: las recibe ya resueltas de quien la llama, con
  `formacionEnRotacion` (sin líbero) o `jugadoresEnPista` (con él) — así no necesita saber
  nada de líberos (ADR 0014).
- `catalogo-sistemas.ts` — `crearSistema`, `renombrarSistema`, `borrarSistema`,
  `ordenarCatalogo`, `cambiarSustitutoLibero` (a quién sustituye el líbero, purgando cada
  formación con el roster que le toca en su propia rotación — ADR 0014), `describirSistema`
  (descripción general del sistema, spec 025; texto en blanco la borra, igual que
  `explicarRotacion`), `clonarSistema` (spec 026: duplica un sistema entero bajo un id y un
  nombre nuevos; mismas reglas de nombre que `crearSistema`/`renombrarSistema`), `estadoDe`
  (spec 051: `Sistema.estado` es opcional, ausente equivale a `'borrador'`),
  `validarSistema`/`invalidarSistema` (cambian ese estado; quién puede hacerlo es
  `puedeGestionarEquipo` en `acceso.ts`, no algo que decida este fichero).
- `sistema-recepcion.ts` — `guardarFormacion`, `sistemaCompleto`, `borrarRotacion`,
  `explicarRotacion`, `explicarJugador`.
- `sistema-por-defecto.ts` — `sistemaPorDefecto(plantilla): Sistema` (spec 025, ADR 0021): el
  sistema de recepción a 3 en 5-1 de `docs/voley/Guia_Sistema_Recepcion_3_Esquema_5-1.md`. En la
  v1 arrancaba la app con él si el navegador no tenía nada guardado; desde la spec 033, es
  `server/src/infraestructura/semilla.ts` quien siembra este mismo sistema en PostgreSQL
  (`npm run seed`), no un adaptador de `infrastructure/`. Deriva el roster de cada rotación con
  `jugadoresEnPista`; solo declara puntos y textos por posición rotacional.
- `sistema-defensa-por-defecto.ts` — `sistemaDefensaPorDefecto(plantilla): Sistema` (spec 030,
  reescrito por la 038): el sistema defensivo de `docs/voley/sistema_defensivo_unificado.md`,
  sembrado junto al de recepción. Coloca **por puesto genérico** (1..6, la geometría se declara
  una sola vez por (situación, puesto) y no depende de ningún jugador ni rotación) para los dos
  casos del colocador rival y las situaciones que cubre el documento (z4, z3, z2 —solo caso
  trasero—, pipe); la posición inicial y el ataque por 1 nacen sin colocación, sin material de
  referencia que sembrar (spec 038, E20).
- `acceso.ts` — el rol de acceso (spec 035): `normalizarEmail` (el correo se compara siempre en
  minúsculas y sin espacios), `resolverAltaDesdeInvitacion` (traduce una invitación de la lista
  blanca en si la cuenta nace admin o en qué equipos nace con membresía),
  `LONGITUD_MINIMA_CONTRASENA`, `puedeGestionarEquipo` (specs 037/051: admin, o entrenador con
  membresía en el equipo — crear, editar, borrar y validar comparten esta misma regla) y
  `puedeEditarAlgo` (spec 037: si a la cuenta le toca ver la pestaña Editor, sea cual sea el
  equipo). Nada de contraseñas ni de sesión aquí: eso necesita `node:crypto` y vive en
  `server/`, que es quien lo usa (invariante 2).
- `puertos.ts` — las interfaces `SistemaRepository`, `AjustesRepository` y `AccesoRepository`,
  sin implementación. Asíncronas todas; `SistemaRepository` además es granular —
  `crear`/`actualizar`/`borrar` por sistema, nunca un `guardar` de todo el catálogo— para que una
  escritura no pueda arriesgar el trabajo de un sistema que no tocó (spec 031, ADR 0024).
  También declara `ErrorDeRed`, `ErrorDelServidor` y `ConflictoDeEdicion` (spec 034) para
  `SistemaRepository`, y `CredencialesInvalidas`/`InvitacionNoDisponible` (spec 050) para
  `AccesoRepository`: los motivos de fallo que un adaptador puede señalar, parte del contrato
  del puerto — no un detalle de cómo lo cumple un adaptador en concreto.

Todo son funciones puras y tipos, con una excepción deliberada: las clases de error de
`puertos.ts` no tienen estado propio (heredan de `Error` sin añadir nada), así que siguen sin
fecha ni aleatoriedad — la regla de fondo es esa, no "cero clases". `creadoEn`/`actualizadoEn`
de un sistema no viven aquí, sino en `infrastructure/` (ADR 0012). `cobertura.ts` (huecos y
conflictos derivados de la rejilla) todavía no existe: llega con las specs 014–015 de la hoja
de ruta del README.

**La configuración de roles vive aquí**, no en la UI ni en un fichero de entorno. Cambiar
"Receptor" por "Punta" es cambiar el vocabulario del dominio, y el sitio donde se hace debe
ser evidente para alguien que solo lea `domain/`.

### `application/`

Orquestación y estado de la aplicación con signals. Tres clases, ninguna con decorador de
Angular, las tres testeables sin `TestBed`.

- `AccesoStore` (spec 050) — `usuario`, `cargando` y `error`. `comprobarSesion()` es lo único
  que dispara `app.config.ts` con `provideAppInitializer`: al arrancar solo se pregunta si hay
  sesión, nunca se pide el catálogo de sistemas todavía. `entrar()` y `crearCuenta()` traducen
  `CredencialesInvalidas`/`InvitacionNoDisponible` en el mensaje de `error()`; `crearCuenta()`
  encadena `registrar()` y `entrar()` para que quien acaba de crear su cuenta no tenga que
  teclear la contraseña una segunda vez (E4).
- `SistemaStore` — instanciable con `new SistemaStore(repositorio, ajustesRepositorio)`
  (`sistema.store.spec.ts`). El constructor no hace ninguna E/S (spec 031): `cargar()` es un
  método aparte, asíncrono. Desde la spec 050, ya no lo dispara `app.config.ts`: `App` lo llama
  en cuanto `AccesoStore.usuario()` deja de ser `null` — al arrancar con una sesión ya viva, o
  justo después de entrar o crear cuenta. `estadoActivo` (computed, spec 051) y
  `cambiarEstadoActivo(estado)` (acción) validan o quitan la validación del sistema activo; el
  servidor decide si quien lo pide tiene permiso (ADR 0038), y un rechazo llega por
  `errorGuardado`, igual que cualquier otra escritura.
- `TeoriaStore` (spec 052, ADR 0039) — `new TeoriaStore(sistemaStore)`
  (`teoria.store.spec.ts`): lee `SistemaStore.sistemas()`, filtrado a los validados (spec 051),
  con su propia navegación (equipo, sistema, rotación, caso, situación, bloqueadores, jugador
  seleccionado) — nunca la de `SistemaStore`, para que abrir Teoría no pise un cambio sin
  guardar del editor. `formacionActiva` es `null` cuando esa rotación o variante nunca se
  guardó — a diferencia de `SistemaStore`, no rellena con una formación de partida, porque no
  hay nada que "empezar a colocar" en una vista de solo lectura.

- Escribibles: `sistemas` (catálogo completo, de los dos equipos), `equipoActivo` (spec 032,
  masculino por defecto), `sistemaActivoId`, `rotacionActiva`, `casoActivo`/`situacionActiva`/
  `bloqueadoresActivos` (spec 038-039, sustituyen a `viaActiva` de la spec 021 — la rotación no
  manda nada en defensa, así que estos son los ejes de navegación ahí, no `rotacionActiva`),
  `borrador: readonly ColocacionBorrador[]` (`ColocacionBorrador = Colocacion | ColocacionDefensa`:
  jugador en recepción, puesto genérico en defensa — spec 038), `desplazamientoSombraEdicion`
  (spec 040: el retoque de la sombra de bloqueo en edición, `null` si nunca se ha desplazado; se
  carga desde `VarianteDefensa.desplazamientoSombra` igual que `borrador` se carga desde la
  formación guardada, pero necesita su propia signal porque no es una lista de colocaciones),
  `cambioPendiente` (aviso de cambios sin guardar al cambiar de rotación, de caso, de situación,
  de bloqueadores, de sistema o de equipo), `jugadorSeleccionadoId` (pese al nombre, guarda el id
  del ocupante seleccionado: el del jugador en recepción, o `p${puesto}` en defensa — no se
  renombró para no ampliar el radio de cambio de la spec 038 más de lo necesario), `errorGuardado`
  (spec 034, ADR 0026: motivo de la última escritura fallida y cómo reintentarla, o `null`).
- Derivados con `computed`: `catalogo` (los sistemas de `equipoActivo`, ordenados — spec 032),
  `sistemaActivo`, `posicionesActivas` (quién
  juega de verdad en la rotación activa — titular o líbero, vía `jugadoresEnPista`; solo tiene
  sentido en recepción),
  `formacionGuardadaActiva` (lee `formaciones[rotacion]` en recepción, la variante que coincide
  con `(casoActivo, situacionActiva, bloqueadoresActivos)` en defensa), `hayCambiosSinGuardar`,
  `resultadoValidacion` (siempre `null` en defensa: no es que la validación esté desactivada, es
  que no existe), `puedeGuardar` (en defensa, solo exige los seis puestos colocados),
  `explicacionMostrada` (la del ocupante seleccionado, o si no hay ninguno la de la rotación en
  recepción / de la variante activa en defensa — spec 038, E18: en defensa la explicación de
  conjunto va por caso y situación, no por rotación), `descripcionSistemaActivo` (spec 025: la
  descripción general del sistema activo, o cadena vacía si no tiene),
  `celdasJugadorSeleccionado` (spec 024: las celdas del ocupante seleccionado, o su bloque por
  defecto si no tiene ninguna; siempre vacío fuera de defensa), `celdasFintaJugadorSeleccionado`
  (spec 041: igual pero sobre `celdasFinta`, nunca con bloque por defecto).
- Acciones: `activarSistema`, `seleccionarEquipo` (spec 032, mismo aviso de cambios sin guardar
  que las demás; activa el primero del catálogo del equipo nuevo, o ninguno si está vacío),
  `seleccionarRotacion`, `seleccionarCaso`/`seleccionarSituacion`/`seleccionarBloqueadores`
  (spec 038-039; cambiar de caso conserva la situación si sigue existiendo en el nuevo, si no
  cae en la inicial),
  `confirmarCambio`/`cancelarCambio`, `colocarOMover` (conserva `celdas` y `explicacion` de la
  colocación previa; en defensa el id que recibe tiene la forma `p${puesto}` — `puestoDeId` lo
  distingue de un id de jugador), `quitar`, `vaciar`, `pintarCelda`/`borrarCelda` (marcan o
  quitan una celda de la rejilla de responsabilidad de un ocupante en el borrador, spec 022; si
  `celdas` era `undefined`, parten del bloque por defecto en vez de vacío — spec 024, así que
  pintar o borrar cualquiera de sus celdas materializa y congela la zona en vez de sustituirla;
  spec 041: despachan sobre `celdas` o `celdasFinta` según la signal `modoPintado`, sin bloque por
  defecto en modo finta), `accionArrastre`/`seleccionarAccionArrastre` (spec 044, sustituye al
  interruptor `pintadoActivo` de la 041; tri-estado desde la spec 045 — `'pintar'`, `'mover'` o
  `null` si se clica dos veces la misma opción, o si `seleccionarBloqueadores` deja la variante
  sin bloqueadores mientras estaba en `'mover'`), `puedeMoverBloqueo` (spec 045: `false` sin
  bloqueadores, incluida la postura inicial — deshabilita "Mover bloqueo" en la UI y hace que el
  store ignore la selección aunque llegue igual) y `modoPintado`/`seleccionarModoPintado` (qué
  campo afecta el pintado), `escalaSombra`/`cambiarEscalaSombra` (spec 044: entero 0-10 desde la
  045, ajuste global persistido, puramente de pantalla — `ui/pista/pista.ts` escala solo el eje
  lateral del polígono, nunca la profundidad; `domain/` no la conoce),
  `guardar` (en defensa llama a `guardarVarianteDefensa` en vez de `guardarFormacion`, incluyendo
  `desplazamientoSombraEdicion` si lo hay), `desplazarSombra`/`recentrarSombra` (spec 040: retocan
  o descartan el desplazamiento en edición; se persiste al llamar a `guardar`), `crear` (recibe el
  equipo del sistema nuevo, spec 032; cambia `equipoActivo` si es distinto del que ya estaba
  activo, para que el sistema recién creado se vea de inmediato), `clonar`
  (spec 026, mismo patrón que `crear` pero a partir del sistema activo; mantiene su equipo, sin
  parámetro propio), `renombrarActivo`,
  `borrar`, `seleccionarJugador` (toggle: toca a la misma ficha deselecciona, a otra cambia el
  foco — spec 010), `enfocarJugador` (selecciona sin toggle, spec 027: se usa al terminar un
  arrastre que coloca una ficha), `deseleccionarJugador` (spec 027: pinchar el fondo cuando no
  tiene ya otro trabajo asignado — pintar zona, en defensa), `guardarExplicacion`,
  `guardarDescripcion` (spec 025), `cambiarSustitutoLibero`. `quitar` también deselecciona si el
  jugador quitado era el seleccionado (spec 027). Toda acción que persiste algo es `async` desde
  la spec 031 y llama al método del puerto que corresponde a lo que tocó (`crear`, `actualizar`
  o `borrar`), nunca a uno que reescriba el catálogo entero.

  **La llamada al repositorio va siempre primero (ADR 0026).** Los ocho métodos de escritura
  pasan por un helper común, `ejecutarEscritura(accion, reintentar)`: espera a que el
  repositorio termine y solo entonces muta los signals locales — nunca al revés. Si falla, no
  toca ningún signal de estado y publica el motivo en `errorGuardado: { mensaje, reintentar } |
  null`, para que `ui/` pueda avisar y ofrecer reintentar. No es UI optimista: con
  `localStorage` (que nunca fallaba) mutar antes de esperar era inofensivo, pero con un
  adaptador HTTP real habría dejado ver un cambio como guardado justo antes de perderlo.

Nada de lógica de voleibol aquí. Si aparece un `if` sobre posiciones, pertenece a `domain/`.

### `infrastructure/`

Adaptadores hacia el mundo exterior.

- `HttpSistemaRepository implements SistemaRepository` (spec 034) — **el adaptador en uso**,
  contra la API de `server/`. `fetch` nativo, no `HttpClient` de Angular (mismo criterio que ya
  usaba el adaptador de la v1 para correr sin DOM: el test sustituye la función global y sigue
  corriendo sin `TestBed`). Traduce cualquier respuesta o excepción a uno de los tres motivos
  que declara el puerto: `ErrorDeRed` (la petición no llegó), `ErrorDelServidor` (el servidor
  respondió con error) o `ConflictoDeEdicion` (409 — alguien más modificó el sistema mientras
  tanto). El testigo de concurrencia (`actualizadoEn`, que el servidor exige como cabecera
  `If-Match` al actualizar) se guarda aquí, en memoria e indexado por id — nunca en el tipo de
  dominio, que sigue sin fechas (ADR 0012).
- `LocalStorageSistemaRepository` — **retirado en la spec 038** (ADR 0031), con sus 26 tests. Ya
  no estaba cableado en `app.config.ts` desde la spec 034 (mandaba `HttpSistemaRepository`), y
  mantenerlo al día con cada cambio de forma de `Sistema` costaba más de lo que aportaba: la
  ADR 0023 ya había dejado escrito que `localStorage` se sustituye, no se queda como modo sin
  conexión. El tipo `AlmacenClaveValor` que exportaba pasó a `local-storage-ajustes.repository.ts`,
  su único usuario que queda.
- `LocalStorageAjustesRepository implements AjustesRepository` — **excepción deliberada**: es el
  único adaptador de `localStorage` que sigue en producción. La spec 034 dejó los `Ajustes`
  fuera de alcance a propósito: son preferencias de pantalla por dispositivo (validación
  desactivada, ayuda de posición…), no trabajo de un entrenador que perder. `usuario` existe
  desde la spec 035, pero moverlos a columnas suyas (`docs/modelo-de-datos.md` §4) sigue sin
  spec asignada, así que este adaptador sigue siendo el definitivo por tiempo indefinido. Mismo
  patrón (versión + data) que tenía `LocalStorageSistemaRepository`, pero bajo su propia clave:
  los ajustes son globales a la app, no de un sistema concreto (ADR 0015). Sigue siendo un único
  documento — de cuatro banderas más `escalaSombra` (spec 044, versión 5 del payload) — que se
  reescribe entero en cada `guardar()` (spec 031): no hay nada que la granularidad de
  `SistemaRepository` pudiera arriesgar aquí, solo se volvió asíncrono.
- `HttpAccesoRepository implements AccesoRepository` (spec 050) — **el adaptador en uso**.
  Mismo criterio que `HttpSistemaRepository`: `fetch` nativo, y toda petición manda
  `credentials: 'include'` — sin eso el navegador no envía la cookie de sesión a un origen
  distinto del suyo. `entrar()` pregunta a `/auth/quien-soy` justo después de abrir sesión,
  porque `/auth/entrar` no devuelve quién ha entrado (spec 035: esa ruta solo abre la sesión).
- Exportadores (PNG, JSON): todavía no existen, llegan con la spec 016.

### `ui/`

Componentes standalone de Angular, prefijo `app-` (el que fija `angular.json`).
`ChangeDetectionStrategy.OnPush`, zoneless.

- `ui/acceso/` — `PantallaAcceso` (spec 050): entrar o crear cuenta, con una pestaña para cada
  modo. Es lo que `App` muestra cuando `AccesoStore.usuario()` es `null`; sin componentes de
  test, como el resto de `ui/` — la lógica que importa ya está probada en `AccesoStore`.
- `ui/pista/` — `Pista` (el SVG, `viewBox` en metros, `puntoDesde`/`contiene`/captura de
  puntero) y `FichaJugador` (`g[appFicha]`, pinta la etiqueta y el punto ya derivados). En
  defensa, también pinta la ficha "A" del atacante en el punto fijo de la situación activa
  (ADR 0020, sigue vigente bajo el nombre nuevo — spec 038) y la ficha "C" del colocador rival,
  fija según el caso. La leyenda gana las entradas propias de defensa cuando `mostrarRival` está
  activo (spec 038, E21), y el botón que la abre cambia de icono (E22). Expone un `pointerdown`
  de fondo (`fondoAgarrado`) para el modo pintar — tanto `FichaJugador` como la ficha "A" paran
  la propagación de su propio `pointerdown` para no disparar los dos gestos a la vez. Cuando
  `mostrarZonas` (solo en defensa, spec 024), pinta siempre las celdas de todos con una paleta
  fija de 7 colores (`PALETA_COLORES`) y una leyenda — ya no hay un interruptor aparte para
  verlas (spec 023 quedó revertida por la 024): la del ocupante seleccionado
  (`indiceColorSeleccionado`) se ve a plena intensidad y las demás atenuadas. Una celda
  compartida se pinta con un patrón SVG de franjas diagonales, uno por cada combinación de
  colores que aparece. `Pista` también pinta la sombra de bloqueo (spec 040) como uno o más
  `<polygon>` — `PUNTO_POR_SITUACION` se exporta desde aquí para que `Tablero` calcule el punto
  canónico del atacante sin duplicarlo. Un `pointerdown` propio (`sombraAgarrada`) para
  retocarla, con el mismo `stopPropagation` que la ficha "A" y `FichaJugador`. La sombra se
  dibuja con relleno oscuro traslúcido, sin ningún color de la paleta de jugadores (E14): es
  geometría de otra naturaleza, no responsabilidad de ningún puesto.
- `ui/rotaciones/` — `SelectorRotacion` (pestañas R1–R6, solo en recepción desde la spec 038),
  `SelectorCaso` (pestañas colocador delantero/trasero) y `SelectorSituacion` (pestañas de
  situación de ataque, dependientes del caso activo) — ambos solo en defensa, spec 038, sustituyen
  a `SelectorVia` de la spec 021. `SelectorBloqueadores` (spec 039): pestañas 0-3, con una marca
  visual de qué números ya tienen variante guardada para la (caso, situación) activos —
  `Tablero.bloqueadoresCreados`, derivado de `sistema.defensas`; no se ofrece en la situación
  `'inicial'` (`Tablero.admiteBloqueadores`).
- `ui/panel/` — `PaletaJugadores` (banquillo), `PanelValidacion` (badge de falta/aviso),
  `PanelEnsenanza` (explicación de la rotación o del jugador seleccionado, editable; input
  `abierto` opcional, por defecto desplegado — spec 025 lo usa plegado para el panel de
  descripción del sistema). `Tablero` monta dos: uno para `descripcionSistemaActivo` y otro,
  el de siempre, para `explicacionMostrada`.
- `ui/sistemas/` — `BarraSistemas` (desplegable + crear/renombrar/clonar/borrar — el botón de
  clonar, spec 026, deshabilitado sin sistema activo igual que renombrar y borrar; recibe el
  catálogo ya filtrado por equipo, no sabe que existen equipos), `DialogoSistema` (alta, edición
  y clonado — spec 026 añade un tercer modo en `Tablero.dialogoSistema`, reutilizando el
  componente sin cambios: `mostrarTipo` en `false` como al editar, `nombreInicial` con el nombre
  sugerido «‹Original› (copia)»; el campo de equipo, spec 032, comparte esa misma visibilidad —
  ni el tipo ni el equipo cambian una vez creado), `SelectorEquipo` (pestañas del equipo activo,
  spec 032, mismo patrón que `SelectorCaso`).
- `ui/comun/` — `DialogoConfirmacion`, reutilizado para "cambios sin guardar" y para confirmar
  el borrado de un sistema. `ficha-vista.ts` (spec 052): etiqueta y color de un puesto o un
  jugador en la pista — `idOcupanteDe`, `indiceColorDe`, `etiquetaOcupanteDe`,
  `ETIQUETA_PUESTO`... Fontanería de presentación sin estado, compartida entre `Tablero` y
  `TeoriaTablero`; vivía dentro de `tablero.ts` hasta que `TeoriaTablero` la necesitó también —
  importarla directamente de ahí habría creado un import circular entre los dos componentes.
- `ui/tablero/` — `Tablero`, el shell: consume `SistemaStore` con `inject()`, traduce signals
  a vista y gestiona el arrastre por `PointerEvent` (capturado sobre el `<svg>`, nunca sobre la
  ficha). `puedeEditar` (spec 037) decide si se ve la pestaña Editor y si `ventana` arranca ahí
  o en "Teoría" — solo depende del rol (`domain/acceso.puedeEditarAlgo`), nunca de qué equipo
  esté activo; el permiso real, equipo a equipo, lo comprueba el servidor en cada escritura.
  Trabaja con `ColocacionBorrador` de forma genérica (jugador o puesto, spec 038): las
  funciones `idOcupanteDe`/`etiquetaOcupanteDe` distinguen los dos casos donde antes solo había
  `Colocacion`. El modo pintar (spec 022, solo en defensa desde la spec 024) es un segundo
  gestor de `PointerEvent` en paralelo al de arrastre: con un ocupante seleccionado, arrastrar
  sobre el fondo de la pista pinta o borra celdas en vez de mover fichas — el primer punto tocado
  decide si el trazo entero pinta o borra, según si esa celda ya era suya (vía
  `store.celdasJugadorSeleccionado()`, que ya incluye el bloque por defecto). Al soltar, si el
  trazo se cerró, `celdasDeTrazo` añade las celdas del interior (spec 024, E9-E11). El índice de
  color de cada jugador (`indiceColorDe`) se deriva del mismo orden fijo de roles que ya usan el
  banquillo y la leyenda de etiquetas (`claveOrdenRol`) — nunca se declara ni se guarda.
  `Tablero.sombra` (spec 040) recalcula la sombra de bloqueo en cada cambio de estado: el punto
  del atacante es el canónico de la situación activa, o el punto bajo el puntero mientras se
  arrastra la ficha "A" (`arrastreAtacante`, spec E3) — un tercer gestor de `PointerEvent`,
  `onAgarrarSombra`, acumula el desplazamiento respecto al punto donde se agarró la sombra y lo
  deja en `store.desplazamientoSombraEdicion` para que `guardar()` lo persista.
- `ui/teoria/` — `TeoriaTablero` (spec 052): la pestaña "Teoría", de solo consulta. Reutiliza
  `Pista` y los selectores del editor (son presentacionales, sin acoplar a `SistemaStore`), pero
  nunca escucha sus eventos de arrastre — `idArrastrada`/`accionArrastre` van siempre a `null` o
  vacíos. Construye `FichaVista`/`CeldaConjunto`/leyenda sobre `TeoriaStore` con el mismo cálculo
  que `Tablero` hace sobre `SistemaStore.borrador()`, pero repetido (ADR 0039) en vez de
  compartido: los dos consumidores necesitan la misma fontanería, pero nunca el mismo estado.

Los componentes leen signals y emiten intenciones. No calculan nada del dominio, ni siquiera
la etiqueta de una ficha — con dos excepciones deliberadas: `Tablero` distingue un toque de un
arrastre por la distancia en píxeles de pantalla entre agarrar y soltar (spec 010), y decide si
un trazo de pintado pinta o borra por el mismo motivo — son distinciones de interacción, no de
voleibol.

`src/app/maqueta/` sigue existiendo como boceto congelado: no se borra, pero desde la spec 009
`app.html` ya no la renderiza. Sirve de referencia visual, no se toca.

### `server/`

Proyecto Node aparte, con su propio `package.json` y `node_modules` (spec 033). API REST con
Express 5 que guarda y sirve sistemas en PostgreSQL vía Prisma. **Importa `src/app/domain/`
directamente, con rutas relativas — nunca al revés, y nunca de `application/`, `infrastructure/`
ni `ui/`** (ADR 0025, invariante 8 de `CLAUDE.md`): es el mismo dominio que corre en el
navegador, ejecutándose en Node.

- `src/http/servidor.ts` — fábrica del servidor Express (`crearServidor()`, sin escuchar puerto:
  eso lo hace `src/main.ts`, y los tests de integración levantan su propia instancia efímera).
  CORS escrito a mano (tres cabeceras y una respuesta corta a `OPTIONS`, sin la dependencia
  `cors`), origen permitido configurable por `ORIGEN_PERMITIDO` (`.env`).
- `src/http/sistemas.rutas.ts` — las rutas de `/api/sistemas`. `GET` sigue **sin exigir
  sesión**, sin spec asignada para cambiarlo. Las cuatro de escritura (`POST`, `PUT`,
  `PUT /:id/estado`, `DELETE`) sí la exigen, y el rol (spec 037/051, ADR 0038):
  `exigirPermisoDeEquipo`, un helper local, resuelve la sesión con
  `acceso.repositorio.quienSoy` y comprueba `domain/acceso.puedeGestionarEquipo` contra el
  equipo real del sistema — nunca el que traiga el cuerpo de la petición, para que no valga
  mentir sobre `equipoId` al editar o borrar uno ya existente. `PUT /sistemas/:id` sigue
  exigiendo además la cabecera `If-Match` con el testigo de concurrencia (`409` si caducó),
  comprobada antes que el permiso.
- `src/http/auth.rutas.ts` — las rutas de `/api/auth` (spec 035, ADR 0036): registro contra la
  lista blanca, entrar, salir y "quién soy".
- `src/http/cookies.ts` — `leerTestigoSesion` (spec 035, factorizado en la 051 al necesitarlo
  también `sistemas.rutas.ts`): parseo de `Cookie` a mano, mismo criterio que el CORS escrito a
  mano en `servidor.ts` — no hace falta más para esto.
- `src/infraestructura/prisma.ts`, `sistema.repositorio.ts` — el cliente de Prisma y el
  repositorio que traduce entre las filas de PostgreSQL y el `Sistema` de dominio.
  `cambiarEstadoSistema` y `equipoDelSistema` (spec 051) son para la ruta de validar: la segunda
  resuelve el equipo dueño sin traer el sistema entero, solo para decidir el permiso.
- `src/infraestructura/acceso.repositorio.ts` — `registrar`, `entrar`, `quienSoy` y `salir` (spec
  035): compone `domain/acceso.ts` con Prisma — valida la invitación, resuelve en qué equipos
  nace la membresía, abre y renueva la sesión. `contrasena.ts` (hash y verificación con `scrypt`,
  ADR 0037) y `sesion.ts` (testigo aleatorio y su huella SHA-256, duración de 30 días) son los
  dos únicos ficheros que tocan `node:crypto` — nada de eso vive en `domain/` (invariante 2).
- `src/infraestructura/semilla.ts` — siembra el equipo, el catálogo fijo de jugadores y los dos
  sistemas de ejemplo (`npm run seed`); sustituye a la siembra que hacía el adaptador de
  `localStorage` en la v1. La guarda de `sembrarEjemplos` es por tipo desde la spec 038, no
  "el equipo tiene algo guardado": un equipo puede tener sistemas de recepción con trabajo real
  del entrenador y a la vez no tener ningún sistema de defensa (por ejemplo, justo tras una
  migración que los borró) — con una guarda por "cualquier sistema" el de defensa no volvería a
  sembrarse nunca. `sembrarPrimerAdmin` (spec 035) invita como `admin` el correo de
  `ADMIN_EMAIL_INICIAL`, si lo hay y todavía no está invitado — esa persona completa su alta por
  el registro normal, sin que ninguna contraseña pase por un fichero.
- `prisma/schema.prisma` y `prisma/migrations/` — el esquema completo está en
  `docs/modelo-de-datos.md`. Los `CHECK` y la función `celdas_validas()` no se expresan en el
  lenguaje de esquema de Prisma: van a mano en el SQL de la migración. Desde la spec 038,
  `formacion_defensa` y `colocacion_defensa` sustituyen a la columna `via` de `formacion`: cuelgan
  directamente de `sistema`, no de `sistema_rotacion` — en defensa ya no hay rotación. Desde la
  spec 035, `usuario`, `lista_blanca`, `membresia` y `sesion` (esta última no estaba en el
  documento original) dan cuenta, lista blanca y sesión.

Arranque, tests y la lista completa de rutas están en `server/README.md`, no se duplican aquí.

## Estructura de carpetas

```
src/app/
├── domain/
│   ├── modelos.ts
│   ├── roles.ts
│   ├── equipos.ts
│   ├── rotacion.ts
│   ├── plantilla.ts
│   ├── plantillas-equipo.ts
│   ├── plantilla-global.ts
│   ├── validacion.ts
│   ├── defensa.ts
│   ├── rejilla.ts
│   ├── catalogo-sistemas.ts
│   ├── sistema-recepcion.ts
│   ├── sistema-defensa.ts
│   ├── sistema-por-defecto.ts
│   ├── sistema-defensa-por-defecto.ts
│   ├── acceso.ts
│   ├── puertos.ts
│   └── *.spec.ts
├── application/
│   ├── acceso.store.ts
│   ├── acceso.store.spec.ts
│   ├── sistema.store.ts
│   ├── sistema.store.spec.ts
│   ├── teoria.store.ts
│   └── teoria.store.spec.ts
├── infrastructure/
│   ├── http-acceso.repository.ts             # en uso (spec 050)
│   ├── http-sistema.repository.ts            # en uso (spec 034)
│   ├── local-storage-ajustes.repository.ts   # en uso, excepción deliberada
│   └── *.spec.ts
├── ui/
│   ├── acceso/
│   ├── teoria/
│   ├── tablero/
│   ├── pista/
│   ├── rotaciones/
│   ├── panel/
│   ├── sistemas/
│   ├── ajustes/
│   └── comun/          # incluye ficha-vista.ts, compartido con tablero/
└── maqueta/        # boceto congelado, no se renderiza ni se borra

server/
├── prisma/
│   ├── schema.prisma
│   └── migrations/       # los CHECK y celdas_validas() están a mano en el SQL
└── src/
    ├── infraestructura/   # Prisma, repositorios (sistemas, acceso), contraseña, sesión, semilla
    ├── http/               # Express: rutas (sistemas, auth) y la fábrica del servidor
    └── main.ts
```

Los tests viven junto al fichero que prueban, no en una carpeta `test/` paralela.

## Por qué SVG y no Canvas

Para seis fichas, una rejilla y unas líneas, SVG gana en todo lo que importa aquí:
`viewBox` da el responsive gratis sin escuchar `resize`, cada elemento está en el DOM
(inspeccionable, estilable con CSS, accesible, testeable con selectores), y el arrastre son
unos manejadores de `pointer` con captura. Canvas y Fabric.js resuelven un problema que este
proyecto no tiene: un lienzo de dibujo libre con rotaciones, capas y texto editable.

Si algún día el entrenador tiene que dibujar flechas a mano alzada, se reevalúa. Ver
`docs/decisiones/0003-svg-en-lugar-de-canvas.md`.

## Sobre las abstracciones

Solo hay una abstracción especulativa permitida en el proyecto: `SistemaRepository`. La apuesta
se cobró — el segundo adaptador (HTTP, spec 034) existe y es hoy el que está en producción — y
poder testear sin `localStorage` tuvo valor desde el principio, con o sin ese segundo
adaptador.

No se crean interfaces con una sola implementación "por si acaso". En particular, **no hay
adaptador de renderizado**: el SVG se deriva de los signals, así que no existe el problema
de sincronizar dos estados que un adaptador de canvas vendría a resolver.
