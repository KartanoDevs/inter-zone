# 0002 — Sistema de coordenadas en metros, origen en la esquina

**Estado:** Aceptada

**Contexto.** Guardar posiciones en píxeles ata los datos al tamaño del lienzo: al cambiar
la resolución, los sistemas guardados dejan de significar nada. Sobre el origen se valoraron
dos opciones: el centro de la red o una esquina.

**Decisión.** Metros. Origen en la esquina donde la red corta la línea lateral izquierda,
vista desde el fondo del propio campo mirando a la red. `x` de 0 a 9 hacia la derecha, `y`
de 0 a 9 hacia el fondo.

**Consecuencias.** El índice de celda de la rejilla es `floor(coord / 0.5)` sin traslación, y
el render en SVG es un escalado puro sin sumar offsets. Se pierde la simetría fácil que daba
el origen central: reflejar una formación pasa a ser `x → 9 - x` en lugar de `x → -x`, lo
que se aísla en una única función. El campo rival, cuando llegue la defensa, será `y < 0`.
