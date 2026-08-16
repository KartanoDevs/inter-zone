# 026 — Clonar un sistema existente

**Estado:** Completada
**Paso de la hoja de ruta:** No encaja en ningún paso de la hoja de ruta: es una utilidad de
catálogo (como crear/renombrar/borrar), no una capacidad de dominio nueva.

## Problema

Un entrenador que quiere probar una variante de un sistema ya construido — mover al líbero a
otro rol, ensayar una formación distinta en una rotación concreta, guardar una versión "con
falta" para enseñar un error — tiene hoy que reconstruirlo entero a mano, rotación a rotación,
porque no existe forma de partir de una copia del que ya tiene.

## Objetivo

Desde la barra de sistemas, un botón "Clonar" abre el mismo diálogo de alta con el nombre
sugerido «‹Nombre del original› (copia)», editable, y al confirmar crea un sistema nuevo e
independiente con el contenido completo del original — las seis formaciones, sus explicaciones,
la descripción general y a quién sustituye el líbero en cada rotación —, que queda activo.

## Fuera de alcance

- **Cambiar el tipo al clonar.** El clon es siempre del mismo tipo que el original (recepción
  clona a recepción, defensa a defensa); el diálogo no ofrece elegir otro.
- **Cambiar la plantilla del clon respecto al original.** Nace con exactamente la misma,
  incluida cualquier personalización de a quién sustituye el líbero rotación a rotación (spec
  017) — no se resetea a los valores por defecto.
- **Clonar varios sistemas a la vez.**
- **Deshacer un clon** salvo borrándolo a mano, como cualquier otro sistema.
- **Clonar sin sistema activo.** El botón se deshabilita, igual que "Renombrar" y "Borrar" hoy.

**Esta spec toca `application/` y `ui/`, además de `domain/`.** La operación de clonar necesita
una acción nueva en el store (genera el id, añade al catálogo, persiste, activa el clon —mismo
patrón que `crear`—) y un botón más en la barra de sistemas que reutiliza el diálogo existente.
Queda autorizado explícitamente aquí, igual que las specs 021, 022, 024 y 025.

## Decisión ya tomada con el usuario (no reabrir)

El nombre del clon se pide en el mismo diálogo modal que "Nuevo sistema" (`DialogoSistema`), con
«‹Nombre del original› (copia)» ya escrito como valor inicial editable — no se clona al instante
sin preguntar.

## Escenarios

**E1 — Clonar copia las seis formaciones**
- Dado: un sistema de recepción con las seis rotaciones guardadas
- Cuando: se clona confirmando un nombre nuevo
- Entonces: el clon tiene las seis formaciones idénticas a las del original

**E2 — El clon copia la descripción general**
- Dado: un sistema con descripción (spec 025)
- Cuando: se clona
- Entonces: el clon tiene la misma descripción

**E3 — El clon copia las explicaciones de rotación y de jugador**
- Dado: un sistema con explicaciones guardadas, de conjunto y de algún jugador
- Cuando: se clona
- Entonces: el clon las conserva igual

**E4 — El clon copia a quién sustituye el líbero en cada rotación**
- Dado: un sistema cuyo líbero sustituye a un titular distinto según la rotación (spec 017)
- Cuando: se clona
- Entonces: el clon sustituye exactamente igual, rotación a rotación

**E5 — El clon es independiente: editarlo no toca el original**
- Dado: un sistema ya clonado
- Cuando: se modifica una formación del clon y se guarda
- Entonces: el sistema original no cambia

**E6 — El clon nace con un id distinto**
- Dado: cualquier sistema
- Cuando: se clona
- Entonces: el id del clon no coincide con el del original

**E7 — El nombre sugerido es «‹Nombre original› (copia)»**
- Dado: un sistema llamado, por ejemplo, «Recepción a 3 (5-1)»
- Cuando: se abre el diálogo de clonar
- Entonces: el nombre propuesto es «Recepción a 3 (5-1) (copia)», editable antes de confirmar

**E8 — Un nombre de clon repetido dentro del mismo tipo se rechaza**
- Dado: ya existe un sistema con el nombre propuesto, del mismo tipo (recepción o defensa)
- Cuando: se intenta confirmar el clon con ese nombre sin cambiarlo
- Entonces: se rechaza, igual que al crear o renombrar con un nombre duplicado

**E9 — El clon es del mismo tipo que el original**
- Dado: un sistema de defensa
- Cuando: se clona
- Entonces: el clon es también de tipo defensa

**E10 — Clonar activa el clon**
- Dado: cualquier sistema
- Cuando: se clona con éxito
- Entonces: el sistema activo pasa a ser el clon, con R1 seleccionada (mismo comportamiento que
  crear un sistema)

**E11 — Sin sistema activo, no hay nada que clonar**
- Dado: el catálogo vacío, sin sistema activo
- Cuando: se mira la barra de sistemas
- Entonces: el botón "Clonar" está deshabilitado, igual que "Renombrar" y "Borrar"

**E12 — Cancelar el diálogo no clona nada**
- Dado: el diálogo de clonar abierto
- Cuando: se cancela
- Entonces: el catálogo queda igual que antes, sin ningún sistema nuevo

## Preguntas abiertas

Ninguna. Resuelta con el usuario antes de congelar esta spec — ver «Decisión ya tomada» más
arriba: el nombre se pide en el diálogo existente, no se genera sin preguntar.

## Al cerrar

Los 12 escenarios se cumplen. Partida: 213 tests (tras cerrar la spec 025); al cerrar, 223 — 10
nuevos con test directo (`domain/catalogo-sistemas.spec.ts` para E1-E6, E8, E9;
`application/sistema.store.spec.ts` para E10, E12). E7 (nombre sugerido «‹Original› (copia)»)
y E11 (botón deshabilitado sin sistema activo) son interacción y render puros — verificados con
`npm run build` (compilación estricta de plantillas) y revisión de código, no con el navegador;
mismo criterio que las specs 022-025, que tampoco tienen `tablero.spec.ts` ni
`barra-sistemas.spec.ts`.

**Seis escenarios (E2, E3, E4, E5, E6, E9) llegaron en verde sin código adicional al de E1.** No
es casualidad: `clonarSistema` se implementó desde el principio como `{ ...sistema, id,
nuevoNombre }`, que por construcción copia cualquier campo presente en `Sistema` — descripción,
explicaciones, plantilla con sus sustitutos de líbero, tipo — y no comparte estructuras mutables
con el original porque ninguna función del dominio muta un `Sistema` en el sitio (todas
devuelven objetos nuevos vía *spread*, invariante ya existente del proyecto). E1 forzó esa
implementación; el resto de escenarios de copia solo la confirmaron.

**Se reutilizó `DialogoSistema` sin cambios en el componente.** El modo `'clonar'` es una tercera
rama en `Tablero.dialogoSistema` (antes `'crear' | 'editar'`), con `mostrarTipo` en `false` como
en editar (el tipo no se elige) y un `nombreInicial` calculado (`nombreClonSugerido`). No hizo
falta ningún input ni output nuevo en `DialogoSistema`.

**Lo que no se desvió:** la decisión tomada con el usuario antes de congelar (diálogo editable
con nombre sugerido, no clonado silencioso) se implementó tal cual. `docs/dominio.md` no se
tocó: esto es una utilidad de catálogo, no una regla de voleibol.
