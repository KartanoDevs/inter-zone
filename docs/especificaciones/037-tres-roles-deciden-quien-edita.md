# 037 — Tres roles deciden quién edita

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

Hoy cualquiera con sesión —o sin ella— puede crear, editar o borrar cualquier sistema de
cualquier equipo. El admin ya puede validar con permiso real (spec 051); el resto de
`/api/sistemas` sigue abierto de par en par.

## Objetivo

Solo `admin` y `entrenador` (de su propio equipo) pueden crear, editar, clonar o borrar
sistemas. `usuario` puede leer, nunca escribir, y no ve la pestaña Editor.

## Fuera de alcance

- Filtrar el catálogo por rol al leerlo (`GET /sistemas` sigue devolviendo todo, borradores
  incluidos, a cualquiera con sesión) — esta spec es sobre quién **edita**, no sobre quién ve
  qué. La matriz de `docs/modelo-de-datos.md` §4 distingue las dos cosas; aquí solo se cierra la
  primera.
- Filtrar el selector de equipo dentro del editor según la membresía del entrenador — un
  entrenador de un solo equipo sigue viendo el desplegable con los dos, y el servidor rechaza
  si intenta escribir en el que no es suyo. Es una mejora de UX pendiente, no un agujero de
  permisos: el rechazo real ya pasa por el servidor.
- Un requisito nuevo de sesión sobre `GET /sistemas`: sigue sin exigirla, igual que hoy.
- Gestionar la lista blanca o cambiar el rol de alguien — spec 054.

## Escenarios

**E1 — Un entrenador sigue creando, editando, clonando y borrando sistemas de su equipo**
- Dado: un entrenador con membresía en un equipo
- Cuando: crea, edita, clona o borra un sistema de ese equipo
- Entonces: funciona exactamente igual que antes de esta spec

**E2 — El admin puede editar sistemas de cualquier equipo**
- Dado: el admin
- Cuando: crea, edita, clona o borra un sistema de cualquiera de los dos equipos
- Entonces: se permite

**E3 — Un entrenador no puede escribir en un equipo donde no tiene membresía**
- Dado: un entrenador solo del equipo masculino
- Cuando: intenta crear, editar o borrar un sistema del equipo femenino
- Entonces: se rechaza

**E4 — Un `usuario` no puede crear, editar ni borrar ningún sistema**
- Dado: una cuenta con rol `usuario`
- Cuando: intenta cualquiera de las cuatro acciones de escritura
- Entonces: se rechaza, sea cual sea el equipo

**E5 — Sin sesión tampoco se puede escribir**
- Dado: ninguna sesión activa
- Cuando: se intenta crear, editar, clonar o borrar un sistema
- Entonces: se rechaza

**E6 — Un `usuario` no ve la pestaña Editor y aterriza en Teoría**
- Dado: una cuenta con rol `usuario`, sin membresía de entrenador en ningún equipo
- Cuando: entra en la aplicación
- Entonces: la pestaña "Editor" no aparece en la navegación, y la ventana que se muestra al
  entrar es "Teoría"

**E7 — Un entrenador o el admin siguen viendo y usando la pestaña Editor con normalidad**
- Dado: un entrenador o el admin
- Cuando: entra en la aplicación
- Entonces: ve la pestaña "Editor" y arranca en ella, igual que hoy

## Preguntas abiertas

Ninguna.

## Al cerrar

E1-E5 tienen test de dominio (`puedeGestionarEquipo`, `puedeEditarAlgo` en `acceso.spec.ts`) y de
integración de servidor (`sistemas.rutas.spec.ts`, describe "permisos de escritura"). E6 y E7 se
verifican mirando: son puramente de `ui/`, sin test automático en este proyecto. Suite de
dominio: 391/391. Suite de servidor: 42/42. `npm run typecheck` limpio. Compilación de `ui/`
verificada con el dev server de Angular.

**Renombrado, no una función nueva:** `puedeValidar` (spec 051) pasó a llamarse
`puedeGestionarEquipo`, sin cambiar su cuerpo — la matriz de permisos de
`docs/modelo-de-datos.md` §4 da la misma respuesta por rol a "validar" y a "crear/editar/
borrar", así que es la misma regla, no dos parecidas. Se actualizaron sus llamadas en
`sistemas.rutas.ts` y sus tests; **no se tocó** la ADR 0038 ni el cierre de la spec 051, que
siguen citando el nombre antiguo — son registros de lo que era cierto cuando se escribieron, y
`docs/decisiones/` es append-only.

**Decisión de seguridad tomada al implementar, no anticipada en el encargo:** `PUT
/sistemas/:id` y `DELETE /sistemas/:id` comprueban el permiso contra el equipo **ya guardado**
del sistema (`equipoDelSistema`), nunca contra el `equipoId` que traiga el cuerpo de la
petición — que además nunca cambia una vez creado (spec 032). Comprobar contra el cuerpo habría
dejado que un entrenador mintiera sobre el equipo para colarse en una escritura que no le
tocaba.

**Ninguna otra sorpresa.** El resto salió tal como se planificó: un helper local
(`exigirPermisoDeEquipo`) resuelve sesión y permiso en una sola llamada, reutilizado en las
cuatro rutas de escritura sin duplicar la lógica de cada una.
