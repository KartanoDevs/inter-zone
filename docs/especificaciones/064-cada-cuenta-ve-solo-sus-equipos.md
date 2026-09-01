# 064 — Cada cuenta ve solo sus equipos

**Estado:** Congelada
**Paso de la hoja de ruta:** 8 (backend, cuentas y equipos)

## Problema

Un `usuario` invitado solo al equipo femenino ve hoy exactamente lo mismo que uno invitado a los
dos: los iconos ♂/♀ para cambiar de equipo, el catálogo de recepciones de ambos, y puede
examinarse de sistemas del masculino aunque no sea "suyo". El rol de acceso ya distingue admin /
entrenador / usuario y la membresía ya dice de qué equipos es cada cuenta (spec 035), pero nada
en la aplicación usa esa membresía para acotar lo que se ve.

## Objetivo

Una cuenta con membresía en un solo equipo trabaja como si ese fuera el único que existe: sin
selector de equipo, y con catálogo, examen y logros limitados a ese equipo. El admin y quien
tenga membresía en los dos siguen viéndolo todo.

## Fuera de alcance

- **Cambiar la membresía de una cuenta ya creada.** Sigue fijándola el registro desde la
  invitación (spec 035) y solo el admin desde la lista blanca antes del alta (spec 054). Esta
  spec solo lee la membresía, no la edita.
- **Un tercer equipo, o equipos configurables.** Siguen siendo dos y fijos (spec 032).
- **Filtrar por rol de voleibol** (qué ve un receptor frente a un central). No existe ese
  concepto de permiso y esta spec no lo introduce.
- **Ocultar la pestaña Editor a un entrenador según equipo.** Un entrenador con membresía en un
  solo equipo ya ve el editor (spec 037) y esta spec no lo cambia — solo le quita el selector de
  equipo si no tiene nada que seleccionar.
- **Rehacer la etiqueta de rol de la ventana Cuenta.** Se le añade la información de equipo al
  lado, nada más.

## Escenarios

**E1 — `equiposVisibles` de un admin son los dos**
- Dado: una cuenta admin
- Cuando: se pregunta a qué equipos tiene acceso
- Entonces: masculino y femenino, en ese orden

**E2 — `equiposVisibles` de un usuario son los de sus membresías**
- Dado: una cuenta con membresía solo en femenino
- Cuando: se pregunta a qué equipos tiene acceso
- Entonces: solo femenino

**E3 — El selector de equipo no se muestra si solo hay un equipo visible**
- Dado: una cuenta con acceso a un solo equipo
- Cuando: abre el editor, Teoría o el examen
- Entonces: no aparecen los iconos ♂/♀ en ninguna de las tres

**E4 — El selector de equipo sí se muestra con acceso a los dos**
- Dado: un admin, o una cuenta con membresía en los dos equipos
- Cuando: abre cualquiera de esas tres ventanas
- Entonces: aparecen los dos iconos, como hasta ahora

**E5 — El equipo activo inicial es el primero visible, no siempre masculino**
- Dado: una cuenta con membresía solo en femenino
- Cuando: arranca la aplicación
- Entonces: el catálogo, la Teoría y el examen arrancan en femenino

**E6 — El catálogo de sistemas solo trae los equipos visibles**
- Dado: una cuenta con acceso solo a femenino
- Cuando: se carga el catálogo
- Entonces: en memoria no hay ningún sistema del masculino

**E7 — El servidor rechaza leer el catálogo de un equipo sin membresía**
- Dado: una sesión de una cuenta con membresía solo en femenino
- Cuando: pide `GET /api/sistemas?equipoId=masculino`
- Entonces: responde 403, no la lista

**E8 — El admin puede leer el catálogo de cualquier equipo**
- Dado: una sesión de admin
- Cuando: pide `GET /api/sistemas` de cualquiera de los dos equipos
- Entonces: responde 200 con la lista

**E9 — Teoría solo ofrece sistemas de los equipos visibles**
- Dado: una cuenta con acceso solo a masculino
- Cuando: abre la pestaña Teoría
- Entonces: solo ve sistemas validados del masculino; nunca del femenino

**E10 — El examen solo deja examinarse de sistemas de los equipos visibles**
- Dado: una cuenta con acceso solo a masculino
- Cuando: abre la hoja de inscripción del examen
- Entonces: el desplegable de sistemas solo lista los del masculino

**E11 — Los logros muestran solo insignias de sistemas de los equipos visibles**
- Dado: una cuenta con acceso solo a masculino que en algún momento ganó una insignia de un
  sistema del femenino (por ejemplo, antes de que le quitaran el acceso)
- Cuando: abre "Logros"
- Entonces: esa insignia no se muestra

**E12 — La ventana Cuenta muestra a qué equipo pertenece**
- Dado: una cuenta con membresía de entrenador solo en femenino
- Cuando: abre la ventana Cuenta
- Entonces: junto a la etiqueta "Entrenador" se ve que es del equipo femenino

**E13 — Un admin ve "Admin" y los dos equipos en la ventana Cuenta**
- Dado: una cuenta admin
- Cuando: abre la ventana Cuenta
- Entonces: se ve "Admin" y, al lado, los dos equipos

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de congelar:

- **Se cierra también el servidor** (E7, E8): `GET /api/sistemas` pasa a exigir membresía en el
  equipo, no solo sesión. Sin esto, el catálogo del otro equipo se sigue pudiendo pedir con
  `curl` y de hecho el cliente lo pedía siempre.
- **El selector desaparece entero** cuando solo hay un equipo (E3), no se deja deshabilitado.
- **Se crean dos cuentas de prueba en el Postgres local** (`usuario-masculino@test`,
  `usuario-femenino@test`), no en producción, para verificar a mano.

## Al cerrar

Los 13 escenarios se cumplen. Suite: 500 tests al empezar (tras cerrar la 063 y los dos fixes
previos de esta rama) → 510 al cerrar la 064 — nuevos en `domain/acceso.spec.ts` (E1, E2),
`application/acceso.store.spec.ts` (E1, E2), `application/sistema.store.spec.ts` (E5, E6),
`application/teoria.store.spec.ts` (E9), `application/examen.store.spec.ts` (E10) y
`server/src/http/sistemas.rutas.spec.ts` (E7, E8). E3, E4, E12 y E13 son render puro,
verificados con `npm run build` y revisión, mismo criterio que specs anteriores sin
`*.spec.ts` de componente. `npm run typecheck` (raíz y servidor) y `npm run format:check`
limpios.

**Dos funciones de dominio nuevas, no una:** `tieneAccesoAEquipo(usuario, equipoId)` (predicado
por equipo, que usa la ruta del servidor) y `equiposVisibles(usuario, equipos)` (la lista, para
la interfaz), definida en términos de la primera. Se separaron porque el servidor pregunta "¿este
equipo sí o no?" y la interfaz "¿cuáles?".

**`equipoActivo` de Teoría y Examen pasó de `signal` a `linkedSignal`** que sigue al de
`SistemaStore` (que la 064 fija en el primer equipo visible). Antes eran tres `signal('masculino')`
independientes; ahora arrancan sincronizados y se resetean juntos en cada recarga, pero cada uno
sigue aceptando su propio `.set()` para la navegación independiente de las specs 052 y 057. Se
descartó pasarles `AccesoStore` por constructor para no tocar sus specs ni `app.config.ts`.

**`SistemaStore.cargar()` ganó un parámetro opcional `equipos`**, no un cambio de firma
obligatorio: los ~40 tests que llaman `cargar()` sin argumento siguen viendo el comportamiento de
antes de la 064 (los dos equipos, masculino activo). Solo `App` lo pasa, con
`acceso.equiposVisibles()`. `SistemaRepository.listar()` igual.

**El servidor: `GET /api/sistemas` pasó de "solo sesión" a "sesión + membresía".** El comentario
de esas líneas afirmaba explícitamente lo contrario ("Teoría la consultan cuentas sin
membresía") — se corrigió. Verificado a mano con las dos cuentas de prueba: un usuario del
femenino recibe 403 al pedir `equipoId=masculino`, 200 al pedir el suyo.

**Los logros (E11) ya salían filtrados sin tocar nada:** `VitrinaMedallas.sistemasDelUsuario`
(spec 061) ya cruzaba las insignias con los sistemas de los equipos del usuario, y esos sistemas
ahora vienen ya acotados de `SistemaStore`. No hizo falta filtrar en `InsigniasStore` ni en
`examen.rutas.ts`.

**Cuentas de prueba creadas en el Postgres local** (no en producción): `usuario-masculino@test`
y `usuario-femenino@test`, contraseña `prueba1234`, cada una con una única membresía de
`usuario`. Sembradas por lista blanca + registro por la API.

**Sin ADR nuevo ni cambio en `docs/dominio.md`:** no es una regla de voleibol; el permiso por
equipo ya existía (spec 035/037), la 064 solo lo lleva a la lectura y a la interfaz. Sí se
actualiza `docs/arquitectura.md` (ADR 0027): el punto de `GET /api/sistemas` y las nuevas
funciones de `acceso.ts`.
