import type { Punto } from './modelos';

/**
 * Distancia mínima entre dos jugadores, en metros: ni en recepción ni en defensa se pueden
 * solapar sus fichas. 0,9 m son dos radios de ficha (0,45 m cada una, `ui/pista/ficha-jugador.ts`)
 * — el mínimo para que dos círculos nunca se toquen — y a la vez queda por debajo de la holgura
 * de vano de la sombra de bloqueo (0,6 m tapados más 0,4 m de ancho de manos = 1 m de referencia
 * que sigue fusionando, `domain/sombra-bloqueo.ts`): empujar a dos bloqueadores hasta el mínimo
 * nunca abre un pasillo de luz en su sombra, porque 0,9 m siempre queda dentro de esa fusión.
 */
export const DISTANCIA_MINIMA_ENTRE_JUGADORES = 0.9;

/**
 * Aparta `punto` de cualquiera de `otros` que quede a menos de `distanciaMinima`, empujándolo en
 * línea recta desde el punto conflictivo hasta quedar exactamente a esa distancia. Si coincide
 * exactamente con otro (distancia cero, sin dirección que seguir), lo aparta hacia la derecha por
 * convención. Varias pasadas resuelven los casos con más de un vecino cercano a la vez sin
 * necesitar un solver — suficiente para las seis fichas de una formación.
 */
/** Distancia euclídea entre dos puntos, en metros. */
export function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function separarDeOtros(
  punto: Punto,
  otros: readonly Punto[],
  distanciaMinima: number,
): Punto {
  let resultado = punto;
  for (let pasada = 0; pasada < 3; pasada++) {
    for (const otro of otros) {
      const dx = resultado.x - otro.x;
      const dy = resultado.y - otro.y;
      const d = distancia(resultado, otro);
      if (d >= distanciaMinima) {
        continue;
      }
      if (d < 1e-9) {
        resultado = { x: otro.x + distanciaMinima, y: otro.y };
        continue;
      }
      const factor = distanciaMinima / d;
      resultado = { x: otro.x + dx * factor, y: otro.y + dy * factor };
    }
  }
  return resultado;
}
