# 065 — Los datos se refrescan al abrir una ventana

**Estado:** Congelada
**Paso de la hoja de ruta:** No encaja en ninguno: es una corrección de comportamiento, no una
capacidad nueva.

## Problema

Dos entrenadores trabajando a la vez no se ven los cambios del otro. Si uno mueve las fichas de
una rotación y guarda, el otro sigue viendo la formación vieja hasta que recarga la página
entera. Lo mismo con los logros: alguien supera un examen y gana una insignia, pero al abrir
"Logros" no aparece si esa ventana ya se abrió antes en la misma sesión. El catálogo se pide una
sola vez, justo al entrar, y nunca más.

## Objetivo

Al abrir la pestaña Editor, Teoría o Examen se vuelve a pedir el catálogo de sistemas al
servidor; al abrir "Logros", se vuelven a pedir las insignias. Lo que estaba a medio editar no
se pisa.

## Fuera de alcance

- **Refrescar en tiempo real** mientras la ventana está abierta (websockets, sondeo periódico).
  El refresco es al *entrar* en la ventana, no continuo.
- **Refrescar al cambiar de sistema en el desplegable** o de rotación. El desplegable ya trabaja
  sobre un catálogo recién pedido al abrir la ventana.
- **Resolver un conflicto de edición** entre dos entrenadores sobre el mismo sistema. Eso ya lo
  cubre el testigo `If-Match` (spec 034); esta spec solo hace que el segundo entrenador vea antes
  el trabajo del primero.
- **La ventana Cuenta / "Datos".** No pide nada al servidor que pueda quedar rancio.
- **La pantalla de acceso y el arranque.** El primer `cargar()` sigue disparándose igual (spec
  050).

## Escenarios

**E1 — Abrir el Editor vuelve a pedir el catálogo**
- Dado: la aplicación en la ventana Cuenta, con el catálogo ya cargado
- Cuando: se abre la pestaña Editor
- Entonces: se hace una petición nueva del catálogo al servidor

**E2 — Abrir Teoría vuelve a pedir el catálogo**
- Dado: la aplicación en otra ventana
- Cuando: se abre Teoría
- Entonces: se pide el catálogo de nuevo, y un sistema que otro entrenador acaba de validar ya
  aparece

**E3 — Abrir Examen vuelve a pedir el catálogo**
- Dado: la aplicación en otra ventana
- Cuando: se abre Examen
- Entonces: se pide el catálogo de nuevo

**E4 — Recargar mantiene el sistema activo si sigue existiendo**
- Dado: el Editor con un sistema concreto activo
- Cuando: se sale a otra ventana y se vuelve al Editor
- Entonces: sigue activo ese mismo sistema, en la misma rotación — no salta al primero del
  catálogo

**E5 — Recargar no pisa una edición sin guardar**
- Dado: el Editor con fichas movidas y sin guardar
- Cuando: se cambia de ventana y se vuelve
- Entonces: la edición a medias sigue ahí; el catálogo se refresca por debajo pero la formación
  en curso no se toca

**E6 — Un sistema borrado por otro entrenador desaparece al volver**
- Dado: el Editor con un sistema activo que otro entrenador borra mientras tanto
- Cuando: se sale y se vuelve al Editor
- Entonces: ese sistema ya no está; queda activo el primero del catálogo, como cuando se borra
  uno desde la propia sesión

**E7 — Abrir "Logros" vuelve a pedir las insignias**
- Dado: la ventana Cuenta, con "Logros" ya abierto antes en esta sesión
- Cuando: se vuelve a "Logros" tras haber ganado una insignia en un examen
- Entonces: la insignia nueva aparece

## Preguntas abiertas

Ninguna. Resueltas con el usuario antes de congelar:

- **Refresco al entrar en la ventana**, no por cada cambio de sistema ni por sondeo periódico.
- El sistema activo se **preserva** al recargar si sigue existiendo (E4); esto obliga a cambiar
  cómo `cargar()` elige el sistema activo, que hoy siempre coge el primero.

## Al cerrar

Los 7 escenarios se cumplen. Suite: 510 → 515 — nuevos en `application/sistema.store.spec.ts`
(E1, E4, E5, E6) y `application/insignias.store.spec.ts` (E7). E2 y E3 son la misma llamada que
E1 desde otra ventana; se cubren por revisión de `Tablero.entrarEnVentana`. `npm run typecheck`,
`npm run build` y `npm run format:check` limpios.

**Método nuevo `SistemaStore.refrescarCatalogo()`, separado de `cargar()`**, no un parámetro más.
`cargar()` es el arranque: pide catálogo + ajustes, resetea el sistema activo al primero.
`refrescarCatalogo()` es la reentrada: solo el catálogo, conservando el sistema activo si sigue
existiendo y sin tocar el borrador si hay una edición sin guardar. Mezclarlos habría llenado
`cargar()` de condicionales.

**`Tablero` ganó `entrarEnVentana()` como único punto que fija `ventana()`.** Antes tres sitios
hacían `this.ventana.set(destino)` por su cuenta (`irAVentana`, `confirmarSalidaExamen`,
`volverDeExamen`); ahora los tres pasan por el mismo método, que dispara el refresco al abrir
Editor/Teoría/Examen. El primer render no dispara doble petición: el `cargar()` inicial de `App`
ya la hace y `ventana` arranca con su valor sin pasar por `entrarEnVentana`.

**Teoría y Examen heredan el refresco sin tocarlos:** sus `catalogo` son `computed` sobre
`SistemaStore.sistemas()`, así que en cuanto `refrescarCatalogo` actualiza esa signal, sus
ventanas se repintan solas.

**`InsigniasStore` no cambió; sí `perfil-cuenta.verVista`:** se quitó la guarda `!cargadas()`
que impedía volver a pedir las insignias. Ahora "Logros" refresca cada vez que se abre (solo se
protege contra pedirlo dos veces a la vez con `!cargando()`). La señal `cargadas` se mantiene:
sigue distinguiendo "vino vacío" de "no pedido" para el mensaje de vitrina vacía.

**Sin ADR nuevo ni cambio en `docs/dominio.md`:** es una corrección de comportamiento de un
flujo existente. Sí se toca `docs/arquitectura.md` (ADR 0027): `refrescarCatalogo` y
`entrarEnVentana`.

**Lo que no se desvió:** el diseño acordado (refresco al entrar, sistema activo preservado,
edición sin guardar intocable) salió tal cual.
