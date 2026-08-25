# 0028 — Se aplaza la autenticación; el siguiente paso es huecos y conflictos

**Estado:** Sustituida por 0036 — se cumplió el disparador que esta misma decisión dejó escrito
(«antes de exponer el servidor a internet», ver sus consecuencias más abajo), así que la
autenticación se retoma. Huecos y conflictos siguen vivos, sin spec asignada.

**Contexto.** La ADR 0023 abrió la v2 con tres cosas dentro: backend, base de datos y cuentas. Las
dos primeras están construidas y en producción (specs 031-034). La tercera —lista blanca, login con
Google o con contraseña, y tres roles de acceso— tenía reservadas las specs 035-037 y un esquema
completo en `docs/modelo-de-datos.md` §4, pero ninguna spec escrita.

Y algo que el propio modelo de datos dejó anotado al final: **cómo se guarda una sesión no está
diseñado**. Ni cookie firmada, ni JWT, ni tabla de tokens — no hay una sola mención a sesión, token
o cookie en todo el fichero. Es requisito previo de la 035, así que empezar por ahí significa
empezar por una decisión de infraestructura, no por voleibol.

Mientras tanto, la promesa que da nombre al proyecto sigue sin cumplirse. **InterZone es mirar
entre las zonas**, y hoy la herramienta pinta las zonas y las guarda, pero no las analiza:
`domain/cobertura.ts` no existe. `docs/dominio.md` §6 define hueco y conflicto desde la spec 022, y
las specs 014-015 llevan reservadas desde la primera hoja de ruta sin que nadie las escriba.

**Decisión.** Las specs 035-037 salen del camino corto. El siguiente paso es **huecos y conflictos**
(specs 014-015): calcular, desde las celdas ya persistidas, qué superficie del campo no cubre nadie
y cuál cubren dos o más.

La autenticación queda **aplazada, no descartada**. El diseño de `docs/modelo-de-datos.md` §4
—`usuario`, `lista_blanca`, `membresia`, y la matriz de permisos— sigue siendo válido y no se toca;
solo deja de tener specs asignadas. La ADR 0023 no se revierte: entraron el backend y la base de
datos, que era el grueso de su contenido, y las cuentas siguen siendo el destino, no una idea
abandonada. Queda marcada como *Precisada por 0028*.

**Por qué este orden y no el inverso.** Tres motivos, en orden de peso:

1. **Es lo único del propósito original que sigue sin construir.** Validar faltas y explicar
   rotaciones ya funciona. Lo que no funciona es justo lo que el nombre promete.
2. **Vive entero en `domain/`.** Es una función pura sobre datos que ya están en PostgreSQL desde
   la spec 028. Ciclo rojo-verde rápido, la regla de 100% de cobertura se aplica limpia, y no toca
   capas, ni adaptadores, ni dependencias nuevas.
3. **Nadie ha pedido las cuentas todavía.** La ADR 0001 fijó un precedente que aquí vale igual: se
   construye cuando alguien lo pide, no cuando parece que tocará. Hoy la pizarra la usa un
   entrenador con el backend al lado; el día que un jugador tenga que entrar a estudiar desde su
   casa, la 035 vuelve al camino corto con su diseño intacto.

**Consecuencias.** El servidor sigue **sin autenticación y abierto**: `/api/sistemas` acepta
cualquier petición del origen permitido. Eso es aceptable en local y **no lo es en una máquina
expuesta a internet**. Es la condición que hay que recordar antes de desplegarlo en ningún sitio
público, y es hoy el único motivo real para desaparcar la 035 — igual que la 0001 dejó escrito su
propio disparador, este es el de la 035.

Los `Ajustes` siguen en `localStorage`, por dispositivo: su destino era ser columnas de `usuario`, y
`usuario` no llega. `LocalStorageAjustesRepository` deja de ser una parada intermedia y pasa a ser,
por tiempo indefinido, el adaptador definitivo de los ajustes.

`sistema.estado` sigue naciendo siempre `'borrador'` y sin que nada lo lea. La columna existe desde
la spec 033 y solo la 037 le daría sentido; se queda como está, sin borrarla — el coste de una
columna enum sin uso es cero, y desandarla sería una migración a cambio de nada.

Y una pregunta que la spec 014 tendrá que cerrar antes de congelarse, detectada al tomar esta
decisión: la **zona por defecto** de la spec 024 —el bloque de 2×2 celdas derivado del punto de un
jugador que nunca pintó— ¿cuenta como cobertura al buscar huecos, o solo cuentan las celdas pintadas
a mano? Las dos respuestas son defendibles y dan resultados muy distintos en el caso más común: un
sistema recién colocado, sin ninguna zona pintada todavía. No se decide aquí. Se decide al escribir
la spec, que es donde se decide el voleibol.

Nota de alcance para esa misma spec: desde la spec 024 las zonas **solo existen en defensa**, así
que el análisis de huecos y conflictos nace acotado ahí. La redacción del paso 5 de la hoja de ruta
del README —*«zonas de responsabilidad de cada receptor»*— venía de antes de esa decisión y se
corrige con esta ADR.
