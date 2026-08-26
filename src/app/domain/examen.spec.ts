import { describe, expect, it } from 'vitest';
import type { Formacion, Jugador, OrdenSaque, PlantillaEquipo, Sistema } from './modelos';
import { formacionEnRotacion, jugadoresEnPista } from './rotacion';
import { jugadoresAColocar, sePuedeExaminar, faltasImputables } from './examen';

function jugador(id: string, rol: Jugador['rol'], indice?: 1 | 2): Jugador {
  return indice === undefined ? { id, rol } : { id, rol, indice };
}

function ordenValidoEstandar(): OrdenSaque {
  return [
    jugador('colocador', 'colocador'),
    jugador('receptor1', 'receptor', 1),
    jugador('receptor2', 'receptor', 2),
    jugador('central1', 'central', 1),
    jugador('central2', 'central', 2),
    jugador('opuesto', 'opuesto'),
  ];
}

function plantilla(): PlantillaEquipo {
  return { nombre: 'Equipo A', ordenSaque: ordenValidoEstandar() };
}

function plantillaConLibero(sustituidoId: string): PlantillaEquipo {
  const sustitutosPorRotacion = { 1: sustituidoId, 2: sustituidoId, 3: sustituidoId, 4: sustituidoId, 5: sustituidoId, 6: sustituidoId };
  return { nombre: 'Equipo A', ordenSaque: ordenValidoEstandar(), libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion } };
}

const PUNTOS_LEGALES = [
  { x: 8, y: 8 },
  { x: 8, y: 1 },
  { x: 4.5, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 6 },
  { x: 4.5, y: 6 },
];

function formacionLegalPara(orden: OrdenSaque, rotacion: number): Formacion {
  const posiciones = formacionEnRotacion(orden, rotacion);
  return posiciones.map((jugador, indice) => ({ jugador, punto: PUNTOS_LEGALES[indice] }));
}

function sistemaConSeisFormaciones(plantillaEquipo: PlantillaEquipo): Sistema {
  const formaciones: Record<number, Formacion> = {};
  for (const rotacion of [1, 2, 3, 4, 5, 6]) {
    formaciones[rotacion] = formacionLegalPara(plantillaEquipo.ordenSaque, rotacion);
  }
  return {
    id: 'sistema-1',
    nombre: 'Sistema',
    tipo: 'recepcion',
    equipoId: 'masculino',
    plantilla: plantillaEquipo,
    formaciones,
    explicacionesRotacion: {},
    estado: 'validado',
  };
}

describe('jugadoresAColocar', () => {
  it('012-E1: en el examen por puesto solo toca colocar al titular examinado', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const examen = { tipo: 'puesto' as const, titularId: 'receptor1' };

    const resultado = jugadoresAColocar(examen, sistema, 1);

    expect(resultado).toEqual([jugador('receptor1', 'receptor', 1)]);
  });

  it('012-E2: en el examen por línea toca colocar a los tres de la línea del examinado', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const examen = { tipo: 'linea' as const, titularId: 'receptor1' };

    // R1: colocador en P1 => orden sin rotar. receptor1 (índice 1) ocupa P2, línea delantera
    // (P4,P3,P2 = índices 3,2,1).
    const resultado = jugadoresAColocar(examen, sistema, 1);

    const orden = ordenValidoEstandar();
    expect(resultado).toEqual([orden[3], orden[2], orden[1]]);
  });

  it('012-E3: en el examen por sistema toca colocar a los seis', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const examen = { tipo: 'sistema' as const };

    const resultado = jugadoresAColocar(examen, sistema, 1);

    expect(resultado).toEqual(jugadoresEnPista(sistema.plantilla, 1));
  });

  it('012-E4: el examen por línea pide la línea del examinado, que cambia con la rotación', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const examen = { tipo: 'linea' as const, titularId: 'receptor1' };

    // R1: receptor1 cae en la línea delantera, junto a central1 y receptor2.
    const enR1 = jugadoresAColocar(examen, sistema, 1);
    // R4: la misma plantilla rota a otro punto de partida y receptor1 cae en la línea zaguera,
    // con los mismos dos compañeros de rol pero en la otra línea — la línea depende de la
    // rotación, no es un trío fijo.
    const enR4 = jugadoresAColocar(examen, sistema, 4);

    expect(enR1.map((j) => j.id)).toEqual(['central1', 'receptor2', 'receptor1']);
    expect(enR4.map((j) => j.id)).toEqual(['central1', 'receptor1', 'receptor2']);
  });

  it('012-E5: si el líbero entra por el examinado, la ficha a colocar es la del líbero', () => {
    const plantillaEquipo = plantillaConLibero('central2');
    const sistema = sistemaConSeisFormaciones(plantillaEquipo);
    const examen = { tipo: 'puesto' as const, titularId: 'central2' };

    // R1: central2 cae en zaga, así que el líbero entra por él.
    const resultado = jugadoresAColocar(examen, sistema, 1);

    expect(resultado).toEqual([jugador('libero', 'libero')]);
  });
});

describe('sePuedeExaminar', () => {
  it('012-E6: no se puede examinar un sistema al que le falta alguna rotación por colocar', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const incompleto: Sistema = { ...sistema, formaciones: { 1: sistema.formaciones[1] } };

    expect(sePuedeExaminar(incompleto)).toBe(false);
  });

  it('012-E7: no se puede examinar un sistema cuyo modelo tenga una falta guardada a propósito', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const orden = ordenValidoEstandar();
    // Formación de R1 con orden lateral invertido entre P4 y P3 (índices 3 y 2): falta a propósito.
    const formacionConFalta: Formacion = formacionEnRotacion(orden, 1).map((j, indice) => ({
      jugador: j,
      punto: indice === 3 ? { x: 4.5, y: 1 } : indice === 2 ? { x: 1, y: 1 } : PUNTOS_LEGALES[indice],
    }));
    const conFalta: Sistema = { ...sistema, formaciones: { ...sistema.formaciones, 1: formacionConFalta } };

    expect(sePuedeExaminar(conFalta)).toBe(false);
  });
});

describe('faltasImputables', () => {
  it('012-E8: cruzarse con un compañero de su propia línea es falta suya', () => {
    // R1: P4=central1, P3=receptor2, P2=receptor1 (línea delantera). Examen por línea sobre
    // central1: le toca colocar a los tres. Se invierten central1 (P4) y receptor2 (P3): las
    // dos son suyas.
    const orden = ordenValidoEstandar();
    const posiciones = formacionEnRotacion(orden, 1);
    const formacion: Formacion = posiciones.map((j, indice) => ({
      jugador: j,
      punto: indice === 3 ? { x: 4.5, y: 1 } : indice === 2 ? { x: 1, y: 1 } : PUNTOS_LEGALES[indice],
    }));
    // Le tocaba colocar a los tres de la línea delantera (examen por línea sobre central1).
    const jugadoresDelAlumno = [orden[3], orden[2], orden[1]];

    const faltas = faltasImputables(jugadoresDelAlumno, formacion, posiciones);

    expect(faltas).toHaveLength(1);
    expect(faltas[0].tipo).toBe('orden-lateral');
  });

  it('012-E9: cruzarse con un compañero que venía dado también es falta suya', () => {
    // R1: P4=central1 (suyo, examen por puesto), P3=receptor2 (dado). Se invierten: central1 a
    // la derecha de receptor2.
    const orden = ordenValidoEstandar();
    const posiciones = formacionEnRotacion(orden, 1);
    const formacion: Formacion = posiciones.map((j, indice) => ({
      jugador: j,
      punto: indice === 3 ? { x: 4.5, y: 1 } : indice === 2 ? { x: 1, y: 1 } : PUNTOS_LEGALES[indice],
    }));
    // Le tocaba colocar solo a central1 (examen por puesto).
    const jugadoresDelAlumno = [orden[3]];

    const faltas = faltasImputables(jugadoresDelAlumno, formacion, posiciones);

    expect(faltas).toHaveLength(1);
    expect(faltas[0].tipo).toBe('orden-lateral');
  });

  it('012-E10: una falta entre dos fichas dadas no se le imputa al alumno', () => {
    // Misma falta que en E9 (central1 x receptor2), pero el alumno examinado es "opuesto": ni
    // central1 ni receptor2 son suyos.
    const orden = ordenValidoEstandar();
    const posiciones = formacionEnRotacion(orden, 1);
    const formacion: Formacion = posiciones.map((j, indice) => ({
      jugador: j,
      punto: indice === 3 ? { x: 4.5, y: 1 } : indice === 2 ? { x: 1, y: 1 } : PUNTOS_LEGALES[indice],
    }));
    const jugadoresDelAlumno = [orden[5]];

    const faltas = faltasImputables(jugadoresDelAlumno, formacion, posiciones);

    expect(faltas).toHaveLength(0);
  });
});
