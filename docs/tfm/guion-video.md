# Guion del vídeo — TFM InterZone

Guion para seguir en voz alta mientras grabas pantalla. Está pensado para leerlo de un vistazo
mientras trabajas, no para memorizarlo. Duración objetivo: **10-12 minutos**.

Formato de cada bloque: **qué haces en pantalla** · **qué dices** (frases guía, no literales —
dilo con tus palabras) · **tiempo**.

---

## Antes de grabar — checklist

- [ ] Sesión iniciada en `https://dev.cvinterzone.duckdns.org` con `admin@cvinter.com` /
      `12345678`, y ya comprobado que funciona.
- [ ] Al menos un sistema de recepción y uno de defensa **validados**, cargados y con nombre
      claro (evita el que se llama `111Inter Recepción 5-1 (copia)` — bórralo o renómbralo
      antes de grabar).
- [ ] Notificaciones del sistema operativo silenciadas.
- [ ] Zoom del navegador al 100 % (o al tamaño que se lea bien en vídeo — pruébalo antes).
- [ ] Una terminal aparte abierta en la raíz del proyecto, con `npm test` ya probado una vez
      (para que no tarde por la caché fría la primera vez que lo enseñes).
- [ ] Editor de código abierto con `src/app/domain/validacion.ts` y con
      `docs/especificaciones/001-validacion-falta-posicional.md` listos en pestañas, para no
      tener que buscarlos en directo.
- [ ] Decide ya si grabas tu cara con cámara o no — es opcional, la captura de pantalla es
      obligatoria.

---

## 0. Introducción — 0:00 a 1:00

**Pantalla:** portada de la app (pantalla de login) o el vídeo empieza con tu cámara/voz sin
pantalla de app todavía.

**Di:**
- Quién eres y qué es este proyecto: InterZone, un TFM.
- En una frase: es una pizarra táctica de voleibol que valida las posiciones legales y explica
  el porqué, no solo las dibuja.
- Qué vas a enseñar en el vídeo: la app funcionando y, al final, un vistazo rápido a cómo está
  construida por dentro.

---

## 1. Entrar en la aplicación — 1:00 a 1:30

**Pantalla:** formulario de login en `dev.cvinterzone.duckdns.org`.

**Haz:** escribe el correo y la contraseña de prueba (puedes decirlos en voz alta, son públicos
a propósito) y entra.

**Di:**
- El acceso es por lista blanca: nadie se registra libremente, el admin invita un correo y ese
  correo fija el rol.
- Esta cuenta de prueba tiene rol admin, así que vas a poder enseñar todas las ventanas.

---

## 2. El editor — la pizarra de recepción — 1:30 a 4:00

**Pantalla:** ventana Editor, sistema de recepción cargado.

**Haz, en este orden:**
1. Señala la pista y las seis fichas colocadas.
2. Arrastra una ficha a una posición que provoque una **falta** (por ejemplo, mueve un receptor
   por delante del colocador en su misma columna). Muestra el aviso de falta.
3. Intenta guardar y muestra que **se bloquea**.
4. Deshaz el movimiento (o arrástrala a un sitio válido) y guarda con éxito.
5. Cambia de rotación (R1 → R2, por ejemplo) y muestra cómo cambian las posiciones.
6. Señala al líbero: explica que entra y sale de la formación solo, según a quién sustituye en
   esa rotación.

**Di, mientras lo haces:**
- Las posiciones están en metros reales, nunca en píxeles — eso solo existe en el dibujo.
- Hay tres estados, no dos: válida, al límite (por muy poco) y falta. "Legal por tres
  centímetros" es información útil para el entrenador, no un aprobado silencioso.
- El líbero es un séptimo jugador: vive fuera del orden de saque y sustituye a cualquier
  jugador de zaga, no solo al central — es una regla FIVB real, no una costumbre táctica.

---

## 3. Sistemas de defensa — 4:00 a 6:00

**Pantalla:** cambia a un sistema de tipo defensa.

**Haz:**
1. Muestra el selector de caso del colocador rival y de situación de ataque.
2. Cambia el número de bloqueadores (0 a 3) y señala cómo cambia quién bloquea.
3. Abre el panel de "Pintado" y pinta una zona de responsabilidad sobre la rejilla.
4. Pinta una segunda zona que se solape con la primera y muestra el patrón de franjas.
5. Mueve al atacante rival o a un bloqueador y muestra cómo se recalcula la sombra del bloqueo.

**Di:**
- En defensa la rotación no manda nada: lo que organiza el sistema es el caso del colocador
  rival y la situación de ataque.
- Las zonas se pintan arrastrando, con relleno por contorno, sin ninguna librería de gráficos.
- La sombra del bloqueo es la superficie que la pared de bloqueadores esconde al atacante — se
  recalcula sola y se puede retocar a mano.

---

## 4. Teoría — 6:00 a 7:00

**Pantalla:** ventana Teoría, mismo sistema que enseñaste en el Editor.

**Haz:** navega por las rotaciones o por caso/situación, muestra las explicaciones de
enseñanza si las hay.

**Di:**
- Teoría es la vista de solo consulta: cualquier cuenta del equipo ve los sistemas validados,
  con las mismas fichas, zonas y explicaciones que en el editor, sin poder tocar nada.
- Los textos de enseñanza son voluntarios, a tres niveles: sistema, rotación y jugador.

---

## 5. Examen y medallas — 7:00 a 8:30

**Pantalla:** ventana Examen.

**Haz:**
1. Configura un examen (por puesto, por línea o por sistema completo).
2. Arrastra alguna ficha a su sitio (puedes fallar una a propósito para enseñar el boletín).
3. Muestra el boletín final con la nota y la comparación con el modelo del entrenador.
4. Ve a la ventana Cuenta y enseña la vitrina de medallas.

**Di:**
- Las faltas solo se ven al validar cada rotación, no mientras arrastras — es un examen guiado,
  no una chuleta en vivo.
- La nota decae con la distancia al modelo del entrenador; con 7 o más y sin faltas se gana una
  insignia de bronce, plata u oro.
- La vitrina de medallas solo cuenta los sistemas validados por el equipo.

---

## 6. Administración — 8:30 a 9:30

**Pantalla:** ventanas Lista blanca, Cuentas y Exportar sistemas.

**Haz:**
1. Enseña la lista blanca: invitar un correo (no hace falta completarlo de verdad).
2. Enseña la lista de cuentas.
3. Enseña exportar el catálogo a JSON (puedes lanzar la descarga y enseñar el fichero).

**Di:**
- El admin gestiona todo esto desde dentro de la propia app, sin tocar la base de datos a mano.
- Exportar e importar en JSON sirve tanto de copia de seguridad manual como para mover sistemas
  entre entornos.

---

## 7. Por dentro — 9:30 a 11:30

**Pantalla:** terminal + editor de código.

**Haz, en este orden:**
1. En la terminal, ejecuta `npm test` y deja que se vea el resultado completo (560 tests en
   verde).
2. En el editor, abre una spec de `docs/especificaciones/` y señala su sección de escenarios
   (Dado/Cuando/Entonces).
3. Abre el `.spec.ts` correspondiente y señala un test cuyo nombre lleve el id del escenario
   (`it('E4: ...')`).
4. Abre `src/app/domain/validacion.ts` (o el fichero que probaste) y señala que no tiene ningún
   `import` de Angular ni de librerías externas.
5. Abre `docs/decisiones/` y muestra un ADR corto, señalando que nunca se edita, solo se añade.

**Di:**
- El proyecto se construye con SDD + TDD: la especificación decide el qué y el porqué, los
  tests dicen cómo se verifica, y el vínculo entre ambos es el id del escenario.
- El dominio — las reglas de voleibol — no importa nada externo: ni Angular, ni el DOM, ni
  librerías. Eso es lo que permite que el mismo código corra en el navegador y en el servidor
  sin duplicar una línea.
- Cada decisión de arquitectura que sobrevive a una spec queda registrada en un ADR, y ese
  registro nunca se reescribe — solo se añade.

---

## 8. Cierre — 11:30 a 12:00

**Pantalla:** vuelve a la app, o a tu cámara si la usas.

**Di:**
- Un resumen de una frase de lo que has enseñado.
- Qué has aprendido construyendo esto (una o dos ideas concretas, no una lista larga).
- Qué queda por hacer: menciona brevemente que faltan los huecos y conflictos de cobertura, y
  algunos endurecimientos de seguridad pendientes.
- Cierre y agradecimiento.

---

## Notas

- Si te trabas en algún bloque, corta y retoma desde el principio de ese bloque — no hace falta
  grabarlo de un tirón.
- Sube el vídeo a YouTube (como "no listado" si prefieres que no aparezca en búsquedas, pero
  accesible por enlace) o a Drive con el enlace compartido como "cualquiera con el enlace puede
  ver". Pega esa URL en la sección 0 del [README.md](../../README.md).
