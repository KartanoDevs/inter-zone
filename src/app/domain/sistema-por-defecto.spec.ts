import { describe, expect, it } from 'vitest';
import { PLANTILLA_GLOBAL } from './plantilla-global';
import { jugadoresEnPista } from './rotacion';
import { validarFormacion } from './validacion';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from './roles';
import { guardarFormacion } from './sistema-recepcion';
import { sistemaPorDefecto } from './sistema-por-defecto';

const ROTACIONES = [1, 2, 3, 4, 5, 6] as const;

/**
 * Etiquetas P1..P6 esperadas en cada Rn de la app, traducidas de la tabla de
 * `docs/voley/Guia_Sistema_Recepcion_3_Esquema_5-1.md` (guía R1→app R1, R2→R6, R3→R5, R4→R4,
 * R5→R3, R6→R2 — ver la spec 025). `L` sustituye siempre al central que cae en zaga.
 */
const ETIQUETAS_ESPERADAS: Readonly<Record<1 | 2 | 3 | 4 | 5 | 6, readonly string[]>> = {
  1: ['C', 'R1', 'C2', 'O', 'R2', 'L'],
  2: ['L', 'C', 'R1', 'C2', 'O', 'R2'],
  3: ['R2', 'C1', 'C', 'R1', 'L', 'O'],
  4: ['O', 'R2', 'C1', 'C', 'R1', 'L'],
  5: ['L', 'O', 'R2', 'C1', 'C', 'R1'],
  6: ['R1', 'C2', 'O', 'R2', 'L', 'C'],
};

describe('sistemaPorDefecto', () => {
  it('025-E2: las seis formaciones son legales', () => {
    const sistema = sistemaPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      const formacion = sistema.formaciones[rotacion]!;
      const posiciones = jugadoresEnPista(PLANTILLA_GLOBAL, rotacion);
      const resultado = validarFormacion(formacion, posiciones);
      expect(resultado.infracciones, `R${rotacion}`).toEqual([]);
    }
  });

  it('025-E3: el líbero está en pista donde le corresponde', () => {
    const sistema = sistemaPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      const formacion = sistema.formaciones[rotacion]!;
      const esperado = jugadoresEnPista(PLANTILLA_GLOBAL, rotacion);
      expect(formacion.map((c) => c.jugador.id), `R${rotacion}`).toEqual(esperado.map((j) => j.id));
    }
  });

  it('025-E4: cada rotación coloca la distribución de la guía, traducida a la numeración de la app', () => {
    const sistema = sistemaPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      const formacion = sistema.formaciones[rotacion]!;
      const etiquetas = formacion.map((c) => etiquetaDe(c.jugador, CONFIGURACION_ROLES_POR_DEFECTO));
      expect(etiquetas, `R${rotacion}`).toEqual(ETIQUETAS_ESPERADAS[rotacion]);
    }
  });

  it('025-E5: cada rotación trae su explicación de conjunto', () => {
    const sistema = sistemaPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      expect(sistema.explicacionesRotacion[rotacion]?.trim(), `R${rotacion}`).toBeTruthy();
    }
  });

  it('025-E6: cada jugador de cada rotación trae su propia explicación', () => {
    const sistema = sistemaPorDefecto(PLANTILLA_GLOBAL);

    for (const rotacion of ROTACIONES) {
      const formacion = sistema.formaciones[rotacion]!;
      for (const colocacion of formacion) {
        expect(colocacion.explicacion?.trim(), `R${rotacion} ${colocacion.jugador.id}`).toBeTruthy();
      }
    }
  });

  it('025-E7: es un sistema corriente, se puede editar y volver a guardar', () => {
    const sistema = sistemaPorDefecto(PLANTILLA_GLOBAL);
    const formacion = sistema.formaciones[1]!;
    // `central2` es el central de P3: el que está en pista en R1, porque al de P6 lo sustituye
    // el líbero.
    const movida = formacion.map((c) => (c.jugador.id === 'central2' ? { ...c, punto: { x: 4.6, y: 0.8 } } : c));

    const guardado = guardarFormacion(sistema, 1, movida);

    expect(guardado).not.toBeNull();
    expect(guardado!.formaciones[1]?.find((c) => c.jugador.id === 'central2')?.punto).toEqual({ x: 4.6, y: 0.8 });
  });

  it('025-E8: el sistema por defecto trae descripción general', () => {
    const sistema = sistemaPorDefecto(PLANTILLA_GLOBAL);

    expect(sistema.descripcion?.trim()).toBeTruthy();
  });
});
