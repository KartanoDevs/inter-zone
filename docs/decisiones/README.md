# Registro de decisiones

Append-only. Una decisión existente no se edita: si cambia, se añade una nueva que la
sustituye y se marca la anterior como *Sustituida por NNNN*.

Un fichero por decisión, numerado `NNNN-slug.md`. Antes vivían todas en un único
`docs/decisiones.md`; se partió aquí al superar las quince entradas (ver decisión 0001 y
siguientes sobre por qué el fichero único era la opción a propósito hasta ese punto).

Formato de cada fichero: contexto, decisión, consecuencias. Corto. Lo importante es el
**porqué**, que es lo único que no se puede deducir leyendo el código dentro de seis meses.

## Índice

| # | Decisión | Estado |
|---|---|---|
| [0001](0001-sin-backend-en-la-v1.md) | Sin backend en la v1 | Aceptada |
| [0002](0002-coordenadas-en-metros.md) | Sistema de coordenadas en metros, origen en la esquina | Aceptada |
| [0003](0003-svg-en-lugar-de-canvas.md) | SVG en lugar de Canvas y Fabric.js | Aceptada |
| [0004](0004-rejilla-de-responsabilidad.md) | Zonas de responsabilidad como rejilla de 0,5 m | Aceptada |
| [0005](0005-orden-de-saque-unico.md) | El orden de saque se define una vez; las rotaciones se derivan | Precisada por 0010 |
| [0006](0006-roles-configurables-etiqueta-derivada.md) | Roles con nombre y abreviatura configurables, etiqueta derivada | Sustituida por 0009 |
| [0007](0007-validarformacion-infracciones-y-avisos.md) | `validarFormacion` devuelve infracciones y avisos por separado | Aceptada |
| [0008](0008-plantilla-ts-aparte-de-roles-ts.md) | `plantilla.ts` como fichero de dominio aparte de `roles.ts` | Aceptada |
| [0009](0009-central-usa-c-colision-por-etiqueta.md) | El central usa C como abreviatura; la colisión se compara por etiqueta, no por letra | Aceptada |
| [0010](0010-rn-anclada-al-colocador.md) | `Rn` se numera anclada al colocador, no al orden de saque tal cual se definió | Aceptada (vigente tras 0018/0019) |
| [0011](0011-crearsistema-en-catalogo-sistemas.md) | `crearSistema` vive en `catalogo-sistemas.ts`, no en `sistema-recepcion.ts` | Aceptada |
| [0012](0012-fechas-en-el-repositorio.md) | `creadoEn`/`actualizadoEn` viven en el repositorio, no en `Sistema` | Aceptada |
| [0013](0013-plantilla-global-en-domain.md) | La plantilla global vive en `domain/`; el `SistemaStore` se cablea con `useFactory` | Aceptada |
| [0014](0014-libero-fuera-del-orden-de-saque.md) | El líbero vive fuera del orden de saque; entra y sale según la rotación | Aceptada |
| [0015](0015-sustituto-libero-por-rotacion-e-indice-de-rol.md) | El sustituto del líbero se declara por rotación; el índice de rol cuenta en sentido de rotación | Parcialmente sustituida por 0017 |
| [0016](0016-modal-generico.md) | Un componente `Modal` genérico sustituye a las implementaciones paralelas de diálogo | Aceptada |
| [0017](0017-indice-de-rol-declarado.md) | El índice de rol se declara, no se deriva | Aceptada |
| [0018](0018-rn-es-la-rotacion-fisica.md) | `Rn` es la rotación física número n, no "el colocador ocupa Pn" | Revertida por 0019 |
| [0019](0019-revierte-0018-rn-anclada-al-colocador.md) | Se revierte la ADR 0018: `Rn` sí es "el colocador ocupa Pn" | Aceptada |
