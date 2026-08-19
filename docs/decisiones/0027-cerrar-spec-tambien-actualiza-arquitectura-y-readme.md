# 0027 — Cerrar una spec también actualiza `docs/arquitectura.md` y `README.md` si tocó la estructura

**Estado:** Aceptada

**Contexto.** El paso 7 «Cerrar» de `docs/flujo-de-trabajo.md` y el «Paso final» de `CLAUDE.md`
obligan a actualizar `docs/dominio.md` (si se aprendió una regla de voleibol) y a añadir una ADR
(si fue una decisión estructural), pero no mencionan `docs/arquitectura.md` ni `README.md` en
ningún punto. Las specs 031-034 cambiaron la arquitectura de raíz —el puerto de persistencia se
volvió asíncrono, nació `server/` con PostgreSQL, la pizarra pasó de `localStorage` a hablar por
HTTP— y siguieron el ritual al pie de la letra: cada una añadió su ADR y, cuando tocaba, corrigió
`docs/dominio.md`. Ninguna tocó `docs/arquitectura.md` ni `README.md`, porque el ritual no se lo
pedía.

El resultado, descubierto al volver a `1d02c3c` tras revertir un trabajo posterior sin spec: `docs/arquitectura.md`
no mencionaba `server/` ni una sola vez y describía un comportamiento (`ui/` no espera las
escrituras) que la ADR 0026 había revocado explícitamente meses antes. `README.md` decía «lo que
guarda de verdad sigue siendo el navegador» con los sistemas ya en PostgreSQL desde la spec 033.
Un asistente de IA que siguiera `CLAUDE.md` al pie de la letra —«antes de crear ficheros o mover
código, lee `docs/arquitectura.md`»— habría diseñado la spec 035 contra una arquitectura que ya no
existía.

**Decisión.** El paso 7 de `docs/flujo-de-trabajo.md` y el «Paso final — Cerrar la spec» de
`CLAUDE.md` añaden una comprobación explícita: si la spec cambió qué capas existen, qué adaptador
está en uso, o qué hace la aplicación en producción (no solo cómo lo hace por dentro), se
actualizan también `docs/arquitectura.md` y `README.md` antes de marcar la spec como
`Completada`. Si no cambió nada de eso —la mayoría de specs, que añaden o corrigen lógica de
dominio sin mover capas— no hay nada que tocar en ninguno de los dos.

No es una obligación nueva y aislada: es la misma disciplina que ya exige actualizar
`docs/dominio.md`, aplicada a los dos documentos que describen la forma del proyecto en vez de
sus reglas.

**Consecuencias.** El ritual de cierre gana un paso más que revisar, pero es una pregunta de sí/no
("¿esta spec movió una pared?") antes de cerrar, no una reescritura sistemática. El coste de
saltárselo ya se pagó una vez: dos documentos que `CLAUDE.md` cita como fuente de verdad,
desincronizados en silencio durante cuatro specs, sin que la suite —que no comprueba prosa—
lo detectara nunca.
