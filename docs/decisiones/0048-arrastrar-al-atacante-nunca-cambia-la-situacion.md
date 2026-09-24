# 0048 — Arrastrar al atacante nunca cambia la situación

**Estado:** Aceptada

**Contexto.** La ADR 0020 (spec 021) fijó que la situación de ataque se deriva de dónde se
suelta la ficha del atacante rival, y la ADR 0047 (spec 072) añadió que, además de derivar la
situación, se persiste el punto exacto dentro de ella. Con las dos decisiones vigentes a la vez,
soltar la ficha "A" hacía dos cosas de golpe: decidía a qué variante pertenecía el punto (spec
0020) y guardaba el punto exacto dentro de esa variante (spec 0047). En voleibol real esto no
corresponde: un atacante que arma por zona 3 puede rematar hacia 2 o hacia 4 según lea el
bloqueo, sin que eso cambie contra qué está organizada la defensa — el punto de despegue no es
la situación. Con el comportamiento anterior, mover la ficha un poco hacia el lateral cambiaba
silenciosamente de variante (y de formación de los seis puestos) sin que el entrenador lo
pidiera.

**Decisión.** Arrastrar la ficha "A" **nunca** cambia la situación activa (spec 075). El punto se
mueve libre por todo el campo rival (mismos límites de siempre, `acotarPuntoRival`) y se guarda
siempre dentro de la variante que ya estaba activa, aunque visualmente caiga sobre el tercio de
otra situación. Cambiar de situación de verdad sigue siendo posible, y solo posible, a través del
selector de pestañas (`app-selector-situacion`, ya existente desde la spec 038) — que llama al
mismo `SistemaStore.seleccionarSituacion` de siempre, sin cambios.

**Por qué no hizo falta construir nada nuevo para el selector.** Las pestañas de situación no
dependían de `onAgarrarRival` ni de `situacionMasCercana`: ya eran, desde la spec 038, una vía
completamente independiente de cambiar de variante. Desacoplar el arrastre no dejó al entrenador
sin forma de cambiar de zona — solo dejó de disparar ese cambio como efecto colateral de mover
la ficha.

**Qué queda de la 0020.** La función `situacionMasCercana` (`domain/defensa.ts`) no se elimina:
sigue siendo correcta como cálculo de dominio, con sus tests, por si en el futuro hace falta en
otro contexto. Pero deja de invocarse desde el arrastre de la ficha "A" — la tabla de
condiciones de `docs/dominio.md` §3 sigue siendo la referencia para lo que decide el *selector*,
no para lo que decide *soltar la ficha en un punto*.

**Consecuencias.** `onAgarrarRival` (`ui/tablero/tablero.ts`) deja de llamar a
`store.seleccionarSituacion(...)`; solo llama a `store.moverAtacante(punto)`. Ningún cambio en
`domain/`, `application/`, `infrastructure/` ni `server/`: el mecanismo de persistencia del
punto (ADR 0047) no cambia, solo cuándo se dispara un cambio de variante. Las variantes ya
guardadas no se ven afectadas — sus puntos guardados siguen siendo válidos y se siguen leyendo
igual.
