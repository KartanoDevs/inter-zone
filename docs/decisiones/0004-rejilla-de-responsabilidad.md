# 0004 — Zonas de responsabilidad como rejilla de 0,5 m

**Estado:** Aceptada

**Contexto.** Se valoraron cuatro representaciones: círculo con radio, elipse orientada,
polígono de vértices arrastrables y rejilla de celdas pintables.

**Decisión.** Rejilla de celdas cuadradas de 0,5 m, pintadas a mano por el entrenador.

**Consecuencias.** Los huecos y conflictos se calculan contando responsables por celda: sin
geometría computacional, sin librerías, en dos bucles. Se pinta con el dedo en tablet, que es
el contexto de uso real. A cambio, el resultado es menos estilizado que una elipse; si hiciera
falta, se puede suavizar el contorno al renderizar sin tocar el modelo de datos.

Se descartó 0,25 m: a un ancho típico de lienzo, la celda quedaría en unos 19 px, por debajo
del mínimo táctil recomendado, y el entrenador fallaría el objetivo con el dedo. Además, ni
el ojo ni el criterio táctico razonan con esa precisión. `TAMANO_CELDA` es una constante del
dominio, así que la resolución se reajusta con un cambio de una línea si el uso real lo pide.
