# 0007 — `validarFormacion` devuelve infracciones y avisos por separado

**Estado:** Aceptada

**Contexto.** Al implementar la spec 001, `docs/arquitectura.md` sugería la firma
`validarFormacion(formacion, orden, equipo): Infraccion[]`. Pero `docs/dominio.md` distingue
tres estados por comparación (`valida`, `al_limite`, `falta`) y dice explícitamente que
`al_limite` "no es una infracción: es información para el entrenador". Un `Infraccion[]`
plano no puede representar "esto no es infracción pero hay que marcarlo" sin inventarse un
estado falso dentro del propio tipo `Infraccion`.

**Decisión.** `validarFormacion(formacion, orden, rotacion): ResultadoValidacion`, donde
`ResultadoValidacion = { infracciones: Infraccion[]; avisos: Aviso[] }`. Se elimina también
el parámetro `equipo`: `OrdenSaque` ya es un array de `Jugador` con su `rol`, así que la
regla del líbero no necesita un roster aparte.

**Consecuencias.** El consumidor (más adelante, `application/`) distingue sin ambigüedad qué
bloquea la formación (`infracciones`) de qué es solo informativo (`avisos`). Si en el futuro
aparece un motivo real para pasar el roster completo (por ejemplo, para las etiquetas de la
spec 002), se añadirá entonces, no antes.
