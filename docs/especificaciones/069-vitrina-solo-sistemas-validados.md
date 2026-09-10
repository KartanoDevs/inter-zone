# 069 — La vitrina solo cuenta sistemas validados

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

Un jugador puede examinarse y ganar medallas de un sistema mientras está validado. Si el
entrenador le retira la validación después —para corregirlo, para rehacerlo, porque cambió de
opinión—, hoy esas medallas se siguen viendo en la vitrina exactamente igual que las de un
sistema validado de verdad. Eso confunde: el jugador ve una pieza "dominada" de un sistema que
ya no es el que se juega en pista, y el recuento de "X de Y dominados" cuenta ese sistema como
si siguiera siendo un objetivo vigente.

Esto invierte a propósito una decisión anterior (spec 061, escenario E21): "quitar la
validación no borra las medallas ya ganadas". Esta spec **sustituye ese escenario**: las
medallas se conservan (no se borran, ver Fuera de alcance), pero dejan de mostrarse mientras el
sistema no esté validado.

## Objetivo

La vitrina de medallas solo muestra sistemas validados del equipo al que el usuario tiene
acceso; un sistema sin validar no aparece, con medallas o sin ellas, y no cuenta en el
recuento.

## Fuera de alcance

- **Borrar las insignias de un sistema desvalidado.** Siguen guardadas en la base de datos
  (`insignia_examen`, spec 056) intactas. Esta spec solo cambia qué se **muestra**, nunca lo
  que se persiste. Si el sistema se vuelve a validar, sus medallas reaparecen tal cual estaban.
- **Tocar `domain/insignias.ts`.** `resumenDeMedallas` y `recuentoDeSistemas` no reciben ni
  necesitan el estado del sistema: seguirán operando igual que hoy sobre la lista de sistemas
  y de insignias que les pase quien las llama. El filtro por validación se aplica **antes**, en
  el mismo sitio donde ya se filtra por equipo (`VitrinaMedallas.sistemasDelUsuario`) — no es
  una regla de dominio de voleibol, es una decisión de qué mostrar en esta pantalla.
- **Cambiar el filtro de equipo/permiso.** Sigue exactamente igual que hoy: admin ve todos los
  sistemas de recepción; el resto, solo los de los equipos donde tiene membresía. No hay
  escenario nuevo para esto, es un invariante que ya existía y no cambia.
- **Tocar `InsigniasStore` ni el servidor.** Siguen trayendo todas las insignias de la cuenta
  sin filtrar por sistema; el filtrado de qué sistemas son visibles ya ocurría en el cliente
  antes de este cambio (spec 061) y sigue ocurriendo ahí.
- **Sistemas de defensa.** No tienen examen (spec 012) y ya quedaban fuera del recuento; sigue
  igual.

## Escenarios

**E1 — Un sistema validado con medallas aparece en el mosaico**
- Dado: un sistema de recepción validado, con medallas ganadas por la cuenta
- Cuando: se abre la vista Logros
- Entonces: el sistema aparece como pieza del mosaico con sus medallas

**E2 — Retirar la validación oculta el sistema del mosaico**
- Dado: un sistema de recepción con medallas ganadas por la cuenta, al que el entrenador
  retira la validación
- Cuando: se abre la vista Logros
- Entonces: el sistema ya no aparece como pieza del mosaico; sus medallas no se ven (aunque
  siguen guardadas)

**E3 — Volver a validar hace reaparecer las medallas intactas**
- Dado: el sistema del E2, ya sin validar y sin pieza en el mosaico
- Cuando: el entrenador lo valida de nuevo y se abre la vista Logros
- Entonces: el sistema vuelve a aparecer como pieza, con exactamente las mismas medallas que
  tenía antes de desvalidarse

**E4 — Un sistema que nunca se validó no aparece, aunque tenga medallas**
- Dado: un sistema de recepción que nunca ha estado validado, con una medalla registrada (por
  ejemplo, ganada mientras estuvo validado brevemente y luego se desvalidó antes de esta
  consulta)
- Cuando: se abre la vista Logros
- Entonces: el sistema no aparece como pieza — mismo criterio que E2, sin distinguir "nunca
  validado" de "desvalidado después"

**E5 — El recuento solo cuenta sistemas validados en el denominador**
- Dado: una cuenta con 3 sistemas de recepción visibles, 2 validados (uno dominado, con oro) y
  1 sin validar
- Cuando: se abre la vista Logros
- Entonces: el recuento muestra "1 de 2 dominados" (el sin validar no cuenta ni en el
  numerador ni en el denominador)

**E6 — Un sistema sin validar y sin medallas tampoco cuenta**
- Dado: un sistema de recepción sin validar y sin ninguna medalla ganada
- Cuando: se abre la vista Logros
- Entonces: no aparece como pieza y no suma al denominador del recuento (mismo tratamiento que
  si tuviera medallas, E4)

**E7 — El filtro de equipo sigue aplicando igual (invariante, no cambia)**
- Dado: un usuario sin membresía en el equipo femenino, con un sistema validado y con medallas
  en el equipo femenino
- Cuando: se abre la vista Logros
- Entonces: ese sistema no aparece — el filtro de equipo actúa antes o junto al de validación,
  sin que uno reemplace al otro

**E8 — Sin sistemas validados visibles, la vitrina se ve vacía, no rota**
- Dado: una cuenta cuyos sistemas de recepción visibles están todos sin validar
- Cuando: se abre la vista Logros
- Entonces: se ve el mismo mensaje de "sin medallas todavía" que hoy usa `vacia` — no un error
  ni una pantalla en blanco

## Preguntas abiertas

Ninguna.

## Al cerrar

Los ocho escenarios (E1-E8) se resolvieron con un solo cambio: `VitrinaMedallas.sistemasDelUsuario`
(`src/app/ui/acceso/vitrina-medallas.ts`) añade `estadoDe(s) === 'validado'` al filtro que ya
tenía por tipo, junto a `estadoDe` importado de `domain/catalogo-sistemas.ts`. Como `piezas`,
`recuento` y `vacia` ya derivaban todos de `sistemasDelUsuario()`, ningún otro sitio necesitó
tocarse — ni `domain/insignias.ts`, ni `InsigniasStore`, ni el servidor, tal y como preveía
"Fuera de alcance". No hubo desviación respecto a lo previsto.

`domain/insignias.spec.ts::E21` no se borró ni se reescribió su aserción: sigue demostrando que
`recuentoDeSistemas`/`resumenDeMedallas` no miran `estado` (agnósticas a validación, ver "Fuera
de alcance"), solo se le añadió un comentario aclarando que el filtrado por validación ahora
vive en `VitrinaMedallas`, no en el dominio.

`ui/` no tiene runner de test (`vitest.config.ts` solo cubre `domain/`, `infrastructure/`,
`application/`), así que los ocho escenarios no tienen test automático — se verificaron a mano
relanzando la app en modo desarrollo (Docker + `npm start` en `server/` y en la raíz), con la
cuenta demo del README: crear un sistema, examinarlo validado, ganar una medalla, quitarle la
validación (desaparece de la vitrina), volver a validarlo (reaparece con la medalla intacta), y
el recuento con una mezcla de sistemas validados y sin validar. El usuario confirmó que el
comportamiento es el esperado. `npm test` (533/533) y `npm run typecheck` en verde.

Esta spec sustituye el escenario **E21** de la spec 061 ("Quitar la validación de un sistema
no borra las medallas ya ganadas" — la versión donde el sistema seguía visible).
