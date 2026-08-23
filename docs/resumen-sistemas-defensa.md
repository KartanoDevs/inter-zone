# Resumen — Sistemas de defensa (specs 021, 022, 023)

Sesión: implementación completa del primer sistema de defensa de InterZone, en tres specs
encadenadas, cada una congelada, implementada con TDD y cerrada por separado con su propio
commit.

## Qué se puede hacer ahora que no se podía antes

- **Crear un sistema de tipo Defensa** desde el mismo formulario de alta (antes solo ofrecía
  "Defensa (próximamente)", deshabilitado).
- **Marcar por dónde ataca el rival** arrastrando una ficha genérica a su campo: cuatro vías
  (zona 4, zona 3, zona 2, pipe), derivadas de dónde se suelta, con el espejo de zonas resuelto
  (la zona 4 del rival cae a nuestra derecha).
- **Colocar a los seis defensores** por rotación y por vía — mismo roster que en recepción,
  líbero incluido donde le toque —, **sin ninguna validación de posición**: en defensa esa
  regla no existe, no es un ajuste que se pueda desactivar.
- **Pintar la zona de responsabilidad de un jugador**: al seleccionarlo, arrastrar por el campo
  pinta o borra celdas de 0,5 m en vez de mover fichas. Funciona igual en recepción y en
  defensa, y se guarda junto con la formación.
- **Ver todas las zonas a la vez**: un interruptor muestra las seis zonas superpuestas, cada
  jugador con un color estable y una leyenda; una celda compartida por varios se ve en franjas
  diagonales.

## Alcance de los cambios

| Capa | Ficheros nuevos | Ficheros tocados |
|---|---|---|
| `domain/` | `defensa.ts`, `sistema-defensa.ts`, `rejilla.ts` (+ sus `.spec.ts`) | `modelos.ts` (`ViaAtaque`, `Celda`, `Sistema.defensas`, `Colocacion.celdas`), `rotacion.ts` (ya existente, `zaguerosEnRotacion` reutilizado) |
| `application/` | — | `sistema.store.ts` (`viaActiva`, `seleccionarVia`, `pintarCelda`/`borrarCelda`, `resultadoValidacion`/`puedeGuardar` conscientes del tipo de sistema) |
| `infrastructure/` | — | `local-storage-sistema.repository.ts` (versión 3→4: persiste `defensas`) |
| `ui/` | `rotaciones/selector-via.*` | `pista/*`, `tablero/*`, `sistemas/dialogo-sistema.*` |
| `docs/` | 3 specs, 1 ADR (0020) | `dominio.md`, `arquitectura.md`, `README.md` |

**149 → 175 tests** (26 nuevos), todos en verde; `ng build` limpio en cada cierre. Sin
`npm run test:coverage` (no existe en el proyecto).

## Tres commits, uno por spec

```
c06f8e5 feat(defensa): pizarra de defensa por rotacion y via de ataque (spec 021)
8b1dfa7 feat(zonas): pintar la zona de responsabilidad de un jugador (spec 022)
07ead19 feat(zonas): vista de conjunto con color estable por jugador (spec 023)
```

## Bugs reales encontrados y corregidos durante la implementación

Cuatro, todos detectados con un test o una verificación manual *antes* de cerrarse la spec
correspondiente, nunca después:

1. **`puedeGuardar` en el store** quedaba siempre en `false` para defensa al generalizar
   `resultadoValidacion` a "siempre `null`" — `undefined === 0` nunca es `true`.
2. **El botón "Guardar rotación"** tenía su propio cálculo duplicado (`!completo() ||
   !esLegal()`) en vez de leer `store.puedeGuardar()`, con el mismo fallo que (1) — no lo cogió
   ningún test unitario porque las plantillas no se testean; lo encontró la verificación manual
   con Playwright.
3. **`LocalStorageSistemaRepository` no serializaba `sistema.defensas`** en absoluto: cualquier
   defensa guardada se habría perdido al recargar la página. Detectado escribiendo el test de
   ida-y-vuelta antes de tocar el código.
4. **`formacionesIguales` no comparaba `celdas`**, solo `punto`: pintar una zona sin mover a
   nadie no activaba el aviso de "cambios sin guardar".

Los cuatro comparten un patrón: aparecieron al **generalizar una función existente** a un caso
nuevo (defensa, o celdas), no al escribir código nuevo desde cero. Vale la pena recordarlo la
próxima vez que se generalice algo en este proyecto — conviene buscar activamente los sitios que
dependen de la forma antigua, no solo el que motivó el cambio.

## Decisiones de diseño, documentadas

- **ADR 0020**: la vía de ataque se persiste como valor derivado (`z4`/`z3`/`z2`/`pipe`), nunca
  como la posición exacta del rival. Cada pestaña de vía muestra la ficha rival en un punto fijo.
- `docs/dominio.md` §6 y el invariante 10 corregidos: la rejilla ya no es solo de quien recibe
  (ahora cualquiera de los seis) ni cubre la zona libre (solo el campo propio, 9×9 m).
- El color de cada jugador en la vista de conjunto se deriva de `claveOrdenRol` (el mismo orden
  que ya usan el banquillo y la leyenda), no se declara ni se guarda.

## Qué falta o podría mejorarse

**Del alcance ya conocido, deliberadamente fuera de estas tres specs:**
- Huecos y conflictos derivados de la rejilla (specs 014-015 de la hoja de ruta) — la rejilla ya
  está construida de forma genérica (recepción y defensa) precisamente para que estas specs no
  tengan que tocar `domain/rejilla.ts` cuando lleguen.
- Modo consulta y modo examen (specs 012-013), exportar/importar (spec 016): sin empezar.
- El campo rival se quedó en 4 m (no se amplió a 6-9 m); el pipe se pinta en la banda ya
  dibujada, por detrás de la línea de ataque rival. Si en el uso real el pipe necesita más
  profundidad visual, es un cambio acotado a `pista.html`/`pista.css`, sin tocar dominio.

**Deuda menor no crítica, no introducida por esta sesión pero visible al pasar por estos ficheros:**
- `docs/arquitectura.md`, sección `infrastructure/`, sigue describiendo `LocalStorageAjustesRepository`
  como "si la validación de posiciones está desactivada" cuando ya tiene cuatro ajustes desde
  antes de esta sesión. No se tocó por no ser parte de este trabajo; sería un cambio de una
  frase si se quiere poner al día.
- Los scripts de verificación con Playwright de esta sesión son ad-hoc (viven en el scratchpad,
  no en el repo). Si la verificación manual con navegador se vuelve rutina en este proyecto,
  podría merecer la pena capturarla como un skill del repo (`/run-skill-generator`) en vez de
  reescribirla cada vez.

**Preguntas para el entrenador, no para el código**, que solo surgirán con uso real:
- ¿Hace falta un botón "vaciar zona" para un jugador (deshacer todo su pintado de golpe), o
  celda a celda es suficiente? Quedó fuera de la spec 022 a propósito.
- ¿El pipe necesita matizar profundidad (short/long) más allá de una sola vía? Hoy es una única
  zona; si en la práctica hace falta distinguir, es una quinta vía o una subdivisión del pipe,
  cambio de dominio con su propia spec.
