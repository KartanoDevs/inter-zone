# 004 — Plantillas de equipo

**Estado:** Congelada
**Paso de la hoja de ruta:** 1

## Problema

Un entrenador puede llevar más de un equipo, o el mismo equipo puede cambiar de plantilla
entre temporadas. Cada plantilla tiene su propio orden de saque y su propia composición de
roles. Hoy el dominio solo modela un `OrdenSaque` suelto, sin nombre ni forma de guardar más
de uno para elegir con cuál se trabaja.

## Objetivo

Guardar varias plantillas con nombre, cada una con su orden de saque válido, y poder elegir
con cuál se trabaja en cada momento. Una plantilla es válida de principio a fin: no existe una
plantilla a medias, y una vez creada su orden de saque no se modifica.

## Fuera de alcance

- La UI para crear o editar una plantilla arrastrando jugadores. Es una spec de `ui/`,
  no ésta.
- La persistencia entre sesiones del navegador. Eso es la spec 006.
- Los dorsales y nombres propios de los jugadores: ya fuera de alcance en la spec 002.

## Escenarios

**E1 — Crear una plantilla válida**
- Dado: un nombre y un orden de saque con composición válida (spec 002)
- Cuando: se crea la plantilla
- Entonces: se acepta y queda disponible por su nombre

**E2 — Nombre vacío**
- Dado: un orden de saque válido sin nombre
- Cuando: se crea la plantilla
- Entonces: se rechaza

**E3 — Dos plantillas con el mismo nombre**
- Dado: una plantilla ya creada con un nombre
- Cuando: se intenta crear otra con el mismo nombre
- Entonces: se rechaza

**E4 — Composición de roles inválida**
- Dado: un orden de saque que `validarPlantilla` rechazaría (p. ej. dos colocadores)
- Cuando: se crea la plantilla
- Entonces: se rechaza

**E5 — Borrar una plantilla sin sistemas asociados**
- Dado: una plantilla que ningún sistema de recepción usa
- Cuando: se borra
- Entonces: se acepta

**E6 — Borrar una plantilla en uso**
- Dado: una plantilla que algún sistema de recepción usa
- Cuando: se intenta borrar
- Entonces: se rechaza

**E7 — Las plantillas son inmutables una vez creadas**
- Dado: una plantilla ya creada
- Cuando: se intenta modificar su orden de saque
- Entonces: se rechaza, la use o no algún sistema de recepción

## Preguntas abiertas

Ninguna. Resueltas con el usuario:

- El orden de saque de una plantilla **no se modifica** una vez creada (E7). Si el entrenador
  necesita otro orden, crea una plantilla nueva. No hace falta versionar ni revalidar sistemas
  existentes, porque la plantilla que usan nunca cambia por debajo.
- Una plantilla se guarda completa y válida o no se guarda: no existe un estado "a medias"
  para la plantilla en sí (a diferencia de un sistema de recepción, spec 005).

## Al cerrar

_Pendiente — se rellena al cerrar la spec._
