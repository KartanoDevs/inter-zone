import { describe, expect, it } from 'vitest';
import { PLANTILLA_GLOBAL } from './plantilla-global';
import { jugadoresEnPista } from './rotacion';
import { guardarFormacionDefensa } from './sistema-defensa';
import { sistemaDefensivoPorDefecto } from './sistema-defensivo-por-defecto';

const ROTACIONES = [1, 2, 3, 4, 5, 6] as const;
const VIAS = ['z4', 'z2'] as const;

describe('sistemaDefensivoPorDefecto', () => {
  it('029-E2: tiene doce formaciones — las seis rotaciones, cada una con z4 y z2, sin z3 ni pipe', () => {
    const sistema = sistemaDefensivoPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      const porVia = sistema.defensas?.[rotacion];
      expect(Object.keys(porVia ?? {}).sort(), `R${rotacion}`).toEqual(['z2', 'z4']);
    }
  });

  it('029-E3: el líbero está en pista donde le corresponde, en las doce formaciones', () => {
    const sistema = sistemaDefensivoPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      const esperado = jugadoresEnPista(PLANTILLA_GLOBAL, rotacion).map((j) => j.id);
      for (const via of VIAS) {
        const formacion = sistema.defensas?.[rotacion]?.[via] ?? [];
        expect(formacion.map((c) => c.jugador.id), `R${rotacion}/${via}`).toEqual(esperado);
      }
    }
  });

  it('029-E4: el patrón bloqueador/off-blocker/defensor es el de la tabla posicional', () => {
    const sistema = sistemaDefensivoPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      const z4 = sistema.defensas?.[rotacion]?.z4 ?? [];
      const z2 = sistema.defensas?.[rotacion]?.z2 ?? [];
      // vs Z4: P3(2) y P4(3) bloquean (comparten punto y=0.4, cerca de la red); P2(1) es off-blocker.
      expect(z4[2]?.punto.y, `R${rotacion} z4 P3`).toBe(0.4);
      expect(z4[3]?.punto.y, `R${rotacion} z4 P4`).toBe(0.4);
      expect(z4[1]?.punto.y, `R${rotacion} z4 P2 (off-blocker)`).toBe(3.0);
      // vs Z2: P2(1) y P3(2) bloquean; P4(3) es off-blocker.
      expect(z2[1]?.punto.y, `R${rotacion} z2 P2`).toBe(0.4);
      expect(z2[2]?.punto.y, `R${rotacion} z2 P3`).toBe(0.4);
      expect(z2[3]?.punto.y, `R${rotacion} z2 P4 (off-blocker)`).toBe(3.0);
    }
  });

  it('029-E5: cada formación trae su explicación de conjunto', () => {
    const sistema = sistemaDefensivoPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      expect(sistema.explicacionesRotacion[rotacion]?.trim(), `R${rotacion}`).toBeTruthy();
    }
  });

  it('029-E6: cada jugador de cada formación trae su propia explicación', () => {
    const sistema = sistemaDefensivoPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      for (const via of VIAS) {
        const formacion = sistema.defensas?.[rotacion]?.[via] ?? [];
        for (const colocacion of formacion) {
          expect(colocacion.explicacion?.trim(), `R${rotacion}/${via} ${colocacion.jugador.id}`).toBeTruthy();
        }
      }
    }
  });

  it('029-E7: es un sistema corriente, se puede editar y volver a guardar', () => {
    const sistema = sistemaDefensivoPorDefecto(PLANTILLA_GLOBAL);
    const formacion = sistema.defensas?.[1]?.z4 ?? [];
    const movida = formacion.map((c) => (c.jugador.id === 'central1' ? { ...c, punto: { x: 5, y: 5 } } : c));

    const guardado = guardarFormacionDefensa(sistema, 1, 'z4', movida);

    expect(guardado).not.toBeNull();
    expect(guardado!.defensas?.[1]?.z4?.find((c) => c.jugador.id === 'central1')?.punto).toEqual({ x: 5, y: 5 });
  });

  it('029-E8: trae descripción general', () => {
    const sistema = sistemaDefensivoPorDefecto(PLANTILLA_GLOBAL);

    expect(sistema.descripcion?.trim()).toBeTruthy();
  });

  it('029-E9: cada jugador de cada formación trae zona de responsabilidad pintada', () => {
    const sistema = sistemaDefensivoPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      for (const via of VIAS) {
        const formacion = sistema.defensas?.[rotacion]?.[via] ?? [];
        for (const colocacion of formacion) {
          expect(colocacion.celdas?.length ?? 0, `R${rotacion}/${via} ${colocacion.jugador.id}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('029-E10: las zonas de los dos bloqueadores de una formación comparten al menos una celda', () => {
    const sistema = sistemaDefensivoPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      for (const via of VIAS) {
        const formacion = sistema.defensas?.[rotacion]?.[via] ?? [];
        // P3 siempre bloquea; su compañero de bloqueo es P4 en z4, P2 en z2.
        const p3 = formacion[2]?.celdas ?? [];
        const companero = (via === 'z4' ? formacion[3] : formacion[1])?.celdas ?? [];
        const comparten = p3.some((celda) => companero.some((otra) => otra.columna === celda.columna && otra.fila === celda.fila));
        expect(comparten, `R${rotacion}/${via}`).toBe(true);
      }
    }
  });
});
