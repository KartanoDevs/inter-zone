# 028 — Persistir la zona de responsabilidad de un jugador

**Estado:** Completada
**Paso de la hoja de ruta:** Corrige un defecto de las specs 022/024, descubierto al preparar la
spec 029. No añade funcionalidad nueva.

## Problema

Pintar la zona de responsabilidad de un jugador (specs 022, 024) se guarda en memoria, pero
`LocalStorageSistemaRepository` nunca serializa `Colocacion.celdas`: al recargar la página,
cualquier zona pintada desaparece. Como una defensa completa puede tener seis jugadores con zona
en cada una de sus formaciones, esto pierde trabajo real del entrenador sin avisar.

## Objetivo

Pintar una zona, guardar y recargar conserva exactamente las celdas pintadas — ni de más ni de
menos, y respetando la distinción entre "nunca se tocó" (`undefined`, se ve el bloque por
defecto) y "se vació a propósito" (`[]`, spec 024) que ya existe en memoria.

## Fuera de alcance

- Cambiar `TAMANO_CELDA` o cualquier otra regla de la rejilla (`rejilla.ts` no se toca).
- Calcular huecos o conflictos (specs 014-015, sin escribir).

## Escenarios

**E1 — Las celdas pintadas de un jugador sobreviven a guardar y releer**
- Dado: un jugador con varias celdas pintadas en una formación
- Cuando: se guarda y se vuelve a leer con `LocalStorageSistemaRepository`
- Entonces: sus celdas llegan idénticas

**E2 — Sin celdas pintadas, no aparece un array vacío tras releer**
- Dado: un jugador colocado sin ninguna celda pintada (`celdas` es `undefined`)
- Cuando: se guarda y se vuelve a leer
- Entonces: `celdas` sigue siendo `undefined`, no `[]` — para no convertir "nunca tocada" en
  "vaciada a propósito" (spec 024)

**E3 — Una zona vaciada a propósito sobrevive como vacía, no como "nunca tocada"**
- Dado: un jugador cuya zona se vació borrando su última celda (`celdas: []`)
- Cuando: se guarda y se vuelve a leer
- Entonces: `celdas` sigue siendo `[]`, no `undefined` — si volviera a `undefined` reaparecería
  el bloque por defecto que el entrenador borró a propósito

## Preguntas abiertas

Ninguna.

## Al cerrar

Los 3 escenarios se cumplen. Partida: 227 tests (tras cerrar la spec 027); al cerrar, 230 — 3
nuevos en `infrastructure/local-storage-sistema.repository.spec.ts`. E2 llegó en verde sin
código nuevo: hoy nunca hay `celdas`, así que "sigue sin haberlas" ya era cierto antes del
arreglo.

**La distinción `undefined` vs `[]` (spec 024) se resuelve gratis con `JSON.stringify`:** una
propiedad con valor `undefined` se omite al serializar, así que `celdas: c.celdas` en
`posicionesPersistidasDe` no necesita ningún condicional — si `c.celdas` es `undefined` no
aparece en el JSON (E2); si es `[]`, aparece como `[]` (E3). Mismo patrón que ya usaba
`explicacion` para la misma distinción, sin que nadie lo hubiera dejado escrito hasta ahora.

**No hizo falta subir la versión del payload.** Añadir un campo opcional a
`PosicionPersistida` es compatible hacia atrás para lectura (un payload de la v5 sin `celdas`
sigue siendo válido, y ahora sí, un dato real que antes se perdía en silencio empieza a
conservarse) — a diferencia de las specs 021/025, que sí subieron versión porque cambiaban el
significado de datos ya existentes, aquí solo se empieza a leer/escribir un campo que antes se
ignoraba del todo. `docs/dominio.md` no se tocó: no cambia ninguna regla de voleibol, solo se
corrige un defecto de guardado.
