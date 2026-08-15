# 0009 — El central usa C como abreviatura; la colisión se compara por etiqueta, no por letra

**Estado:** Aceptada

**Contexto.** El equipo quiere `C1`/`C2` para el central en vez de `M1`/`M2`. La decisión
0006 prohibía que dos roles compartieran abreviatura, precisamente para que colocador y
central no coincidieran en "C". Pero esa regla era más estricta de lo necesario: compara
letras sueltas, no las etiquetas que de verdad se pintan en la ficha.

**Decisión.** El colocador nunca lleva índice (siempre hay exactamente uno en pista), así que
su etiqueta es siempre la letra suelta `C`. El central sí lleva índice siempre, así que sus
etiquetas son siempre `C1` o `C2`. Una etiqueta con índice nunca es textualmente igual a una
sin índice, así que ambos roles pueden compartir la letra base `C` sin que ninguna ficha
resulte ambigua. El central pasa a usar `C` como abreviatura por defecto. El invariante de
colisión se corrige: dos roles solo colisionan si comparten abreviatura **y** coinciden en si
llevan índice o no (ambos con índice, o ninguno). `validarConfiguracionRoles` compara el par
`(abreviatura, llevaIndice)` en vez de la abreviatura sola.

**Consecuencias.** Sustituye a la decisión 0006 en lo relativo a la abreviatura del central y
al criterio de colisión; el resto de 0006 (identificadores estables, nombre/abreviatura
configurables, convención de índice cerca/lejos) sigue vigente. La spec 002 (`Completada`) se
revisa para reflejar el nuevo valor por defecto y un ejemplo de colisión real bajo la regla
nueva.
