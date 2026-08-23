import type { Punto } from './modelos';

/** Medio ancho de red que tapa un bloqueador, en metros (spec 040): un bloqueador cierra
 * aproximadamente 1 m de red con sus manos. En planta, el bloqueo se lee como un tramo de red,
 * no como una pared a la altura exacta donde esté el jugador — simplificación deliberada del
 * modelo (ver `docs/decisiones/`). */
const ANCHO_BLOQUEADOR = 1;

/** Dos tramos de red separados por esta distancia o menos se consideran el mismo bloqueo
 * cerrado y se fusionan en una sola pared (spec 040, E7); más separados que esto, el bloqueo
 * deja pasar un pasillo de luz entre ellos (E6). */
const HOLGURA_VANO = 0.15;

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
function recortarContraSemiplano(poligono: readonly Punto[], dentro: (p: Punto) => boolean, interseccion: (a: Punto, b: Punto) => Punto): readonly Punto[] {
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
  const lerp = (a: Punto, b: Punto, t: number): Punto => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

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
 * `desplazamiento` es el retoque manual (spec 040, E10-E13): se aplica a los vértices antes de
 * recortar, nunca después — aplicarlo después podría dejar la sombra fuera de las líneas sin
 * que el recorte lo corrigiera.
 */
export function sombraDeBloqueo(atacante: Punto, bloqueadores: readonly Punto[], desplazamiento?: Punto): readonly (readonly Punto[])[] {
  if (bloqueadores.length === 0) {
    return [];
  }
  const ay = Math.min(atacante.y, -PROFUNDIDAD_MINIMA);
  const profundidad = -ay;
  const xEn = (w: number, y: number): number => atacante.x + (w - atacante.x) * ((y + profundidad) / profundidad);
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
      return recortarAlCampo(poligono);
    })
    .filter((poligono) => poligono.length > 0);
}
