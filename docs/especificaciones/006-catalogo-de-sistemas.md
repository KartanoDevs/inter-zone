# 006 — Catálogo de sistemas: crear, renombrar y borrar

**Estado:** Completada
**Paso de la hoja de ruta:** 3

## Problema

Hoy la aplicación conoce un único sistema, fijado en el código de la maqueta. Un entrenador
lleva más de un sistema de recepción a la vez —distintas rotaciones para distintos rivales, o
simplemente versiones sucesivas de la misma—, y en la fase 2 del proyecto existirán además
sistemas de defensa. Sin un catálogo, no hay dónde guardar el segundo sistema.

## Objetivo

Un catálogo de sistemas, cada uno con nombre y tipo (recepción o defensa), que se puede crear,
renombrar y borrar, y que se ordena de forma predecible para mostrarse en un desplegable.

## Fuera de alcance

- La UI del desplegable y del formulario de alta. Eso es la spec 010.
- La persistencia entre sesiones del navegador. Eso es la spec 008.
- El editor de sistemas de defensa: fase 2 del proyecto (ver README). Esta spec solo garantiza
  que el catálogo admite el tipo, no que se pueda editar uno.
- Las explicaciones de enseñanza. Eso es la spec 007.

## Escenarios

**E1 — Crear un sistema de recepción**
- Dado: un nombre libre y el tipo "recepción"
- Cuando: se crea el sistema
- Entonces: se acepta y queda en el catálogo

**E2 — Crear un sistema de defensa**
- Dado: un nombre libre y el tipo "defensa"
- Cuando: se crea el sistema
- Entonces: se acepta igual que uno de recepción, aunque su editor llegue en la fase 2

**E3 — Nombre vacío o en blanco**
- Dado: un nombre vacío o formado solo por espacios
- Cuando: se crea el sistema
- Entonces: se rechaza

**E4 — Nombre duplicado dentro del mismo tipo**
- Dado: un sistema de recepción ya creado con un nombre
- Cuando: se intenta crear otro sistema de recepción con el mismo nombre
- Entonces: se rechaza

**E5 — Mismo nombre en tipos distintos**
- Dado: un sistema de recepción ya creado con un nombre
- Cuando: se crea un sistema de defensa con ese mismo nombre
- Entonces: se acepta

**E6 — Renombrar a un nombre libre**
- Dado: un sistema ya creado
- Cuando: se le pone un nombre que ningún otro sistema de su mismo tipo usa
- Entonces: se acepta

**E7 — Renombrar a un nombre ocupado por otro**
- Dado: dos sistemas del mismo tipo
- Cuando: se intenta poner al primero el nombre del segundo
- Entonces: se rechaza

**E8 — Renombrar a su propio nombre actual**
- Dado: un sistema ya creado
- Cuando: se "renombra" con el mismo nombre que ya tenía
- Entonces: se acepta — no colisiona consigo mismo

**E9 — Borrar un sistema no afecta a los demás**
- Dado: varios sistemas en el catálogo
- Cuando: se borra uno de ellos
- Entonces: el resto sigue en el catálogo, sin cambios

**E10 — Orden del catálogo**
- Dado: sistemas de recepción y de defensa mezclados, en cualquier orden
- Cuando: se pide el catálogo ordenado
- Entonces: todos los de recepción aparecen antes que todos los de defensa, y dentro de cada
  grupo aparecen alfabéticos por nombre

**E11 — Cambiar quién ocupa la sexta plaza**
- Dado: un sistema que usa al segundo central en la sexta plaza del orden de saque
- Cuando: se cambia esa plaza para que la ocupe el líbero
- Entonces: se acepta y el sistema pasa a usar la plantilla con el líbero

**E12 — Cambiar de ocupante retira al saliente de las rotaciones guardadas**
- Dado: un sistema con formaciones guardadas donde aparece el segundo central
- Cuando: se cambia esa plaza para que la ocupe el líbero
- Entonces: el segundo central desaparece de todas las formaciones donde estaba colocado

## Preguntas abiertas

Ninguna. Se puede congelar en cuanto la revises.

## Al cerrar

Los 12 escenarios pasan (68 en total en `src/app/domain`). No existe `npm run test:coverage`
en `package.json`; no se reporta cobertura numérica por el mismo motivo que en specs
anteriores.

**Reubicación de `crearSistema`.** Esta función vivía en `sistema-recepcion.ts` desde la spec
005, con una comprobación de nombre duplicado que no distinguía tipo (no existía el concepto
todavía). Como "traer un sistema nuevo al catálogo" es, precisamente, de lo que trata esta
spec, se trasladó entera a `catalogo-sistemas.ts` en vez de duplicar la lógica de creación en
dos sitios. Eso obligó a tocar dos tests ya `Completada` de la spec 005 (E1 y E10): se
retiraron de `sistema-recepcion.spec.ts` y su intención pasa a estar cubierta por 006-E1 y
006-E4/E5, con la comprobación de duplicado ahora sí distinguiendo tipo. El resto de tests de
la 005 solo cambiaron su forma de construir el `Sistema` de partida (un literal en vez de
llamar a `crearSistema`), sin tocar ninguna aserción. Anotado también en el "Al cerrar" de la
spec 005. Ver decisión 0011 en `docs/decisiones.md`.

**Diseño de `cambiarPlantilla`.** Se mantiene genérica a propósito: no sabe nada de "central2"
ni "líbero", solo sustituye la plantilla de un sistema y filtra de sus formaciones a quien ya
no pertenece a la nueva. Quién es cada una de las dos variantes de plantilla (con el segundo
central o con el líbero) es una decisión de fuera del dominio — hoy de quien llame a la
función, más adelante de `application/` — así que `catalogo-sistemas.ts` no hardcodea ningún
roster concreto.

**Lo que sorprendió:** en cuanto `crearSistema` quedó escrito para E1, los escenarios E2-E5
pasaron en verde sin tocar código, igual que ya había pasado en la spec 005 con
`guardarFormacion`.

**Lo que no se desvió:** ninguna regla de `docs/dominio.md` resultó incorrecta.
