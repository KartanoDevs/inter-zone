# 01 — Finalidad y alcance

> Documento de lectura, no normativo. La fuente de verdad sigue siendo `docs/dominio.md`
> (reglas de voleibol), `docs/arquitectura.md` (capas) y `docs/decisiones/` (ADRs).
> Aquí se resume **qué es InterZone, para quién y hasta dónde llega hoy**.

---

## 1. Visión del producto

**InterZone es una pizarra táctica de voleibol que valida y explica, no solo dibuja.**

El nombre lo dice: lo interesante de una recepción no está donde se coloca cada jugador, sino
en las **costuras que quedan entre ellos**. Mirar *entre* las zonas.

### El problema que resuelve

Un entrenador de 5-1 se enfrenta a tres problemas que las herramientas genéricas (pizarra de
vestuario, PowerPoint, apps de dibujo) no resuelven:

| Problema | Cómo lo resuelve InterZone |
|---|---|
| **La falta de posición es contraintuitiva.** Depende de la posición rotacional (P1..P6), que cambia cada rotación, no de dónde "parece" que está el jugador. | Valida en vivo las tres reglas de orden relativo (`docs/dominio.md` §5) y **bloquea el guardado** de una rotación ilegal. |
| **El jugador memoriza posiciones, no entiende el porqué.** Seis dibujos sueltos no enseñan la lógica que los une. | Cada sistema, cada rotación y cada jugador dentro de ella pueden llevar su **texto de enseñanza**. La geometría viene acompañada del motivo. |
| **Los huecos de cobertura son invisibles en un dibujo.** Seis puntos sobre una pista no dicen qué trozo de campo no cubre nadie. | Zonas de responsabilidad pintadas sobre una **rejilla de celdas de 0,5 m**, con colores por jugador y patrón de franjas donde dos se solapan. |

### La regla que gobierna el diseño

**Todo lo que se puede derivar, se deriva; nunca se almacena.** La posición rotacional, la
etiqueta de una ficha, quién está en pista, la vía de ataque, la zona por defecto, las
infracciones. Esto no es elegancia: es lo que impide que la herramienta enseñe algo falso
porque un dato guardado se quedó viejo.

### El criterio de corte de cada entrega

Cada paso de la hoja de ruta tiene que ser **usable en un entrenamiento por sí solo**. No se
construye media funcionalidad esperando a la siguiente.

---

## 2. Usuarios y roles

### Hoy (v2 en construcción, autenticación aplazada — ADR 0028)

**No hay concepto de usuario.** La API de `server/` no tiene autenticación y la pizarra no
pide credenciales. Quien abre `http://localhost:4200` puede verlo y editarlo todo. Es una
herramienta de un entrenador en su portátil, con el backend levantado al lado.

Lo que sí existe ya es la separación por **equipo**: cada sistema pertenece al equipo
masculino o al femenino (spec 032), y el catálogo se filtra por el equipo activo.

### Diseñado, aplazado (ADR 0028)

Tres roles de acceso, definidos en `docs/modelo-de-datos.md` §4. **No están implementados**: las
tablas `usuario`, `lista_blanca` y `membresia` no existen. Desde la ADR 0028 tampoco tienen spec
asignada — el diseño sigue vivo, pero se retoma cuando alguien pida entrar desde fuera o antes de
exponer el servidor a internet.

| | Admin | Entrenador | Usuario (jugador) |
|---|---|---|---|
| Ver sistemas validados | todos | de sus equipos | de sus equipos |
| Ver borradores | sí | de sus equipos | **no** |
| Crear, editar, clonar, borrar | sí | de sus equipos | no |
| Validar un sistema | sí | de sus equipos | no |
| Gestionar lista blanca, usuarios y equipos | sí | no | no |
| Examinarse *(futuro)* | sí | sí | sí |

Dos decisiones de acceso que conviene tener presentes:

- **No hay registro abierto.** La `lista_blanca` es la única puerta: si el correo no está en
  ella, no se crea usuario, ni por Google ni por contraseña.
- **Los permisos son por equipo, no por sistema.** Lo que alguien puede hacer sobre un sistema
  sale de su rol en el equipo dueño de ese sistema. No hay permisos sistema a sistema, que
  obligarían a mantener una fila por cada par (persona, sistema).

---

## 3. Core features — lo que funciona hoy

### 3.1 Catálogo de sistemas

- Dos **equipos** fijos: masculino y femenino. Pestañas para cambiar de uno a otro.
- Dos **tipos** de sistema: `recepcion` y `defensa`.
- **Crear** un sistema con nombre, tipo y equipo. El nombre es único dentro de
  `(equipo, tipo)`: masculino y femenino pueden tener cada uno su «5-1».
- **Renombrar**, **clonar** (duplica el sistema entero bajo un id y un nombre nuevos, sugiriendo
  «‹Original› (copia)») y **borrar**, con diálogo de confirmación.
- **Aviso de cambios sin guardar** al cambiar de rotación, de vía, de sistema o de equipo.

### 3.2 La pizarra

- **Media pista en SVG**, `viewBox` en metros reales. Origen en la esquina red/lateral
  izquierda; `x` hacia la derecha, `y` hacia el fondo. Nunca píxeles en el modelo.
- **Seis fichas arrastrables** con captura de puntero sobre el `<svg>`.
- **Banquillo** (`PaletaJugadores`) con los jugadores todavía sin colocar.
- **Navegación R1–R6**, donde `Rn` significa *«el colocador ocupa Pn»* — no «la rotación número
  n desde el orden de saque». Es la convención del 5-1 y costó dos vaivenes fijarla
  (ADR 0018 → 0019).
- **Selección de jugador** por toque, con toggle; al soltar un arrastre, la ficha queda enfocada.
- **Ayuda de posición rotacional** (P1..P6) bajo cada ficha, desactivable.

### 3.3 Validación de falta posicional (solo recepción)

- Las tres reglas de orden relativo, evaluadas sobre las posiciones **derivadas** de la rotación:
  zaguero detrás de su delantero, orden lateral de la delantera, orden lateral de la zaga.
- **Tres estados, no dos**, con un margen `ε = 0,05 m`: `valida`, `al_limite`, `falta`.
  «Legal por tres centímetros» es información pedagógica, no un aprobado silencioso.
- **Guardar queda bloqueado** si hay infracción.
- **La validación se puede desactivar** a propósito (spec 017), para enseñar una excepción o
  guardar deliberadamente una formación con falta y explicar por qué está mal.
- **En defensa la validación no existe.** No es un ajuste apagado: la falta posicional solo
  tiene sentido en el instante del saque, no defendiendo un ataque ya en juego.

### 3.4 Líbero

- El líbero vive **fuera del orden de saque** (ADR 0014). Es un séptimo hueco, no el sexto.
- Sustituye a **cualquier titular de zaga**, no solo al central — regla FIVB 19.3.1.1. Que en
  el 5-1 casi siempre sea el central es decisión del entrenador, no reglamento.
- **A quién sustituye se declara rotación a rotación** (spec 017), y puede ser nadie (`null`)
  en las rotaciones en las que no entra.
- Como el sustituido cambia de línea al rotar, el líbero **entra y sale solo**. De ahí que
  nunca pueda ocupar P2, P3 ni P4: no es una regla aparte, es consecuencia de cuándo entra.

### 3.5 Sistemas de defensa

- Organizados por **rotación × vía de ataque del rival**: `z4`, `z3`, `z2`, `pipe`. Hasta 24
  formaciones por sistema.
- La vía se marca **soltando una ficha rival** en su campo (`y < 0`) y se **deriva** del punto,
  con el espejo de zonas ya resuelto (la zona 4 del rival cae a nuestra derecha). Solo se
  persiste la vía resuelta, nunca la posición del rival (ADR 0020).
- Mismo roster que en recepción, líbero incluido. Sin validación de posición.

### 3.6 Zonas de responsabilidad

- Rejilla de **celdas cuadradas de 0,5 m** sobre el campo propio de 9×9 m — 18×18 = 324 celdas.
  Ni círculos con radio ajustable, ni polígonos (ADR 0004).
- **Solo en defensa** (spec 024). Cualquiera de los seis puede tener zona, no solo quien recibe.
- **Zona por defecto**: un jugador sin celdas pintadas muestra el bloque de 2×2 celdas más
  cercano a su punto, recortado si está pegado a una línea. Se deriva, sigue a la ficha — y
  deja de recalcularse en cuanto se pinta o borra una celda a mano.
- **Pintado por arrastre**, con relleno por contorno: si el trazo se cierra, se rellena el
  interior (flood fill puro, sin librerías).
- **Todas las zonas visibles a la vez**, paleta fija de 7 colores; la del jugador seleccionado
  a plena intensidad y las demás atenuadas. Las celdas compartidas se pintan con un patrón SVG
  de franjas diagonales, uno por combinación de colores.

### 3.7 Enseñanza

Tres niveles de texto, todos voluntarios:

1. **Descripción del sistema** — independiente de cualquier rotación.
2. **Explicación de rotación** — el porqué de conjunto de esa R.
3. **Explicación de jugador** — por qué *ese* jugador se coloca ahí *en esa* rotación.

El panel muestra la del jugador seleccionado, o la de la rotación si no hay ninguno.

### 3.8 Persistencia y errores

- Los sistemas viven en **PostgreSQL**, tras el backend de `server/`. Ya no en el navegador.
- **La escritura va siempre antes que el cambio local** (ADR 0026): el store espera la
  respuesta del repositorio y solo entonces muta sus signals. Nada de UI optimista — con un
  servidor real, mutar antes dejaría ver como guardado algo que se acaba de perder.
- Tres motivos de fallo distinguidos, cada uno con su aviso y su botón de reintentar:
  **sin conexión**, **error del servidor** y **conflicto de edición** (alguien más guardó ese
  sistema mientras tanto, detectado con `If-Match`).
- Los **ajustes de pantalla** (validación desactivada, ayuda de posición, orden cronológico de
  las pestañas, números de metros) siguen en `localStorage`, por dispositivo. Es deliberado:
  son preferencias, no trabajo de un entrenador que perder.

### 3.9 Datos de arranque

`npm run seed` en `server/` siembra los dos equipos, el catálogo fijo de siete jugadores, y
**dos sistemas de ejemplo completos** del equipo masculino: la recepción a 3 en 5-1 (6
rotaciones) y el sistema defensivo (24 formaciones, con sus zonas). Entre los dos, 30
formaciones y 180 colocaciones. El equipo femenino arranca vacío a propósito: no hay guía de
referencia de la que sembrarlo.

Desde la spec 033 **la siembra ya no es automática**: si la base de datos está vacía hay que
sembrarla explícitamente. En la v1, `localStorage` la reponía sola al no encontrar nada.

---

## 4. Qué NO hace (y por qué)

### Aplazado con el diseño hecho (ADR 0028)

| Función | Estado |
|---|---|
| Login con Google y con contraseña, lista blanca | Eran las specs 035-036. **Aplazadas.** El esquema sigue intacto en `docs/modelo-de-datos.md` §4. |
| Tres roles de acceso | Era la spec 037. **Aplazada.** |
| **Cómo se guarda una sesión** (cookie firmada, JWT, tabla de tokens) | **Sin diseñar.** Era requisito previo de la 035; se decide cuando esa spec vuelva. |

**Consecuencia que no hay que perder de vista:** el servidor queda abierto, sin autenticación.
Aceptable en local, **inaceptable en una máquina expuesta a internet** — y ese es hoy el
disparador que devolvería la 035 al camino corto.

### Reservado en la hoja de ruta, sin código todavía

No existen ni la spec ni la implementación. Los huecos en la numeración de specs (012–016) están
reservados para ellos. *(Hasta hoy el `README.md` los listaba bajo «Qué hace (v1)» como si
estuvieran hechos; se corrigió al tomar la decisión de la ADR 0028.)*

| Función | Spec reservada | Estado real |
|---|---|---|
| Cálculo de **huecos y conflictos** derivados de las zonas | 014–015 | **El siguiente paso** (ADR 0028). Sin escribir todavía: `domain/cobertura.ts` no existe, hoy la rejilla se pinta y se guarda, no se analiza. |
| Consulta en solo lectura y **modo examen** con nota de perfección | 012–013 | Sin escribir. |
| **Exportar/importar** JSON y PNG | 016 | Sin escribir. No hay exportadores en `infrastructure/`. |

Dos requisitos ya anotados para cuando se escriban:

- **014-015:** hay que decidir si la *zona por defecto* (el bloque 2×2 derivado del punto de un
  jugador que nunca pintó) cuenta como cobertura al buscar huecos, o si solo cuentan las celdas
  pintadas a mano. Cambia el resultado en el caso más común. Y el análisis nace acotado a
  defensa, que es donde existen las zonas desde la spec 024.
- **012-013:** en consulta y examen el alumno **no ve las faltas hasta que pulsa «Confirmar»**.
  Enseñárselas mientras arrastra convierte el ejercicio en calentar-y-enfriar y deja de medir si
  entendió la regla.

### Fuera a propósito

- **PWA offline y sincronización sin conexión.** `localStorage` no se queda como modo
  desconectado para los sistemas: se sustituyó por el servidor.
- **Un modelo de jugador más fino que un punto.** La regla real habla del pie más adelantado;
  un punto por jugador basta para el propósito didáctico y evita un modelo mucho más
  complicado sin ganancia pedagógica.
- **Canvas, Fabric.js o cualquier librería de gráficos.** SVG nativo desde signals (ADR 0003).
- **Jugadores con nombre y apellidos.** Las siete filas de `jugador` son *huecos del sistema*
  («el colocador», «el central contiguo a él», «el líbero»), no personas. Cuando lleguen las
  personas, irán en una tabla aparte y **sin rol fijo**: a este nivel la misma persona juega de
  receptora un día y de central al siguiente.

---

## 5. Estado de un vistazo

| | |
|---|---|
| Specs completadas | 001–011, 017–034 (las 012–016 están reservadas, sin escribir) |
| Siguiente paso | Specs 014–015: huecos y conflictos (ADR 0028) |
| ADRs registradas | 28 |
| Tests | 156 de dominio · 81 de aplicación · 40 de infraestructura · 12 de integración del servidor |
| Tablas construidas | 6 de 9 |
| Adaptador de persistencia en uso | `HttpSistemaRepository` (spec 034) |
| Autenticación | ninguna, y aplazada (ADR 0028) |
