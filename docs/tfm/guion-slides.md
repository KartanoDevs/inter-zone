# Guion de las slides — TFM InterZone

Contenido para montar en Google Slides (u otra herramienta), diapositiva a diapositiva.
Cada bloque trae **título**, **contenido** (máximo 3-4 líneas, son apoyo visual, no para leer
en voz alta) y **qué captura o material usar**. Duración orientativa total: 8-10 minutos de
exposición si se acompaña hablando.

Antes de montar: lee la sección 0 y 6 del [README.md](../../README.md) — de ahí sale casi todo
el contenido de texto, ya redactado y revisado.

---

## 1. Portada

**Contenido:**
- InterZone
- Pizarra táctica de recepción y defensa de voleibol
- Trabajo de Fin de Máster — [tu nombre]

**Material:** el logo (`public/icons/icon-512.png` o similar) sobre fondo simple.

---

## 2. El problema

**Título:** La falta de posición es contraintuitiva

**Contenido:**
- Depende de la posición rotacional (P1–P6), que cambia en cada rotación
- No de dónde *parece* que está el jugador sobre la pista
- Las herramientas genéricas (pizarra de vestuario, PowerPoint) no lo validan

**Material:** ninguna captura; texto solo, o un dibujo simple de una pista con jugadores
numerados P1-P6.

---

## 3. Lo que las herramientas genéricas no resuelven

**Título:** Tres problemas, tres respuestas

**Contenido (tabla, tomada del README §1):**
| Problema | Cómo lo aborda InterZone |
|---|---|
| La falta de posición es contraintuitiva | Valida en vivo y bloquea el guardado si hay falta |
| El jugador memoriza, no entiende el porqué | Cada sistema lleva su texto de enseñanza |
| Los huecos de cobertura son invisibles | Zonas de responsabilidad pintadas sobre una rejilla |

**Material:** sin captura, es la slide de contexto.

---

## 4. Qué es InterZone en una frase

**Título:** Una pizarra que valida y explica, no solo dibuja

**Contenido:**
- Mira **entre** las zonas — de ahí el nombre
- Todo lo que se puede derivar, se deriva; nunca se almacena

**Material:** captura de la app con un sistema de recepción cargado, pista limpia, sin paneles
abiertos.

---

## 5. Demo 1 — La pizarra y la validación en vivo

**Título:** Arrastrar, validar, bloquear

**Contenido:**
- Seis fichas arrastrables sobre la pista, en metros reales
- Tres estados: válida · al límite · falta
- Guardar se bloquea si hay infracción

**Material:** captura con una ficha en posición de **falta** (borde/color de error visible) y
otra con **al_límite**, si se puede en la misma imagen o en dos.

---

## 6. Demo 2 — El líbero

**Título:** El líbero entra y sale solo

**Contenido:**
- Vive fuera del orden de saque: es un séptimo jugador
- Sustituye a cualquier titular de zaga, no solo al central
- Cambia de rotación en rotación sin que nadie lo declare a mano

**Material:** dos capturas de la misma rotación consecutiva mostrando al líbero entrando/saliendo,
o una sola captura con el chip del líbero bien visible.

---

## 7. Demo 3 — Sistemas de defensa

**Título:** Organizados por lo que hace el rival, no por rotación

**Contenido:**
- Caso del colocador rival (delantero/trasero) + situación de ataque
- Variantes por número de bloqueadores (0-3)
- Sombra del bloqueo calculada en vivo

**Material:** captura de la pista de defensa con la sombra de bloqueo (polígono) visible.

---

## 8. Demo 4 — Zonas de responsabilidad

**Título:** Los huecos, visibles

**Contenido:**
- Rejilla de celdas de 0,5 m, pintada por arrastre
- Paleta de 7 colores, uno por jugador
- Celdas compartidas con patrón de franjas

**Material:** captura de la pista de defensa con varias zonas pintadas y algún solape con
franjas.

---

## 9. Demo 5 — Teoría y Examen

**Título:** Estudiar y examinarse

**Contenido:**
- Teoría: los mismos sistemas, en solo lectura, con las explicaciones
- Examen: por puesto, por línea o por sistema completo
- Nota de 0 a 10 e insignias (bronce/plata/oro)

**Material:** captura de la vitrina de medallas de la ventana Cuenta.

---

## 10. Arquitectura hexagonal

**Título:** Las flechas apuntan siempre hacia dentro

**Contenido (diagrama, tomado del README §3):**
```
    ui/  ──────────►  application/  ──────────►  domain/
                            │                        ▲
                            ▼                        │
                    infrastructure/  ────────────────┘

    server/  ──────────────────────────────────────►  domain/
```

**Material:** reproducir el diagrama como texto/figura simple; no hace falta captura de la app.

---

## 11. El invariante que lo sostiene

**Título:** `domain/` no importa nada externo

**Contenido:**
- Ni Angular, ni el DOM, ni RxJS, ni librerías de terceros
- Solo TypeScript — por eso el mismo código de reglas corre en navegador **y** en servidor
- Cobertura de tests del 100 % en esa capa

**Material:** opcional, captura de un fichero de `src/app/domain/` en el editor (por ejemplo
`validacion.ts`) mostrando que no hay imports externos.

---

## 12. Método: SDD + TDD

**Título:** Un escenario cada vez

**Contenido (ciclo, tomado del README §7):**
1. Escribir la spec, con escenarios verificables
2. Congelar la spec antes de ver una línea de código
3. Test en rojo → código mínimo → verde → refactor
4. Cerrar la spec y registrar la decisión en un ADR si aplica

**Material:** sin captura, o una captura de `npm test` en verde.

---

## 13. Los números

**Título:** El proyecto en cifras

**Contenido:**
- 560 tests (dominio, aplicación, infraestructura) + integración de servidor
- 74 especificaciones, 47 decisiones de arquitectura registradas (ADR)
- 13 tablas en PostgreSQL

**Material:** sin captura, solo los números en grande.

---

## 14. Despliegue

**Título:** Dos entornos, un solo Compose

**Contenido (tabla, tomada del README §4.5):**
| | Producción | Desarrollo |
|---|---|---|
| URL | cvinterzone.duckdns.org | dev.cvinterzone.duckdns.org |
| Rama | main | develop |
| Copias de seguridad | sí | no |

**Material:** sin captura.

---

## 15. Cierre

**Título:** Qué queda por hacer

**Contenido:**
- Huecos y conflictos de cobertura (specs 014-015, aún sin construir)
- Registro de auditoría y revocación de sesión (pendientes desde la pasada OWASP, ADR 0043)
- Gracias / preguntas

**Material:** sin captura.

---

## Notas para montar el deck

- Usa el mismo color de acento que la app (revisa `src/app/app.css` o el CSS de los
  componentes) para que el deck no desentone con las capturas.
- Todas las capturas deben venir del **entorno de desarrollo** (`dev.cvinterzone.duckdns.org`),
  nunca de producción, para no enseñar datos reales de un equipo.
- Al terminar el deck en Google Slides: **Archivo → Compartir → Cambiar a "Cualquier persona
  con el enlace"** y pegar esa URL en la sección 0 del README.
