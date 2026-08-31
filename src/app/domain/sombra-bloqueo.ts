import type { Punto } from './modelos';

/** Medio ancho de red que tapa un bloqueador, en metros (spec 040): un bloqueador cierra
 * aproximadamente 1 m de red con sus manos. En planta, el bloqueo se lee como un tramo de red,
 * no como una pared a la altura exacta donde esté el jugador — simplificación deliberada del
 * modelo (ver `docs/decisiones/`). Reducido un 60% (de 1 a 0.4) a petición del entrenador: la
 * sombra resultante de 1 m se veía desproporcionada respecto al bloqueo real. */
const ANCHO_BLOQUEADOR = 0.4;

/** Dos tramos de red separados por esta distancia o menos se consideran el mismo bloqueo
 * cerrado y se fusionan en una sola pared (spec 040, E7); más separados que esto, el bloqueo
 * deja pasar un pasillo de luz entre ellos (E6). Subida junto con la reducción de
 * `ANCHO_BLOQUEADOR` (de 1 a 0.4) para que dos jugadores a la distancia de referencia de "manos
 * casi tocándose" (spec 040, E7: bloqueadores a 1 m de separación entre sí) sigan formando una
 * única pared, aunque cada tramo individual tape menos red.
 *
 * Subida de 0.6 a 1.2 (fix posterior a la 040): los dobles bloqueos reales de
 * `sistema-defensa-por-defecto.ts` (p. ej. puestos 2 y 3 en `z4`) separan los centros de los
 * bloqueadores hasta 1.5 m, dejando un hueco de hasta 1.1 m entre tramos — por encima del 0.6
 * original, se veían como dos sombras con un pasillo de luz en medio de lo que en pista es un
 * bloqueo doble cerrado. 1.2 cubre esos huecos (máximo real 1.1) sin fusionar el bloqueo
 * individual del pipe, donde el central bloquea solo y las bandas se descuelgan lejos (hueco de
 * referencia 1.5 m — debe seguir separado). */
const HOLGURA_VANO = 1.2;

/** Cota inferior de la profundidad del atacante respecto a la red, para que el cono de sombra
 * nunca se vuelva infinitamente ancho si se coloca justo sobre la línea `y = 0`. */
const PROFUNDIDAD_MINIMA = 0.2;

const CAMPO_MIN = 0;
const CAMPO_MAX = 9;

interface Tramo {
  readonly izq: number;
  readonly der: number;
}

function tramoDe(bloqueador: Punto): Tramo {
  return { izq: bloqueador.x - ANCHO_BLOQUEADOR / 2, der: bloqueador.x + ANCHO_BLOQUEADOR / 2 };
}

/** Fusiona tramos de red que se solapan o quedan a `HOLGURA_VANO` o menos entre sí, en paredes
 * de bloqueo continuas (spec 040, E6-E7). */
function paredesDe(bloqueadores: readonly Punto[]): readonly Tramo[] {
  const tramos = bloqueadores.map(tramoDe).sort((a, b) => a.izq - b.izq);
  const paredes: Tramo[] = [];
  for (const tramo of tramos) {
    const ultima = paredes.at(-1);
    if (ultima && tramo.izq - ultima.der <= HOLGURA_VANO) {
      paredes[paredes.length - 1] = { izq: ultima.izq, der: Math.max(ultima.der, tramo.der) };
    } else {
      paredes.push(tramo);
    }
  }
  return paredes;
}

/** Recorta un polígono convexo contra un semiplano (Sutherland–Hodgman), quedándose con la parte
 * donde `dentro(punto)` es verdadero. Interpola linealmente los vértices que cruzan el borde. */
function recortarContraSemiplano(
  poligono: readonly Punto[],
  dentro: (p: Punto) => boolean,
  interseccion: (a: Punto, b: Punto) => Punto,
): readonly Punto[] {
  const resultado: Punto[] = [];
  for (let i = 0; i < poligono.length; i++) {
    const actual = poligono[i];
    const siguiente = poligono[(i + 1) % poligono.length];
    const actualDentro = dentro(actual);
    const siguienteDentro = dentro(siguiente);
    if (actualDentro) {
      resultado.push(actual);
    }
    if (actualDentro !== siguienteDentro) {
      resultado.push(interseccion(actual, siguiente));
    }
  }
  return resultado;
}

/** Recorta un polígono convexo al rectángulo del campo propio `[0,9]×[0,9]` (spec 040, E5, E8,
 * E12): nunca se dibuja fuera de las líneas. Un polígono que cae fuera por completo recorta a
 * una lista vacía — estado válido, no un error. */
function recortarAlCampo(poligono: readonly Punto[]): readonly Punto[] {
  const lerp = (a: Punto, b: Punto, t: number): Punto => ({
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  });

  let recortado = poligono;
  recortado = recortarContraSemiplano(
    recortado,
    (p) => p.x >= CAMPO_MIN,
    (a, b) => lerp(a, b, (CAMPO_MIN - a.x) / (b.x - a.x)),
  );
  if (recortado.length === 0) return recortado;
  recortado = recortarContraSemiplano(
    recortado,
    (p) => p.x <= CAMPO_MAX,
    (a, b) => lerp(a, b, (CAMPO_MAX - a.x) / (b.x - a.x)),
  );
  if (recortado.length === 0) return recortado;
  recortado = recortarContraSemiplano(
    recortado,
    (p) => p.y >= CAMPO_MIN,
    (a, b) => lerp(a, b, (CAMPO_MIN - a.y) / (b.y - a.y)),
  );
  if (recortado.length === 0) return recortado;
  recortado = recortarContraSemiplano(
    recortado,
    (p) => p.y <= CAMPO_MAX,
    (a, b) => lerp(a, b, (CAMPO_MAX - a.y) / (b.y - a.y)),
  );
  return recortado;
}

/**
 * La sombra que el bloqueo le proyecta al atacante sobre el campo propio (spec 040): una lista
 * de polígonos, uno por cada pared de bloqueo cerrada — dos bloqueadores separados producen dos
 * sombras con un pasillo de luz entre ellas (E6), en vez de una sola (E7).
 *
 * Geometría: desde el atacante `A = (ax, ay)` con `ay < 0`, cada punto de red `w` de una pared
 * proyecta un rayo que se abre linealmente con la profundidad — cuanto más atrás ataca (`ay` más
 * negativo), menos sombra proyecta un mismo bloqueo (E9). El polígono resultante (un
 * cuadrilátero desde la red hasta el fondo del campo) se recorta a las líneas del campo propio.
 *
 * `desplazamiento` es el retoque manual (spec 040, E10-E13). `escala` es el ajuste de ancho de
 * pantalla (spec 044/045), en metros de dominio, no en píxeles — el invariante 1 sigue intacto,
 * es un multiplicador adimensional, no una unidad de pantalla. Los dos se aplican **antes** de
 * `recortarAlCampo`, nunca después: escalar (o desplazar) un polígono que ya se recortó deja
 * clavados en su sitio los vértices que ese recorte había pegado a una línea del campo, y el
 * resultado es un borde recto artificial en mitad de la sombra en vez de dejarla llegar hasta la
 * esquina — el bug real detrás de "la sombra se corta con 2 o 3 bloqueadores" (que un solo
 * bloqueador nunca lo mostraba porque su pared, mucho más estrecha, casi nunca llega a recortarse
 * contra un lateral). `escala` ancla en el centro de la pared, no en los vértices del polígono ya
 * recortado — con o sin recorte de por medio, el centro de la pared es siempre el mismo punto.
 */
export function sombraDeBloqueo(
  atacante: Punto,
  bloqueadores: readonly Punto[],
  desplazamiento?: Punto,
  escala = 1,
): readonly (readonly Punto[])[] {
  if (bloqueadores.length === 0) {
    return [];
  }
  const ay = Math.min(atacante.y, -PROFUNDIDAD_MINIMA);
  const profundidad = -ay;
  const xEn = (w: number, y: number): number =>
    atacante.x + (w - atacante.x) * ((y + profundidad) / profundidad);
  const dx = desplazamiento?.x ?? 0;
  const dy = desplazamiento?.y ?? 0;

  return paredesDe(bloqueadores)
    .map((pared): readonly Punto[] => {
      const poligono: Punto[] = [
        { x: pared.izq + dx, y: 0 + dy },
        { x: pared.der + dx, y: 0 + dy },
        { x: xEn(pared.der, CAMPO_MAX) + dx, y: CAMPO_MAX + dy },
        { x: xEn(pared.izq, CAMPO_MAX) + dx, y: CAMPO_MAX + dy },
      ];
      const centro = (pared.izq + pared.der) / 2 + dx;
      const escalado = poligono.map((p) => ({ x: centro + (p.x - centro) * escala, y: p.y }));
      return recortarAlCampo(escalado);
    })
    .filter((poligono) => poligono.length > 0);
}
