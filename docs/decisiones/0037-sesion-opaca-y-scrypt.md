# 0037 — Sesión opaca en base de datos y contraseña con scrypt

**Estado:** Aceptada

**Contexto.** La spec 035 necesitaba decidir cómo se guarda una sesión — la pregunta que la ADR
0028 y `docs/modelo-de-datos.md` §9 dejaron anotada sin responder — y cómo se guarda una
contraseña. Se compararon dos mecanismos de sesión contra el stack real (Express 5 sin sesiones
de por medio, Postgres ya disponible): un testigo opaco guardado en una tabla nueva (`sesion`)
frente a un JWT firmado.

**Decisión.** Sesión: testigo aleatorio de alta entropía (`node:crypto`, `randomBytes`),
entregado como cookie `HttpOnly`; en la base de datos solo se guarda su huella SHA-256
(`sesion.testigo_hash`), nunca el valor que viaja en la cookie. Caduca a los 30 días y se
renueva en cada uso. Un JWT se descartó porque revocar una sesión antes de que caduque —lo que
hace falta el día que el admin retire a alguien de la lista blanca— exigiría de todos modos una
tabla de revocados, y entonces el JWT deja de ahorrar nada a cambio de tener que custodiar y
rotar un secreto de firma que aquí no hace falta.

Contraseña: derivada con `scrypt` de `node:crypto` (factor de coste, sal aleatoria propia por
cuenta), nunca en claro y nunca con un hash sin coste como SHA-256 — SHA-256 sí se usa, pero
solo para la huella del testigo de sesión, cuya entrada ya es aleatoria de alta entropía, no una
contraseña adivinable.

**Consecuencias.** Cero dependencias nuevas: todo el mecanismo vive en `node:crypto` y en la
tabla `sesion` (no diseñada en `docs/modelo-de-datos.md`, que ya avisaba de que si la sesión
resultaba ser una tabla nueva, el principio de nueve tablas pasaría a diez — es esta). Retirar el
acceso de alguien es una fila que se borra, no un secreto que rotar ni una lista de revocados
que mantener aparte.
