# 0036 — Se retoma la autenticación: sustituye a la 0028

**Estado:** Aceptada

**Contexto.** La ADR 0028 aplazó las specs 035-037 y dejó escrito su propio disparador: *«es
hoy el único motivo real para desaparcar la 035»* — exponer el servidor fuera de una máquina de
confianza, o que alguien pida estudiar los sistemas desde fuera del entrenamiento. Eso ha
ocurrido: los jugadores quieren consultar los sistemas de recepción y defensa desde su casa, y
eso exige que el servidor sepa distinguir quién pregunta.

**Decisión.** Se implementa la spec 035: lista blanca, alta de cuenta con contraseña y sesión.
El diseño de `docs/modelo-de-datos.md` §4 se mantiene casi intacto — se construye tal como
estaba dibujado, con dos ajustes deliberados que se documentan en esa misma spec (sin login de
Google todavía; sin las columnas de `Ajustes`, que siguen en `localStorage` por dispositivo,
ADR 0028). La ADR 0028 no se edita ni se borra: queda marcada como *Sustituida por 0036*. Su
otra mitad —huecos y conflictos, specs 014-015— sigue viva, sin tocar, sin spec asignada
todavía.

**Consecuencias.** El servidor gana `/api/auth/registro`, `/api/auth/entrar`, `/api/auth/salir`
y `/api/auth/quien-soy`. **`/api/sistemas` sigue sin exigir sesión**: cerrar esa puerta según el
rol de quien pregunta es la spec 037, todavía por hacer. El invariante 8 de `CLAUDE.md` se
reescribe para dejar de decir que la autenticación está aplazada.
