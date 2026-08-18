# InterZone

Pizarra táctica para diseñar, validar y estudiar sistemas de recepción de voleibol.

El nombre viene de lo que la herramienta hace de verdad: mirar **entre** las zonas. Lo
interesante de una recepción no está donde se coloca cada jugador, sino en las costuras
que quedan entre ellos.

El objetivo no es dibujar bonito: es que un jugador entienda **por qué** se coloca donde se
coloca, y que el entrenador vea al instante si una formación es **legal** y si deja **huecos**
sin cubrir.

## Qué hace (v1)

- Arrancar con dos sistemas de ejemplo ya construidos si el navegador no tiene nada guardado: la
  recepción a 3 en 5-1 (seis rotaciones colocadas y explicadas) y la defensa especializada por
  zonas (veinticuatro formaciones, con su zona de responsabilidad pintada).
- Definir varias plantillas de equipo, cada una con sus roles y su orden de saque.
- Crear, renombrar, clonar y borrar varios sistemas de recepción con nombre, cada uno ligado a
  una plantilla, y elegir con cuál se trabaja.
- Colocar los 6 jugadores en media pista, en metros reales, rotación a rotación (R1–R6,
  numeradas por dónde está el colocador).
- El líbero sustituye a cualquier jugador de zaga (no solo al central) y entra y sale de la
  formación según le toque, como en un partido real.
- Bloquear el guardado de una rotación que cometa falta de posición.
- Crear sistemas de defensa: colocar a los seis defensores por rotación y por vía de ataque
  del rival (zona 4, zona 3, zona 2, pipe), sin validación de posición.
- Escribir por qué se coloca así una rotación, un jugador dentro de ella, o el sistema entero
  — enseñanza, no solo geometría.
- Pintar sobre una rejilla la zona de responsabilidad de cada receptor.
- Detectar huecos (nadie cubre) y conflictos (dos o más se pisan).
- Consultar un sistema guardado, rotación a rotación, en solo lectura.
- Examinarse: colocar los jugadores y recibir una nota de perfección frente al sistema
  guardado, además del veredicto de legalidad.
- Guardar en el navegador; exportar e importar JSON y PNG.

## Qué NO hace

**Todavía no, pero está decidido y en marcha: la v2.** Backend, base de datos, login con Google o
contraseña, lista blanca de correos, tres roles de acceso, y sistemas separados por equipo
masculino y femenino. La condición que la v1 puso para construirlo —que el equipo pidiera editar
desde varios dispositivos— se cumplió. El esquema está en `docs/modelo-de-datos.md` y la decisión
en `docs/decisiones/0023-cierra-la-v1-entra-el-backend.md`. Mientras tanto, lo que guarda de verdad
sigue siendo el navegador.

**Fuera a propósito, también en la v2:** PWA offline y sincronización sin conexión. `localStorage`
no se queda como modo desconectado; se sustituye.

## Stack

- Angular 22, standalone, signals, zoneless.
- SVG nativo para el render (no Canvas, no Fabric.js).
- TypeScript estricto.
- Vitest para los tests.
- Persistencia en `localStorage` detrás de un puerto. En la v2, PostgreSQL con Prisma tras un
  backend de Node y Express en `server/`, con un segundo adaptador del mismo puerto — `domain/` no
  se entera.

## Arranque

Requiere Node 22.22.3 o superior.

```bash
npm install
npm test          # dominio, infraestructura y aplicación; deben pasar siempre
npm start
```

## Documentación

| Fichero | Para qué |
|---|---|
| `docs/dominio.md` | Las reglas del voleibol y el vocabulario del proyecto. La fuente de verdad. |
| `docs/arquitectura.md` | Capas, dependencias permitidas, estructura de carpetas. |
| `docs/flujo-de-trabajo.md` | Cómo se trabaja aquí: ciclo SDD + TDD. |
| `docs/decisiones/` | Registro de decisiones tomadas y su motivo, una por fichero. Solo se añade. |
| `docs/especificaciones/` | Una spec por porción de trabajo. Se cierran al terminarse. |
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
   PostgreSQL + Prisma en la V2; la pista SVG con arrastre, validación en vivo, navegación
   R1–R6 y selección de jugador; y el líbero sustituyendo a cualquier jugador de zaga, entrando
   y saliendo según la rotación (FIVB 19.3.1.1). Primer punto en que la herramienta enseña algo
   tocándola. Specs 006–011.
4. **Consulta y examen.** Ver un sistema guardado en solo lectura, y examinarse: colocar los
   jugadores y recibir una nota de perfección más el veredicto de legalidad. Specs 012–013.
5. **Rejilla pintable, huecos y conflictos.** Zonas de responsabilidad de cada receptor.
   Specs 014–015.
6. **Exportar e importar JSON y PNG.** Compartir un sistema sin backend. Spec 016.
7. **Sistemas de defensa.** Un sistema de tipo defensa, organizado por rotación y por vía de
   ataque del rival (zona 4, zona 3, zona 2, pipe): se marca la vía soltando una ficha rival
   genérica en su campo, se colocan los seis defensores (mismo roster que en recepción, líbero
   incluido) y se guarda sin validación de posición — en defensa esa regla no existe. Spec 021.
   La rejilla pintable del paso 5 se generaliza para activarse también aquí: pintar la zona de
   cada defensor y verlas todas a la vez son las specs 022–023.
8. **Backend, cuentas y equipos (v2).** Los sistemas dejan de vivir en un navegador y pasan a una
   base de datos, para poder editarlos desde varios dispositivos y para que los jugadores puedan
   estudiarlos. Por orden: el puerto de persistencia se vuelve asíncrono y granular; cada sistema
   pasa a ser del equipo masculino o del femenino; nace `server/` con PostgreSQL y su API; la
   pizarra habla con él; se entra con lista blanca, contraseña y Google; y por último los tres
   roles deciden quién ve y quién edita cada cosa. Specs 031–037. El esquema completo, en
   `docs/modelo-de-datos.md`.

Cada paso tiene su spec en `docs/especificaciones/`; el orden exacto de implementación y los
escenarios de cada una viven ahí, no aquí.

**Spec 017** no encaja en ningún paso de arriba: corrige y amplía el líbero por rotación y la
validación del paso 3 tras usar la pizarra en la práctica (el líbero pasa de sustituir siempre al
mismo titular a declararse rotación a rotación, y se puede desactivar la validación al enseñar
una excepción). Se numera después de las specs ya reservadas (012–016) para no reordenarlas.

**Specs 018–020** tampoco encajan en ningún paso: corrigen, en dos vaivenes, la numeración de
las rotaciones tras usar la pizarra con un equipo real — ver `docs/decisiones/0018-…md` y
`0019-…md`. No añaden funcionalidad nueva, solo corrigen una regla mal aplicada.
