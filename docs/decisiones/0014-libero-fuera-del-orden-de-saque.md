# 0014 — El líbero vive fuera del orden de saque; entra y sale según la rotación

**Estado:** Aceptada

**Contexto.** El modelo original (specs 002-010) trataba al líbero como un jugador más dentro
de `OrdenSaque`, en la plaza de un central. Esto era incorrecto en dos sentidos, descubiertos
al investigar un fallo real ("el líbero no aparece en el banquillo"): la regla FIVB 19.3.1.1
permite que sustituya a **cualquier** jugador de zaga, no solo al central — eso era una
convención táctica del 5-1 documentada por error como regla en `docs/dominio.md`. Y más grave:
con el líbero en una plaza fija, su hueco recorre las seis posiciones al rotar y cae en línea
delantera en tres de ellas, dejando esas tres rotaciones bloqueadas por una falta que en un
partido real no existe, porque el líbero simplemente sale y entra el titular.

**Decisión.** `PlantillaEquipo.ordenSaque` son siempre los seis titulares; el líbero, si lo
hay, vive en un campo aparte (`libero?: { jugador, sustituidoId }`) que declara a quién
sustituye. Una nueva función, `jugadoresEnPista(plantilla, rotacion)`, deriva quién juega de
verdad en cada rotación: el titular, salvo que le toque zaga y la plantilla tenga líbero, en
cuyo caso juega el líbero. `validarFormacion` deja de calcular las posiciones P1..P6 por sí
misma (perdiendo así el parámetro `rotacion`, que ya no usaba para nada): las recibe siempre
resueltas de quien la llama, con `formacionEnRotacion` o con `jugadoresEnPista` según si hay
líbero o no. `cambiarPlantilla` (ADR 0011, pensada para intercambiar dos `PlantillaEquipo`
completas) se retira: con el líbero fuera del orden de saque solo existe una plantilla, así que
la única operación que tiene sentido es cambiar a quién sustituye
(`cambiarSustitutoLibero`), purgando cada formación guardada con el roster que le corresponde
en su propia rotación — no un único conjunto de ids válido para las seis a la vez, porque quién
es válido varía rotación a rotación.

**Consecuencias.** Toca specs ya `Completada`: 002 (`composicionValida` se simplifica; un
líbero dentro de `ordenSaque` pasa de válido a inválido, invierte 002-E13), 001 (`~16` tests
mecánicos por el cambio de firma de `validarFormacion`), 003 (E8, mismo motivo), 006
(`cambiarPlantilla` y sus dos tests se retiran). `LocalStorageSistemaRepository` (spec 008,
ADR 0012) cambia de forma: donde antes recibía `Record<'central2'|'libero', PlantillaEquipo>`
(dos plantillas completas inyectadas) ahora recibe una única `PlantillaEquipo`, y donde antes
persistía un discriminador (`ocupanteCasilla`) ahora persiste directamente a quién sustituye el
líbero (`sustitutoLibero?: string`) — corrige lo dicho en la ADR 0013 sobre que el repositorio
ya estaba preparado para "cualquier `Record<OcupanteCasilla, PlantillaEquipo>`": no lo estaba,
porque ese tipo entero deja de existir. `docs/dominio.md` §2 y el invariante 3 de su §7 se
corrigieron para dejar de afirmar que el líbero solo sustituye al central y que una formación
coloca siempre a los seis titulares fijos.
