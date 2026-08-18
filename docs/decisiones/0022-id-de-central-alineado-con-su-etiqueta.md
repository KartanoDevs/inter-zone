# 0022 — El id de un central coincide con su etiqueta

**Estado:** Aceptada

**Contexto.** La ADR 0017 dejó el índice de rol como dato declarado y anotó, como aviso, que en
`plantilla-global.ts` el sufijo del id no coincidía con la etiqueta: `central1` llevaba índice 2 y
se pintaba `C2`, y `central2` al revés. Se documentó como trampa conocida en vez de arreglarse
porque el id era un identificador interno, sin más consecuencia que confundir a quien leyera el
fichero — y porque la 0017 nació precisamente de tres intentos fallidos de tocar esta zona.

Al escribir `docs/modelo-de-datos.md` ese id deja de ser interno: pasa a ser clave primaria de la
tabla `jugador` y a viajar en cada colocación persistida. Un identificador que dice lo contrario que
la etiqueta que el entrenador ve en pantalla es barato mientras vive en una constante del código, y
caro en cuanto está repetido en miles de filas y en las peticiones de una API.

**Decisión.** Se intercambian los dos ids. `central1` es el central contiguo al colocador —el de P6
en R1— y se etiqueta `C1`; `central2` es el de P3 y se etiqueta `C2`. Es la convención del
entrenador que la propia 0017 recoge: *«nombra `R1` al receptor de P2 (contando hacia delante desde
el colocador) y `C1` al central de P6 (contando hacia atrás)»*.

No cambia ninguna etiqueta en pantalla ni ninguna regla de voleibol: solo el identificador. **La
decisión de fondo de la 0017 sigue intacta** — el índice se declara, no se deriva — y no se vuelve a
intentar derivarlo. Este cambio va en la dirección contraria a aquellos tres intentos: en vez de
buscar una regla que produzca el índice, hace que el id repita el índice que ya está declarado.

**Consecuencias.** El aviso de las consecuencias de la ADR 0017 deja de ser cierto, así que su
`Estado` pasa a «Precisada por 0022»; su texto no se reescribe.

`plantilla-global.spec.ts`, que verifica las seis rotaciones de referencia etiqueta a etiqueta
contra ejemplos confirmados por el usuario, **pasó sin tocarlo**: es la prueba de que no cambió nada
visible. Los dos tests que sí fallaron codificaban el cruce y se ajustaron como puro renombrado
(`rotacion.spec.ts`, `sistema-por-defecto.spec.ts`); en ambos, el jugador físico implicado es el
mismo antes y después.

Cualquier sistema hecho a mano y guardado en un navegador antes de este cambio queda con los dos
centrales cruzados, porque las posiciones se persisten por `jugadorId`. Los dos sistemas sembrados
no se ven afectados: derivan su roster del rol, vía `jugadoresEnPista`. Se hace ahora, con un único
navegador en juego y ningún dato compartido, en vez de cuando la base de datos guarde el trabajo de
dos equipos — que es exactamente el motivo de hacerlo hoy y no después.
