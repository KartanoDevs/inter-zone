# InterZone

Pizarra táctica para diseñar, validar y estudiar sistemas de recepción de voleibol.

El nombre viene de lo que la herramienta hace de verdad: mirar **entre** las zonas. Lo
interesante de una recepción no está donde se coloca cada jugador, sino en las costuras
que quedan entre ellos.

El objetivo no es dibujar bonito: es que un jugador entienda **por qué** se coloca donde se
coloca, y que el entrenador vea al instante si una formación es **legal** y si deja **huecos**
sin cubrir.

## Qué hace (v1)

- Definir la plantilla del equipo con sus roles y el orden de saque.
- Colocar los 6 jugadores en media pista, en metros reales.
- Validar en vivo la falta posicional según el orden de saque.
- Pintar sobre una rejilla la zona de responsabilidad de cada receptor.
- Detectar huecos (nadie cubre) y conflictos (dos o más se pisan).
- Navegar entre las 6 rotaciones.
- Guardar en el navegador, exportar PNG y JSON.

## Qué NO hace (deliberadamente)

Sin backend, sin base de datos, sin login, sin roles de usuario, sin PWA offline. Todo eso
entra cuando el equipo haya usado la herramienta en entrenamientos reales y pida algo
concreto. Ver `docs/decisiones.md`, decisión 0001.

## Stack

- Angular 22, standalone, signals, zoneless.
- SVG nativo para el render (no Canvas, no Fabric.js).
- TypeScript estricto.
- Vitest para los tests.
- Persistencia en `localStorage` detrás de un puerto.

## Arranque

Requiere Node 22.22.3 o superior.

```bash
npm install
npm test          # tests de dominio, deben pasar siempre
npm start
```

## Documentación

| Fichero | Para qué |
|---|---|
| `docs/dominio.md` | Las reglas del voleibol y el vocabulario del proyecto. La fuente de verdad. |
| `docs/arquitectura.md` | Capas, dependencias permitidas, estructura de carpetas. |
| `docs/flujo-de-trabajo.md` | Cómo se trabaja aquí: ciclo SDD + TDD. |
| `docs/decisiones.md` | Registro de decisiones tomadas y su motivo. Solo se añade. |
| `docs/especificaciones/` | Una spec por porción de trabajo. Se cierran al terminarse. |
| `CLAUDE.md` | Contexto e invariantes para asistentes de IA. |

## Hoja de ruta

Cada paso es usable en un entrenamiento por sí solo. Ese es el criterio de corte.

1. **Dominio puro con tests.** Roles y etiquetas, rotación derivada, validación posicional.
   Sin UI.
2. **Pista SVG + arrastre + validación en vivo.** Primer punto en que la herramienta enseña
   algo.
3. **Plantilla y orden de saque configurables, navegación R1–R6.**
4. **Rejilla pintable, huecos y conflictos.**
5. **Persistencia, exportar PNG y JSON.**
6. **Modo solo lectura para compartir con el equipo.**

Después de la v1: sistemas de defensa, que reutilizan el mismo modelo de pista y de rejilla
pero añaden bloqueo y atacante rival.
