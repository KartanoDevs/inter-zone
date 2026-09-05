# 068 — Borrar una cuenta

**Estado:** Completada
**Paso de la hoja de ruta:** No encaja en ninguno: es una herramienta de administración, no una
funcionalidad de pista o de examen.

## Problema

El admin da de alta cuentas de prueba (demo, pruebas de catálogo, cuentas de un jugador que se
va del club) y hoy no tiene forma de quitarlas. "Retirar" (spec 054) solo borra una invitación
de `lista_blanca`; si el correo ya tiene cuenta, esta sigue existiendo para siempre.

## Objetivo

El admin ve la lista de cuentas existentes y puede borrar una de verdad: la fila de `usuario`
desaparece, junto con todo lo que dependía de ella, como si esa cuenta nunca hubiera existido.

## Fuera de alcance

- Soft-delete o cualquier marca de "cuenta desactivada" — es borrado definitivo (hard delete),
  no reversible.
- Que una cuenta se borre a sí misma como acción dedicada — esta spec solo cubre "el admin borra
  a otro". Nada impide que un admin se borre desde esta misma pantalla si hay más de un admin
  (no hay caso especial que lo prohíba), pero no es el escenario que se persigue aquí, y si el
  admin que se borra es el único, la regla de E3 ya lo bloquea igual que a cualquier otro intento
  de dejar el sistema sin admin. La sesión del admin borrado deja de servir sola, por el cascade
  de `sesion` sobre `usuario` — no hace falta cerrarla a mano.
- Auditoría de quién borró qué ni cuándo (ya es una carencia conocida, ADR 0043, A09).
- Papelera o periodo de gracia antes del borrado definitivo.
- Borrar en bloque (varias cuentas a la vez).

## Escenarios

**E1 — El admin borra una cuenta que no es admin**
- Dado: una cuenta con membresía en un equipo y una sesión activa
- Cuando: el admin la borra
- Entonces: la fila de `usuario` desaparece, junto con su membresía y su sesión — nada queda de
  ella

**E2 — Borrar una cuenta admin cuando hay más de una sí se permite**
- Dado: dos cuentas con `es_admin: true`
- Cuando: el admin borra una de ellas
- Entonces: se borra, y la otra sigue siendo admin sin cambios

**E3 — No se puede borrar al último admin**
- Dado: una única cuenta con `es_admin: true`
- Cuando: se intenta borrar esa cuenta (por sí misma o por otro admin, si lo hubiera)
- Entonces: se rechaza y la cuenta sigue existiendo tal cual

**E4 — Tras borrar, el correo puede volver a darse de alta como si fuera nuevo**
- Dado: una cuenta ya borrada
- Cuando: el admin invita otra vez ese mismo correo y alguien se registra con él
- Entonces: se crea una cuenta nueva y corriente — sin rol ni membresías heredadas de la que se
  borró

**E5 — El admin ve la lista de cuentas para elegir a quién borrar**
- Dado: varias cuentas existentes
- Cuando: el admin la consulta
- Entonces: ve, de cada una, al menos correo y si es admin

**E6 — Un entrenador o un usuario no pueden listar ni borrar cuentas**
- Dado: una cuenta que no es admin
- Cuando: intenta listar cuentas o borrar una
- Entonces: se rechaza (403)

**E7 — Sin sesión tampoco se puede listar ni borrar**
- Dado: ninguna sesión activa
- Cuando: se intenta listar cuentas o borrar una
- Entonces: se rechaza (401)

**E8 — La cuenta no se borra sin confirmación explícita**
- Dado: el admin pulsa "Borrar" sobre una cuenta, en la pantalla
- Cuando: no confirma el diálogo (lo cancela)
- Entonces: la cuenta sigue existiendo intacta; solo se borra si confirma

## Preguntas abiertas

Ninguna.

## Al cerrar

Mismo patrón que la 054: los 7 escenarios de servidor (E1-E3, E5-E7 más el 401/403 de
`exigirAdmin`, y E4 como test de integración) pasaron en verde sin necesitar un ciclo
rojo-verde propio en `domain/` — es orquestación de Prisma, no lógica de dominio que aislar. El
riesgo real estaba en E3 (contar admins antes de borrar) y en el cascade de E1, y los dos se
verificaron con los tests de integración contra Postgres real.

La desviación real, y la más instructiva: al escribir el test de E4 ("tras borrar, el correo se
puede volver a dar de alta como cuenta nueva") salió a la luz un bug ya existente en
`invitar()` (spec 054) — su `upsert` nunca ponía `usada_en` a `null` al reinvitar, así que
reinvitar un correo cuya cuenta se había borrado dejaba la invitación marcada como "ya usada"
para siempre, y `registrar()` la rechazaba aunque ya no hubiera ninguna cuenta detrás. No era un
bug visible en la 054 porque hasta ahora nunca existió una forma de que una cuenta dejara de
existir. Se corrigió en el mismo `update`, con test de integración cubriéndolo (E4). Ninguna
otra desviación: la interfaz `UsuariosRepository` se diseñó calcada de `ListaBlancaRepository`
y encajó sin retoques, y reutilizar `DialogoConfirmacion` para E8 fue igual de directo que en la
054.

Cobertura tras cerrar: 527/527 tests de dominio/aplicación/infraestructura (cliente, incluye los
nuevos de `UsuariosStore` y `HttpUsuariosRepository`), 94/94 tests de servidor (87 previos + 7 de
`usuarios.rutas.spec.ts`), typecheck limpio en ambos `tsconfig` (cliente y servidor). No existe
`test:coverage` en ninguno de los dos `package.json`; no se inventa una cifra.
