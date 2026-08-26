import { describe, expect, it } from 'vitest';
import type { Formacion, Jugador, OrdenSaque, PlantillaEquipo, Sistema } from './modelos';
import { formacionEnRotacion, jugadoresEnPista } from './rotacion';
import {
  jugadoresAColocar,
  sePuedeExaminar,
  faltasImputables,
  notaPorDistancia,
  corregirRotacion,
  corregirExamen,
  rotacionesExaminables,
  NOTA_APROBADO,
  permiteCorregirPorRotacion,
} from './examen';

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

  it('057-E3: una rotación donde el líbero sustituye al examinado no se examina (revierte 012-E5)', () => {
    const plantillaEquipo = plantillaConLibero('central2');
    const sistema = sistemaConSeisFormaciones(plantillaEquipo);
    const examen = { tipo: 'puesto' as const, titularId: 'central2' };

    // R1: central2 cae en zaga, así que el líbero entra por él — esa rotación no se examina.
    // (Spec 012-E5 pedía colocar la ficha del líbero; la spec 057 lo revierte: si el examinado
    // no está físicamente en pista, la rotación queda fuera del examen.)
    const resultado = jugadoresAColocar(examen, sistema, 1);

    expect(resultado).toEqual([]);
  });
});

describe('rotacionesExaminables', () => {
  it('057-E4: un titular en pista las seis rotaciones se examina de las seis', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const examen = { tipo: 'puesto' as const, titularId: 'receptor1' };

    const resultado = rotacionesExaminables(examen, sistema);

    expect(resultado).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('057-E3b: un titular al que el líbero sustituye en algunas rotaciones no se examina en esas', () => {
    const plantillaEquipo = plantillaConLibero('central2');
    const sistema = sistemaConSeisFormaciones(plantillaEquipo);
    const examen = { tipo: 'puesto' as const, titularId: 'central2' };

    const resultado = rotacionesExaminables(examen, sistema);

    expect(resultado.length).toBeGreaterThan(0);
    expect(resultado.length).toBeLessThan(6);
  });

  it('057-E4b: el examen por sistema siempre examina las seis, no depende del líbero', () => {
    const plantillaEquipo = plantillaConLibero('central2');
    const sistema = sistemaConSeisFormaciones(plantillaEquipo);
    const examen = { tipo: 'sistema' as const };

    const resultado = rotacionesExaminables(examen, sistema);

    expect(resultado).toEqual([1, 2, 3, 4, 5, 6]);
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

describe('notaPorDistancia', () => {
  it('013-E1: colocar la ficha en el sitio exacto del entrenador es un diez', () => {
    expect(notaPorDistancia(0)).toBe(10);
  });

  it('057-E9: una ficha a medio metro o menos de su sitio es un diez (sustituye a 013-E2)', () => {
    expect(notaPorDistancia(0.45)).toBe(10);
    expect(notaPorDistancia(0.5)).toBe(10);
  });

  it('057-E10: la nota decae de forma proporcional hasta perderla entera a los cuatro metros (sustituye a 013-E3)', () => {
    expect(notaPorDistancia(1)).toBeCloseTo(8.571, 2);
    expect(notaPorDistancia(1.5)).toBeCloseTo(7.143, 2);
    expect(notaPorDistancia(2)).toBeCloseTo(5.714, 2);
    expect(notaPorDistancia(3)).toBeCloseTo(2.857, 2);
    expect(notaPorDistancia(4)).toBe(0);
    expect(notaPorDistancia(5)).toBe(0);
  });
});

describe('corregirRotacion', () => {
  it('013-E4: la nota de la rotación es la media de las fichas que le tocaba colocar; las dadas no cuentan', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const examen = { tipo: 'linea' as const, titularId: 'central1' };
    // R1: le toca colocar a central1 (P4), receptor2 (P3), receptor1 (P2). Los coloca exactos
    // (nota 10 cada uno) salvo receptor1, a 1,5 m de su punto (nota ~5,88). El colocador (P1,
    // dado) se desplaza a un punto legal distinto del suyo — no debe afectar a la nota.
    const modelo = sistema.formaciones[1]!;
    const entrega: Formacion = modelo.map((c) => {
      if (c.jugador.id === 'receptor1') {
        return { ...c, punto: { x: c.punto.x + 1.5, y: c.punto.y } };
      }
      if (c.jugador.id === 'colocador') {
        return { ...c, punto: { x: 8, y: 3 } };
      }
      return c;
    });

    const resultado = corregirRotacion(examen, sistema, 1, entrega);

    // receptor1 desplazado 1,5 m: con la curva de la spec 057 (0,5 m/4 m) su nota es 7,143.
    expect(resultado.nota).toBeCloseTo((10 + 10 + 7.143) / 3, 1);
  });

  it('013-E5: una ficha sin colocar es un cero, y esa rotación no se juzga de falta', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const examen = { tipo: 'puesto' as const, titularId: 'receptor1' };
    // La entrega no incluye a receptor1 en absoluto.
    const entrega: Formacion = sistema.formaciones[1]!.filter((c) => c.jugador.id !== 'receptor1');

    const resultado = corregirRotacion(examen, sistema, 1, entrega);

    expect(resultado.nota).toBe(0);
    expect(resultado.faltas).toHaveLength(0);
  });

  it('013-E6 / 057-E8: una rotación con falta suya vale cero, aunque las fichas estén casi en su sitio', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const orden = ordenValidoEstandar();
    const posiciones = formacionEnRotacion(orden, 1);
    // Examen por línea sobre central1 (P4, delantero en R1): coloca los tres de su línea casi
    // perfectos, pero invierte central1 y receptor2 (P4/P3) — falta suya, orden-lateral.
    const entrega: Formacion = posiciones.map((j, indice) => ({
      jugador: j,
      punto:
        indice === 3
          ? { x: 4.5 + 0.01, y: 1 }
          : indice === 2
            ? { x: 1 + 0.01, y: 1 }
            : PUNTOS_LEGALES[indice],
    }));
    const examen = { tipo: 'linea' as const, titularId: 'central1' };

    const resultado = corregirRotacion(examen, sistema, 1, entrega);

    expect(resultado.nota).toBe(0);
    expect(resultado.faltas.length).toBeGreaterThan(0);
  });
});

describe('corregirExamen', () => {
  it('013-E7: una falta en una rotación no hunde las otras cinco; las seis pesan lo mismo', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const examen = { tipo: 'sistema' as const };
    const orden = ordenValidoEstandar();
    const entrega: Partial<Record<1|2|3|4|5|6, Formacion>> = {};
    for (const rotacion of [1, 2, 3, 4, 5, 6] as const) {
      entrega[rotacion] = sistema.formaciones[rotacion]!;
    }
    // R1 con falta: invierte P4 y P3.
    const posicionesR1 = formacionEnRotacion(orden, 1);
    entrega[1] = posicionesR1.map((j, indice) => ({
      jugador: j,
      punto: indice === 3 ? { x: 4.5, y: 1 } : indice === 2 ? { x: 1, y: 1 } : PUNTOS_LEGALES[indice],
    }));

    const resultado = corregirExamen(examen, sistema, entrega);

    // R1 vale 0, las otras cinco valen 10 cada una: media = 50/6.
    expect(resultado.nota).toBeCloseTo(50 / 6, 1);
  });

  it('013-E8: estar en regla por pocos centímetros no quita nota (no es una falta que la anule)', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const examen = { tipo: 'linea' as const, titularId: 'central1' };
    const orden = ordenValidoEstandar();
    const posicionesR1 = formacionEnRotacion(orden, 1);
    // P4 y P3 separados solo 0,03 m entre sí (un aviso, dentro del margen de 0,05 m, no una
    // falta), pero cada uno sigue a menos de 0,45 m (DISTANCIA_PERFECTA) de su punto del modelo.
    const entrega: Formacion = posicionesR1.map((j, indice) => ({
      jugador: j,
      punto: indice === 3 ? { x: 1, y: 1 } : indice === 2 ? { x: 1.03, y: 1 } : PUNTOS_LEGALES[indice],
    }));

    const resultado = corregirRotacion(examen, sistema, 1, entrega);

    // Sin faltas (era un aviso, no falta): la nota sale de la distancia de cada ficha al modelo,
    // no se anula a 0 por haber estado al límite de la regla de posición.
    expect(resultado.faltas).toHaveLength(0);
    expect(resultado.nota).toBeGreaterThan(0);
  });

  it('013-E9: se supera el examen a partir de un siete, y cada tipo da su insignia', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const entregaPerfecta: Partial<Record<1|2|3|4|5|6, Formacion>> = {};
    for (const rotacion of [1, 2, 3, 4, 5, 6] as const) {
      entregaPerfecta[rotacion] = sistema.formaciones[rotacion]!;
    }

    const porPuesto = corregirExamen({ tipo: 'puesto', titularId: 'receptor1' }, sistema, entregaPerfecta);
    const porLinea = corregirExamen({ tipo: 'linea', titularId: 'receptor1' }, sistema, entregaPerfecta);
    const porSistema = corregirExamen({ tipo: 'sistema' }, sistema, entregaPerfecta);

    expect(porPuesto.insignia).toBe('bronce');
    expect(porLinea.insignia).toBe('plata');
    expect(porSistema.insignia).toBe('oro');
  });

  it('013-E10: con una falta en cualquiera de las seis rotaciones no hay insignia, aunque la nota llegue a siete', () => {
    const sistema = sistemaConSeisFormaciones(plantilla());
    const orden = ordenValidoEstandar();
    const entrega: Partial<Record<1|2|3|4|5|6, Formacion>> = {};
    for (const rotacion of [1, 2, 3, 4, 5, 6] as const) {
      entrega[rotacion] = sistema.formaciones[rotacion]!;
    }
    // R1 con falta (P4/P3 invertidos): esa rotación vale 0, pero las otras cinco perfectas dan
    // 50/6 ≈ 8,33 — por encima de 7.
    const posicionesR1 = formacionEnRotacion(orden, 1);
    entrega[1] = posicionesR1.map((j, indice) => ({
      jugador: j,
      punto: indice === 3 ? { x: 4.5, y: 1 } : indice === 2 ? { x: 1, y: 1 } : PUNTOS_LEGALES[indice],
    }));
    const examen = { tipo: 'sistema' as const };

    const resultado = corregirExamen(examen, sistema, entrega);

    expect(resultado.nota).toBeGreaterThanOrEqual(NOTA_APROBADO);
    expect(resultado.insignia).toBeNull();
  });

  it('013-E11: el examen por puesto y por línea se corrigen rotación a rotación; el de sistema no', () => {
    expect(permiteCorregirPorRotacion('puesto')).toBe(true);
    expect(permiteCorregirPorRotacion('linea')).toBe(true);
    expect(permiteCorregirPorRotacion('sistema')).toBe(false);
  });

  it('057-E5: la nota final es la media de las rotaciones examinadas, no de las seis', () => {
    const plantillaEquipo = plantillaConLibero('central2');
    const sistema = sistemaConSeisFormaciones(plantillaEquipo);
    const examen = { tipo: 'puesto' as const, titularId: 'central2' };
    const rotaciones = rotacionesExaminables(examen, sistema);
    // El líbero sustituye a central2 en algunas rotaciones: no se examinan las seis.
    expect(rotaciones.length).toBeGreaterThan(0);
    expect(rotaciones.length).toBeLessThan(6);

    const entrega: Partial<Record<1 | 2 | 3 | 4 | 5 | 6, Formacion>> = {};
    for (const rotacion of rotaciones) {
      entrega[rotacion] = sistema.formaciones[rotacion]!;
    }

    const resultado = corregirExamen(examen, sistema, entrega);

    // Si las rotaciones no examinadas contaran como cero, la nota bajaría de 10. Al ignorarlas,
    // se queda en 10 porque las examinadas están colocadas exactas.
    expect(resultado.nota).toBe(10);
  });
});
