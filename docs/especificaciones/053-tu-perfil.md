# 053 — Tu perfil

**Estado:** Completada
**Paso de la hoja de ruta:** 8

## Problema

La ventana "Cuenta" solo tiene un botón de salir (spec 050). Nadie puede decir cómo se llama,
de qué juega, o cambiar su contraseña sin tocar la base de datos a mano.

## Objetivo

Cualquier cuenta ve su correo y su rol, y puede guardar nombre, posición favorita y dorsal
—los tres opcionales— y cambiar su contraseña, siempre acertando la actual.

## Fuera de alcance

- Cambiar el propio correo o el propio rol — no se pueden tocar desde aquí, ni aunque se manden
  en la petición.
- Ver o editar el perfil de otra cuenta.
- Foto de perfil.
- Mover los `Ajustes` de pantalla a la cuenta — siguen en `localStorage` por dispositivo.
- Recuperar una contraseña olvidada (hace falta la actual siempre).
- Borrar la propia cuenta.

## Escenarios

**E1 — El perfil muestra el correo, el rol y los campos ya guardados**
- Dado: una cuenta con nombre y dorsal ya guardados
- Cuando: abre la ventana Cuenta
- Entonces: ve su correo, su rol, y esos dos campos con su valor

**E2 — Guardar un nombre lo deja visible al recargar**
- Dado: una cuenta sin nombre guardado
- Cuando: escribe un nombre y guarda
- Entonces: sigue ahí tras recargar la aplicación

**E3 — La posición favorita solo admite los cinco roles de voleibol del dominio**
- Dado: cualquier cuenta
- Cuando: intenta guardar una posición favorita que no sea colocador, receptor, central,
  opuesto o líbero
- Entonces: se rechaza

**E4 — Un dorsal fuera de 1-99 se rechaza**
- Dado: cualquier cuenta
- Cuando: intenta guardar un dorsal menor que 1 o mayor que 99
- Entonces: se rechaza, y el dorsal guardado no cambia

**E5 — Dejar los tres campos en blanco es válido**
- Dado: una cuenta recién creada
- Cuando: guarda el perfil sin tocar nombre, posición favorita ni dorsal
- Entonces: se guarda sin error — son opcionales de verdad

**E6 — Vaciar un campo que tenía valor lo borra**
- Dado: una cuenta con dorsal guardado
- Cuando: guarda el perfil con el campo de dorsal en blanco
- Entonces: el dorsal guardado queda vacío, no como estaba

**E7 — Cambiar la contraseña exige acertar la actual**
- Dado: una cuenta con contraseña
- Cuando: intenta cambiarla escribiendo mal la contraseña actual
- Entonces: se rechaza, y la contraseña no cambia

**E8 — La nueva contraseña también tiene que llegar al mínimo**
- Dado: la contraseña actual correcta
- Cuando: la nueva contraseña es más corta que el mínimo
- Entonces: se rechaza

**E9 — El correo y el rol no cambian aunque se manden en la petición**
- Dado: cualquier cuenta
- Cuando: guarda su perfil mandando también un correo o un rol distintos
- Entonces: su correo y su rol siguen siendo los mismos de antes

## Preguntas abiertas

Ninguna.

## Al cerrar

Los 9 escenarios en verde, repartidos en las tres capas donde de verdad se pueden probar:
dominio (`roles.spec.ts` para `esRolIdValido`, `acceso.spec.ts` para `dorsalValido`/
`normalizarNombre`), servidor (`auth.rutas.spec.ts`, describe "perfil (spec 053)", contra
Postgres real) y `application/` (`acceso.store.spec.ts`). `ui/` no lleva test automático, como
en el resto del proyecto; se verificó compilando con el dev server de Angular y con una
comprobación manual end-to-end por HTTP (registro → guardar perfil → quien-soy →
dorsal inválido rechazado → cambiar contraseña → entrar con la nueva). Suite de dominio:
404/404. Suite de servidor: 53/53. `npm run typecheck` limpio.

**Decisión de forma tomada al escribir la spec, no en el encargo original:** `DatosPerfil` manda
siempre los tres campos juntos (nombre, posición favorita, dorsal), nunca un parche parcial con
"no toques este campo". La alternativa —cada campo opcional de verdad, con `undefined` para "no
tocar" y `null` para "vaciar"— habría cubierto lo mismo, pero con un tercer estado que no aporta
nada aquí: el formulario de perfil ya manda su estado completo en cada guardado, como cualquier
formulario normal, así que la ambigüedad extra solo habría sido riesgo de bug sin beneficio.

**Reutilización directa de un patrón ya existente:** `normalizarNombre` sigue exactamente el
criterio de `describirSistema` (`catalogo-sistemas.ts`, spec 025) — un texto en blanco borra el
campo. Ninguna sorpresa: es la tercera vez que este patrón aparece en el dominio (descripción de
sistema, explicación de rotación, y ahora nombre de perfil), y las tres veces con el mismo
criterio.

**Ninguna otra sorpresa.** El resto salió tal como se planificó.
