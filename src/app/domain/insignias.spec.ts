import { describe, expect, it } from 'vitest';
import type { InsigniaGanada } from './insignias';
import { recuentoDeSistemas, resumenDeMedallas } from './insignias';
import type { Jugador, OrdenSaque, PlantillaEquipo, Sistema } from './modelos';

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

function plantillaConLibero(): PlantillaEquipo {
  const sustitutosPorRotacion = { 1: 'central1', 2: 'central1', 3: 'central1', 4: 'central1', 5: 'central1', 6: 'central1' };
  return {
    nombre: 'Equipo A',
    ordenSaque: ordenValidoEstandar(),
    libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion },
  };
}

function insignia(datos: Partial<InsigniaGanada> & Pick<InsigniaGanada, 'sistemaId' | 'tipo' | 'titularId'>): InsigniaGanada {
  return { obtenidaEn: '2026-02-12T10:00:00.000Z', ...datos };
}

function sistema(id: string, tipo: Sistema['tipo'] = 'recepcion'): Sistema {
  return {
    id,
    nombre: id,
    tipo,
    equipoId: 'masculino',
    plantilla: plantilla(),
    formaciones: {},
    explicacionesRotacion: {},
    estado: 'validado',
  };
}

describe('resumenDeMedallas', () => {
  it('E1: un sistema sin ningún examen superado no tiene medallas ni está dominado', () => {
    const resumen = resumenDeMedallas('sistema-1', plantilla(), []);

    expect(resumen.bronce).toEqual([]);
    expect(resumen.plata).toEqual([]);
    expect(resumen.oro).toBeNull();
    expect(resumen.dominado).toBe(false);
  });

  it('E2: superar el examen por puesto de un titular da el bronce de ese puesto y solo ese', () => {
    const insignias = [insignia({ sistemaId: 'sistema-1', tipo: 'puesto', titularId: 'receptor1' })];

    const resumen = resumenDeMedallas('sistema-1', plantilla(), insignias);

    expect(resumen.bronce).toEqual(['R1']);
    expect(resumen.plata).toEqual([]);
    expect(resumen.oro).toBeNull();
  });

  it('E3: varios puestos del mismo sistema acumulan varios bronces, en el orden en que se ganaron', () => {
    const insignias = [
      insignia({ sistemaId: 'sistema-1', tipo: 'puesto', titularId: 'central1', obtenidaEn: '2026-01-10T09:00:00.000Z' }),
      insignia({ sistemaId: 'sistema-1', tipo: 'puesto', titularId: 'receptor1', obtenidaEn: '2026-02-01T09:00:00.000Z' }),
    ];

    const resumen = resumenDeMedallas('sistema-1', plantilla(), insignias);

    expect(resumen.bronce).toEqual(['C1', 'R1']);
  });

  it('E4: bronce y plata conviven en el mismo sistema, cada uno con su puesto', () => {
    const insignias = [
      insignia({ sistemaId: 'sistema-1', tipo: 'puesto', titularId: 'receptor1' }),
      insignia({ sistemaId: 'sistema-1', tipo: 'linea', titularId: 'central1' }),
    ];

    const resumen = resumenDeMedallas('sistema-1', plantilla(), insignias);

    expect(resumen.bronce).toEqual(['R1']);
    expect(resumen.plata).toEqual(['C1']);
  });

  it('E5: el oro marca el sistema como dominado y guarda su fecha', () => {
    const insignias = [
      insignia({ sistemaId: 'sistema-1', tipo: 'sistema', titularId: null, obtenidaEn: '2026-01-20T09:00:00.000Z' }),
    ];

    const resumen = resumenDeMedallas('sistema-1', plantilla(), insignias);

    expect(resumen.oro).toBe('2026-01-20T09:00:00.000Z');
    expect(resumen.dominado).toBe(true);
  });

  it('E6: las medallas de un sistema no se cuelan en el resumen de otro', () => {
    const insignias = [
      insignia({ sistemaId: 'sistema-1', tipo: 'puesto', titularId: 'receptor1' }),
      insignia({ sistemaId: 'sistema-1', tipo: 'sistema', titularId: null }),
    ];

    const resumenOtro = resumenDeMedallas('sistema-2', plantilla(), insignias);

    expect(resumenOtro.bronce).toEqual([]);
    expect(resumenOtro.plata).toEqual([]);
    expect(resumenOtro.oro).toBeNull();
    expect(resumenOtro.dominado).toBe(false);
  });

  it('E7b: el bronce del líbero se nombra como un puesto más, con la etiqueta "L"', () => {
    const insignias = [
      insignia({ sistemaId: 'sistema-1', tipo: 'puesto', titularId: 'central1' }),
      insignia({ sistemaId: 'sistema-1', tipo: 'puesto', titularId: 'libero' }),
    ];

    const resumen = resumenDeMedallas('sistema-1', plantillaConLibero(), insignias);

    expect(resumen.bronce).toEqual(['C1', 'L']);
  });
});

describe('recuentoDeSistemas', () => {
  it('E7: cuenta los sistemas con oro sobre todos los de recepción, sin contar los de defensa', () => {
    const sistemas = [
      sistema('s1'),
      sistema('s2'),
      sistema('s3'),
      sistema('s4'),
      sistema('s5'),
      sistema('s6'),
      sistema('s7'),
      sistema('s8'),
      sistema('s9'),
      sistema('d1', 'defensa'),
      sistema('d2', 'defensa'),
    ];
    const insignias = [
      insignia({ sistemaId: 's1', tipo: 'sistema', titularId: null }),
      insignia({ sistemaId: 's2', tipo: 'sistema', titularId: null }),
      insignia({ sistemaId: 's3', tipo: 'puesto', titularId: 'receptor1' }),
      insignia({ sistemaId: 's4', tipo: 'linea', titularId: 'central1' }),
    ];

    const recuento = recuentoDeSistemas(sistemas, insignias);

    expect(recuento).toEqual({ dominados: 2, total: 9 });
  });

  it('E20: una medalla cuyo sistema ya no está en el catálogo no cuenta en el recuento', () => {
    const sistemas = [sistema('s1'), sistema('s2')];
    const insignias = [
      insignia({ sistemaId: 's1', tipo: 'sistema', titularId: null }),
      insignia({ sistemaId: 'borrado', tipo: 'sistema', titularId: null }),
    ];

    const recuento = recuentoDeSistemas(sistemas, insignias);

    expect(recuento).toEqual({ dominados: 1, total: 2 });
  });

  it('E21: un sistema sin validar resume sus medallas igual que uno validado', () => {
    const sistemas = [{ ...sistema('s1'), estado: 'borrador' as const }];
    const insignias = [insignia({ sistemaId: 's1', tipo: 'sistema', titularId: null })];

    const recuento = recuentoDeSistemas(sistemas, insignias);
    const resumen = resumenDeMedallas('s1', plantilla(), insignias);

    expect(recuento).toEqual({ dominados: 1, total: 1 });
    expect(resumen.dominado).toBe(true);
  });
});
