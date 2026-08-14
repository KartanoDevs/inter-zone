# 010 — Catálogo en pantalla: selector, alta y panel de enseñanza

**Estado:** Congelada
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

Pendiente. Se rellena cuando la spec se cierre.
