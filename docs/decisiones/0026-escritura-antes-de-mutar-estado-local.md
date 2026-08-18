# 0026 — El store escribe en el repositorio antes de mutar sus signals, nunca al revés

**Estado:** Aceptada

**Contexto.** Con `localStorage` detrás (ADR 0024), varios métodos de `SistemaStore` mutaban sus
signals (`sistemas`, `borrador`) y solo después llamaban al repositorio — el orden no importaba
porque una escritura en `localStorage` no falla nunca en la práctica. La spec 034 puso un
adaptador HTTP real detrás del mismo puerto, y ahí el orden sí importa: una petición de red puede
fallar por muchos motivos ajenos al usuario (sin conexión, el servidor caído, un conflicto de
edición). Con el orden antiguo, un fallo de red habría dejado el signal `sistemas` mostrando un
cambio que nunca llegó al servidor, y en `guardar()` en concreto `borrador` se habría puesto a
igualar `formacionGuardadaActiva()` como si el guardado hubiera tenido éxito — el entrenador vería
su formación como "guardada" y la perdería en cuanto recargara la pizarra en otro dispositivo. Es
"UI optimista" sin haberlo decidido nunca como tal: nadie lo escribió a propósito, era simplemente
inobservable mientras el repositorio no podía fallar.

**Decisión.** Los ocho métodos de escritura de `SistemaStore` (`crear`, `clonar`,
`renombrarActivo`, `cambiarSustitutoLibero`, `borrar`, `guardarExplicacion`,
`guardarDescripcion`, `guardar`) pasan por un helper común, `ejecutarEscritura`, que:

1. Llama primero al método del repositorio que corresponde.
2. Solo si esa llamada tiene éxito, muta los signals locales.
3. Si falla, deja los signals tal cual estaban —nada de trabajo perdido ni de estado a medias— y
   publica el fallo en un signal nuevo, `errorGuardado: { mensaje, reintentar } | null`, donde
   `reintentar` es una función que vuelve a invocar exactamente la misma llamada con los mismos
   argumentos.

`mensajeDeError` traduce las tres clases de error del puerto (`ErrorDeRed`, `ErrorDelServidor`,
`ConflictoDeEdicion`, `domain/puertos.ts`) a un mensaje legible en castellano. Nunca se reintenta
solo: el único disparador de `reintentar` es que el entrenador pulse el botón del aviso
(`tablero.html`, reutilizando `DialogoConfirmacion`).

**Consecuencias.** Ningún método de escritura del store hace ya nada "optimista": el estado que
ve la pantalla es siempre el que el servidor confirmó, o el borrador tal cual el usuario lo dejó
si el servidor no respondió. Esto es válido para cualquier adaptador presente o futuro de
`SistemaRepository`, no solo para el HTTP — si algún día `LocalStorageSistemaRepository` empezara
a fallar (cuota llena, por ejemplo), se beneficiaría del mismo mecanismo sin cambiar una línea del
store.

El coste es un nivel más de indirección en cada método de escritura (pasan por
`ejecutarEscritura`/`reemplazarSistema` en vez de mutar directamente), y que cada uno tiene que
declarar explícitamente su propio `reintentar` como clausura sobre sus argumentos originales.
