# 061 — La vitrina de medallas

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

El jugador supera exámenes y gana medallas —bronce por colocar bien un puesto, plata por una
línea, oro por el sistema entero (spec 013)— y desde la spec 056 esas medallas se guardan en su
cuenta para siempre. Pero no puede verlas en ninguna parte: la ventana Cuenta solo enseña su
correo, su rol y los campos de perfil. Nadie puede mirar lo que ya ha conseguido ni lo que le
queda por examinar.

## Objetivo

La ventana Cuenta gana una vista "Logros" donde, sistema a sistema, el jugador ve qué medallas
tiene ganadas, de qué puestos, y cuáles le faltan.

## Fuera de alcance

Esta spec autoriza explícitamente crear y tocar ficheros fuera de `domain/`, que `CLAUDE.md`
protege por defecto. La autorización se limita a estos ficheros:

- `src/app/application/insignias.store.ts` (nuevo)
- `src/app/app.config.ts` — para cablear el store nuevo y sacar `HttpInsigniasRepository` de la
  factoría de `ExamenStore`, donde hoy vive escondido, a un sitio del que también lo pueda tomar
  el store nuevo
- `src/app/ui/acceso/perfil-cuenta.ts`, `perfil-cuenta.html`, `perfil-cuenta.css`
- El componente nuevo de la vista Logros (`src/app/ui/acceso/`, nombre a elección de quien
  implemente) y sus tres ficheros
- `src/app/ui/tablero/tablero.ts`, `tablero.html`, `tablero.css` — la ventana `'cuenta'` hoy es
  `<app-perfil-cuenta>` más un botón "Salir"; hay que meter ahí el conmutador de las dos vistas
- `public/medals/bronze.png`, `public/medals/silver.png`, `public/medals/gold.png` — por el
  escenario E21

`src/app/domain/insignias.ts` no necesita autorización: `domain/` es lo que el protocolo permite
por defecto. Ningún otro fichero de `ui/`, `application/`, `infrastructure/`, `server/` ni de
`domain/` fuera de `insignias.ts` queda autorizado por esta spec.

Explícitamente fuera:

- **Ver las medallas de otra cuenta.** Ni un panel para que el entrenador vea las de su equipo.
  Ya estaba fuera en la spec 056; sigue fuera.
- **Cambiar qué medalla concede cada tipo de examen.** Bronce/plata/oro por puesto/línea/sistema
  lo fija la spec 013; aquí solo se muestra el resultado.
- **Guardar la nota, las faltas o las colocaciones del intento.** Igual que la spec 056: se
  muestra el hecho de haber ganado la medalla, no cómo se ganó.
- **Medallas de examen de defensa.** No existe examen de defensa (spec 012).
- **Rutas de servidor nuevas ni migraciones de base de datos.** `GET /api/examen/insignias` ya
  existe, con sesión y probado (spec 056).
- **Rediseñar el resto de ventanas** ni la pantalla de acceso. Esta spec toca la ventana Cuenta
  y nada más.
- **Una configuración de roles por equipo.** Las etiquetas de puesto salen de la configuración
  por defecto fija; si el día de mañana cada equipo puede renombrar sus roles, adaptar la vitrina
  es otra spec.
- **Cerrar `GET /api/sistemas` tras una sesión** (spec 037). La vitrina consume ese endpoint tal
  como está; que hoy no exija sesión es un problema conocido y con spec propia pendiente.
- **Añadir dependencias.** Los tokens de fondo, neón y tipografía y el patrón de esquina
  facetada ya están en `src/styles.css`; el panel de detalle se apoya en `Modal`
  (`ui/comun/modal.ts`).
- **Accesibilidad de teclado más allá de lo que pidan E10 y E17.** El resto sigue siendo trabajo
  aparte, como ya dejaron dicho las specs 055, 057 y 059.

## Escenarios

### El resumen de medallas de un sistema

**E1 — Un sistema sin ningún examen superado no tiene medallas**
- Dado: una cuenta que nunca ha superado ningún examen de un sistema
- Cuando: se calcula el resumen de medallas de ese sistema para esa cuenta
- Entonces: el resumen dice que no hay ninguna medalla —ni bronce, ni plata, ni oro— y que el
  sistema no está dominado

**E2 — Superar el examen de un puesto da el bronce de ese puesto**
- Dado: una cuenta que ha ganado la medalla de bronce del examen por puesto de un titular
  concreto de un sistema
- Cuando: se calcula el resumen de medallas de ese sistema
- Entonces: el resumen tiene bronce, y el bronce nombra ese puesto y solo ese

**E3 — Varios puestos del mismo sistema acumulan varios bronces**
- Dado: una cuenta que ha ganado el bronce del examen por puesto de dos titulares distintos del
  mismo sistema
- Cuando: se calcula el resumen de medallas de ese sistema
- Entonces: el bronce del resumen nombra los dos puestos

**E4 — Bronce y plata conviven en el mismo sistema**
- Dado: una cuenta con el bronce de un puesto y la plata de una línea, ambos del mismo sistema
- Cuando: se calcula el resumen de medallas de ese sistema
- Entonces: el resumen tiene bronce y plata a la vez, cada uno con su puesto o su línea

**E5 — El oro marca el sistema como dominado**
- Dado: una cuenta que ha ganado la medalla de oro del examen de sistema completo
- Cuando: se calcula el resumen de medallas de ese sistema
- Entonces: el resumen tiene oro y el sistema cuenta como dominado

**E6 — Las medallas de un sistema no se cuelan en otro**
- Dado: una cuenta con medallas ganadas en un sistema y ninguna en otro
- Cuando: se calculan los resúmenes de los dos sistemas
- Entonces: las medallas aparecen solo en el resumen de su sistema; el otro sale vacío

**E7 — El recuento cuenta los sistemas dominados sobre todos los de recepción**
- Dado: una cuenta con el oro de dos sistemas y medallas parciales en otros, y un catálogo con
  nueve sistemas de recepción y algunos de defensa
- Cuando: se calcula el recuento de la vitrina
- Entonces: el recuento dice "2 de 9" — el numerador solo cuenta el sistema con oro, no el que
  tiene solo bronce o plata; el denominador son todos los sistemas de recepción del catálogo del
  usuario, y los de defensa no cuentan

**E7b — Un bronce de líbero no descoloca el desglose**
- Dado: una cuenta con el bronce del examen por puesto del líbero de un sistema, además de otros
  puestos
- Cuando: se calcula el resumen de medallas de ese sistema
- Entonces: el bronce nombra el líbero como un puesto más de la lista, con la etiqueta "L", igual
  que el resto

### La ventana Cuenta con dos vistas

**E8 — Cuenta abre mostrando los datos del usuario**
- Dado: el jugador abre la ventana Cuenta
- Cuando: la ventana aparece
- Entonces: se ve la vista "Datos usuario" con el correo, el rol y los campos de perfil, igual
  que hoy; la vista "Logros" no se ve todavía

**E9 — Se conmuta a Logros y se vuelve sin perder nada**
- Dado: la ventana Cuenta abierta en "Datos usuario", con un cambio sin guardar en el campo del
  nombre
- Cuando: se pulsa "Logros" y luego se vuelve a "Datos usuario"
- Entonces: la vista Logros se muestra y se oculta correctamente, y al volver el cambio sin
  guardar del nombre sigue ahí

**E10 — El conmutador se maneja entero con el teclado**
- Dado: el foco puesto en el conmutador de vistas
- Cuando: se navega solo con el teclado (tabulador para llegar, flechas para cambiar de vista)
- Entonces: se puede pasar de "Datos usuario" a "Logros" y volver, el foco es siempre visible, y
  la vista activa queda marcada de forma que no dependa solo del color

### La vitrina

**E11 — Sin ninguna medalla, la vitrina lo dice en vez de quedarse en blanco**
- Dado: una cuenta que no ha ganado ninguna medalla en ningún sistema
- Cuando: se abre la vista Logros
- Entonces: aparece un mensaje que explica que aún no hay medallas y cómo se consiguen (superar
  un examen), no un mosaico vacío ni una pantalla en blanco

**E12 — Cada pieza enseña las tres medallas, encendidas o apagadas**
- Dado: la vista Logros con varios sistemas de recepción, algunos sin ninguna medalla todavía
- Cuando: se mira la pieza de un sistema
- Entonces: la pieza lleva su nombre y las tres medallas —bronce, plata, oro— con las ganadas
  destacadas y las no ganadas atenuadas, y se distingue una de otra sin depender solo del color;
  un sistema sin ninguna medalla también aparece, con las tres apagadas

**E12b — Las piezas se ordenan con lo conseguido delante**
- Dado: la vista Logros con un sistema dominado, otros con medallas parciales y otros vacíos
- Cuando: se mira el mosaico
- Entonces: primero van los sistemas dominados, después los que tienen alguna medalla, y al
  final los que no tienen ninguna

**E13 — Un sistema dominado se distingue de uno a medias**
- Dado: la vista Logros con un sistema que tiene oro y otro que solo tiene bronce
- Cuando: se miran las dos piezas
- Entonces: la del sistema dominado se ve claramente distinta de la del que va a medias, y esa
  diferencia no es solo de color

### El detalle de un sistema

**E14 — Al elegir un sistema se abre su detalle**
- Dado: la vista Logros
- Cuando: se elige la pieza de un sistema
- Entonces: se abre un panel con el desglose de ese sistema: una fila por medalla —bronce, plata,
  oro— con su estado

**E15 — El detalle nombra los puestos de cada medalla ganada**
- Dado: un sistema con el bronce del examen por puesto de dos titulares y la plata del examen por
  línea de otros dos titulares
- Cuando: se abre su detalle
- Entonces: la fila de bronce nombra sus dos puestos y la de plata nombra sus dos puestos, cada
  medalla por el titular que se examinó, con las mismas etiquetas que usa la pizarra (C, R1, R2,
  C1, C2, O, L)

**E16 — El detalle dice qué queda por examinar y cuándo se dominó**
- Dado: un sistema con bronce pero sin plata ni oro, y otro sistema con oro
- Cuando: se abren sus detalles
- Entonces: en el primero, la fila de plata y la de oro indican que están pendientes de examen y
  no se quedan mudas; en el segundo, la fila de oro muestra la fecha en que se ganó, y las de
  bronce y plata no muestran fecha

**E17 — Al cerrar el detalle el foco vuelve a la pieza de la que salió**
- Dado: el detalle de un sistema abierto, al que se llegó eligiendo su pieza
- Cuando: se cierra el detalle (con el botón de cerrar, con la tecla de escape o pulsando fuera)
- Entonces: el detalle se cierra y el foco del teclado vuelve a la pieza de ese sistema, no se
  pierde al principio de la página

### Cuando los datos no están

**E18 — Mientras las medallas se piden al servidor**
- Dado: la vista Logros recién abierta, con la petición de medallas todavía en curso
- Cuando: se mira la vista
- Entonces: se muestra un estado de carga en el lenguaje de la app, no un mosaico vacío que
  luego dé un salto ni una pantalla en blanco

**E19 — Si las medallas no se pueden pedir**
- Dado: la vista Logros y una petición de medallas que falla (sin conexión, error del servidor)
- Cuando: la petición falla
- Entonces: se muestra un mensaje de error con la opción de reintentar, no un mosaico vacío que
  parezca "no tienes ninguna medalla"

### A quién le toca qué

**E19b — El admin ve la vitrina de todos los sistemas de recepción**
- Dado: una cuenta admin, sin ninguna membresía de equipo, con medallas ganadas en un sistema
- Cuando: se abre la vista Logros
- Entonces: el mosaico muestra los sistemas de recepción de todos los equipos, con las medallas
  del admin donde las tenga — igual que el admin gestiona los sistemas de cualquier equipo en el
  resto de la app

**E19c — Un usuario sin equipo no ve una vitrina rota**
- Dado: una cuenta sin admin y sin ninguna membresía de equipo
- Cuando: se abre la vista Logros
- Entonces: se muestra el mensaje de "sin medallas todavía" (E11), no una pantalla en blanco ni
  un error

### Sistemas que cambian bajo los pies del jugador

**E20 — Una medalla de un sistema borrado no rompe la vitrina**
- Dado: una cuenta con una medalla ganada en un sistema que el entrenador ha borrado después
- Cuando: se abre la vista Logros
- Entonces: la vitrina se muestra sin error; la medalla huérfana no aparece como pieza, pero
  sigue guardada y el recuento de sistemas dominados no la cuenta

**E21 — Quitar la validación de un sistema no borra las medallas ya ganadas**
- Dado: una cuenta con medallas en un sistema al que el entrenador le retira la validación
- Cuando: se abre la vista Logros
- Entonces: el sistema sigue apareciendo en el mosaico con sus medallas intactas; que ya no se
  pueda examinar de él no cambia lo que el jugador consiguió cuando sí se podía

### En el móvil y para todos

**E22 — La vitrina cabe en 375 px sin desbordar a lo ancho**
- Dado: la vista Logros con nueve sistemas y algún nombre largo ("Recepción en semicírculo")
- Cuando: el viewport mide 375 px de ancho (y también en el suelo de 320 px de la spec 059)
- Entonces: el mosaico se reordena para caber, ningún elemento provoca scroll horizontal del
  documento, y el panel de detalle tampoco se sale

**E23 — Las medallas no penalizan la carga**
- Dado: las tres imágenes de medalla de `public/medals/`, que hoy son de 1024 × 1024 px y pesan
  cerca de 1 MB cada una, y se pintan a unos 30 px en el mosaico y a unos 56 px en el detalle
- Cuando: se abre la vista Logros en un móvil
- Entonces: cada imagen que se descarga pesa un orden de magnitud menos que hoy —decenas de KB,
  no ~1 MB—, redimensionada a una resolución acorde con el tamaño al que se muestra (con margen
  para pantallas de alta densidad), y abrir Logros no dispara varios MB de descarga

**E24 — Tener o no tener una medalla no se distingue solo por el color**
- Dado: cualquier punto donde se muestre el estado de una medalla —la pieza del mosaico, la fila
  del detalle, el estado activo del conmutador
- Cuando: se mira sin distinguir colores
- Entonces: ganada, no ganada y pendiente se diferencian también por forma, icono, opacidad o
  texto, no solo por el color

**E25 — Sin movimiento si el sistema pide movimiento reducido**
- Dado: un dispositivo con "reducir movimiento" activado
- Cuando: se conmuta entre vistas y se abre o cierra el detalle
- Entonces: las transiciones no se animan, los cambios son instantáneos y nada parpadea

## Preguntas abiertas

Ninguna. Las diez que había se resolvieron con el usuario antes de congelar:

1. **El líbero como sujeto examinado (spec 058):** aparece como un puesto más de la lista, con la
   etiqueta "L", tanto en bronce como en plata. Sin sección aparte (E7b, E15).

2. **La etiqueta de la plata:** por titular examinado, igual que el bronce. Si el jugador tiene
   la plata de R1 y la de C1 —ambas cubren la línea delantera—, el detalle muestra las dos, cada
   una por su titular. No se funden en "Delantera" (E15).

3. **De qué equipo son los sistemas:** los mismos que le tocan al usuario en el resto de la app
   (`puedeGestionarEquipo`): **todos** si es admin, o los de los equipos donde tiene membresía si
   no. Un usuario sin admin y sin ninguna membresía ve "sin sistemas que mostrar", con el mismo
   mensaje que E11 (E23c). Si tiene varias membresías, las piezas se agrupan o etiquetan por
   equipo.

4. **Sistemas sin ninguna medalla:** el mosaico muestra todos los sistemas de recepción del
   catálogo del usuario, con las piezas apagadas hasta ganar algo (E12). Los sistemas de defensa
   no aparecen —no tienen examen (spec 012)— y no cuentan en el recuento (E7).

5. **El orden del mosaico:** dominados primero, luego los que tienen alguna medalla, y al final
   los vacíos (E12b).

6. **La fecha:** solo la del oro. En el detalle de un sistema dominado, la fila de oro muestra
   "dominado el <fecha>"; bronce y plata no muestran fecha (E16). El mosaico no muestra fechas.

7. **De qué configuración de roles salen las etiquetas:** la configuración por defecto fija
   (`CONFIGURACION_ROLES_POR_DEFECTO`), igual que `ficha-vista.ts` para el resto de la pista. Si
   algún día hay configuración de roles por equipo, adaptarlo es otra spec.

8. **Una medalla cuyo sistema ya no existe:** se oculta. La medalla sigue guardada (spec 056) y
   se puede volver a mostrar si el sistema reaparece, pero mientras su sistema no exista no hay
   pieza y no cuenta en el recuento (E20).

9. **Un sistema al que se le ha quitado la validación:** sus medallas se quedan. El sistema sigue
   en el mosaico con lo ganado intacto; desvalidar impide examinarse otra vez, no borra el
   logro (E21).

10. **El denominador del recuento:** son todos los sistemas de recepción del catálogo del
    usuario. Si el entrenador crea uno nuevo, el denominador sube y el ratio del jugador empeora
    sin que haya hecho nada — se acepta a cambio de tener un objetivo claro y estable ("dominar
    todos los sistemas"), en vez de un denominador que cambie con cada examen que el jugador
    empiece (E7).

## Nota de verificación

E1–E7b, E20 y E21 son lógica: qué medallas resume un sistema, cómo se ordena el mosaico, qué
cuenta el recuento, qué pasa con una medalla huérfana o de un sistema desvalidado. Se verifican
con `npm test`, uno por escenario, sin `TestBed` — el cálculo del resumen vive en `domain/` y no
toca Angular.

E8–E19 y E22–E25 son de presentación: que las dos vistas conmuten, que la pieza atenúe una
medalla no ganada, que el foco vuelva a su sitio, que el mosaico quepa en 375 px, que las
imágenes pesen poco. Como ya hizo la spec 059, se verifican a ojo en el navegador contra su
condición concreta y se registran en la tabla de "Al cerrar", no en una suite de tests. Coincide
con lo que la sección "Qué NO se testea" de `docs/flujo-de-trabajo.md` ya excluye.

## Al cerrar

Los 12 escenarios de lógica (E1–E7b, E20, E21) pasan: `npx vitest run src/app/domain/insignias.spec.ts`
en verde (10 tests — E3 y E4 comparten cobertura de código con E2, E6 y E20/E21 son de
regresión), más 3 tests de `InsigniasStore` (`insignias.store.spec.ts`, cubren E12/E18/E19 a
nivel de estado). Suite completa: 488 tests (frente a 469 al cerrar la 060). `npm run typecheck`
limpio; `ng build --configuration production` sin errores (persisten los dos avisos de
presupuesto de `tablero.css` y `examen-tablero.css`, ya presentes antes y ajenos a esta spec —
`vitrina-medallas.css` y `perfil-cuenta.css` no disparan ninguno). No existe `test:coverage`,
como ya se hizo constar al cerrar las specs 012, 013, 057 y 060.

**Desviación real, no anticipada: E3 y E4 no forzaron código nuevo.** La implementación mínima
de E2 —filtrar las insignias del sistema por `tipo` y mapear cada una a su etiqueta de puesto—
ya cubría "acumular varios bronces" (E3) y "bronce y plata a la vez" (E4) sin una sola rama
extra. Se dejaron sus tests como regresión en vez de inventar código que ningún fallo pedía,
según la regla 5 del flujo de trabajo. Lo mismo con E6 (aislamiento entre sistemas, garantizado
por el filtro `sistemaId`) y con E20/E21 (una huérfana no está en la lista de sistemas y no
cuenta; ni `resumenDeMedallas` ni `recuentoDeSistemas` miran `estado`).

**Decisión de presentación tomada al implementar: el orden del desglose de bronce/plata.** La
spec (E3, E15) dice "nombra los puestos" sin fijar orden. Se ordena por `obtenidaEn` —el orden
en que se ganaron—, que es además el orden en que el servidor ya los devuelve (`orderBy:
obtenida_en asc`, spec 056). `resumenDeMedallas` lo reordena explícitamente de todas formas para
no depender de que la lista llegue ya ordenada. No se ordenó por el orden de saque, que habría
sido igual de defendible, para no reabrir un escenario congelado.

**El foco de vuelta (E17) se resuelve con `queueMicrotask` + `getElementById`, no con una
`@ViewChild`.** La pieza del mosaico y el overlay de `Modal` no coexisten en el DOM (el detalle
está en un `@if`), así que al cerrar hay que esperar un tick a que la pieza vuelva a montarse
antes de enfocarla. `Modal` ya cierra por Escape, clic en el overlay y botón ✕ —los tres emiten
`cerrar`— así que E17 se cubrió entero sin tocar `Modal`. `Modal` sigue sin focus trap; esta
spec no lo arregla (accesibilidad de teclado más allá de E10/E17 sigue fuera, como en la 059).

**Las PNG se redimensionaron con `System.Drawing` de PowerShell**, no con una herramienta de
imagen: el proyecto no tiene `sharp`/ImageMagick y no se pueden añadir dependencias. De 1024 ×
1024 (~1 MB cada una) a 128 × 128 (~28 KB), con margen de sobra para los 52 px del detalle en
pantallas de alta densidad. E23 cumplido: `curl` sobre `/medals/gold.png` en el stack local
devuelve 30 KB, no 1 MB.

**`docs/dominio.md` no cambia.** No dice nada de exámenes ni de medallas, y esta spec no aprende
ninguna regla de voleibol nueva — las de qué medalla concede cada tipo de examen ya las fijó la
013. Añadir ahora una sección de exámenes a `dominio.md` sería documentar specs anteriores, no
esta.

**Sin ADR nuevo en `docs/decisiones/`.** Se creó `InsigniasStore` y `HttpInsigniasRepository`
pasó de instanciarse inline a proveerse una sola vez con un `InjectionToken` compartido por
`ExamenStore` e `InsigniasStore`. Es el patrón que la ADR 0039 ya estableció (store propio sin
decorador, cableado con `useFactory`); el `InjectionToken` es mecánica de Angular estándar para
compartir una instancia, no una decisión de arquitectura que merezca fichero propio.

**`docs/arquitectura.md` y `README.md` sí se actualizaron (ADR 0027):** la app hace algo nuevo
en producción —la ventana Cuenta muestra las medallas— y hay una capa `application/` con un
store más. Se añadió `insignias.ts` (con sus dos funciones) y `InsigniasStore` a la descripción
de capas, la nota de que `HttpInsigniasRepository` ahora se comparte, `VitrinaMedallas` y el
conmutador de dos vistas de `PerfilCuenta` a `ui/acceso/`, y las entradas del árbol de carpetas.

**Verificación visual pendiente.** E8–E19c y E22–E25 se comprueban mirando la app en un
navegador; la columna "Resultado" del checklist queda sin rellenar hasta que alguien lo haga en
`http://localhost:8080` → Cuenta → Logros. "Implementado y con build en verde" no es "verificado".

**Corrección posterior al primer uso (E19b/E19c, P3 revisada).** La primera versión filtraba los
sistemas por `usuario.membresias` a secas: un admin —que no tiene ninguna membresía, solo
`esAdmin`— veía la vitrina vacía aunque tuviera medallas guardadas. Se alineó con la regla que
ya usa el resto de la app (`puedeGestionarEquipo`): admin ve todos los sistemas de recepción, el
resto solo los de sus equipos. La P3 y dos escenarios nuevos (E19b, E19c) recogen el caso; el
resto de la spec no cambió.

**Checklist manual (columna "Resultado" sin rellenar hasta probarlo en un navegador):**

| Escenario | Qué comprobar | Resultado |
|---|---|---|
| E8 — Cuenta abre en "Datos usuario" | Abrir Cuenta, ver perfil, Logros oculto | |
| E9 — conmutar y volver sin perder | Escribir en el nombre, ir a Logros y volver | |
| E10 — conmutador con teclado | Tab hasta el conmutador, flechas, foco visible | |
| E11 — vitrina vacía | Cuenta sin ninguna medalla | |
| E12 — pieza con tres medallas | Sistema a medias: ganadas vs. apagadas | |
| E12b — orden del mosaico | Dominado, parcial y vacío en ese orden | |
| E13 — dominado vs. a medias | Dos piezas, diferencia no solo de color | |
| E14 — abrir detalle | Elegir una pieza, ver las tres filas | |
| E15 — puestos en el detalle | Bronce y plata con sus titulares (C1, R1, L) | |
| E16 — pendientes y fecha del oro | Filas mudas no; oro con fecha, resto sin | |
| E17 — foco al cerrar | Cerrar con ✕, Escape y clic fuera; foco vuelve | |
| E18 — cargando | Abrir Logros con la petición en curso | |
| E19 — error de carga | Petición fallida: mensaje + reintentar | |
| E19b — admin ve todos los sistemas | Cuenta admin sin membresía, con medallas | |
| E19c — usuario sin equipo | Cuenta sin admin ni membresía: mensaje, no error | |
| E22 — cabe en 375 px | 375 px y 320 px, nombre largo, sin scroll lateral | |
| E23 — peso de las imágenes | DevTools, red: KB por medalla, no MB | |
| E24 — no solo color | Ganada / no ganada / pendiente sin distinguir color | |
| E25 — movimiento reducido | "Reducir movimiento" activo: cambios instantáneos | |
