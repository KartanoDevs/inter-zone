# 005 — Sistema de recepción: crear, guardar por rotación y bloquear faltas

**Estado:** Congelada
**Paso de la hoja de ruta:** 2

## Problema

El entrenador diseña un sistema de recepción con nombre (por ejemplo, "Recepción de 3
jugadores V1"), coloca a los seis jugadores rotación a rotación, y la herramienta debe
impedir guardar una formación que cometa falta de posición, para que todo lo que quede
guardado sea legal.

## Objetivo

Un sistema con nombre, ligado a una plantilla, que acumula hasta seis formaciones — una por
`Rn` — todas validadas al guardarse, y que sabe si está completo.

## Fuera de alcance

- El arrastre en pantalla y el guardado desde la UI. Eso es la spec 007.
- La persistencia entre sesiones del navegador. Eso es la spec 006.
- El modo examen y el cálculo de la nota de perfección. Eso es la spec 010.
- Qué pasa si se intenta borrar la plantilla que usa este sistema: ya lo resuelve la spec 004
  (E6, se rechaza borrar una plantilla en uso).

## Escenarios

**E1 — Crear un sistema vacío**
- Dado: un nombre y una plantilla existente
- Cuando: se crea el sistema
- Entonces: se acepta, sin ninguna rotación guardada todavía

**E2 — Guardar una formación legal**
- Dado: un sistema y una formación sin infracciones para una rotación `Rn`
- Cuando: se guarda
- Entonces: se acepta y queda asociada a esa `Rn`

**E3 — Guardar una formación con infracción se bloquea**
- Dado: un sistema y una formación con alguna infracción de las reglas de falta posicional
- Cuando: se intenta guardar
- Entonces: se rechaza y no queda nada guardado para esa rotación

**E4 — Un aviso "al límite" no bloquea el guardado**
- Dado: una formación sin infracciones pero con algún aviso `al_limite`
- Cuando: se guarda
- Entonces: se acepta (un aviso no es una infracción, ADR 0007)

**E5 — Sistema incompleto**
- Dado: un sistema con menos de seis rotaciones guardadas
- Cuando: se consulta si está completo
- Entonces: no lo está

**E6 — Sistema completo**
- Dado: un sistema con las seis rotaciones guardadas, todas legales
- Cuando: se consulta si está completo
- Entonces: lo está

**E7 — Sobrescribir una rotación ya guardada**
- Dado: un sistema con una formación ya guardada para `R2`
- Cuando: se guarda una nueva formación legal para `R2`
- Entonces: sustituye a la anterior

**E8 — Jugador ajeno a la plantilla**
- Dado: una formación que incluye a un jugador que no pertenece a la plantilla del sistema
- Cuando: se intenta guardar
- Entonces: se rechaza

**E9 — Formación incompleta**
- Dado: una formación que no coloca a los seis jugadores de la plantilla
- Cuando: se intenta guardar
- Entonces: se rechaza

**E10 — Dos sistemas con el mismo nombre**
- Dado: un sistema ya creado con un nombre
- Cuando: se intenta crear otro con el mismo nombre
- Entonces: se rechaza

**E11 — Borrar una rotación ya guardada**
- Dado: un sistema con una formación guardada para `R2`
- Cuando: se borra esa rotación
- Entonces: `R2` queda vacía otra vez

**E12 — Borrar una rotación deshace la completitud**
- Dado: un sistema completo, con las seis rotaciones guardadas
- Cuando: se borra una de ellas
- Entonces: el sistema deja de estar completo

## Preguntas abiertas

Ninguna. Resueltas con el usuario:

- **Orden de implementación:** esta spec se congela y se implementa después de que la 003 y la
  004 estén cerradas, en ese orden. Cuando le toque el turno, `Rn` ya tiene un significado
  único y sin ambigüedad.
- **Borrar una rotación:** se permite (E11), y puede deshacer la completitud de un sistema
  (E12). Completar un sistema no es un paso sin retorno.

## Al cerrar

_Pendiente — se rellena al cerrar la spec._
