# 004 — Plantillas de equipo

**Estado:** Completada
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

## Preguntas abiertas

Ninguna. Resueltas con el usuario:

- El orden de saque de una plantilla **no se modifica** una vez creada. Si el entrenador
  necesita otro orden, crea una plantilla nueva. No hace falta versionar ni revalidar sistemas
  existentes, porque la plantilla que usan nunca cambia por debajo. El dominio no expone
  ninguna función para modificar una `PlantillaEquipo` ya creada — la inmutabilidad se
  garantiza por ausencia, no por una comprobación en tiempo de ejecución. "Intentar
  modificarla" solo es posible reutilizando su nombre para crear otra, y eso ya lo cubre E3
  (nombre duplicado), sea cual sea el orden de saque nuevo. Por eso no hay un escenario E7
  aparte: sería un test contra una función que deliberadamente no existe.
- Una plantilla se guarda completa y válida o no se guarda: no existe un estado "a medias"
  para la plantilla en sí (a diferencia de un sistema de recepción, spec 005).

## Al cerrar

Los 6 escenarios pasan (46 en total en `src/app/domain`). No existe `npm run test:coverage`
en `package.json`; no se reporta cobertura numérica por el mismo motivo que en specs
anteriores.

**Desviación respecto a lo previsto.** El escenario E7 de la redacción original ("las
plantillas son inmutables") se retiró antes de escribir su test: no hay ninguna función de
actualización en el dominio, así que no había nada que ejercitar sin inventar código cuyo
único propósito fuera rechazar siempre. Se documentó como parte de las "Preguntas abiertas"
en vez de forzar un test artificial. Ver `docs/flujo-de-trabajo.md` — un test no puede fallar
por `ReferenceError` contra una función que no debe existir.

**Desacoplo deliberado de `Sistema`.** E5/E6 hablan de "sistemas que usan la plantilla", pero
`Sistema` no existe todavía (llega con la spec 005). `puedeBorrarPlantillaEquipo` recibe un
booleano `estaEnUso` en vez de una lista de sistemas, precisamente para que
`plantillas-equipo.ts` no dependa de un tipo que aún no está definido; quien llame a esta
función (más adelante, `application/`) es quien calcula ese booleano.

**Lo que no se desvió:** ninguna regla de `docs/dominio.md` resultó incorrecta.

**Lo que sorprendió:** E4 (composición inválida) pasó en verde sin código nuevo, reutilizando
`validarPlantilla` de la spec 002 directamente.
