# 050 — La pizarra pide entrar

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

El servidor ya sabe distinguir cuentas y sesiones (spec 035), pero la pizarra sigue sin
preguntar nada: pide el catálogo al arrancar sin que nadie se haya identificado. Hace falta que
la aplicación misma pida entrar antes de mostrar nada de trabajo.

## Objetivo

Sin sesión, la aplicación muestra una pantalla para entrar o crear cuenta y no llega a pedir el
catálogo. Con sesión, se comporta exactamente como hoy.

## Fuera de alcance

- Restringir el editor según el rol — cualquier cuenta ve el editor igual que hoy. Eso es la
  spec 037.
- La pestaña "Teoría". Specs aparte.
- La ventana "Cuenta" real (nombre, posición favorita, dorsal, cambiar contraseña) — aquí solo
  gana un botón para salir, mínimo. La spec 053 construye la ventana completa.
- Recuperar una contraseña olvidada.
- Entrar con Google.
- Que una sesión caduque mientras se trabaja en el editor y la aplicación reaccione a mitad de
  un guardado: no hay manera de provocar ese caso todavía porque `/api/sistemas` sigue sin exigir
  sesión (spec 037). Se retomará si esa spec lo necesita.

## Escenarios

**E1 — Sin sesión, la aplicación muestra la pantalla de entrar**
- Dado: nadie ha entrado en este navegador
- Cuando: arranca la aplicación
- Entonces: se muestra la pantalla de entrar y no se pide el catálogo de sistemas

**E2 — Entrar con credenciales correctas da paso al tablero, con el catálogo ya cargado**
- Dado: una cuenta ya creada
- Cuando: entra con su correo y su contraseña correcta desde la pantalla de entrar
- Entonces: se muestra el tablero y su catálogo de sistemas

**E3 — Entrar con credenciales incorrectas deja el formulario en pie con un aviso**
- Dado: la pantalla de entrar
- Cuando: se envían un correo o una contraseña que el servidor rechaza
- Entonces: sigue en la pantalla de entrar, con un aviso, sin haber cargado ningún catálogo

**E4 — Crear cuenta con un correo invitado deja dentro directamente**
- Dado: un correo invitado por el admin, sin cuenta todavía
- Cuando: se completa el formulario de crear cuenta con ese correo y una contraseña
- Entonces: queda dentro de la aplicación, con el tablero visible, sin tener que teclear la
  contraseña una segunda vez

**E5 — Crear cuenta con un correo no invitado explica que hace falta una invitación**
- Dado: un correo que nadie ha invitado
- Cuando: intenta crear cuenta con ese correo
- Entonces: se queda en la pantalla de crear cuenta, con un aviso que explica que hace falta una
  invitación

**E6 — Con una sesión ya viva, recargar la aplicación no vuelve a pedir la contraseña**
- Dado: una sesión abierta en este navegador
- Cuando: se recarga la aplicación
- Entonces: se muestra el tablero directamente, sin pasar por la pantalla de entrar

**E7 — Salir vacía el catálogo y devuelve a la pantalla de entrar**
- Dado: una sesión abierta con el tablero visible
- Cuando: pulsa "Salir"
- Entonces: vuelve a la pantalla de entrar, y el catálogo deja de estar disponible

**E8 — Mientras se comprueba si hay sesión, no se enseña ni el tablero ni la pantalla de entrar**
- Dado: la aplicación acaba de arrancar
- Cuando: todavía no ha llegado la respuesta de si hay una sesión viva
- Entonces: no se muestra ni el tablero ni la pantalla de entrar — un estado de carga propio,
  para no parpadear del uno al otro

## Preguntas abiertas

Ninguna.

## Al cerrar

Los 8 escenarios están probados donde de verdad es verificable en este proyecto: como este
código vive en `application/` e `infrastructure/`, no en `domain/`, no aplica la regla de
cobertura al 100% ni el límite de un segundo — pero sigue el mismo rojo→mínimo→verde. `ui/` no
lleva test automático, por convención ya establecida (`docs/flujo-de-trabajo.md`, "Qué NO se
testea"): se verificó compilando y sirviendo la aplicación con el dev server de Angular
(`mcp__angular-cli__devserver_start`), sin errores de build. **No se hizo una comprobación
visual pixel a pixel del navegador** — esta sesión no usa automatización de navegador salvo que
se pida expresamente; queda pendiente de que el entrenador la abra y la mire.

Suite de dominio/application/infrastructure: 373/373. `npm run typecheck` limpio.

**Ninguna sorpresa de diseño.** El único ajuste no anticipado en la spec: `App` pasó de no
tener hoja de estilos propia a tener una mínima (`app.css`), solo para el estado de carga (E8).

**Decisión tomada al implementar, no elevada a ADR:** `/auth/entrar` no devuelve quién ha
entrado (spec 035 lo dejó así a propósito), así que `HttpAccesoRepository.entrar()` pregunta a
`/auth/quien-soy` justo después. Es una composición de dos llamadas ya existentes, no una
decisión estructural nueva.

**Deliberadamente mínimo:** el botón "Salir" vive en el mismo placeholder de "Cuenta" que ya
existía, con el email debajo. La ventana real (nombre, posición favorita, dorsal, cambiar
contraseña) es la spec 053.
