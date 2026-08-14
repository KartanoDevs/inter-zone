# 008 — Persistencia en el navegador

**Estado:** Congelada
**Paso de la hoja de ruta:** 3

## Problema

Todo lo que la aplicación sabe hoy —sistemas, rotaciones, explicaciones— vive solo en memoria.
Recargar la página, o cerrar la pestaña, lo borra todo. Un entrenador que ha invertido tiempo
en construir varios sistemas no puede permitirse perderlos al cerrar el navegador.

## Objetivo

El catálogo completo de sistemas, con sus rotaciones y explicaciones, sobrevive a recargar la
página y a cerrar y volver a abrir el navegador, guardado en el propio dispositivo.

## Fuera de alcance

- Sincronizar entre dispositivos o compartir con otra persona: eso requeriría un servidor
  (ADR 0001), fuera de la v1.
- Exportar e importar como fichero (JSON o PNG): spec futura.
- La migración real de una versión de datos a otra: en la v1 solo hay una versión, así que el
  mecanismo de migración existe pero no tiene nada que migrar todavía.

## Escenarios

**E1 — Ida y vuelta sin pérdida**
- Dado: un catálogo con varios sistemas, rotaciones guardadas y explicaciones
- Cuando: se guarda y se vuelve a leer
- Entonces: el catálogo leído es igual, sistema por sistema y rotación por rotación

**E2 — Almacén vacío**
- Dado: un dispositivo donde nunca se ha guardado nada
- Cuando: se lee el catálogo
- Entonces: se obtiene una lista vacía, sin ningún error

**E3 — Datos corruptos**
- Dado: algo ilegible guardado donde debería estar el catálogo
- Cuando: se lee el catálogo
- Entonces: no se interrumpe el arranque de la aplicación

**E4 — Versión futura desconocida**
- Dado: un catálogo guardado marcado con una versión de formato posterior a la que la
  aplicación conoce
- Cuando: se lee
- Entonces: no se sobrescribe a ciegas con una versión que la aplicación no sabe interpretar

**E5 — Borrado**
- Dado: un sistema guardado
- Cuando: se borra y se guarda el catálogo resultante
- Entonces: al releer, ese sistema ya no aparece

**E6 — Precisión de los metros**
- Dado: una formación con coordenadas con decimales
- Cuando: se guarda y se vuelve a leer
- Entonces: los decimales llegan exactos, sin redondear

**E7 — Las explicaciones sobreviven**
- Dado: una rotación y un jugador con explicación de enseñanza
- Cuando: se guarda y se vuelve a leer
- Entonces: ambas explicaciones llegan intactas

**E8 — Forma del guardado**
- Dado: cualquier catálogo
- Cuando: se guarda
- Entonces: lo escrito tiene la forma que fija `docs/arquitectura.md` — un número de versión
  junto a los datos, nunca los datos sueltos

**E9 — La fecha de creación se fija una sola vez**
- Dado: un sistema recién creado
- Cuando: se guarda por primera vez y, más tarde, se guarda de nuevo tras editar alguna de sus
  rotaciones
- Entonces: su fecha de creación es la misma en ambos guardados

**E10 — La fecha de modificación cambia con cada guardado**
- Dado: un sistema ya persistido
- Cuando: se guarda de nuevo tras cambiar una rotación o una explicación
- Entonces: su fecha de última modificación se actualiza, sin tocar la de creación

## Preguntas abiertas

Ninguna. Resueltas con el usuario:

- **Se persiste solo cuál de las dos variantes de plantilla usa cada sistema** —con el segundo
  central o con el líbero—, no la plantilla completa. En la v1 la plantilla en sí es una
  constante fija del código; al leer, se reconstruye a partir de ese dato. Cuando en la V2 haya
  varias plantillas de verdad, este campo se sustituye por una referencia a la plantilla
  elegida, sin tocar el resto del esquema.
- **Las coordenadas `x`/`y` se guardan tal cual**, sin redondear ni restringir su número de
  decimales en la v1 (E6 ya lo exige: nada se pierde al guardar y releer).
- **Se guardan ya fecha de creación y de última modificación de cada sistema** (E9, E10), aunque
  hoy la pantalla no las muestre, para que la V2 no tenga que inventarlas al migrar.

## Al cerrar

Pendiente. Se rellena cuando la spec se cierre.
