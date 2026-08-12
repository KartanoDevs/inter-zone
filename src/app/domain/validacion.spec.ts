import { describe, expect, it } from 'vitest';
import type { Formacion, Jugador, OrdenSaque } from './modelos';
import { validarFormacion } from './validacion';

function jugador(id: string, rol: Jugador['rol']): Jugador {
  return { id, rol };
}

describe('validarFormacion', () => {
  it('E1: formación estándar legal no devuelve ninguna infracción', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 1 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([]);
  });

  it('E2: legal aunque un zaguero esté fuera de las líneas laterales', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 1 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: -1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([]);
  });

  it('E3: legal aunque un delantero esté por detrás de la línea de ataque', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 5 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 7 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([]);
  });

  it('E4: falta si el zaguero P1 está por delante de su delantero P2', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 0.5 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 1 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([{ tipo: 'zaguero-delantero', jugadores: [p1, p2] }]);
  });

  it('E5: zagueros y delanteros no emparejados no se comparan', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 1 } },
      { jugador: p4, punto: { x: 1, y: 0.1 } },
      { jugador: p5, punto: { x: 1, y: 0.5 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([]);
  });

  it('E6: falta si los delanteros P3 y P4 están cruzados', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 1, y: 1 } },
      { jugador: p4, punto: { x: 4.5, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([{ tipo: 'orden-lateral', jugadores: [p4, p3] }]);
  });

  it('E7: falta si los zagueros P1 y P6 están cruzados', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 1, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 1 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: -1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([{ tipo: 'orden-lateral', jugadores: [p6, p1] }]);
  });

  it('E8: misma altura exacta entre P6 y P3 es falta', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 4 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 4 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([{ tipo: 'zaguero-delantero', jugadores: [p6, p3] }]);
  });

  it('E9: dentro del margen de tolerancia se marca como al límite, no como infracción', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 4 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 4.03 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([]);
    expect(resultado.avisos).toEqual([{ tipo: 'zaguero-delantero', jugadores: [p6, p3] }]);
  });

  it('E10: justo por encima del margen es válida y no se marca como al límite', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 4 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 4.08 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([]);
    expect(resultado.avisos).toEqual([]);
  });

  it('E11: el líbero en posición zaguera P5 no infringe nada', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'libero');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 1 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([]);
  });

  it('E12: el líbero en posición delantera P3 infringe la regla del líbero', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'libero');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 1 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([{ tipo: 'libero-delantero', jugadores: [p3] }]);
  });

  it('E13: un no-líbero en posición delantera no infringe nada', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 1 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([]);
  });

  it('E14: varias infracciones a la vez se devuelven todas', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 0.5 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 1, y: 1 } },
      { jugador: p4, punto: { x: 4.5, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const resultado = validarFormacion(formacion, orden, 0);

    expect(resultado.infracciones).toEqual([
      { tipo: 'zaguero-delantero', jugadores: [p1, p2] },
      { tipo: 'orden-lateral', jugadores: [p4, p3] },
    ]);
  });

  it('E15: la misma formación cambia de veredicto según la rotación', () => {
    const p1 = jugador('p1', 'opuesto');
    const p2 = jugador('p2', 'colocador');
    const p3 = jugador('p3', 'central');
    const p4 = jugador('p4', 'receptor');
    const p5 = jugador('p5', 'central');
    const p6 = jugador('p6', 'receptor');
    const orden: OrdenSaque = [p1, p2, p3, p4, p5, p6];
    const formacion: Formacion = [
      { jugador: p1, punto: { x: 8, y: 8 } },
      { jugador: p2, punto: { x: 8, y: 1 } },
      { jugador: p3, punto: { x: 4.5, y: 1 } },
      { jugador: p4, punto: { x: 1, y: 1 } },
      { jugador: p5, punto: { x: 1, y: 6 } },
      { jugador: p6, punto: { x: 4.5, y: 6 } },
    ];

    const enR1 = validarFormacion(formacion, orden, 0);
    const enR2 = validarFormacion(formacion, orden, 1);

    expect(enR1.infracciones).toEqual([]);
    expect(enR2.infracciones.length).toBeGreaterThan(0);
  });
});
