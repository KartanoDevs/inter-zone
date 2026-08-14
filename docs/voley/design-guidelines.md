# Design Guidelines — Neon Cyberpunk Profesional

> Guía de diseño para desarrollo. Objetivo: aplicar la estética cyberpunk del kit "Inter AUU" sin que la app parezca un flyer de rave — debe transmitir **rendimiento, competición y solidez**, no caos visual.

---

## 1. Filosofía: "Cyberpunk contenido"

El error más común al usar neones es abusar de ellos. La clave de un cyberpunk que se vea profesional (piensa en interfaces de F1, esports de alto nivel o dashboards de control) es:

- **El fondo hace el trabajo pesado.** Los negros/azulados oscuros ocupan el 80–90% de la pantalla. El neón es la excepción, no la norma.
- **Un solo acento domina por pantalla.** Cian o magenta, no ambos compitiendo en el mismo bloque. El segundo color se reserva para un único elemento de contraste (ej. un CTA).
- **El glow se usa como puntuación, no como párrafo.** Úsalo en 1–2 elementos por vista (borde activo, título de sección, estado en vivo). Si todo brilla, nada destaca.
- **La tipografía técnica (Orbitron) es un condimento.** Se usa en titulares cortos, marcadores, badges — nunca en párrafos largos, donde mata la legibilidad.

---

## 2. Paleta de color

### 2.1 Fondos (profundidad)

| Token | Hex | Uso |
|---|---|---|
| `--bg-darker` | `#05050A` | Fondo raíz de la app, splash, overlays |
| `--bg-dark` | `#090B14` | Fondo principal de pantallas |
| `--bg-card-alt` | `#0A0A1A` | Variante de tarjeta secundaria |
| `--bg-card` | `#12162D` | Tarjetas, paneles, modales |

**Regla:** nunca uses negro puro (`#000000`). La profundidad se construye subiendo un escalón (darker → dark → card) para separar capas visuales sin recurrir a sombras duras.

### 2.2 Acentos primarios (firma de marca)

| Token | Hex | Uso |
|---|---|---|
| `--neon-cyan` | `#00E5FF` | CTA principal, enlaces activos, borde de foco, elementos "en vivo" |
| `--neon-magenta` | `#FF00FF` | Contraste puntual, alertas de alta prioridad, hover secundario |

**Regla de oro 60/30/10 adaptada:**
- 60% fondos oscuros
- 30% superficies de tarjeta / texto
- 10% neón (repartido entre cian, magenta y un acento secundario como mucho)

### 2.3 Acentos secundarios (estado, no decoración)

| Token | Hex | Significado sugerido |
|---|---|---|
| `--neon-green` | `#39FF14` | Éxito, victoria, "online" |
| `--neon-teal` | `#00FFAA` | Información, estado neutro-positivo |
| `--neon-amber` | `#FFAA00` | Advertencia, pendiente |
| `--neon-purple` | `#AA88FF` | Categoría / torneo / rango especial |
| `--neon-pink` | `#FF0055` | Error, eliminación, urgente |

**Regla:** máximo **2 acentos secundarios visibles por pantalla**. Estos colores son semánticos (comunican estado), no paleta libre para "decorar". Si necesitas un tercer color en la misma vista, es señal de que hay que simplificar la jerarquía de información.

### 2.4 Texto

| Token | Hex | Uso |
|---|---|---|
| `--text-main` | `#FFFFFF` | Titulares, texto de alto contraste |
| `--text-secondary` | `#E0E6ED` | Cuerpo de texto general |
| `--text-muted` | `#8AA4C8` | Metadatos, timestamps, texto de apoyo |
| `--text-muted-alt` | `#8B9BB4` | Placeholders, texto deshabilitado |

**Accesibilidad:** verifica contraste WCAG AA (mínimo 4.5:1) para texto sobre `--bg-dark` / `--bg-card`. `--text-muted` sobre `--bg-darker` puede quedar por debajo del umbral en textos pequeños — resérvalo para tamaños ≥14px o usa `--text-secondary` si el contenido es crítico.

---

## 3. Tipografía

| Fuente | Peso | Uso |
|---|---|---|
| **Orbitron** | 700 | Titulares H1, nombres de torneo, marcador destacado |
| **Orbitron** | 400 | Subtítulos "consola", labels de estado en vivo |
| **Inter** | 600 | UI destacada: botones, nav, cabeceras de tarjeta |
| **Inter** | 400 | Cuerpo de texto, descripciones, contenido largo |

**Reglas para mantenerlo legible y profesional:**
- Orbitron **nunca** en párrafos ni listas largas — solo en textos cortos (≤ 5–6 palabras por línea).
- Jerarquía clara: si un titular usa Orbitron, su subtítulo inmediato debe usar Inter para no saturar.
- Interlineado generoso en Inter (1.5–1.6) para compensar el contraste alto del fondo oscuro.
- Evita el uso de mayúsculas sostenidas (`text-transform: uppercase`) en bloques largos — resérvalo para labels/badges cortos, donde sí encaja con el tono "consola".

---

## 4. Componentes

### 4.1 Botones

- Borde con degradado animado (cian → magenta) reservado para el **CTA principal** de cada pantalla — no lo repitas en botones secundarios o terciarios.
- Esquinas facetadas (`clip-path`) como firma visual, pero mantén el mismo patrón de corte en toda la app (consistencia > originalidad puntual).
- Jerarquía sugerida:
  - **Primario:** borde degradado + glow sutil + fondo `--bg-card`
  - **Secundario:** borde sólido `--neon-cyan` sin glow, fondo transparente
  - **Terciario/Cancelar:** borde `--text-muted`, sin color de marca
  - **Destructivo:** `--neon-pink`, sin degradado (para que se lea como advertencia, no como CTA)

### 4.2 Tarjetas y paneles

- Fondo `--bg-card` sobre `--bg-dark`, nunca al revés (evita invertir la jerarquía de profundidad).
- Borde con glow **solo** en el estado activo/seleccionado o en elementos "en vivo" (ej. partido en curso). Las tarjetas en reposo llevan borde sutil sin glow (`rgba(255,255,255,0.08)` aprox.).
- Padding generoso (24–32px) — el cyberpunk profesional respira, no lo llenes de ruido visual.

### 4.3 Efectos de glow y flicker

- **Glow:** úsalo en `box-shadow`/`text-shadow` con blur amplio y opacidad baja-media. Debe leerse como "iluminado", no como "sobreexpuesto".
- **Flicker (parpadeo):** resérvalo para 1 elemento clave por vista como mucho (ej. indicador "EN VIVO"). Nunca lo apliques a texto de lectura ni a más de un elemento simultáneo — es la forma más rápida de que la interfaz parezca poco seria.
- Anima con `prefers-reduced-motion` respetado: desactiva flicker/parpadeo si el usuario lo tiene configurado en su sistema.

---

## 5. Layout y estructura

- **Grid consistente:** usa un sistema de 8px para espaciados (8, 16, 24, 32, 48...). El orden técnico del grid contrarresta visualmente el caos que el neón podría sugerir.
- **Jerarquía de profundidad clara:** fondo → tarjeta → tarjeta activa/glow. No saltes niveles.
- **Densidad de información controlada:** en apps de torneo/marcador, prioriza datos clave grandes (marcador, nombres) y relega metadatos a `--text-muted`.
- **Estados vacíos y de carga:** mantén el mismo lenguaje visual (fondo oscuro, tipografía Orbitron en mensajes cortos) para que nunca "salga" del sistema, incluso en pantallas de error o skeleton loaders.

---

## 6. Checklist antes de dar por bueno un diseño

- [ ] ¿Hay más de un elemento con glow simultáneo en la misma vista? → reducir
- [ ] ¿Orbitron aparece en un párrafo largo? → cambiar a Inter
- [ ] ¿Hay 3+ acentos secundarios visibles a la vez? → simplificar jerarquía
- [ ] ¿El contraste de texto cumple AA sobre el fondo usado?
- [ ] ¿El CTA principal es el único elemento con borde degradado en la pantalla?
- [ ] ¿El flicker se limita a un solo elemento "en vivo"?
- [ ] ¿Funciona igual de bien con `prefers-reduced-motion: reduce`?

---

## 7. Tokens CSS de referencia

```css
:root {
  /* fondos */
  --bg-darker: #05050A;
  --bg-dark: #090B14;
  --bg-card-alt: #0A0A1A;
  --bg-card: #12162D;

  /* acentos primarios */
  --neon-cyan: #00E5FF;
  --neon-magenta: #FF00FF;

  /* acentos secundarios */
  --neon-green: #39FF14;
  --neon-teal: #00FFAA;
  --neon-amber: #FFAA00;
  --neon-purple: #AA88FF;
  --neon-pink: #FF0055;

  /* texto */
  --text-main: #FFFFFF;
  --text-secondary: #E0E6ED;
  --text-muted: #8AA4C8;
  --text-muted-alt: #8B9BB4;

  /* fuentes — Google Fonts */
  --font-body: 'Inter', sans-serif;
  --font-display: 'Orbitron', sans-serif;

  /* espaciado base */
  --space-unit: 8px;
}
```

---

## 8. Resumen en una frase

**El neón puntúa, el fondo oscuro estructura, y la tipografía técnica se usa como acento — nunca como base.** Eso es lo que separa un cyberpunk profesional (competición, alto rendimiento) de uno amateur (ruido visual).
