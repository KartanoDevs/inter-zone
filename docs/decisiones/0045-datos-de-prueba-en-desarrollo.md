# 0045 — Datos de prueba en desarrollo

**Estado:** Aceptada

## Contexto

Desde el [ADR 0044](0044-produccion-y-desarrollo-en-la-misma-maquina.md), desarrollo es un
despliegue completo aparte, con su propia base de datos, que nace vacía y se siembra con
`seed:prod` (dos sistemas de ejemplo, ambos del equipo masculino). Eso basta para arrancar, pero
es poco para enseñar la aplicación: el equipo femenino no tiene nada, no hay ningún sistema de
recepción con muy pocos jugadores en la línea de recepción, y "TEST Defensa zonas" deja sin
colocación la postura inicial y el ataque por 1 (spec 038, E20).

Además, el trabajo de fin de máster necesita una URL con acceso que un tribunal externo pueda
usar sin pedir credenciales a nadie: la web de desarrollo, con una cuenta de demostración.

## Decisión

1. **Una segunda semilla, separada de la de arranque y explícitamente destructiva.**
   `server/src/infraestructura/semilla-desarrollo.ts` (`npm run seed:pruebas` /
   `seed:pruebas:prod`) crea seis sistemas de prueba variados — "Rotación base" en los dos
   equipos, "TEST Recepción 5-1", "TEST Defensa zonas", "TEST Defensa completa" (las 34
   variantes que admite el dominio) y "TEST Recepción a 2" (femenino, con solo el líbero y el
   receptor de zaga recibiendo) — y **los sustituye si ya existen con ese nombre**. Es lo
   contrario de `sembrarEjemplos` en `semilla.ts`, que nunca pisa un sistema ya sembrado: aquí
   el objetivo es justo el opuesto, dejar siempre el mismo juego de datos conocido, así que se
   ejecuta a petición explícita (`DATOS_DE_PRUEBA=si` en `deploy-servidor.sh`), nunca en el
   arranque normal del contenedor.
2. **Los datos de prueba viven en `server/`, no en `src/app/domain/`.** No son reglas de
   voleibol, sino contenido de un entorno concreto; meterlos en `domain/` habría cargado la
   cobertura del 100 % de esa carpeta con datos que no prueban ninguna regla. Reutilizan las
   factorías del dominio que ya existían (`sistemaPorDefecto`, `sistemaDefensaPorDefecto`,
   `formacionDefensaPorDefecto`) para las formaciones ya validadas, y solo se escriben a mano
   las dos que no tenían factoría: "Rotación base" (copiada de un despliegue local existente,
   redondeada a centímetros) y "TEST Recepción a 2" (geometría nueva, comprobada contra
   `validarFormacion` en `datos-desarrollo.spec.ts` para no enseñar una falta de posición
   inventada).
3. **La cuenta demo (`admin@cvinter.com`) la crea la misma semilla, solo en desarrollo.** Se
   invita y se registra por el camino normal (`registrar`, con `scrypt`), nunca escribiendo un
   hash a mano. A diferencia de los sistemas, si la cuenta ya existe la semilla NO la toca —
   ni contraseña ni rol — para no invalidar una sesión abierta. Sus credenciales
   (`admin@cvinter.com` / `12345678`) se publican a propósito en el README: es el acceso que
   necesita el tribunal del TFM, y el entorno es desechable y sin datos reales (ADR 0044, punto
   5), así que no hay nada que proteger detrás de ellas.

## Consecuencias

- `DATOS_DE_PRUEBA` es una variable de entorno nueva, en el mismo espíritu que
  `COPIAS_DE_SEGURIDAD` del ADR 0044: lo que distingue producción de desarrollo sigue viviendo
  por completo en el `.env` de cada clon. **Debe valer `no` en producción, siempre** — se
  documenta con una advertencia en `.env.produccion.example`, igual que otras variables
  sensibles a la identidad del entorno.
- Volver a desplegar desarrollo dos veces seguidas con `DATOS_DE_PRUEBA=si` no duplica nada: la
  semilla busca cada sistema por su `(equipo_id, tipo, nombre)` — la `@@unique` que ya impone el
  esquema — y sustituye su contenido si lo encuentra, en vez de crear uno nuevo cada vez.
- Un entrenador que entrara a la web de desarrollo y editara a mano uno de los seis sistemas de
  prueba perdería su cambio en el siguiente despliegue con `DATOS_DE_PRUEBA=si`. Aceptable: el
  ADR 0044 ya establece que desarrollo no guarda nada que no se pueda recrear.

## Alternativas descartadas

- **Añadir los sistemas de prueba a `sembrarEjemplos` (`semilla.ts`)**: se descarta porque esa
  función es idempotente en el sentido de "nunca pisar trabajo real" — necesaria en producción,
  donde si existiera alguna vez datos reales no se puede sobrescribir nada — y estos datos
  necesitan justo lo contrario: sustituirse en cada despliegue de desarrollo para no acumular
  sistemas obsoletos de pruebas anteriores.
- **Restaurar una copia de producción en desarrollo**: ya descartada por el ADR 0044 (expone
  datos reales de entrenadores en un entorno abierto a cualquiera); sigue sin tener sentido
  aquí por el mismo motivo.
- **Contraseña de la cuenta demo distinta en cada despliegue**: más "seguro" en apariencia, pero
  inútil en la práctica — el objetivo es justo que cualquiera con el enlace del README pueda
  entrar sin pedir nada, y el entorno no guarda nada que proteger.
