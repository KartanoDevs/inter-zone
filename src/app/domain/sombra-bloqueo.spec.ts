import { describe, expect, it } from 'vitest';
import type { Punto } from './modelos';
import { sombraDeBloqueo } from './sombra-bloqueo';

describe('sombraDeBloqueo', () => {
  it('E2: sin bloqueadores no hay sombra', () => {
    const atacante: Punto = { x: 4.5, y: -1.2 };

    const sombra = sombraDeBloqueo(atacante, []);

    expect(sombra).toEqual([]);
  });

  it('E1: con un bloqueador aparece una sombra que nace en la red', () => {
    const atacante: Punto = { x: 4.5, y: -1.2 };
    const bloqueador: Punto = { x: 4.5, y: 0.4 };

    const sombra = sombraDeBloqueo(atacante, [bloqueador]);

    expect(sombra).toHaveLength(1);
    const [poligono] = sombra;
    expect(poligono.length).toBeGreaterThanOrEqual(3);
    // Nace en la red: al menos dos vértices con y = 0.
    const verticesEnRed = poligono.filter((p) => p.y === 0);
    expect(verticesEnRed.length).toBeGreaterThanOrEqual(2);
    // Se abre hacia el fondo: hay vértices con y > 0.
    expect(poligono.some((p) => p.y > 0)).toBe(true);
  });

  it('E5: la sombra se recorta en las líneas del campo propio, nunca sale fuera', () => {
    // Atacante muy a la izquierda y bloqueador muy a la derecha: el cono se abre hacia fuera
    // del campo por la izquierda.
    const atacante: Punto = { x: -5, y: -1.2 };
    const bloqueador: Punto = { x: 8, y: 0.4 };

    const sombra = sombraDeBloqueo(atacante, [bloqueador]);

    for (const poligono of sombra) {
      for (const punto of poligono) {
        expect(punto.x).toBeGreaterThanOrEqual(0);
        expect(punto.x).toBeLessThanOrEqual(9);
        expect(punto.y).toBeGreaterThanOrEqual(0);
        expect(punto.y).toBeLessThanOrEqual(9);
      }
    }
  });

  it('E6: dos bloqueadores separados dejan un pasillo de luz — dos sombras, no una', () => {
    const atacante: Punto = { x: 4.5, y: -1.2 };
    const bloqueadorIzq: Punto = { x: 1, y: 0.4 };
    const bloqueadorDer: Punto = { x: 8, y: 0.4 }; // muy separado del anterior

    const sombra = sombraDeBloqueo(atacante, [bloqueadorIzq, bloqueadorDer]);

    expect(sombra).toHaveLength(2);
  });

  it('E7: dos bloqueadores juntos forman una sola sombra continua', () => {
    const atacante: Punto = { x: 4.5, y: -1.2 };
    const bloqueadorIzq: Punto = { x: 4, y: 0.4 };
    const bloqueadorDer: Punto = { x: 5, y: 0.4 }; // manos casi tocándose

    const sombra = sombraDeBloqueo(atacante, [bloqueadorIzq, bloqueadorDer]);

    expect(sombra).toHaveLength(1);
  });

  it('E8: un ataque muy abierto con el bloqueo al otro lado no proyecta sombra dentro del campo', () => {
    // El atacante ataca muy por fuera de la banda derecha y el bloqueo cierra la banda
    // izquierda: el rayo entero queda a la izquierda de x=0 en toda la profundidad del campo.
    const atacante: Punto = { x: 50, y: -1.2 };
    const bloqueador: Punto = { x: -10, y: 0.4 };

    const sombra = sombraDeBloqueo(atacante, [bloqueador]);

    expect(sombra).toEqual([]);
  });

  it('E9: un ataque pegado a la red tapa más campo que la misma pipe desde el fondo', () => {
    const bloqueador: Punto = { x: 4.5, y: 0.4 };
    const pegadoARed: Punto = { x: 4.5, y: -1.2 };
    const pipe: Punto = { x: 4.5, y: -3.5 };

    const areaDe = (poligono: readonly Punto[]): number => {
      let area = 0;
      for (let i = 0; i < poligono.length; i++) {
        const a = poligono[i];
        const b = poligono[(i + 1) % poligono.length];
        area += a.x * b.y - b.x * a.y;
      }
      return Math.abs(area) / 2;
    };

    const sombraPegada = sombraDeBloqueo(pegadoARed, [bloqueador]);
    const sombraPipe = sombraDeBloqueo(pipe, [bloqueador]);

    expect(areaDe(sombraPegada[0])).toBeGreaterThan(areaDe(sombraPipe[0]));
  });

  it('E10-E11: el desplazamiento se aplica a la sombra calculada', () => {
    // Bloqueo centrado, cerca de la red (donde el cono todavía es estrecho) para que ni la
    // sombra sin retocar ni la retocada toquen los bordes del campo: así el recorte no cambia
    // la forma del polígono y se puede comparar vértice a vértice.
    const atacante: Punto = { x: 4.5, y: -2 };
    const bloqueador: Punto = { x: 4.5, y: 0.4 };

    const sinRetocar = sombraDeBloqueo(atacante, [bloqueador]);
    const retocada = sombraDeBloqueo(atacante, [bloqueador], { x: 0.3, y: 0 });

    expect(retocada[0].map((p) => p.x)).toEqual(sinRetocar[0].map((p) => p.x + 0.3));
    expect(retocada[0].map((p) => p.y)).toEqual(sinRetocar[0].map((p) => p.y));
  });

  it('E12: un desplazamiento que saca la sombra del campo se recorta igual que la sombra sin retocar', () => {
    const atacante: Punto = { x: 1, y: -1.2 };
    const bloqueador: Punto = { x: 1, y: 0.4 };

    // Desplazamiento tan grande que se lleva la sombra entera fuera del campo por la izquierda.
    const sombra = sombraDeBloqueo(atacante, [bloqueador], { x: -20, y: 0 });

    for (const poligono of sombra) {
      for (const punto of poligono) {
        expect(punto.x).toBeGreaterThanOrEqual(0);
        expect(punto.x).toBeLessThanOrEqual(9);
      }
    }
  });

  it('E13: sin desplazamiento (recentrado), la sombra vuelve a la posición calculada', () => {
    const atacante: Punto = { x: 4.5, y: -1.2 };
    const bloqueador: Punto = { x: 4.5, y: 0.4 };

    const sinRetocar = sombraDeBloqueo(atacante, [bloqueador]);
    const recentrada = sombraDeBloqueo(atacante, [bloqueador], undefined);

    expect(recentrada).toEqual(sinRetocar);
  });

  it('E14: la escala por defecto (1) no cambia el resultado', () => {
    const atacante: Punto = { x: 4.5, y: -1.2 };
    const bloqueador: Punto = { x: 4.5, y: 0.4 };

    const sinEscala = sombraDeBloqueo(atacante, [bloqueador]);
    const conEscala1 = sombraDeBloqueo(atacante, [bloqueador], undefined, 1);

    expect(conEscala1).toEqual(sinEscala);
  });

  it('E15: una pared ancha escalada hacia dentro sigue llegando al fondo del campo', () => {
    // Bloqueo doble ancho (varios bloqueadores fusionados) con un atacante escorado: el cono sin
    // escalar ya se recorta contra el lateral izquierdo antes de llegar a y=9. Escalar hacia
    // dentro (factor < 1) desde el centro de la pared, antes de recortar, no debe introducir un
    // borde recto artificial que corte la sombra antes del fondo.
    const atacante: Punto = { x: 8, y: -1.2 };
    const bloqueadorIzq: Punto = { x: 6.1, y: 0.4 };
    const bloqueadorDer: Punto = { x: 7.6, y: 0.4 };

    const sombra = sombraDeBloqueo(atacante, [bloqueadorIzq, bloqueadorDer], undefined, 0.5);

    expect(sombra).toHaveLength(1);
    const [poligono] = sombra;
    expect(poligono.some((p) => p.y === 9)).toBe(true);
  });

  it('E16: escalar no cambia el conjunto de profundidades del polígono sin recortar', () => {
    const atacante: Punto = { x: 4.5, y: -2 };
    const bloqueador: Punto = { x: 4.5, y: 0.4 };

    const sinEscalar = sombraDeBloqueo(atacante, [bloqueador], undefined, 1);
    const escalado = sombraDeBloqueo(atacante, [bloqueador], undefined, 0.5);

    expect(escalado[0].map((p) => p.y)).toEqual(sinEscalar[0].map((p) => p.y));
  });

  it('E17: la escala ancla en el centro de la pared, no en los vértices supervivientes del recorte', () => {
    const atacante: Punto = { x: 4.5, y: -1.2 };
    const bloqueador: Punto = { x: 4.5, y: 0.4 };

    const sombra = sombraDeBloqueo(atacante, [bloqueador], undefined, 0.5);

    const [poligono] = sombra;
    const enRed = poligono.filter((p) => p.y === 0);
    // El tramo de red del bloqueador es [4.3, 4.7]; escalado al 50% desde su centro (4.5) queda
    // [4.4, 4.6].
    expect(enRed.map((p) => p.x).sort((a, b) => a - b)).toEqual([4.4, 4.6]);
  });
});
