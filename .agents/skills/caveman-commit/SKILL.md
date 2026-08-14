---
name: caveman-commit
description: >
  Generador de mensajes de commit ultra-comprimidos. Elimina ruido de los mensajes
  preservando la intención y el razonamiento. Formato Conventional Commits, con el
  mensaje en castellano. Asunto ≤50 caracteres, cuerpo solo cuando el "por qué" no
  es obvio. Se usa cuando el usuario dice "escribe un commit", "mensaje de commit",
  "genera un commit", "/commit", o invoca /caveman-commit. Se activa automáticamente
  al hacer staging de cambios.
---

Escribe mensajes de commit concisos y precisos, en castellano. Formato Conventional Commits.
Sin relleno. El porqué importa más que el qué.

## Reglas

**Idioma:**
- El tipo (`feat`, `fix`, `refactor`...) y el `!` de breaking change van SIEMPRE en inglés,
  tal cual el estándar.
- El resumen, el `<scope>` (si es una palabra descriptiva) y todo el cuerpo van en castellano.
- No mezclar idiomas dentro de la misma frase (evitar "fix: arregla el bug del *endpoint*"
  si hay alternativa natural en castellano).

**Línea de asunto:**
- `<type>(<scope>): <resumen en imperativo>` — `<scope>` opcional
- Tipos: `feat`, `fix`, `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci`, `style`, `revert`
- Modo imperativo: "añade", "corrige", "elimina" — no "añadido", "añade" en gerundio, "añadiendo"
- ≤50 caracteres cuando sea posible, límite duro de 72
- Sin punto final
- Respeta la convención de mayúsculas/minúsculas del proyecto tras los dos puntos

**Cuerpo (solo si es necesario):**
- Omitir por completo cuando el asunto ya se explica solo
- Añadir cuerpo solo para: el *porqué* no evidente, cambios incompatibles (breaking changes),
  notas de migración, issues enlazadas
- Ajustar el texto a 72 caracteres por línea
- Viñetas con `-`, no `*`
- Referenciar issues/PRs al final: `Closes #42`, `Refs #17` (estas palabras clave se
  mantienen en inglés porque GitHub/GitLab las interpretan literalmente)

**Lo que NUNCA debe aparecer:**
- "Este commit hace X", "yo", "hemos", "ahora", "actualmente" — el diff ya lo dice
- "Tal y como pidió..." — usar el trailer `Co-authored-by`
- "Generado con Claude Code" o cualquier atribución a la IA — a menos que una regla propia
  del usuario exija un trailer tipo `Assisted-by`/atribución de IA, en cuyo caso se añade como trailer
- Emojis (salvo que la convención del proyecto los exija)
- Repetir el nombre del archivo cuando el `scope` ya lo indica

## Ejemplos

Diff: nuevo endpoint para el perfil de usuario, con cuerpo explicando el porqué
- ❌ "feat: se añade un nuevo endpoint para obtener la información del perfil de usuario de la base de datos"
- ✅