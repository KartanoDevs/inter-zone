# InterZone

Pizarra táctica para diseñar, validar y estudiar sistemas de recepción de voleibol.

El nombre viene de lo que la herramienta hace de verdad: mirar **entre** las zonas. Lo
interesante de una recepción no está donde se coloca cada jugador, sino en las costuras
que quedan entre ellos.

El objetivo no es dibujar bonito: es que un jugador entienda **por qué** se coloca donde se
coloca, y que el entrenador vea al instante si una formación es **legal** y si deja **huecos**
sin cubrir.

## Qué hace hoy

- Arrancar con dos sistemas de ejemplo ya construidos: la recepción a 3 en 5-1 (seis rotaciones
  colocadas y explicadas) y la defensa especializada por zonas (una formación por cada caso del
  colocador rival y situación de ataque con material de referencia, con su zona de
  responsabilidad pintada). Los siembra el servidor (`npm run seed` en `server/`) si la base de
  datos está vacía.
- Crear, renombrar, clonar y borrar varios sistemas con nombre —de recepción o de defensa—, cada
  uno de un equipo (masculino o femenino), y elegir con cuál se trabaja.
- Colocar los 6 jugadores en media pista, en metros reales, rotación a rotación (R1–R6,
  numeradas por dónde está el colocador).
- El líbero sustituye a cualquier jugador de zaga (no solo al central) y entra y sale de la
  formación según le toque, como en un partido real.
- Bloquear el guardado de una rotación que cometa falta de posición — o permitirlo a propósito,
  desactivando la validación para enseñar una excepción (spec 017).
- Crear sistemas de defensa: colocar seis puestos genéricos según el caso del colocador rival
  (delantero o trasero) y la situación de ataque que le corresponde a ese caso, sin validación
  de posición — en defensa la rotación no manda nada.
- Escribir por qué se coloca así una rotación, un jugador dentro de ella, o el sistema entero
  — enseñanza, no solo geometría.
- Pintar sobre una rejilla la zona de responsabilidad de cada uno de los seis defensores, y
  verlas todas a la vez con su leyenda de colores. Solo en los sistemas de defensa (spec 024).
- Guardar en un servidor propio (PostgreSQL). Los ajustes de pantalla (validación desactivada,
  ayuda de posición…) siguen en el navegador, por dispositivo.
- Darse de alta con correo y contraseña si el admin invitó ese correo de antemano (lista
  blanca), que fija el rol con el que nace la cuenta —`admin`, `entrenador` o `usuario`— y, para
  `entrenador`/`usuario`, en qué equipo o equipos. Entrar abre una sesión de 30 días que se
  renueva sola con el uso; salir la invalida al instante (spec 035, ADR 0036).
- La pizarra misma pide entrar (spec 050): sin sesión, solo se ve la pantalla de entrar o crear
  cuenta, y no se pide el catálogo.
- Validar un sistema (spec 051): el entrenador del equipo dueño, o el admin, lo marca como listo
  para que un jugador lo estudie — y puede quitarle la marca si hace falta corregirlo.
- Teoría (spec 052): cualquier cuenta puede abrir esta pestaña y recorrer los sistemas
  validados del equipo activo — rotación a rotación en recepción, por caso/situación/
  bloqueadores en defensa — viendo fichas, zonas, sombra y explicaciones exactamente como en el
  editor, sin poder tocar nada. Un equipo sin nada validado todavía lo dice, en vez de una pista
  vacía.
- Solo `admin` y `entrenador` crean, editan, clonan o borran sistemas (spec 037): un
  entrenador, en los suyos; el admin, en cualquiera. Un `usuario` no ve la pestaña Editor y
  entra directo en Teoría. `GET /sistemas` sigue sin filtrar por rol — ver "Qué NO hace".
- La ventana "Cuenta" es real (spec 053): correo y rol de solo lectura, más nombre o apodo,
  posición favorita y dorsal —los tres opcionales, y en blanco es un estado válido— y cambiar
  la contraseña, exigiendo acertar la actual.
- El admin gestiona la lista blanca desde la propia aplicación (spec 054): invitar un correo con
  un rol y, si no es `admin`, un equipo; reinvitar un correo ya invitado y sin usar cambia su rol
  en vez de duplicar la fila; invitar un correo que ya tiene cuenta se rechaza; retirar una
  invitación pendiente la borra sin tocar cuentas ya creadas a partir de ella. Solo `admin` ve
  esta pestaña.

## Qué NO hace

**Ya hecho, de la v2:** backend propio (Express + PostgreSQL vía Prisma, en `server/`), sistemas
separados por equipo masculino y femenino, la pizarra hablando con el servidor en vez de con
`localStorage`, y cuentas con lista blanca, contraseña y sesión (spec 035, ADR 0036 — sustituye
a la 0028). La condición que la v1 puso para el backend —que el equipo pidiera editar desde
varios dispositivos— se cumplió; la decisión está en
`docs/decisiones/0023-cierra-la-v1-entra-el-backend.md`.

**Con las cuentas ya construidas, la puerta de escritura ya está cerrada (spec 037): sigue
abierta la de lectura.** Crear, editar, clonar, borrar y validar exigen sesión y rol
(`admin`/`entrenador` sí, `usuario` no). `GET /sistemas`, en cambio, sigue sin exigir sesión ni
filtrar por rol — cualquiera puede seguir leyendo el catálogo entero, borradores incluidos, sin
entrar. Filtrar la lectura por rol (qué ve un `usuario` frente a un `entrenador`) no tiene spec
asignada todavía; hasta entonces, sigue sin ser buena idea exponer el servidor a una red que no
sea de confianza.

**Aplazado, sin construir:** login con Google. Sigue reservado, sin spec asignada.

**Reservado en la hoja de ruta, sin escribir todavía.** Los huecos 014–016 en la numeración de
specs siguen guardados para esto, y hasta que no se escriban no existe ni la spec ni el código:

- Detectar huecos (nadie cubre) y conflictos (dos o más se pisan) sobre la rejilla ya pintada
  (specs 014–015) — **el siguiente paso**, ver el paso 5 de la hoja de ruta.
- Exportar e importar JSON y PNG (spec 016).
- Definir varias plantillas de equipo desde la aplicación. Las reglas ya están en `domain/`
  (`plantillas-equipo.ts`), pero hoy todos los sistemas usan la misma plantilla fija:
  `PLANTILLA_GLOBAL`, una constante de la aplicación (ADR 0013).

**Fuera a propósito, también en la v2:** PWA offline y sincronización sin conexión. `localStorage`
no se queda como modo desconectado para los sistemas; se sustituyó por el servidor. Sí se queda,
a propósito, como almacén de los ajustes de pantalla: son preferencias por dispositivo, no
trabajo de un entrenador que perder.

## Stack

- Angular 22, standalone, signals, zoneless.
- SVG nativo para el render (no Canvas, no Fabric.js).
- TypeScript estricto.
- Vitest para los tests.
- Persistencia de los sistemas en PostgreSQL con Prisma, tras un backend de Node y Express en
  `server/`, hablado por HTTP desde un puerto asíncrono y granular (`domain/` declara el
  contrato; ni Angular ni Express se enteran de cómo lo cumple el otro lado). Los ajustes de
  pantalla siguen en `localStorage`, detrás del mismo tipo de puerto.

## Arranque

Requiere Node 22.22.3 o superior. La pizarra pide el catálogo al arrancar (`provideAppInitializer`
en `app.config.ts`), así que **hace falta el backend levantado** para ver algo más que una
pantalla vacía — no basta con `npm install && npm start` en la raíz.

```bash
npm install
npm test          # dominio, infraestructura y aplicación; deben pasar siempre
```

Backend, en otra terminal — requiere además Docker (instrucciones completas y la lista de rutas
en `server/README.md`, no se duplican aquí):

```bash
cd server
npm install
cp .env.example .env
npm run db:up               # PostgreSQL en Docker
npx prisma migrate deploy
npm run seed                 # equipo + jugador + los dos sistemas de ejemplo
npm run dev                  # http://localhost:3000
```

Con el backend arriba, `npm start` en la raíz sirve la pizarra en `http://localhost:4200`.

## Documentación

| Fichero | Para qué |
|---|---|
| `docs/dominio.md` | Las reglas del voleibol y el vocabulario del proyecto. La fuente de verdad. |
| `docs/arquitectura.md` | Capas, dependencias permitidas, estructura de carpetas — incluye `server/`. |
| `docs/modelo-de-datos.md` | El esquema de PostgreSQL: qué tablas existen y cuáles quedan por construir. |
| `docs/flujo-de-trabajo.md` | Cómo se trabaja aquí: ciclo SDD + TDD. |
| `docs/decisiones/` | Registro de decisiones tomadas y su motivo, una por fichero. Solo se añade. |
| `docs/especificaciones/` | Una spec por porción de trabajo. Se cierran al terminarse. |
| `server/README.md` | Arranque del backend, rutas de la API, estructura de `server/`. |
| `CLAUDE.md` | Contexto e invariantes para asistentes de IA. |

## Hoja de ruta

Cada paso es usable en un entrenamiento por sí solo. Ese es el criterio de corte.

1. **Dominio puro con tests.** Roles y etiquetas, rotación anclada al colocador (R1–R6),
   validación posicional, plantillas de equipo. Sin UI. Specs 001–004.
2. **Sistema de recepción.** Crear un sistema con nombre, ligado a una plantilla, y guardar
   una formación legal por rotación — bloqueando el guardado si comete falta. Spec 005.
3. **Catálogo de sistemas, enseñanza, persistencia, pizarra interactiva y líbero por
   rotación.** Crear, renombrar y borrar varios sistemas; explicaciones de enseñanza por
   rotación y por jugador; guardado en el navegador con un esquema pensado para migrar a
   PostgreSQL + Prisma (migración ya hecha, ver el paso 8); la pista SVG con arrastre,
   validación en vivo, navegación R1–R6 y selección de jugador; y el líbero sustituyendo a
   cualquier jugador de zaga, entrando y saliendo según la rotación (FIVB 19.3.1.1). Primer
   punto en que la herramienta enseña algo tocándola. Specs 006–011.
4. **Consulta y examen.** Ver un sistema guardado en solo lectura, y examinarse: colocar los
   jugadores y recibir una nota de perfección más el veredicto de legalidad. La consulta en solo
   lectura se hizo como "Teoría" (spec 052, ligada a cuentas y roles — ver paso 8): cualquier
   cuenta recorre los sistemas validados del equipo, sin poder tocarlos. Las reglas de
   examinarse con nota ya están en `domain/` — los tres tipos de examen (por puesto, por línea o
   por sistema completo), el veredicto de legalidad y la nota de 0 a 10 (specs 012–013) — pero
   todavía no hay ventana de examen: falta la spec de UI que arrastre las fichas, guarde el
   intento y muestre la insignia en Cuenta.
5. **Rejilla pintable, huecos y conflictos.** La rejilla ya se pinta y se guarda (specs 022, 024 y
   028), y desde la spec 024 las zonas son de los seis defensores, no solo de los receptores.
   Falta el análisis derivado: qué superficie no cubre nadie y cuál cubren dos o más. Specs
   014–015 — **el siguiente paso** (ADR 0028).
6. **Exportar e importar JSON y PNG.** Compartir un sistema sin depender del servidor. Spec 016.
7. **Sistemas de defensa.** Un sistema de tipo defensa, organizado por el caso del colocador
   rival (delantero o trasero) y por la situación de ataque que le corresponde a ese caso — la
   rotación no manda nada en defensa, solo cambia quién ocupa cada puesto, nunca la tarea. Se
   marca la situación soltando la ficha "A" del atacante en el campo rival, junto a la ficha "C"
   del colocador; se colocan seis puestos genéricos (no jugadores concretos) y se guarda sin
   validación de posición — en defensa esa regla no existe. Cada situación admite variantes según
   cuántos jugadores llegan al bloqueo (0 a 3), con quién bloquea derivado de la posición de los
   puestos delanteros; y se ve, calculada y retocable a mano, la sombra que ese bloqueo le
   proyecta al atacante sobre el campo propio. Specs 021, 038, 039 y 040 (038 sustituye la
   rotación y la vía de ataque de la 021 por caso y situación). La rejilla pintable del paso 5 se
   generaliza para activarse también aquí: pintar la zona de cada puesto y verlas todas a la vez
   son las specs 022–023.
8. **Backend, cuentas y equipos (v2).** Los sistemas dejan de vivir en un navegador y pasan a una
   base de datos, para poder editarlos desde varios dispositivos y para que los jugadores puedan
   estudiarlos. **Hecho:** el puerto de persistencia se volvió asíncrono y granular (spec 031);
   cada sistema pasa a ser del equipo masculino o del femenino (spec 032); nació `server/` con
   PostgreSQL y su API (spec 033); la pizarra habla con él (spec 034); la autenticación,
   aplazada por la ADR 0028, se retoma con la ADR 0036 — lista blanca, alta con contraseña y
   sesión (spec 035); la propia pizarra pide entrar antes de mostrar nada (spec 050); un
   entrenador o el admin pueden validar un sistema (spec 051, ADR 0038); "Teoría" deja
   consultar en solo lectura los sistemas validados (spec 052, ADR 0039); los tres roles
   deciden quién edita — crear, editar, clonar y borrar exigen sesión y rol; un `usuario` no ve
   el editor (spec 037); la ventana "Cuenta" guarda el perfil y cambia la contraseña
   (spec 053); y el admin gestiona la lista blanca —invitar, reinvitar con otro rol, retirar—
   desde la propia aplicación (spec 054). **Sin hacer todavía:** login con Google, sin spec
   asignada; y que el rol también decida qué se **lee** (hoy `GET /sistemas` sigue abierto a
   cualquiera, borradores incluidos), sin spec asignada.

Cada paso tiene su spec en `docs/especificaciones/`; el orden exacto de implementación y los
escenarios de cada una viven ahí, no aquí.

**Spec 017** no encaja en ningún paso de arriba: corrige y amplía el líbero por rotación y la
validación del paso 3 tras usar la pizarra en la práctica (el líbero pasa de sustituir siempre al
mismo titular a declararse rotación a rotación, y se puede desactivar la validación al enseñar
una excepción). Se numera después de las specs ya reservadas (012–016) para no reordenarlas.

**Specs 018–020** tampoco encajan en ningún paso: corrigen, en dos vaivenes, la numeración de
las rotaciones tras usar la pizarra con un equipo real — ver `docs/decisiones/0018-…md` y
`0019-…md`. No añaden funcionalidad nueva, solo corrigen una regla mal aplicada.
