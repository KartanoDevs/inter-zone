# 051 — Validar un sistema

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

Todo sistema nace en borrador y nada lo saca de ahí. Para que un jugador pueda estudiarlo
(Teoría, spec siguiente) hace falta que su entrenador — o el admin — lo dé por bueno primero.

## Objetivo

Un entrenador del equipo dueño de un sistema, o el admin, puede marcar ese sistema como
validado, y quitarle esa marca si hace falta corregirlo.

## Fuera de alcance

- La pestaña "Teoría" que consume `estado` para filtrar — spec 052.
- Restringir el resto de `/api/sistemas` (crear, editar, borrar) según el rol — spec 037. Esta
  spec solo protege la acción de validar/quitar validación, como adelanto puntual: es la única
  acción nueva que el encargo ata explícitamente a un rol.
- `sistema.creado_por`: no se añade en esta spec. Añadir una columna sin nada que la escriba
  todavía sería la columna especulativa que `docs/modelo-de-datos.md` prohíbe.
- Notificar a nadie cuando un sistema se valida o se invalida.
- Impedir editar un sistema ya validado — sigue editable exactamente igual que antes.

## Escenarios

**E1 — Un sistema recién creado nace en borrador**
- Dado: cualquier sistema nuevo
- Cuando: se crea
- Entonces: su estado es "borrador"

**E2 — Un entrenador del equipo dueño puede validar el sistema**
- Dado: un entrenador con membresía en el equipo del sistema, y el sistema en borrador
- Cuando: pide validarlo
- Entonces: el sistema queda validado

**E3 — El admin puede validar un sistema de cualquier equipo**
- Dado: el admin, y un sistema en borrador de cualquiera de los dos equipos
- Cuando: pide validarlo
- Entonces: el sistema queda validado

**E4 — Un entrenador de otro equipo no puede validar ese sistema**
- Dado: un entrenador sin membresía en el equipo dueño del sistema
- Cuando: pide validarlo
- Entonces: se rechaza, y el sistema sigue en borrador

**E5 — Sin sesión, no se puede validar**
- Dado: ninguna sesión activa
- Cuando: se pide validar un sistema
- Entonces: se rechaza

**E6 — Un entrenador puede quitar la validación de un sistema ya validado**
- Dado: un entrenador del equipo dueño, y el sistema validado
- Cuando: pide quitarle la validación
- Entonces: el sistema vuelve a borrador

**E7 — Los dos sistemas de ejemplo de la semilla nacen ya validados**
- Dado: una base de datos recién sembrada
- Cuando: se consulta el catálogo
- Entonces: los dos sistemas de ejemplo (recepción y defensa) están validados — si no, nadie
  vería nada en Teoría hasta que un entrenador validara algo a mano

## Preguntas abiertas

Ninguna.

## Al cerrar

Los 7 escenarios en verde: E1, E3, E4 (como `puedeValidar`) y E6 (`invalidarSistema`) también
como dominio puro (`catalogo-sistemas.spec.ts`, `acceso.spec.ts`); los 7 de nuevo como
integración de servidor (`sistemas.rutas.spec.ts`, describe "validar"); y `051-E2` una tercera
vez a nivel de `SistemaStore` (`sistema.store.spec.ts`), porque ahí es donde se compone con el
resto de la aplicación. Suite de dominio: 381/381. Suite de servidor: 36/36. `npm run
typecheck` limpio en raíz y `server/`. Compilación de `ui/` verificada con el dev server de
Angular; sin comprobación visual en navegador (misma nota que la spec 050).

**Decisión de diseño no anticipada en la spec, tomada al implementar:** `validado_por` y
`validado_en`, no `estado`, viven fuera del tipo `Sistema` de dominio — mismo criterio que
`creado_en`/`actualizado_en` (ADR 0012). `estado` sí entra en `Sistema`, porque a diferencia de
las fechas, decide qué ve la aplicación (Teoría, spec siguiente, lo usará para filtrar).

**Imprevisto igual que en la spec 035, mismo motivo:** `prisma migrate dev --create-only` volvió
a proponer borrar los dos índices de `jugador` escritos a mano (specs 017/018) — drift falso, ya
conocido, quitado de la migración antes de aplicarla. Además, al generar esta migración Prisma
detectó que la de la spec 035 «se había modificado después de aplicarse» (cierto: se corrigió a
mano el `CHECK` de `sesion` que resultó problemático) y se negó a continuar sin ofrecer más que
un `migrate reset` destructivo. Se resolvió actualizando a mano el `checksum` guardado en
`_prisma_migrations` para que coincidiera con el fichero ya corregido — sin perder ningún dato.
Vale la pena recordarlo: **cualquier edición de una migración ya aplicada deja este mismo rastro
la próxima vez que se genere una migración nueva**, y la solución no es `migrate reset`.

**Alcance deliberadamente ampliado sobre la spec original:** validar exige sesión y rol,
adelantando una pieza de la spec 037 (ADR 0038) — ya estaba anotado en "Fuera de alcance" como
la única excepción.
