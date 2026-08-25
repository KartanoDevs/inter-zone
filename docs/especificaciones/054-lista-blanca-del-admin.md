# 054 — Lista blanca del admin

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

Invitar a alguien hoy exige tocar la base de datos a mano. El admin no tiene ninguna pantalla
para decidir quién puede darse de alta, ni con qué rol.

## Objetivo

El admin invita un correo con un rol (y, si aplica, un equipo), ve qué invitaciones siguen
pendientes y cuáles ya se usaron, cambia el rol de una pendiente, y puede retirarla.

## Fuera de alcance

- Cambiar el rol o la membresía de una cuenta que ya existe — esta spec solo toca
  `lista_blanca`, no `usuario` ni `membresia` de alguien que ya se dio de alta. Es la spec 037 y
  el propio registro (035) quienes deciden eso hoy.
- Borrar una cuenta.
- Invitar por correo electrónico de verdad — el admin comparte la dirección a mano, como hoy.
- Gestionar equipos (crear, renombrar) — los dos equipos siguen siendo fijos.

## Escenarios

**E1 — El admin invita un correo con un rol y un equipo**
- Dado: un correo sin invitación
- Cuando: el admin lo invita con un rol y, si no es `admin`, un equipo
- Entonces: queda invitado, pendiente, con ese rol y ese equipo

**E2 — Invitar un correo ya invitado y sin usar actualiza su rol en vez de duplicarlo**
- Dado: un correo ya invitado, todavía sin usar
- Cuando: el admin lo invita otra vez con un rol distinto
- Entonces: la invitación pasa a tener el rol nuevo — sigue siendo una sola fila

**E3 — Invitar un correo que ya tiene cuenta se rechaza**
- Dado: un correo que ya completó su alta
- Cuando: el admin intenta invitarlo
- Entonces: se rechaza — el rol de una cuenta ya creada no se toca desde aquí

**E4 — Retirar una invitación pendiente la borra**
- Dado: una invitación sin usar
- Cuando: el admin la retira
- Entonces: ese correo deja de estar invitado

**E5 — Retirar una invitación ya usada no toca la cuenta que salió de ella**
- Dado: una invitación ya usada, con su cuenta ya creada
- Cuando: el admin la retira
- Entonces: la cuenta sigue existiendo con su rol de siempre — la fila de `lista_blanca` es
  historia, no la fuente de verdad de esa cuenta

**E6 — La lista distingue de un vistazo las pendientes de las ya usadas**
- Dado: invitaciones de los dos tipos
- Cuando: el admin la consulta
- Entonces: se ve cuáles siguen pendientes y cuáles ya se usaron

**E7 — Un entrenador o un usuario no pueden gestionar la lista blanca**
- Dado: una cuenta que no es admin
- Cuando: intenta ver, invitar o retirar de la lista blanca
- Entonces: se rechaza

**E8 — Sin sesión tampoco se puede gestionar la lista blanca**
- Dado: ninguna sesión activa
- Cuando: se intenta ver, invitar o retirar
- Entonces: se rechaza

## Preguntas abiertas

Ninguna.

## Al cerrar

Los 9 escenarios de servidor (E1-E8 más el 403/401 de `exigirAdmin`) pasaron en verde a la
primera contra Postgres real, sin necesitar un ciclo rojo-verde propio — la única pieza de
dominio nueva (`esRolAccesoValido`) sí se hizo con TDD estricto (rojo con `ReferenceError`
resuelto, luego rojo de aserción, luego verde). Es la misma desviación ya vista en specs
anteriores con lógica puramente CRUD sobre Prisma: el riesgo real estaba en el `upsert` de
`invitar` (E2, no duplicar fila al reinvitar) y en no tocar la cuenta al retirar (E5), y ambos
se verificaron con los tests de integración en vez de con un TDD escenario a escenario en
`domain/`, porque no hay lógica de dominio ahí que aislar — es orquestación de Prisma.

Nada se desvió del plan: la interfaz `AccesoRepository`/`ListaBlancaRepository` ya preveía este
reparto (servidor gestiona la lista blanca, cliente solo la consume), así que no hizo falta
retocar ningún puerto existente. Sorprendió lo poco que costó reutilizar `DialogoConfirmacion`
para "retirar" — ya existía desde specs de sistemas y encajó sin cambios.

Cobertura tras cerrar: 415/415 tests de dominio/aplicación/infraestructura (cliente),
62/62 tests de servidor (53 previos + 9 de `lista-blanca.rutas.spec.ts`), typecheck limpio en
ambos `tsconfig` y build de Angular verificado con el dev server del MCP `angular-cli`.
