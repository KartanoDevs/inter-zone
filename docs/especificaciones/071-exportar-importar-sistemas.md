# 071 — Exportar e importar sistemas en JSON

**Estado:** Completada
**Paso de la hoja de ruta:** README, "Paso 6: Exportar e importar JSON y PNG" — esta spec cubre
solo la mitad de JSON de sistemas; PNG y cualquier exportación masiva quedan fuera.

## Problema

El usuario está probando InterZone en varios entornos (local, distintos servidores/bases de
datos) y necesita mover un sistema de recepción o defensa concreto de un entorno a otro sin
recrearlo a mano, formación por formación. Hoy no existe ningún mecanismo de exportar o importar
en el proyecto: `docs/arquitectura.md` lo anota como pendiente desde hace tiempo ("Exportadores
(PNG, JSON): todavía no existen") y nunca se implementó.

## Objetivo

Desde el panel de administración, el admin puede:

1. Elegir un sistema del catálogo (de cualquier equipo) y descargarlo como un fichero `.json`.
2. Elegir ese mismo fichero (o pegar su contenido) y un equipo destino, y crear un sistema nuevo
   a partir de él en el catálogo — con el mismo contenido que el original: plantilla, líbero,
   formaciones, explicaciones, defensas y celdas.

## Fuera de alcance

- **Exportar o importar varios sistemas a la vez.** Un sistema por operación. Si más adelante
  hace falta mover un catálogo entero, será otra spec — no se diseña el formato pensando en un
  array de sistemas todavía.
- **CSV o cualquier otro formato.** Solo JSON: la estructura anidada de un `Sistema` (formaciones
  por rotación, variantes de defensa, celdas de responsabilidad con sus tres estados) no se
  aplana a filas sin ambigüedad ni pérdida.
- **Sobrescribir un sistema existente al importar.** Importar siempre **crea** un sistema nuevo,
  nunca reemplaza uno ya guardado. Si el nombre elegido choca con uno existente en el equipo y
  tipo de destino, se pide renombrar o cancelar (ver escenarios) — nunca se ofrece "sobrescribir".
- **Elegir a qué equipo(s) exportar.** Exportar no toca ningún equipo, solo lee y descarga; el
  `equipoId` que trae el JSON es el del sistema original, informativo para quien lo abra a mano,
  pero irrelevante al reimportar (ver E7).
- **PNG u otro formato de imagen.** Es la otra mitad del "Paso 6" del README; no se toca aquí.
- **Exportar o importar por fuera del panel de administración.** No hay atajo desde el editor de
  sistemas ni desde la vitrina; solo existe en la pantalla de admin nueva.

**Esta spec toca `domain/`, `application/` y `ui/`** — no es una spec de dominio de voleibol,
sino una utilidad de plataforma, así que no había protocolo previo de "implementa la spec NNN"
que lo prohibiera; queda autorizado aquí explícitamente:

- `domain/catalogo-sistemas.ts` gana `serializarSistema` y `parsearSistemaImportado`.
- `application/sistema.store.ts` gana `exportarActivo`/`exportar` e `importar` en `SistemaStore`.
- `ui/acceso/` gana un componente nuevo, `ExportarSistemasAdmin`, montado como pestaña dentro del
  área de admin en `Tablero` (junto a la pestaña de lista blanca/cuentas, spec 054/068).

## Diseño de pantalla (acordado con el usuario)

Dos paneles independientes en una misma pantalla de admin, "Exportar sistema" e "Importar
sistema": apilados verticalmente en móvil, lado a lado en escritorio (`min-width: 1024px`, el
único punto de corte real de la app) — mismo criterio que `tablero.css`, que ensancha la columna
sin reestructurar el orden de los bloques. Estilo visual coherente con el resto del admin
(`.app-boton`, badges tipo píldora, tarjetas `--bg-card`); sin modo claro, la app es oscura fija.

- **Exportar**: selector de equipo, lista de sistemas de ese equipo (con badges de tipo y
  estado), botón para descargar el sistema elegido como `<nombre>.json`.
- **Importar**: selector de fichero o textarea para pegar el JSON, selector de equipo destino, y
  si hay conflicto de nombre, un aviso inline con campo de nombre nuevo y opción de cancelar.

## Escenarios

**E1 — Exportar un sistema descarga un JSON fiel al original**
- Dado: un sistema de recepción con las seis formaciones completas, descripción, explicaciones
  de rotación y de jugador, y un líbero que sustituye a titulares distintos según la rotación
  (spec 017)
- Cuando: el admin lo exporta
- Entonces: se descarga un fichero `.json` cuyo contenido, al analizarlo, reconstruye
  exactamente el mismo sistema — mismas formaciones, mismo líbero por rotación, misma
  descripción y explicaciones

**E2 — Exportar un sistema de defensa conserva variantes y celdas de finta**
- Dado: un sistema de defensa con varias variantes por (caso, situación, bloqueadores), alguna
  con `desplazamientoSombra` y celdas de finta pintadas
- Cuando: se exporta
- Entonces: el JSON conserva cada variante con su `desplazamientoSombra` y sus celdas de finta
  intactas, incluyendo la diferencia entre "sin celdas pintadas nunca" (`undefined`) y "vaciada a
  propósito" (`[]`)

**E3 — Importar un JSON válido crea un sistema nuevo en el equipo elegido**
- Dado: el JSON exportado de un sistema, y un nombre libre en el equipo y tipo de destino
- Cuando: el admin lo importa eligiendo ese equipo
- Entonces: aparece un sistema nuevo en el catálogo de ese equipo, con un `id` propio (nunca el
  del JSON), en estado `borrador` (nunca hereda `validado` del original), y con el mismo
  contenido que el sistema exportado

**E4 — Importar no reutiliza el `id` del JSON aunque coincida con uno existente**
- Dado: un JSON cuyo `id` coincide con el de un sistema ya guardado en el entorno de destino
- Cuando: se importa
- Entonces: se crea un sistema nuevo con un `id` generado aparte — nunca se sobrescribe el
  sistema que ya tenía ese `id`

**E5 — Nombre duplicado: se ofrece renombrar o cancelar, nunca sobrescribir**
- Dado: un JSON cuyo nombre ya existe para ese mismo equipo y tipo en el catálogo de destino
- Cuando: se intenta importar
- Entonces: no se crea nada todavía; se muestra un aviso con el nombre en conflicto, un campo de
  texto precargado con `"<nombre> (importado)"` y dos salidas: confirmar con un nombre nuevo (que
  vuelve a comprobarse) o cancelar la importación sin crear nada

**E6 — Tras resolver el conflicto con un nombre nuevo, la importación continúa**
- Dado: el aviso de conflicto de E5, con el campo de nombre editado a uno libre
- Cuando: se confirma
- Entonces: se crea el sistema con ese nombre nuevo, igual que en E3

**E7 — El equipo de destino lo elige quien importa, no el que trae el JSON**
- Dado: un JSON exportado de un sistema del equipo masculino
- Cuando: se importa eligiendo el equipo femenino como destino
- Entonces: el sistema se crea en femenino; el `equipoId` que traía el JSON no se usa para nada
  más que informativo

**E8 — JSON inválido o incompleto no crea nada**
- Dado: un fichero que no es JSON, o un JSON que le faltan campos obligatorios de `Sistema` (por
  ejemplo, sin `formaciones` ni `plantilla`)
- Cuando: se intenta importar
- Entonces: se muestra un mensaje de error claro ("el fichero no es un sistema válido" o
  equivalente) y no se crea ningún sistema

**E9 — Se puede pegar el JSON directamente, sin fichero**
- Dado: el contenido de un JSON exportado, copiado al portapapeles
- Cuando: se pega en el campo de texto del panel de importar (en vez de seleccionar un fichero)
- Entonces: el flujo continúa igual que si se hubiera subido un fichero — detección del sistema,
  selección de equipo, importación

**E10 — Cancelar la importación no dice nada al catálogo**
- Dado: un JSON detectado y listo para importar, con o sin conflicto de nombre pendiente
- Cuando: el admin cancela en cualquier punto antes de confirmar
- Entonces: el catálogo no gana ningún sistema

**E11 — Exportar no depende de qué equipo o sistema esté activo en el editor**
- Dado: el entrenador tiene abierto en el editor un sistema del equipo masculino
- Cuando: desde el panel de exportar elige un sistema del equipo femenino y lo exporta
- Entonces: se descarga el sistema femenino elegido; el sistema activo del editor no cambia

## Preguntas abiertas

Ninguna — resueltas con el usuario antes de congelar:

1. **Formato**: solo JSON (no CSV). Ver "Fuera de alcance".
2. **Alcance**: un sistema por operación, no exportación/importación masiva. Ver "Fuera de
   alcance".
3. **Conflicto de nombre al importar**: se pregunta, con dos salidas — renombrar (nombre
   precargado, editable) o cancelar. Nunca se sobrescribe. Ver E5/E6.
4. **Equipo destino al importar**: lo elige quien importa con un selector explícito, nunca se
   asume el `equipoId` que traía el JSON. Ver E7.
5. **Diseño de la pantalla**: dos paneles ("Exportar"/"Importar"), apilados en móvil y lado a
   lado en escritorio — variante elegida tras revisar tres mockups. Ver "Diseño de pantalla".

## Al cerrar

Los 11 escenarios se cumplen. Partida: 533 tests → 542 al cerrar — 9 nuevos con test directo:
`domain/catalogo-sistemas.spec.ts` (E1, E2, E8: `serializarSistema`/`parsearSistemaImportado`,
round-trip fiel en recepción con líbero y en defensa con `desplazamientoSombra` y los tres
estados de `celdas`/`celdasFinta`, y rechazo de JSON inválido) y
`application/sistema.store.spec.ts` (E11, E3/E4, E7, E5, E6, E8: `exportar`/`importar` del
store — exportar independiente del contexto activo, creación con id/estado nuevos, equipo
destino explícito, conflicto de nombre y su resolución, JSON inválido). E9 (pegar en vez de
subir fichero) y E10 (cancelar) son interacción de UI pura, verificadas con `npm run build`
(compilación estricta de plantillas) y revisión de código — mismo criterio que las specs 026,
048 y 063, que tampoco tienen test de componente para `ui/`. `npm run typecheck` y
`npm run format:check` limpios. No existe `test:coverage` en el proyecto; no se reporta
cobertura.

**Desviación respecto a lo especificado: ninguna en el comportamiento.** Una precisión de
diseño que la spec no fijaba: la lógica de "construir el sistema a importar" (id nuevo, equipo
elegido, sin `estado`, comprobando colisión de nombre en destino) se extrajo como una función
de dominio nueva, `importarSistema` en `catalogo-sistemas.ts`, con la misma forma que
`clonarSistema` — el store solo orquesta la I/O (`ejecutarEscritura`, `repositorio.crear`), como
manda `docs/arquitectura.md` para `application/`. No se creó un fichero `exportar-sistema.ts`
aparte (el plan lo dejaba como opción): la lógica cabía en `catalogo-sistemas.ts` sin ensuciarlo,
y menos ficheros es la deuda que se prefiere evitar aquí (CLAUDE.md).

**Ubicación en la UI, decidida con el usuario al implementar (no estaba fijada al congelar):**
no existía ningún patrón de sub-pestañas dentro de la ventana `admin` — hoy solo renderiza
`ListaBlancaAdmin`, con sus dos bloques apilados (Lista blanca / Cuentas). Se optó por añadir
`ExportarSistemasAdmin` como un tercer bloque apilado en esa misma ventana, en vez de inventar
un tabstrip nuevo sin precedente en el proyecto. `Tablero` monta los dos componentes uno debajo
del otro cuando `ventana() === 'admin' && esAdmin()`.

**Verificación visual en navegador pendiente**: Docker Desktop no estaba disponible en la
máquina de desarrollo durante el cierre de esta spec, así que no se pudo levantar el stack para
probar la ventana nueva a ojo (exportar un sistema real, importarlo, provocar el conflicto de
nombre desde la interfaz). Suite de dominio/aplicación, `npm run build` (compilación estricta
de plantillas Angular) y `npm run typecheck` sí se ejecutaron y están en verde. Queda pendiente
una pasada visual en cuanto Docker esté disponible.

**Ningún ADR nuevo ni cambio en `docs/dominio.md`**: no es una regla de voleibol ni una decisión
de arquitectura nueva, es una utilidad de plataforma sobre el mismo `Sistema` de dominio que ya
existía. `docs/arquitectura.md` sí se actualiza (ver más abajo): `catalogo-sistemas.ts` gana
`serializarSistema`, `parsearSistemaImportado` e `importarSistema`; `application/` gana
`exportar`/`importar` en `SistemaStore`; `ui/acceso/` gana `ExportarSistemasAdmin`. El README no
cambia de cierre de paso: el "Paso 6" de la hoja de ruta cubre JSON y PNG juntos, y esta spec
solo cierra la mitad de JSON de sistemas — PNG sigue pendiente.
