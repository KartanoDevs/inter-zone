# 0001 — Sin backend en la v1

**Estado:** Aceptada

**Contexto.** El objetivo es doble: que el equipo tenga una herramienta útil pronto y que el
código sea de buena calidad. Un backend con Node, Express, PostgreSQL y Prisma añade semanas
de trabajo antes de que un jugador pueda ver nada, y no aporta nada al aprendizaje del
voleibol.

**Decisión.** La v1 es una SPA sin servidor. Los sistemas se guardan en `localStorage` y se
comparten exportando JSON o PNG.

**Consecuencias.** No hay usuarios, ni roles de acceso, ni sincronización entre dispositivos.
El "modo jugador" es la misma aplicación con un flag de solo lectura. La persistencia queda
detrás de un puerto para que añadir un adaptador HTTP más adelante no toque el dominio. Si el
equipo pide editar desde varios dispositivos, esa petición justificará el backend.
