import type { Celda, Punto } from './modelos';

/** El lado de una celda de la rejilla de responsabilidad, en metros (ADR 0004). */
export const TAMANO_CELDA = 0.5;

/** La celda que contiene un punto del campo propio (9×9 m), o `null` si el punto queda fuera
 * de sus líneas (spec 022, E7): la rejilla de responsabilidad no cubre la zona libre. */
export function celdaDe(punto: Punto): Celda | null {
  if (punto.x < 0 || punto.x >= 9 || punto.y < 0 || punto.y >= 9) {
    return null;
  }
  return { columna: Math.floor(punto.x / TAMANO_CELDA), fila: Math.floor(punto.y / TAMANO_CELDA) };
}

/** El centro de una celda, en metros — el punto donde se pinta su marca. */
export function centroDe(celda: Celda): Punto {
  return { x: (celda.columna + 0.5) * TAMANO_CELDA, y: (celda.fila + 0.5) * TAMANO_CELDA };
}

/** Número de celdas por lado del campo propio (9 m a 0,5 m por celda). */
const CELDAS_POR_LADO = 9 / TAMANO_CELDA;
const ULTIMA_CELDA = CELDAS_POR_LADO - 1;

/** Los dos índices de celda más cercanos a `valor` en un eje: la celda que lo contiene y, de
 * las dos vecinas, la del lado donde cae `valor` dentro de ella (spec 024, E3). Si esa vecina se
 * sale de la rejilla, se recorta a un solo índice en vez de desplazarse al otro lado (E4). */
function celdasCercanas(valor: number): readonly number[] {
  const crudo = Math.floor(valor / TAMANO_CELDA);
  const base = Math.min(ULTIMA_CELDA, Math.max(0, crudo));
  const fraccion = valor / TAMANO_CELDA - crudo;
  const vecina = fraccion < 0.5 ? base - 1 : base + 1;
  if (vecina < 0 || vecina > ULTIMA_CELDA) {
    return [base];
  }
  return base < vecina ? [base, vecina] : [vecina, base];
}

/** El bloque de hasta 2×2 celdas más cercano a un punto: la zona de responsabilidad por
 * defecto de un jugador recién colocado (spec 024). Cerca de una línea del campo se recorta a
 * 2×1 o 1×1 en vez de desplazarse entero hacia dentro. */
export function bloquePorDefecto(punto: Punto): readonly Celda[] {
  const columnas = celdasCercanas(punto.x);
  const filas = celdasCercanas(punto.y);
  const celdas: Celda[] = [];
  for (const fila of filas) {
    for (const columna of columnas) {
      celdas.push({ columna, fila });
    }
  }
  return celdas;
}

function claveCelda(celda: Celda): string {
  return `${celda.columna},${celda.fila}`;
}

function sonVecinas(a: Celda, b: Celda): boolean {
  return Math.abs(a.columna - b.columna) <= 1 && Math.abs(a.fila - b.fila) <= 1;
}

/** Un trazo se considera cerrado si su última celda es la primera, o una vecina inmediata —
 * comparten lado o esquina (spec 024, pregunta abierta resuelta al congelar). Compara solo
 * principio y fin: cruzarse a sí mismo en otro punto del trazo nunca cuenta como cierre. */
export function trazoCerrado(trazo: readonly Celda[]): boolean {
  if (trazo.length === 0) {
    return false;
  }
  return sonVecinas(trazo[0], trazo[trazo.length - 1]);
}

function celdasVecinas(celda: Celda): Celda[] {
  return [
    { columna: celda.columna - 1, fila: celda.fila },
    { columna: celda.columna + 1, fila: celda.fila },
    { columna: celda.columna, fila: celda.fila - 1 },
    { columna: celda.columna, fila: celda.fila + 1 },
  ];
}

/** Rellena lo que encierra un contorno cerrado (spec 024, E8-E11): un flood fill puro sobre la
 * rejilla del campo, desde fuera hacia dentro — toda celda que el relleno exterior no alcanza es
 * interior. Como el flood fill nunca sale de la rejilla (0..17), el resultado tampoco. */
export function rellenarContorno(contorno: readonly Celda[]): readonly Celda[] {
  const paredes = new Set(contorno.map(claveCelda));
  const exterior = new Set<string>();
  const pila: Celda[] = [];

  const marcarSiLibre = (celda: Celda): void => {
    const clave = claveCelda(celda);
    if (!paredes.has(clave) && !exterior.has(clave)) {
      exterior.add(clave);
      pila.push(celda);
    }
  };

  for (let i = 0; i <= ULTIMA_CELDA; i++) {
    marcarSiLibre({ columna: i, fila: 0 });
    marcarSiLibre({ columna: i, fila: ULTIMA_CELDA });
    marcarSiLibre({ columna: 0, fila: i });
    marcarSiLibre({ columna: ULTIMA_CELDA, fila: i });
  }

  while (pila.length > 0) {
    const actual = pila.pop()!;
    for (const vecina of celdasVecinas(actual)) {
      if (
        vecina.columna < 0 ||
        vecina.columna > ULTIMA_CELDA ||
        vecina.fila < 0 ||
        vecina.fila > ULTIMA_CELDA
      ) {
        continue;
      }
      marcarSiLibre(vecina);
    }
  }

  const interior: Celda[] = [];
  for (let columna = 0; columna <= ULTIMA_CELDA; columna++) {
    for (let fila = 0; fila <= ULTIMA_CELDA; fila++) {
      const clave = claveCelda({ columna, fila });
      if (!paredes.has(clave) && !exterior.has(clave)) {
        interior.push({ columna, fila });
      }
    }
  }

  return [...contorno, ...interior];
}

/** Punto de entrada del pintado por contorno (spec 024): si el trazo se cierra, se rellena;
 * si no, se devuelve tal cual, igual que el pintado celda a celda de la spec 022. */
export function celdasDeTrazo(trazo: readonly Celda[]): readonly Celda[] {
  return trazoCerrado(trazo) ? rellenarContorno(trazo) : trazo;
}
