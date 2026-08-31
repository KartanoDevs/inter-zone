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
- `roles.ts` — configuración de roles por defecto, `etiquetaDe()` y `esRolIdValido` (spec 053:
  si un valor es uno de los cinco roles de voleibol — usado para validar la posición favorita
  del perfil).
- `equipos.ts` — los dos equipos fijos (spec 032, `EQUIPOS`, `NOMBRE_EQUIPO`), mismo patrón que
  `roles.ts`: el identificador es estable, el nombre visible es lo único configurable.
- `rotacion.ts` — `rotar`, `formacionEnRotacion`, `rotacionDe`: deriva las posiciones
  rotacionales ancladas al colocador (ADR 0010). `jugadoresEnPista(plantilla, rotacion)`
  deriva quién juega de verdad — el líbero en vez del titular si le toca zaga (ADR 0014).
  `zaguerosEnRotacion(orden, rotacion)` deriva quiénes ocupan P1/P5/P6 en una rotación; la usa
  `sustitutosLiberoPorDefecto` (desde la decisión 0040, único origen del sustituto: la interfaz ya
  no ofrece elegirlo).
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
  nombre nuevos; spec 063: recibe también el equipo de destino —el del original o el otro— y
  comprueba la unicidad del nombre en ese equipo; mismas reglas que
  `crearSistema`/`renombrarSistema`), `estadoDe`
  (spec 051: `Sistema.estado` es opcional, ausente equivale a `'borrador'`),
  `validarSistema`/`invalidarSistema` (cambian ese estado; quién puede hacerlo es
  `puedeGestionarEquipo` en `acceso.ts`, no algo que decida este fichero).
- `sistema-recepcion.ts` — `guardarFormacion`, `sistemaCompleto`, `borrarRotacion`,
  `explicarRotacion`, `explicarJugador`.
- `examen.ts` — reglas del examen sobre un sistema de recepción (specs 012–013, ajustadas por la
  057, ampliadas por la 058). `Examen` es una unión cerrada de tres casos (`'puesto' | 'linea' |
  'sistema'`), no una configuración declarativa: los tipos se añaden desde código, y el punto de
  extensión principal es `jugadoresAColocar(examen, sistema, rotacion)`, que deriva a quién le
  toca colocar al alumno en cada rotación. Si `titularId` es el propio líbero (spec 058: puede
  ser sujeto de examen, no solo sustituto), se localiza directamente en `jugadoresEnPista` — el
  líbero nunca vive en el orden de saque (ADR 0014). Si no, resuelve primero el titular en el
  orden de saque y luego su ocupante real con `jugadoresEnPista`; si el líbero ha entrado por él
  (spec 043/ADR 0034), el titular no está físicamente en pista esa rotación y la función
  devuelve `[]` (spec 057-E3, revierte 012-E5: antes pedía colocar la ficha del líbero en su
  lugar). `liberoExaminable(sistema)` decide si el líbero se ofrece como sujeto: solo si el
  sistema lo declara y de verdad entra en pista en alguna rotación (058-E1/E2/E5).
  `rotacionesExaminables`
  usa esa señal para decidir qué rotaciones cuentan — todas por sistema, solo las de verdad en
  pista por puesto o línea — y `corregirExamen` promedia únicamente esas (spec 057-E5: una
  rotación fuera del examen no cuenta como cero). `faltasImputables` filtra el resultado de
  `validarFormacion` a solo las infracciones donde interviene una ficha del alumno — una falta
  entre dos fichas dadas por el enunciado no es suya. `sePuedeExaminar(sistema)` exige el sistema
  completo y sus seis rotaciones legales: no tiene sentido medir al alumno contra un modelo con
  una falta guardada a propósito (spec 017). `notaPorDistancia(distancia)` decae linealmente de
  10 (a ≤0,5 m) a 0 (a ≥4 m, spec 057: valores ajustados desde los 0,45 m/3 m originales de la
  013 porque medían precisión de pizarra, no criterio táctico); `corregirRotacion` la agrega por
  las fichas que le tocaba colocar al alumno, y una falta suya anula la nota de esa rotación a 0
  sin tocar las demás; `corregirExamen` agrega las rotaciones examinadas y concede una insignia
  (bronce/plata/oro, una por tipo y titular) si la nota llega a 7 y ninguna tuvo falta.
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
  equipo), `dorsalValido` y `normalizarNombre` (spec 053: mismo criterio que `describirSistema`
  con la descripción de un sistema — un texto en blanco borra lo que hubiera). `DatosPerfil` es
  el tipo de los tres campos de perfil, siempre los tres juntos, nunca un parche parcial. Nada
  de contraseñas ni de sesión aquí: eso necesita `node:crypto` y vive en `server/`, que es quien
  lo usa (invariante 2).
- `insignias.ts` — `InsigniaGanada` (spec 056: qué sistema, qué tipo de examen y, si aplica, qué
  titular). `resumenDeMedallas(sistemaId, plantilla, insignias)` y `recuentoDeSistemas(sistemas,
  insignias)` (spec 061): agrupan las insignias de una cuenta para la vitrina de la ventana
  Cuenta — qué puestos tienen bronce (examen por puesto) y plata (por línea), la fecha del oro
  (examen de sistema completo) si lo hay y si el sistema está dominado, y cuántos sistemas de
  recepción están dominados sobre el total. La etiqueta de cada puesto se deriva con `etiquetaDe`
  y la configuración de roles por defecto, igual que `ficha-vista.ts` para el resto de la pista;
  una insignia cuyo sistema ya no está en el catálogo (borrado) no aparece.
- `puertos.ts` — las interfaces `SistemaRepository`, `AjustesRepository`, `AccesoRepository`,
  `ListaBlancaRepository` e `InsigniasRepository` (spec 056), sin implementación. Asíncronas
  todas; `SistemaRepository` además es granular —
  `crear`/`actualizar`/`borrar` por sistema, nunca un `guardar` de todo el catálogo— para que una
  escritura no pueda arriesgar el trabajo de un sistema que no tocó (spec 031, ADR 0024).
  También declara `ErrorDeRed`, `ErrorDelServidor` y `ConflictoDeEdicion` (spec 034) para
  `SistemaRepository`, y `CredencialesInvalidas`/`InvitacionNoDisponible` (spec 050) para
  `AccesoRepository`: los motivos de fallo que un adaptador puede señalar, parte del contrato
  del puerto — no un detalle de cómo lo cumple un adaptador en concreto. `InsigniasRepository`
  no necesita ninguna clase de error propia: un fallo se señala con `ErrorDelServidor`, y sus dos
  métodos (`listar`, `registrar`) siempre actúan sobre la cuenta de la sesión, igual que
  `AccesoRepository` con el propio perfil — nunca aceptan un id de otra cuenta.

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
  teclear la contraseña una segunda vez (E4). `actualizarPerfil()` y `cambiarContrasena()`
  (spec 053) siguen el mismo patrón: con éxito, la primera refleja los datos nuevos en
  `usuario()` sin volver a preguntar al servidor.
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
- `ListaBlancaStore` (spec 054) — `new ListaBlancaStore(repositorio)`
  (`lista-blanca.store.spec.ts`): `invitaciones`, `cargando`, `error`. `cargar()`, `invitar(email,
  rol, equipoClave)` y `retirar(email)` recargan la lista entera tras cada escritura en vez de
  parchear en local — la lista es corta (una fila por correo invitado) y así el estado nunca
  puede divergir del servidor tras un reintento o un fallo a medias.
- `InsigniasStore` (spec 061) — `new InsigniasStore(repositorio)` (`insignias.store.spec.ts`):
  `insignias`, `cargando`, `cargadas`, `error`. Solo lee (`InsigniasRepository.registrar` lo
  sigue llamando `ExamenStore` al terminar un examen). `cargadas` distingue "aún no se ha
  pedido / se está pidiendo" de "se pidió y vino vacío", para que una cuenta sin ninguna medalla
  y una carga en curso no se vean igual. `PerfilCuenta` dispara `cargar()` la primera vez que se
  abre la vista "Logros", nunca al abrir la ventana Cuenta.

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
  (spec 026, mismo patrón que `crear` pero a partir del sistema activo; spec 063: recibe
  `equiposId` como `crear` y clona a uno o a los dos equipos, todo o nada; queda activa la copia
  del equipo del original si estaba marcado, si no la del primero marcado), `renombrarActivo`,
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
  `actualizarPerfil()` y `cambiarContrasena()` (spec 053) van a `/auth/perfil` y
  `/auth/contrasena`.
- `HttpListaBlancaRepository implements ListaBlancaRepository` (spec 054) — **el adaptador en
  uso**. Mismo criterio que los otros dos: `fetch` nativo con `credentials: 'include'` contra
  `/api/lista-blanca` (`GET`/`POST`/`DELETE /lista-blanca/:email`). Traduce el 409 del servidor a
  `CorreoYaRegistrado` (E3).
- `HttpInsigniasRepository implements InsigniasRepository` (spec 056) — **el adaptador en uso**.
  Mismo criterio: `fetch` nativo, `credentials: 'include'`, contra `GET`/`POST
  /api/examen/insignias`. No traduce ningún motivo de fallo propio — cualquier rechazo del
  servidor se señala como `ErrorDelServidor`, porque el único caso especial de este puerto (sin
  sesión) ya lo cubre ese mismo error, sin necesitar una clase nueva. Desde la spec 061 se
  provee una sola vez (un `InjectionToken` en `app.config.ts`) y lo comparten `ExamenStore`
  —que registra la insignia al terminar un examen— e `InsigniasStore` —que las lista en la
  vitrina—; antes se instanciaba inline dentro de la factoría de `ExamenStore`, sin forma de que
  nadie más lo tomara.
- Exportadores (PNG, JSON): todavía no existen, llegan con la spec 016.

### `ui/`

Componentes standalone de Angular, prefijo `app-` (el que fija `angular.json`).
`ChangeDetectionStrategy.OnPush`, zoneless.

- `ui/acceso/` — `PantallaAcceso` (spec 050): entrar o crear cuenta, con una pestaña para cada
  modo. Es lo que `App` muestra cuando `AccesoStore.usuario()` es `null`. `PerfilCuenta`
  (spec 053, ampliada por la 061): la ventana "Cuenta" real, ahora con un conmutador de dos
  vistas — "Datos usuario" (correo y rol de solo lectura, los tres campos de perfil, cambiar la
  contraseña en un `Modal` aparte) y "Logros" (`VitrinaMedallas`). `VitrinaMedallas` (spec 061):
  el mosaico con una pieza por sistema de recepción de los equipos del usuario, cada una con las
  tres ranuras de medalla, y un panel de detalle —sobre `Modal`— con los puestos de cada tier;
  toda la lógica está en `domain/insignias.ts`. `ListaBlancaAdmin`
  (spec 054): formulario de invitar (correo, rol, equipo si no es `admin`) más tabla de
  invitaciones pendientes con botón de retirar tras confirmar en `DialogoConfirmacion`
  (`ui/comun/`) — solo visible en la pestaña "Lista blanca", que `Tablero` solo muestra si
  `esAdmin()`. Ninguno lleva test de componente, como el resto de `ui/` — la lógica que importa
  ya está probada en `AccesoStore`/`ListaBlancaStore`/`domain/insignias`.
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
  y clonado — spec 026 añade un tercer modo en `Tablero.dialogoSistema`: `mostrarTipo` en `false`
  como al editar, `nombreInicial` con el nombre sugerido «‹Original› (copia)». La spec 063 separa
  `mostrarEquipo` de `mostrarTipo`: el bloque de equipo (spec 048, casillas de los dos equipos)
  se muestra al crear y al clonar, no al renombrar — clonar puede llevar la copia a uno o a los
  dos equipos), `SelectorEquipo` (pestañas del equipo activo,
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
- `src/http/sistemas.rutas.ts` — las rutas de `/api/sistemas`. `GET` exige sesión (cualquier
  rol) desde la pasada de seguridad de la ADR 0043; no exige membresía del equipo, para que
  Teoría siga funcionando con cuentas sin membresía. Las cuatro de escritura (`POST`, `PUT`,
  `PUT /:id/estado`, `DELETE`) exigen además el rol (spec 037/051, ADR 0038):
  `exigirPermisoDeEquipo`, un helper local, resuelve la sesión con
  `acceso.repositorio.quienSoy` y comprueba `domain/acceso.puedeGestionarEquipo` contra el
  equipo real del sistema — nunca el que traiga el cuerpo de la petición, para que no valga
  mentir sobre `equipoId` al editar o borrar uno ya existente. `PUT /sistemas/:id` sigue
  exigiendo además la cabecera `If-Match` con el testigo de concurrencia (`409` si caducó),
  comprobada antes que el permiso.
- `src/http/auth.rutas.ts` — la factoría `crearAuthRutas(limitador)` monta las rutas de
  `/api/auth` (spec 035, ADR 0036): registro, entrar, salir, "quién soy", y guardar el perfil o
  cambiar la contraseña de la propia sesión (spec 053) — nunca de otra cuenta, porque el id sale
  de la sesión, no de la petición. `entrar`, `registro` y `contrasena` pasan por el limitador de
  intentos (`src/http/limitador.ts`, ADR 0043): `429` por IP tras 20 fallos en la ventana.
- `src/http/limitador.ts` — `crearLimitadorDeIntentos()`: middleware `guardia` y contador
  `registrarFallo`, en memoria, por IP. Sin dependencias, mismo criterio que el CORS y el lector
  de cookies escritos a mano (ADR 0043).
- `src/http/lista-blanca.rutas.ts` — las rutas de `/api/lista-blanca` (spec 054): `GET` (listar),
  `POST` (invitar o reinvitar con otro rol) y `DELETE /:email` (retirar). `exigirAdmin`, un
  helper local, resuelve la sesión con `resolverSesion` y rechaza si el rol no es `admin` — a
  diferencia de `exigirPermisoDeEquipo`, aquí no hay equipo que comprobar: gestionar la lista
  blanca es cosa exclusiva del admin.
- `src/http/cookies.ts` — `leerTestigoSesion` (spec 035) y `resolverSesion` (spec 037,
  factorizados aquí al necesitarlos también `sistemas.rutas.ts`, y desde la 053 las dos rutas
  de perfil): parseo de `Cookie` a mano, mismo criterio que el CORS escrito a mano en
  `servidor.ts` — no hace falta más para esto.
- `src/http/examen.rutas.ts` — las rutas de `/api/examen/insignias` (spec 056): `GET` (las de la
  propia cuenta) y `POST` (registrar una ganada). Exigen sesión, sin ningún rol — a diferencia de
  `sistemas.rutas.ts` y `lista-blanca.rutas.ts`, no hay equipo ni admin que comprobar, porque el
  id de usuario sale siempre de la sesión.
- `src/infraestructura/prisma.ts`, `sistema.repositorio.ts` — el cliente de Prisma y el
  repositorio que traduce entre las filas de PostgreSQL y el `Sistema` de dominio.
  `cambiarEstadoSistema` y `equipoDelSistema` (spec 051) son para la ruta de validar: la segunda
  resuelve el equipo dueño sin traer el sistema entero, solo para decidir el permiso.
- `src/infraestructura/acceso.repositorio.ts` — `registrar`, `entrar`, `quienSoy` y `salir` (spec
  035): compone `domain/acceso.ts` con Prisma — valida la invitación, resuelve en qué equipos
  nace la membresía, abre y renueva la sesión. `actualizarPerfil` y `cambiarContrasena`
  (spec 053): la primera rechaza antes de tocar la base si la posición o el dorsal no son
  válidos (`esRolIdValido`, `dorsalValido`); la segunda exige acertar la actual
  (`verificarContrasena`) antes de aceptar la nueva. `listarInvitaciones`, `invitar` y
  `retirarInvitacion` (spec 054): `invitar` hace un `upsert` por correo normalizado — reinvitar
  uno pendiente actualiza su rol en la misma fila (E2) — y rechaza con `CorreoYaRegistrado` si el
  correo ya tiene cuenta (E3); `retirarInvitacion` borra la fila de `lista_blanca` sin tocar la
  `usuario`/`membresia` que haya podido salir de ella (E5). `contrasena.ts` (hash y verificación
  con
  `scrypt`, ADR 0037) y `sesion.ts` (testigo aleatorio y su huella SHA-256, duración de 30 días)
  son los dos únicos ficheros que tocan `node:crypto` — nada de eso vive en `domain/`
  (invariante 2).
- `src/infraestructura/insignias.repositorio.ts` — `registrarInsignia` y `insigniasDe` (spec
  056): un `upsert` sobre la clave primaria compuesta de `insignia_examen` para que repetir un
  examen ya superado no duplique la fila ni mueva su fecha; `titular_id` vacío en la fila
  representa "sin titular" (examen por sistema), traducido de vuelta a `null` al leer.
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
│   ├── examen.ts
│   ├── sistema-defensa.ts
│   ├── sistema-por-defecto.ts
│   ├── sistema-defensa-por-defecto.ts
│   ├── acceso.ts
│   ├── insignias.ts
│   ├── puertos.ts
│   └── *.spec.ts
├── application/
│   ├── acceso.store.ts
│   ├── acceso.store.spec.ts
│   ├── sistema.store.ts
│   ├── sistema.store.spec.ts
│   ├── teoria.store.ts
│   ├── teoria.store.spec.ts
│   ├── lista-blanca.store.ts
│   ├── lista-blanca.store.spec.ts
│   ├── examen.store.ts
│   ├── examen.store.spec.ts
│   ├── insignias.store.ts
│   └── insignias.store.spec.ts
├── infrastructure/
│   ├── http-acceso.repository.ts             # en uso (spec 050)
│   ├── http-sistema.repository.ts            # en uso (spec 034)
│   ├── http-lista-blanca.repository.ts       # en uso (spec 054)
│   ├── http-insignias.repository.ts          # en uso (spec 056)
│   ├── local-storage-ajustes.repository.ts   # en uso, excepción deliberada
│   └── *.spec.ts
├── ui/
│   ├── acceso/         # PantallaAcceso, PerfilCuenta, VitrinaMedallas, ListaBlancaAdmin
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
    ├── http/               # Express: rutas (sistemas, auth, lista-blanca) y la fábrica del servidor
    └── main.ts
```

Los tests viven junto al fichero que prueban, no en una carpeta `test/` paralela.

## Despliegue

Producción es tres contenedores Docker bajo un solo origen (ADR 0041): `web` (nginx) sirve el
build de Angular y hace `proxy_pass` de `/api` al contenedor `servidor`; `servidor` y
`postgres` no publican ningún puerto al host, solo se alcanzan desde la red interna del
compose. Mismo origen quiere decir que `URL_API` en `app.config.ts` es `'/api'` (ruta
relativa) y no una URL absoluta: elimina CORS entre front y API, y hace que la cookie de
sesión `iz_sesion` sea de primera parte — importante en Safari/iOS, que descarta cookies de
terceros.

- `Dockerfile.web`, `nginx.conf` (raíz) — build multi-stage del frontend; nginx aplica
  cabeceras de caché distintas por tipo de recurso (inmutable para los bundles con hash,
  `no-cache` para `index.html` y `sw.js`) y una CSP.
- `server/Dockerfile` — build del servidor. **Se ejecuta con `tsx` en producción, igual que en
  desarrollo, a propósito**: el generador de Prisma (`prisma-client`) emite el cliente como
  TypeScript con imports sin extensión, que ni `tsc` reescribe ni Node resuelve; compilar
  obligaría a migrar la resolución de módulos del servidor entero. `prisma generate` se
  ejecuta dentro de la imagen (el motor de consultas es un binario por plataforma) y
  `prisma migrate deploy` corre al arrancar el contenedor, antes de escuchar el puerto.
- `docker-compose.prod.yml` (raíz) — no sustituye a `server/docker-compose.yml`, que sigue
  siendo solo el Postgres desechable de desarrollo.
- El servidor de estáticos no necesita fallback de rutas por SPA con router (la aplicación no
  tiene uno, todo vive en `/`), pero lo lleva de todas formas por si algún día lo tiene.
- PWA instalable, no offline: un service worker de ~20 líneas escrito a mano (`public/sw.js`)
  cachea solo una página de cortesía sin conexión, nunca los bundles. No se usa
  `@angular/service-worker` porque su precacheo agresivo es justo el modo offline que el
  proyecto excluye a propósito (ver README y `docs/01_Finalidad_y_Alcance.md`).

Detalle del razonamiento completo, alternativas descartadas y riesgos aceptados:
`docs/decisiones/0041-despliegue-en-un-solo-origen-y-pwa-instalable.md`.

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
