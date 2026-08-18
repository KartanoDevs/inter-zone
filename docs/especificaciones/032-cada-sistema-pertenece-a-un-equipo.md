# 032 — Cada sistema pertenece a un equipo

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

El club tiene equipo masculino y femenino, y hoy la pizarra los mezcla en un único catálogo: no
hay forma de que un entrenador vea solo los sistemas de su equipo, ni de tener un «5-1» de
recepción en cada uno sin que sus nombres choquen.

## Objetivo

Todo sistema pertenece a un equipo, masculino o femenino, elegido al crearlo. El catálogo que se
ve y con el que se trabaja es siempre el de un equipo a la vez, con un desplegable para cambiar
de cuál.

## Fuera de alcance

- **El estado validado/borrador.** No tiene ningún efecto todavía sin alguien que pueda
  validar: se añade con los roles, en la spec 037.
- **Un tercer equipo, o renombrar «Masculino»/«Femenino».** Los dos son fijos por ahora, igual
  que la plantilla es hoy una única constante de la aplicación (ADR 0013). Equipos de verdad,
  gestionables, llegan con la base de datos (specs 033-034).
- **Sembrar los sistemas de ejemplo también para el equipo femenino.** Simplificación
  deliberada — ver E11 — que se puede corregir después sin tocar el modelo.
- **Mover un sistema ya creado de un equipo a otro.**
- **Cualquier control de quién puede ver o crear en cada equipo.** Sin cuentas todavía,
  cualquiera ve y edita los dos (spec 037 lo cierra).
- Backend, base de datos, red: sigue todo en `localStorage`. La forma persistida sube de
  versión.

**Esta spec toca `application/`, `infrastructure/` y `ui/`, además de `domain/`.** El
desplegable de equipo y el filtrado del catálogo no existen sin tocar esas capas. Queda
autorizado explícitamente aquí, igual que las specs 009, 021 y 025.

## Escenarios

### Un sistema nace en el equipo que se elija

**E1 — Crear asigna el sistema al equipo elegido**
- Dado: el catálogo, cualquiera que sea
- Cuando: se crea un sistema para el equipo femenino
- Entonces: el sistema creado pertenece al equipo femenino

**E2 — El mismo nombre puede repetirse en equipos distintos**
- Dado: un sistema de recepción llamado «5-1» en el equipo masculino
- Cuando: se crea otro sistema de recepción llamado «5-1» en el equipo femenino
- Entonces: se acepta

**E3 — Dentro del mismo equipo, el nombre repetido se sigue rechazando**
- Dado: un sistema de recepción llamado «5-1» en el equipo masculino
- Cuando: se intenta crear otro sistema de recepción llamado «5-1» en el equipo masculino
- Entonces: se rechaza, igual que hoy

**E4 — Clonar mantiene el sistema en el mismo equipo que el original**
- Dado: un sistema del equipo femenino
- Cuando: se clona
- Entonces: el clon pertenece también al equipo femenino

### El catálogo es siempre el de un equipo

**E5 — El catálogo solo muestra los sistemas del equipo activo**
- Dado: sistemas guardados en los dos equipos
- Cuando: se consulta el catálogo con el equipo masculino activo
- Entonces: solo aparecen los sistemas del equipo masculino

**E6 — Cambiar de equipo activa el primero del catálogo del equipo nuevo**
- Dado: sistemas guardados en los dos equipos
- Cuando: se cambia el equipo activo a femenino
- Entonces: el sistema activo pasa a ser el primero del catálogo de femenino, o ninguno si ese
  equipo no tiene sistemas todavía

**E7 — Cambiar de equipo con cambios sin guardar pide confirmar**
- Dado: una formación sin guardar en el sistema activo
- Cuando: se intenta cambiar de equipo
- Entonces: aparece el mismo aviso de cambios sin guardar que al cambiar de rotación o de
  sistema; confirmar descarta los cambios y cambia, cancelar mantiene el equipo y los cambios
  tal y como estaban

**E8 — Crear un sistema para el equipo activo lo deja activo, sin cambiar de equipo**
- Dado: el equipo masculino activo
- Cuando: se crea un sistema para el equipo masculino
- Entonces: el sistema activo pasa a ser el creado; el equipo activo sigue siendo masculino

**E9 — Crear un sistema para el otro equipo cambia el equipo activo**
- Dado: el equipo masculino activo
- Cuando: se crea un sistema para el equipo femenino
- Entonces: el equipo activo pasa a ser femenino y el sistema creado queda activo — para que se
  vea de inmediato lo que se acaba de crear

### Persistencia

**E10 — El equipo de un sistema sobrevive a guardar y releer**
- Dado: un sistema del equipo femenino
- Cuando: se guarda y se vuelve a leer
- Entonces: sigue perteneciendo al equipo femenino

**E11 — Sin nada guardado, los sistemas de ejemplo son del equipo masculino**
- Dado: un almacén vacío
- Cuando: se lee el catálogo
- Entonces: los dos sistemas de ejemplo pertenecen al equipo masculino; el equipo femenino
  empieza sin ningún sistema

## Preguntas abiertas

Ninguna. Decisiones tomadas antes de congelar:

- El equipo activo por defecto, al abrir la aplicación, es masculino.
- El nombre puede repetirse entre equipos porque la unicidad pasa a comprobarse por
  `(equipo, tipo, nombre)`, exactamente como ya fija `docs/modelo-de-datos.md` para la base de
  datos futura — esta spec adelanta esa regla al modelo de dominio de hoy.
- Los sistemas de ejemplo (specs 025, 030) solo se siembran para el equipo masculino (E11); no
  es una limitación técnica, es no inventar contenido de ejemplo para un equipo del que no hay
  guía de referencia.

## Al cerrar

Los 11 escenarios pasan, más 4 de refuerzo que no cambian lo que prueban pero sí lo hacen más
explícito (032-E6b: equipo sin sistemas; 032-E7b/E7c: confirmar/cancelar el cambio pendiente de
equipo, simétricos a los que ya existían para rotación y vía). Partida: 254 tests; al cerrar,
268 — 14 nuevos (4 en `domain/catalogo-sistemas.spec.ts`, 8 en
`application/sistema.store.spec.ts`, 2 en `infrastructure/local-storage-sistema.repository.spec.ts`).
No existe `npm run test:coverage`; no se reporta cobertura numérica, mismo motivo que en specs
anteriores. `npm run build` compila limpio. No se ha verificado con el navegador (memoria del
usuario: no automatizar con Playwright salvo que se pida); el campo de equipo del diálogo y el
selector de pestañas son radios y botones que siguen exactamente el patrón ya existente de
`tipoSeleccionado` y `SelectorVia`, así que el riesgo de una diferencia visual se consideró bajo,
igual que ya asumieron las specs 026 y 029 para cambios de forma equivalentes.

**Un efecto colateral no previsto en el diseño inicial: `crear()` tuvo que ganar la capacidad de
cambiar `equipoActivo`.** El primer borrador de la spec asumía que el equipo se elegía en el
diálogo pero el catálogo seguía mostrando el equipo que ya estaba activo. Escribir 032-E9 obligó
a decidir qué pasa si se crea un sistema para el equipo *que no se está viendo*: dejarlo invisible
hasta que alguien cambiara de pestaña a mano habría sido confuso — «he creado un sistema y no lo
veo». Se resolvió cambiando `equipoActivo` dentro de `crear()` cuando el equipo elegido difiere del
activo, documentado ahora en el propio método. No estaba en el objetivo original tal y como se
redactó, pero es la lectura más razonable de «Crear un sistema para el otro equipo cambia el
equipo activo» (E9), que si ya estaba en los escenarios.

**Lo que sorprendió, en el buen sentido:** el `equipoId` de un sistema no tuvo que enseñarse
explícitamente a casi nada de lo que ya existía. `sistemaActivo` sigue siendo
`sistemas().find(s => s.id === sistemaActivoId())`, sin filtrar por equipo — solo `catalogo()` (lo
que se *ve* en el desplegable) filtra. Eso significa que activar un sistema por id concreto (algo
que hoy no ocurre desde fuera del propio store, pero que el diseño no impide) seguiría funcionando
aunque ese sistema no fuera del equipo activo. No se ha escrito ningún escenario sobre ese caso
porque hoy no hay ningún camino de la UI que lo provoque; queda anotado por si en el futuro (por
ejemplo, un enlace directo a un sistema concreto) hiciera falta decidir si eso debe forzar también
un cambio de equipo.

**`renombrarSistema` no necesitó ningún cambio de comportamiento**, solo que su `colisiona`
interno ahora mira también el equipo — pero como toma el equipo de `sistema.equipoId` en vez de
recibirlo aparte, su firma pública no cambió. `clonarSistema` tampoco: sigue sin parámetro de
equipo, y el clon hereda `sistema.equipoId` por el mismo motivo. Ninguno de los dos rompió ningún
llamador existente.

**Lo que no se desvió:** ninguna regla de `docs/dominio.md` resultó incorrecta — pertenecer a un
equipo no es una regla de voleibol, es organización de club. La decisión de sembrar ejemplos solo
para el equipo masculino (E11), tomada antes de congelar, se mantuvo sin ajustes.
