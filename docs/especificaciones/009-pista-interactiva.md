# 009 — La pizarra: pista interactiva, arrastre y guardado por rotación

**Estado:** Completada
**Paso de la hoja de ruta:** 3

## Problema

El dominio ya sabe decidir si una formación es legal, y el catálogo ya sabe guardar varios
sistemas — pero nada de eso se puede tocar todavía. Hoy solo existe la maqueta
(`src/app/maqueta/`), que no está conectada a un catálogo real ni a la persistencia, y que ni
siquiera guarda de verdad al pulsar "Guardar rotación". La pizarra que un jugador toca en un
entrenamiento tiene que ser la real.

## Objetivo

Sobre un sistema activo, se puede navegar entre sus seis rotaciones, arrastrar jugadores para
colocarlos, ver en vivo si la formación es legal, y guardar cada rotación para que quede en el
sistema y sobreviva a recargar la página. Cambiar de rotación con cambios sin guardar nunca los
descarta en silencio: siempre se pregunta antes.

**Esta spec toca `application/` y `ui/`, y sustituye lo que hoy renderiza `app.html`.** Es la
primera que se sale de la regla por defecto de `CLAUDE.md` de no tocar esas capas; queda
autorizada explícitamente aquí. `src/app/maqueta/` no se borra ni se modifica: queda como
referencia visual congelada y deja de ser lo que arranca la aplicación.

## Fuera de alcance

- Crear, renombrar o borrar sistemas desde la pantalla, y el desplegable para elegir cuál está
  activo. Eso es la spec 010 — pero el aviso de "cambios sin guardar" que define esta spec
  (E6–E8) es el mismo mecanismo que la 010 reutiliza cuando cambiar de sistema activo también
  descartaría cambios pendientes en la rotación que se abandona.
- Seleccionar un jugador, resaltarlo y ver o editar su explicación. Eso es la spec 010.
- El modo examen y la nota de perfección: spec futura.
- Pintar la zona de responsabilidad de cada jugador: spec futura.

## Escenarios

### Arranque

**E1 — Arrancar con sistemas ya guardados**
- Dado: varios sistemas ya guardados en el catálogo
- Cuando: arranca la aplicación
- Entonces: queda activo el primero del catálogo ordenado (recepción antes que defensa,
  alfabético dentro de cada grupo)

**E2 — Arrancar con el catálogo vacío**
- Dado: ningún sistema guardado todavía
- Cuando: arranca la aplicación
- Entonces: no hay ningún sistema activo y el campo no muestra ni acepta ninguna ficha

### Navegar entre rotaciones y cambios sin guardar

**E3 — Activar un sistema carga su rotación**
- Dado: un sistema con una formación ya guardada en su rotación activa
- Cuando: ese sistema pasa a ser el activo
- Entonces: el campo muestra esa formación

**E4 — Cambiar de rotación sin cambios pendientes**
- Dado: la rotación activa tal y como quedó tras el último guardado, sin tocarla desde entonces
- Cuando: se cambia a otra rotación
- Entonces: se cambia directamente, sin pedir confirmación, y el campo muestra lo guardado en
  la rotación recién seleccionada

**E5 — Cambiar a una rotación sin guardar**
- Dado: una rotación de la que nunca se ha guardado una formación
- Cuando: se selecciona
- Entonces: el campo aparece vacío

**E6 — Cambiar de rotación con cambios sin guardar pide confirmar**
- Dado: se ha colocado, movido o quitado algún jugador en la rotación activa desde su último
  guardado
- Cuando: se intenta cambiar a otra rotación
- Entonces: aparece un aviso pidiendo confirmar antes de cambiar

**E7 — Confirmar el aviso descarta y cambia**
- Dado: el aviso de cambios sin guardar
- Cuando: se confirma
- Entonces: los cambios se descartan y el campo pasa a mostrar la rotación recién seleccionada

**E8 — Cancelar el aviso mantiene todo**
- Dado: el aviso de cambios sin guardar
- Cuando: se cancela
- Entonces: se sigue en la misma rotación, con los cambios tal y como estaban

### Colocar, mover y quitar jugadores

**E9 — Colocar un jugador**
- Dado: un jugador todavía sin colocar en la rotación activa
- Cuando: se arrastra hasta un punto del campo
- Entonces: aparece en ese punto

**E10 — Mover un jugador ya colocado**
- Dado: un jugador ya colocado en el campo
- Cuando: se arrastra a otro punto
- Entonces: se traslada, sin duplicarse

**E11 — Quitar un jugador arrastrándolo fuera**
- Dado: un jugador colocado en el campo
- Cuando: se arrastra fuera del campo y se suelta
- Entonces: deja de estar colocado en esa rotación

### Validación y guardado

**E12 — La validación se ve en vivo**
- Dado: una formación que, tal y como está en cada momento del arrastre, comete o no una
  infracción o un aviso
- Cuando: se mueve un jugador
- Entonces: el estado de cada jugador afectado (normal, aviso o falta) se actualiza sin
  necesidad de guardar

**E13 — Guardar bloqueado si no procede**
- Dado: una rotación con menos de seis jugadores colocados, o con alguna infracción
- Cuando: se intenta guardar
- Entonces: la acción no está disponible

**E14 — Guardar confirma y persiste**
- Dado: una rotación con los seis jugadores colocados y sin infracciones
- Cuando: se guarda
- Entonces: queda asociada al sistema, y sigue ahí después de recargar la página

**E15 — Guardar deja de haber cambios pendientes**
- Dado: cambios sin guardar en la rotación activa
- Cuando: se guardan
- Entonces: cambiar de rotación inmediatamente después ya no pide confirmar (E4, no E6)

### Vaciar

**E16 — Vaciar la rotación activa**
- Dado: una rotación con jugadores colocados, guardada o no
- Cuando: se vacía
- Entonces: el campo queda sin ningún jugador colocado, sin afectar a otras rotaciones ni a lo
  ya guardado hasta que se guarde de nuevo; vaciar cuenta como cambio pendiente (E6) si la
  rotación tenía algo guardado

## Preguntas abiertas

Ninguna. Resueltas con el usuario:

- **Cambiar de rotación con cambios sin guardar pide confirmar** (E6–E8), en vez de descartar en
  silencio o autoguardar.
- **Con el catálogo vacío, la pista queda inerte** (E2): 009 no crea el primer sistema —eso es
  el botón `+` de la spec 010— pero sí define que, hasta que exista uno, el campo no muestra ni
  acepta nada.
- **El sistema activo por defecto al arrancar es el primero del catálogo ordenado** (E1): mismo
  orden que usará el desplegable de la spec 010, sin persistir "cuál estaba abierto la última
  vez".

## Al cerrar

Los 16 escenarios del store pasan (102 en total: `domain/`, `infrastructure/` y ahora
`application/`, que `vitest.config.ts` amplió a recoger). No existe `npm run test:coverage`
en `package.json`; no se reporta cobertura numérica por el mismo motivo que en specs
anteriores. Lo puramente visual (colores, sensación del arrastre) no se testea, tal como fija
`docs/flujo-de-trabajo.md`.

**Cómo se verificó lo que no tiene test.** Esta spec no se pudo comprobar clicando en un
navegador — no hay esa capacidad disponible en esta sesión. En su lugar: `ng build` compila
la aplicación entera (incluida la comprobación de tipos de las plantillas de Angular contra
sus componentes), y el servidor de desarrollo (MCP de Angular) arrancó y sirvió sin errores.
Ningún recorrido de clics real sustituye a esto; queda pendiente que alguien lo abra en un
navegador de verdad antes de darlo por bueno del todo en producción.

**Aviso de proceso, no de esta spec en concreto.** `npx tsc --noEmit -p tsconfig.json`, que se
había estado usando como comprobación de tipos en las specs 006-008, resultó ser un falso
negativo: `tsconfig.json` no tiene `files`, solo `references` a `tsconfig.app.json` y
`tsconfig.spec.json`, y sin `--build` no comprueba nada real. Se descubrió al ejecutar
`ng build` para esta spec, que sí reventó — con un fallo de tipos genuino, preexistente desde
la spec 007 (`conExplicacionesConservadas` inducía un array de tuplas mal inferido). Corregido
aquí, sin cambiar el comportamiento. A partir de ahora, `ng build` (o `tsc --build
tsconfig.json`) es la comprobación de tipos real; `tsc --noEmit -p tsconfig.json` no lo es.

**Cableado nuevo, más allá de `application/` y `ui/`.** Para que la app arrancara de verdad
hicieron falta tres cosas que la spec no detallaba pero que se derivan de "sustituye lo que
hoy renderiza `app.html`": `domain/plantilla-global.ts` (la plantilla única de la v1, con sus
dos variantes central2/líbero — no existía como dato real, solo como ejemplo en `maqueta/`);
un proveedor de `SistemaStore` en `app.config.ts` vía `useFactory`, construyendo el
`LocalStorageSistemaRepository` con `localStorage` real; y las clases `.app-boton*` se
movieron a `src/styles.css` (Angular encapsula los estilos por componente, y el diálogo de
confirmación las necesitaba tanto como el propio tablero).

**`--neon-purple` tiene ahora su primer uso por nombre.** El campo rival de `pista.css` estaba
hardcodeado como `rgba(170, 136, 255, …)`; se sustituyó por el token con `stroke-opacity`, sin
cambiar el color resultante.

**Lo que sorprendió:** en cuanto el store quedó escrito para E1 (que ya exige casi todo el
mecanismo: catálogo ordenado, sistema activo, borrador), los quince escenarios siguientes
pasaron en verde sin tocar código — la misma dinámica que en las specs 005 a 008.

**Lo que no se desvió:** ninguna regla de `docs/dominio.md` resultó incorrecta.
