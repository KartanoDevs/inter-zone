# 02 — Arquitectura y decisiones

> Documento de lectura. La versión normativa de las capas está en `docs/arquitectura.md`;
> el porqué de cada decisión, una por fichero, en `docs/decisiones/`.

---

## 1. Stack tecnológico

### Frontend (raíz del repositorio)

| Pieza | Versión | Nota |
|---|---|---|
| Angular | ^22.1 | **standalone, signals, zoneless**. Sin NgModules, sin `zone.js`. |
| TypeScript | ~6.0 | Modo estricto. |
| RxJS | ~7.8 | Dependencia transitiva de Angular. **El código del proyecto no la usa**: el estado es signals. |
| Vitest | ^4.0 | Entorno `node`, sin `TestBed`. |
| jsdom | ^28 | Disponible, pero los tests que corren hoy no lo necesitan. |
| Prettier | ^3.8 | Formato. |
| SVG nativo | — | Render de la pista. Sin Canvas, sin Fabric.js, sin D3. |
| CSS plano | — | Un `.css` por componente. Sin Tailwind, Material ni ninguna librería de UI. |

**Lo que no está y es deliberado:** ninguna librería de estado (NgRx, Signal Store), ningún
cliente HTTP más allá de `fetch` nativo, ninguna librería de utilidades (lodash, date-fns),
ningún componente de terceros. Todo el frontend son 4.279 líneas de TypeScript de producción
(sin contar tests, e incluyendo la maqueta congelada); el backend, 575.

### Backend (`server/`, proyecto Node aparte con su propio `package.json`)

| Pieza | Versión | Nota |
|---|---|---|
| Node | ≥ 22 | ESM (`"type": "module"`). |
| Express | ^5.2 | Solo rutas. CORS escrito a mano — tres cabeceras y una respuesta a `OPTIONS`—, sin la dependencia `cors`. |
| Prisma + @prisma/client | ^6.19 | ORM y migraciones. Cliente generado en `server/generated/prisma`. |
| PostgreSQL | 15+ | Requiere 15 por `UNIQUE NULLS NOT DISTINCT`. Local vía Docker Compose. |
| tsx | ^4.23 | Ejecuta TypeScript sin build (`dev`, `start`, `seed`). |
| Vitest | ^4.0 | Tests **de integración contra Postgres real**, no dobles en memoria. |

### Herramientas de proceso

Docker (solo para el Postgres local), Angular CLI, y un registro de decisiones append-only en
`docs/decisiones/`.

---

## 2. Patrones de arquitectura

### 2.1 Arquitectura hexagonal (puertos y adaptadores), en cuatro capas

```
    ui/  ──────────►  application/  ──────────►  domain/
                            │                        ▲
                            ▼                        │
                    infrastructure/  ────────────────┘

    server/  ──────────────────────────────────────►  domain/
```

**Las flechas apuntan solo hacia dentro.** `domain/` no conoce a nadie.

| Capa | Contiene | Regla |
|---|---|---|
| `domain/` | Modelos y reglas de voleibol. Funciones puras y tipos. | **No importa nada externo.** Ni Angular, ni RxJS, ni el DOM, ni librerías. Solo TypeScript y otros ficheros de `domain/`. |
| `application/` | `SistemaStore`: orquestación y estado con signals. | Cero lógica de voleibol. Si aparece un `if` sobre posiciones, pertenece a `domain/`. |
| `infrastructure/` | Adaptadores: HTTP, `localStorage`. | Implementan interfaces **declaradas en `domain/`**. |
| `ui/` | Componentes standalone, `OnPush`. | Leen signals y emiten intenciones. No calculan nada del dominio, ni siquiera la etiqueta de una ficha. |
| `server/` | API REST + Prisma. | **Segundo consumidor de `domain/`**, con rutas relativas. Nunca importa de `application/`, `infrastructure/` ni `ui/`. |

### 2.2 La regla que sostiene todo lo demás

**`domain/` no importa nada.** Si un fichero de `domain/` tiene un `import` que no apunta a
otro fichero de `domain/`, está mal.

No es purismo, y tiene dos réditos concretos ya cobrados:

1. **Los 156 tests de dominio corren en milisegundos**, sin `TestBed`, sin DOM, sin arrancar
   nada. La regla dura del proyecto es que esa suite siga por debajo del segundo; si deja de
   cumplirse, algo se coló en la capa que no debía.
2. **El mismo código de reglas corre en el navegador y en Node.** Cuando nació `server/`, no
   hubo que duplicar ni adaptar nada: importa `src/app/domain/` directamente (ADR 0025). Si el
   dominio hubiera importado Angular, habría hecho falta una capa de traducción o una copia.

### 2.3 Estado con signals, sin librería de estado

`SistemaStore` es **una única clase sin decorador de Angular**, instanciable con
`new SistemaStore(repositorio, ajustesRepositorio)` y testeable sin `TestBed` (81 tests).
Se cablea en `app.config.ts` con `useFactory` (ADR 0013).

Tres tipos de miembro:

- **Signals escribibles** — el estado crudo: `sistemas`, `equipoActivo`, `sistemaActivoId`,
  `rotacionActiva`, `viaActiva`, `borrador`, `jugadorSeleccionadoId`, `errorGuardado`…
- **`computed`** — todo lo derivado: `catalogo`, `posicionesActivas`, `resultadoValidacion`,
  `puedeGuardar`, `celdasJugadorSeleccionado`… Aquí es donde vive el invariante «lo derivado no
  se almacena», expresado en código.
- **Acciones** — `colocarOMover`, `guardar`, `crear`, `clonar`, `pintarCelda`… Las que persisten
  algo son `async`.

**El constructor no hace E/S.** `cargar()` es un método aparte que `app.config.ts` dispara con
`provideAppInitializer`, así que Angular no monta la aplicación hasta que el catálogo y los
ajustes están listos.

### 2.4 El borrador: dos formaciones a la vez

Un patrón que conviene entender antes de leer el store. En todo momento hay dos versiones de
la formación activa:

- `formacionGuardadaActiva` — computed, lo que hay persistido.
- `borrador` — signal escribible, lo que el entrenador está tocando.

Arrastrar una ficha solo cambia el borrador. `hayCambiosSinGuardar` compara los dos, y de ahí
salen el aviso al cambiar de rotación y el estado del botón de guardar. Es lo que permite que
una escritura fallida no destruya el trabajo: **el borrador no se toca si el guardado falla**.

### 2.5 SDD + TDD, escenario a escenario

El proceso es parte de la arquitectura aquí, porque explica la forma del código:

```
1. Spec  →  2. Escenarios E1..En  →  3. Congelar  →  4. Test rojo  →  5. Código mínimo
                                                          ↑                    ↓
                                                          └──── 6. Refactor ───┘
                                                                     ↓
                                                              7. Cerrar la spec
```

Reglas duras que dejan huella visible en el repositorio:

- Ningún código de producción sin un test que falle antes, y **el fallo debe ser una aserción,
  nunca un `ReferenceError`** por función inexistente.
- Los tests se nombran en lenguaje de voleibol y llevan el id del escenario:
  `it('E4: falta si el zaguero P1 está por delante de su delantero P2', ...)`.
- Los tests viven junto al fichero que prueban, no en una carpeta paralela.
- Cobertura de `domain/` al 100%. En el resto **no se mide**: perseguir cobertura en la UI
  produce tests que no fallan nunca.
- Un commit por escenario, para que el historial documente el ciclo rojo-verde.

**La trampa que el proceso vigila**: escribir la spec después, mirando el código. El síntoma es
que la sección «Al cerrar» esté siempre vacía.

---

## 3. Decisiones clave y su justificación

### 3.1 Metros, nunca píxeles (ADR 0002)

El modelo habla en metros reales. Los píxeles solo existen dentro del componente que renderiza
el SVG, vía `viewBox`.

**Por qué:** las reglas de voleibol están en metros. Un modelo en píxeles obliga a convertir en
cada regla, ata el dominio al tamaño de pantalla y hace que cambiar el zoom pueda cambiar un
veredicto de legalidad.

### 3.2 SVG en lugar de Canvas o Fabric.js (ADR 0003)

**Por qué:** para seis fichas, una rejilla y unas líneas, SVG gana en todo lo que importa aquí.
`viewBox` da el responsive gratis sin escuchar `resize`; cada elemento está en el DOM
(inspeccionable, estilable con CSS, accesible, testeable con selectores); y el arrastre son unos
manejadores de `pointer` con captura.

Canvas y Fabric.js resuelven un problema que este proyecto no tiene: un lienzo de dibujo libre
con rotaciones, capas y texto editable. **Si algún día el entrenador tiene que dibujar flechas a
mano alzada, se reevalúa.**

Consecuencia directa: **no existe adaptador de renderizado**. El SVG se deriva de los signals,
así que no hay dos estados que sincronizar.

### 3.3 Lo derivado no se almacena (invariantes de `docs/dominio.md` §7)

| Dato | Se deriva de | Función |
|---|---|---|
| Posición rotacional P1..P6 | orden de saque + rotación | `formacionEnRotacion` |
| Quién está en pista | sustituto del líbero + rotación | `jugadoresEnPista` |
| Etiqueta (`C`, `R1`, `C2`, `O`, `L`) | rol + configuración + índice | `etiquetaDe` |
| Vía de ataque | punto del rival | `viaDeAtaque` |
| Zona por defecto 2×2 | el punto del jugador | `bloquePorDefecto` |
| Infracciones y avisos | la formación | `validarFormacion` |

**Por qué:** un dato derivado y almacenado es un dato que puede quedarse viejo. En una
herramienta de enseñanza, un dato viejo no es un bug estético: enseña una regla falsa a un
jugador real.

**Es el invariante que más fácil se rompe al pasar a SQL.** Si aparece en el esquema una columna
de posición rotacional, de etiqueta o de vía calculada desde un punto, sobra.

### 3.4 El índice de rol se declara, no se deriva (ADR 0017, precisada por 0022)

Que un jugador sea `R1` o `C2` es una decisión del entrenador al declarar su plantilla.

**Por qué:** se intentó derivarlo **tres veces** y las tres salió mal. La convención real no sale
de un único recorrido del orden de saque: el entrenador cuenta los receptores hacia delante desde
el colocador, y los centrales hacia atrás. `validarPlantilla` comprueba que los índices
declarados sean coherentes, pero no impone ningún orden de asignación.

Queda escrito para que **no se vuelva a intentar**.

### 3.5 `Rn` se ancla al colocador (ADR 0010, revertida por 0018, restaurada por 0019)

`Rn` significa siempre «el colocador ocupa Pn».

**Por qué:** es la convención del 5-1 que usa el entrenador. La alternativa —«la rotación número
n desde como se escribió el orden de saque»— depende de por dónde empezó a escribir la lista.
Se cambió a la física (0018) y se revirtió (0019) tras usar la pizarra con un equipo real.
**Dos vaivenes en una decisión de vocabulario**: la lección es que el vocabulario se valida
contra el entrenador, no contra la coherencia interna del modelo.

### 3.6 El líbero vive fuera del orden de saque (ADR 0014)

**Por qué:** este es el error más caro del proyecto, y está anotado como tal. `docs/dominio.md`
afirmó durante las specs 002-010 que «el líbero sustituye a un central». De ahí salió un modelo
con el líbero ocupando plaza fija en el orden de saque, que **bloqueaba tres de cada seis
rotaciones con una falta que en un partido real no existe**.

La regla FIVB real (19.3.1.1) es que sustituye a **cualquier** jugador de zaga. Que en el 5-1
sea casi siempre el central es decisión del entrenador, no reglamento.

**Lección general:** antes de escribir una regla de voleibol, comprobar la fuente — sobre todo
si «siempre se hace así» empieza a sonar a costumbre más que a reglamento.

### 3.7 El puerto de persistencia es asíncrono y granular (ADR 0024, spec 031)

```ts
interface SistemaRepository {
  listar(): Promise<readonly Sistema[]>;
  crear(sistema: Sistema): Promise<void>;
  actualizar(sistema: Sistema): Promise<void>;
  borrar(id: string): Promise<void>;
}
```

Antes era **síncrono** y escribía **el catálogo entero de golpe**.

**Por qué granular:** con un `guardar(catalogoEntero)`, cualquier escritura arriesga el trabajo
de sistemas que no tocó. Cada método toca solo lo que cambia.

**Por qué antes de que existiera `server/`:** para que el adaptador HTTP no naciera obligado a
mandar el catálogo completo en cada guardado. Es el ejemplo del proyecto de una abstracción que
se preparó antes de necesitarla y acertó.

### 3.8 La escritura va antes de mutar el estado local (ADR 0026, spec 034)

Los ocho métodos de escritura del store pasan por un helper común, `ejecutarEscritura`: espera a
que el repositorio termine y **solo entonces** muta los signals. Si falla, no toca ningún estado
y publica `errorGuardado: { mensaje, reintentar }`.

**Por qué:** con `localStorage` (que nunca fallaba) mutar antes era inofensivo. Con un adaptador
HTTP real habría dejado ver un cambio como guardado justo antes de perderlo.

**No es UI optimista, y es a propósito.** El coste —un instante de espera— es menor que el de
mentirle a un entrenador sobre si su trabajo está guardado.

### 3.9 Concurrencia por `If-Match`, no por columna de versión

`sistema.actualizado_en` hace de testigo. El `PUT` exige la cabecera `If-Match`; si caducó, el
servidor responde `409` y el adaptador lo traduce a `ConflictoDeEdicion`.

**Por qué:** con un `WHERE id = $1 AND actualizado_en = $2`, la escritura tardía **falla en vez
de ganar**. No hace falta columna de versión, y el testigo vive en el adaptador (un `Map` en
memoria por id), no en el tipo de dominio — que sigue sin fechas (ADR 0012).

### 3.10 El servidor importa el dominio directamente (ADR 0025)

`server/` importa `src/app/domain/` con rutas relativas. Nunca al revés, y nunca de las otras
tres capas.

**Por qué:** es el rédito del invariante 2. Sin API interna, sin paquete compartido, sin
duplicar reglas. El dominio no sabe que existe un servidor.

**Coste de romperlo:** si alguien mete un `import` de Angular en `domain/`, ahora rompe dos
consumidores, no uno.

### 3.11 Los `CHECK` van a mano en el SQL de la migración

**Por qué:** Prisma no expresa `CHECK` ni `UNIQUE NULLS NOT DISTINCT` en su lenguaje de esquema.
Y aquí no es un detalle menor: **casi todos los invariantes de voleibol del modelo son
`CHECK`s.** Si se generan las migraciones sin revisarlas, el esquema queda sin la mitad de sus
garantías.

Flujo obligatorio: `prisma migrate dev --create-only`, editar el `.sql`, y **después** aplicar.

### 3.12 La falta de posición NO es una restricción de base de datos

Podría parecer el candado ideal, y sería un error.

**Por qué:** la spec 017 permite desactivar la validación para enseñar una excepción, y la 026
contempla guardar a propósito una versión «con falta» para enseñar el error. **Un sistema con
formaciones ilegales es un dato legítimo.** Un `CHECK` se llevaría por delante un caso de uso
didáctico.

La regla general que sale de aquí: **la base de datos rechaza lo imposible (una rotación 7, una
celda 400); la aplicación decide lo discutible.**

### 3.13 Una sola abstracción especulativa permitida

`SistemaRepository`. **La apuesta se cobró**: el segundo adaptador (HTTP) existe y es hoy el que
está en producción. Y poder testear sin `localStorage` tuvo valor desde el primer día.

Fuera de esa, **no se crean interfaces con una sola implementación «por si acaso»**. La deuda de
este proyecto no es técnica, es de andamiaje.

### 3.14 Castellano en el dominio

`colocador`, `rotacion`, `formacion`, `libero`, `ordenSaque`, `etiqueta`. La infraestructura y
las APIs del framework van en lo que use el framework.

**Por qué:** es el vocabulario del entrenador, y evita traducciones que se mezclan con facilidad
(`setter` / `colocador` / `passer`). Los identificadores de rol son estables y en minúscula; los
nombres visibles y las abreviaturas son configuración y pueden cambiar sin romper nada.

---

## 4. Registro completo de decisiones

| # | Decisión | Estado |
|---|---|---|
| 0001 | Sin backend en la v1 | Sustituida por 0023 |
| 0002 | Coordenadas en metros, origen en la esquina | Aceptada |
| 0003 | SVG en lugar de Canvas y Fabric.js | Aceptada |
| 0004 | Zonas de responsabilidad como rejilla de 0,5 m | Aceptada |
| 0005 | El orden de saque se define una vez; las rotaciones se derivan | Precisada por 0010 |
| 0006 | Roles configurables, etiqueta derivada | Sustituida por 0009 |
| 0007 | `validarFormacion` devuelve infracciones y avisos por separado | Aceptada |
| 0008 | `plantilla.ts` aparte de `roles.ts` | Aceptada |
| 0009 | El central usa `C`; la colisión se compara por etiqueta, no por letra | Aceptada |
| 0010 | `Rn` anclada al colocador | Aceptada (vigente tras 0018/0019) |
| 0011 | `crearSistema` vive en `catalogo-sistemas.ts` | Aceptada |
| 0012 | `creadoEn`/`actualizadoEn` viven en el repositorio, no en `Sistema` | Aceptada |
| 0013 | La plantilla global vive en `domain/`; el store se cablea con `useFactory` | Aceptada |
| 0014 | El líbero vive fuera del orden de saque; entra y sale según la rotación | Aceptada |
| 0015 | El sustituto del líbero se declara por rotación | Parcialmente sustituida por 0017 |
| 0016 | Un `Modal` genérico sustituye a los diálogos paralelos | Aceptada |
| 0017 | El índice de rol se declara, no se deriva | Precisada por 0022 |
| 0018 | `Rn` es la rotación física número n | **Revertida por 0019** |
| 0019 | Se revierte la 0018: `Rn` sí es «el colocador ocupa Pn» | Aceptada |
| 0020 | La vía de ataque se persiste como valor derivado, no como posición del rival | Aceptada |
| 0021 | El sistema por defecto se siembra, no se guarda como dato fijo | Aceptada |
| 0022 | El id de un central coincide con su etiqueta: `central1` es `C1` | Aceptada |
| 0023 | Se cierra la v1: entran backend, base de datos y cuentas | Precisada por 0028 |
| 0024 | El puerto de persistencia es asíncrono y granular | Aceptada |
| 0025 | El servidor importa `src/app/domain/` directamente | Aceptada |
| 0026 | El store escribe en el repositorio antes de mutar sus signals | Aceptada |
| 0027 | Cerrar una spec también actualiza `arquitectura.md` y `README.md` si tocó la estructura | Aceptada |
| 0028 | Se aplaza la autenticación; el siguiente paso es huecos y conflictos | Aceptada |

**El registro es append-only.** Una decisión existente no se edita: si cambia, se añade una nueva
que la sustituye y se marca la anterior como *Sustituida por NNNN*. Lo importante de cada
fichero es el **porqué**, que es lo único que no se puede deducir leyendo el código dentro de
seis meses.

---

## 5. Invariantes que no se negocian

Copiados de `CLAUDE.md`, porque son el contrato de fondo:

1. **Nunca píxeles en el modelo.** Las posiciones son metros.
2. **`domain/` no importa nada externo.**
3. **Ningún código de producción antes de un test que falle** — y el fallo debe ser una
   aserción, no un error de referencia.
4. **La posición rotacional se deriva, nunca se almacena.**
5. **La etiqueta de un jugador se deriva, nunca se almacena.**
6. **Huecos y conflictos se derivan, nunca se almacenan.**
7. **Sin Fabric.js, sin Canvas, sin librerías de gráficos.**
8. **`server/` solo importa de `src/app/domain/`.** Nunca al revés.
