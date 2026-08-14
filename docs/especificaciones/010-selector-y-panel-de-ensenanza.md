# 010 — Catálogo en pantalla: selector, alta y panel de enseñanza

**Estado:** Completada
**Paso de la hoja de ruta:** 3

## Problema

El catálogo de sistemas y las explicaciones de enseñanza ya existen en el dominio (specs 006 y
007), y la pizarra ya coloca jugadores y guarda rotaciones (spec 009), pero nada de eso tiene
todavía un lugar en la pantalla: no hay forma de crear un segundo sistema, de elegir cuál se
está viendo, ni de leer o escribir por qué un jugador está donde está.

## Objetivo

Desde la pantalla se elige, crea, renombra y borra un sistema; y, sobre la pizarra ya existente,
se puede seleccionar un jugador para leer o escribir su explicación, o la de la rotación
completa si no hay ninguno seleccionado.

Esta spec sigue trabajando sobre `application/` y `ui/`, ya autorizado por la spec 009.

## Fuera de alcance

- El editor de sistemas de defensa: fase 2 del proyecto.
- El modo examen: spec futura.

## Escenarios

**E1 — Orden del desplegable**
- Dado: varios sistemas de recepción y de defensa
- Cuando: se abre el desplegable
- Entonces: aparecen primero los de recepción y después los de defensa, alfabéticos dentro de
  cada grupo

**E2 — Crear un sistema nuevo**
- Dado: el botón de crear (+)
- Cuando: se rellena un nombre válido y se confirma
- Entonces: el sistema nuevo queda activo, con la pizarra vacía en su primera rotación

**E3 — Elegir otro sistema del desplegable**
- Dado: un sistema distinto al activo, sin cambios pendientes en la rotación activa actual
- Cuando: se elige del desplegable
- Entonces: pasa a ser el sistema activo y la pizarra muestra su primera rotación

**E4 — Cambiar de sistema con cambios pendientes**
- Dado: cambios sin guardar en la rotación activa del sistema actual
- Cuando: se elige otro sistema del desplegable
- Entonces: pide confirmar antes de cambiar, con el mismo aviso que cambiar de rotación
  (spec 009, E6–E8)

**E5 — Defensa visible pero no elegible**
- Dado: el formulario de alta
- Cuando: se abre
- Entonces: puede verse la opción de tipo defensa, pero no puede seleccionarse

**E6 — Renombrar**
- Dado: un sistema activo
- Cuando: se usa el icono de editar, se cambia el nombre y se confirma
- Entonces: el desplegable muestra el nombre nuevo

**E7 — Borrar pide confirmación**
- Dado: un sistema activo
- Cuando: se usa el icono de borrar
- Entonces: se pide confirmar antes de borrarlo de verdad

**E8 — Panel sin selección**
- Dado: ningún jugador seleccionado
- Cuando: se mira el panel de enseñanza
- Entonces: muestra la explicación de la rotación activa

**E9 — Panel con un jugador seleccionado**
- Dado: un jugador de la rotación activa
- Cuando: se selecciona, tocando o haciendo clic sobre su ficha
- Entonces: su ficha se resalta en púrpura y el panel pasa a mostrar la explicación de ese
  jugador

**E10 — Deseleccionar tocando otra vez**
- Dado: un jugador ya seleccionado
- Cuando: se vuelve a tocar su ficha
- Entonces: queda deseleccionado y el panel vuelve a mostrar la explicación de la rotación

**E11 — Cambiar de rotación deselecciona**
- Dado: un jugador seleccionado en la rotación activa
- Cuando: se cambia de rotación
- Entonces: queda deseleccionado

**E12 — Arrastrar no selecciona**
- Dado: un jugador sin seleccionar
- Cuando: se arrastra para moverlo
- Entonces: al soltarlo sigue sin estar seleccionado

**E13 — Editar el texto lo guarda**
- Dado: el panel de enseñanza abierto, con o sin jugador seleccionado
- Cuando: se edita el texto y se confirma
- Entonces: la explicación correspondiente —la de la rotación o la del jugador— queda guardada

## Preguntas abiertas

Ninguna, siempre que las specs 006 a 009 estén cerradas primero.

## Al cerrar

11 de los 13 escenarios se verificaron con test en `application/sistema.store.spec.ts`: E1, E2,
E3 (ya cubierto por el mecanismo de la spec 009), E4 (ídem), E6, E7, E8, E9, E10, E11 y E13
(dividido en dos tests, con y sin jugador seleccionado). 112 tests en total ahora
(`domain/`, `infrastructure/`, `application/`). No existe `npm run test:coverage`; no se
reporta cobertura numérica por el mismo motivo que en specs anteriores.

**E5 y E12 no tienen test.** Son puramente de interfaz: que el radio de "defensa" aparezca
deshabilitado en el formulario, y que un arrastre real no dispare selección. Se verificaron
leyendo el código (`disabled` fijo en el radio de defensa; el umbral de 5px en
`tablero.ts::iniciarArrastre` solo llama a `seleccionarJugador` si el desplazamiento entre
agarrar y soltar queda por debajo) y con `ng build` + arranque del servidor de desarrollo, sin
clic real — la misma limitación de verificación que ya se explicó en la spec 009.

**Toque contra arrastre.** El umbral vive en `ui/tablero/tablero.ts`, no en el store: mide la
distancia en píxeles de pantalla entre el `pointerdown` y el `pointerup` sobre una ficha ya en
pista. Por debajo de 5px cuenta como toque y alterna la selección; por encima, es un arrastre
normal y no toca la selección. Es una constante de UI (`UMBRAL_TOQUE_PX`), no algo que
`SistemaStore` necesite saber.

**Reutilización de la spec 009.** E3 y E4 no necesitaron código nuevo: `activarSistema` ya
llevaba desde la 009 el mismo mecanismo de "cambios sin guardar" que usa `seleccionarRotacion`
(compartían `cambiarContexto()` y el mismo `cambioPendiente`). Confirma la nota que la spec 009
ya dejó escrita en su "Fuera de alcance".

**Panel de enseñanza y explicaciones.** `explicacionMostrada` (en el store) decide sin que
`ui/panel/panel-ensenanza.ts` sepa nada del dominio: si hay jugador seleccionado, la suya; si
no, la de la rotación activa. El panel solo edita el texto que le llega y emite el nuevo texto
al guardar; quién es su destinatario lo decide `SistemaStore::guardarExplicacion` mirando
`jugadorSeleccionadoId` en ese momento.

**Diálogos compartidos.** El `<select>` nativo del desplegable es la primera vez que el
proyecto usa uno (no había ninguno hasta ahora). Las clases `.app-dialogo*` (overlay, tarjeta,
título, acciones) se movieron a `src/styles.css` la spec pasada para que `dialogo-confirmacion`
las reutilizara; `dialogo-sistema` (alta/edición) las reutiliza también, cambiando solo sus
propios campos y dejando el borde cian por defecto en vez del rosa de alerta.

**Lo que no se desvió:** ninguna regla de `docs/dominio.md` resultó incorrecta.
