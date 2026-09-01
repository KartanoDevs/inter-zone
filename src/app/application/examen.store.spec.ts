import { describe, expect, it } from 'vitest';
import type {
  EquipoId,
  Formacion,
  Jugador,
  OrdenSaque,
  PlantillaEquipo,
  Sistema,
} from '../domain/modelos';
import type { InsigniasRepository, SistemaRepository } from '../domain/puertos';
import { formacionEnRotacion, jugadoresEnPista } from '../domain/rotacion';
import { SistemaStore } from './sistema.store';
import { ExamenStore } from './examen.store';

function jugador(id: string, rol: Jugador['rol'], indice?: 1 | 2): Jugador {
  return indice === undefined ? { id, rol } : { id, rol, indice };
}

function ordenSaque(): OrdenSaque {
  return [
    jugador('colocador', 'colocador'),
    jugador('receptor1', 'receptor', 1),
    jugador('receptor2', 'receptor', 2),
    jugador('central1', 'central', 1),
    jugador('central2', 'central', 2),
    jugador('opuesto', 'opuesto'),
  ];
}

const PLANTILLA: PlantillaEquipo = { nombre: 'Equipo', ordenSaque: ordenSaque() };

const PUNTOS_LEGALES = [
  { x: 8, y: 8 },
  { x: 8, y: 1 },
  { x: 4.5, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 6 },
  { x: 4.5, y: 6 },
];

function formacionLegalPara(orden: OrdenSaque, rotacion: number): Formacion {
  return formacionEnRotacion(orden, rotacion).map((j, indice) => ({
    jugador: j,
    punto: PUNTOS_LEGALES[indice],
  }));
}

function sistemaExaminable(id: string, equipoId: EquipoId = 'masculino'): Sistema {
  const formaciones: Record<number, Formacion> = {};
  for (const r of [1, 2, 3, 4, 5, 6]) {
    formaciones[r] = formacionLegalPara(PLANTILLA.ordenSaque, r);
  }
  return {
    id,
    nombre: 'Sistema',
    tipo: 'recepcion',
    equipoId,
    plantilla: PLANTILLA,
    formaciones,
    explicacionesRotacion: {},
    estado: 'validado',
  };
}

/** Una plantilla con líbero, sustituyendo siempre a central2 cuando cae en zaga (decisión 0040:
 * la interfaz ya solo ofrece este caso). No sustituye en las rotaciones donde central2 juega de
 * delantero — `jugadoresEnPista` ignora la declaración fuera de zaga. */
function plantillaConLiberoQueSustituyeACentral2(): PlantillaEquipo {
  const sustitutosPorRotacion = {
    1: 'central2',
    2: 'central2',
    3: 'central2',
    4: 'central2',
    5: 'central2',
    6: 'central2',
  };
  return { ...PLANTILLA, libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion } };
}

/** Spec 058-E5: el líbero está declarado pero nunca sustituye a nadie. */
function plantillaConLiberoQueNuncaJuega(): PlantillaEquipo {
  const sustitutosPorRotacion = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
  return { ...PLANTILLA, libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion } };
}

/** Formación legal construida a partir de quien juega de verdad esa rotación
 * (`jugadoresEnPista`), no del orden de saque a secas — necesario cuando la plantilla tiene
 * líbero, para que la formación coincida con la que exige `sePuedeExaminar`. */
function formacionLegalConLibero(plantillaEquipo: PlantillaEquipo, rotacion: number): Formacion {
  return jugadoresEnPista(plantillaEquipo, rotacion).map((j, indice) => ({
    jugador: j,
    punto: PUNTOS_LEGALES[indice],
  }));
}

function sistemaExaminableConPlantilla(
  id: string,
  plantillaEquipo: PlantillaEquipo,
  equipoId: EquipoId = 'masculino',
): Sistema {
  const formaciones: Record<number, Formacion> = {};
  for (const r of [1, 2, 3, 4, 5, 6]) {
    formaciones[r] = formacionLegalConLibero(plantillaEquipo, r);
  }
  return {
    id,
    nombre: 'Sistema',
    tipo: 'recepcion',
    equipoId,
    plantilla: plantillaEquipo,
    formaciones,
    explicacionesRotacion: {},
    estado: 'validado',
  };
}

const REPOSITORIO_SISTEMAS_SIN_USAR: SistemaRepository = {
  listar: async () => [],
  crear: async () => {},
  actualizar: async () => {},
  cambiarEstado: async () => {},
  borrar: async () => {},
};

function crearExamenStore(
  sistemas: readonly Sistema[],
  insigniasRepositorio?: InsigniasRepository,
): ExamenStore {
  const sistemaStore = new SistemaStore(REPOSITORIO_SISTEMAS_SIN_USAR);
  sistemaStore.sistemas.set(sistemas);
  const insignias: InsigniasRepository = insigniasRepositorio ?? {
    listar: async () => [],
    registrar: async () => {},
  };
  return new ExamenStore(sistemaStore, insignias);
}

/** Coloca la línea del alumno en la rotación activa con dos fichas intercambiadas de sitio: es
 * una falta de orden lateral imputable al alumno (dominio §5, R2/R3), pensada para los tests
 * que comprueban cuándo se ve —o no— el veredicto. Devuelve la rotación colocada. */
function colocarLineaConFalta(examen: ExamenStore, sistema: Sistema): void {
  const rotacion = examen.rotacionActiva();
  const modelo = sistema.formaciones[rotacion]!;
  const alumno = examen.jugadoresDelAlumno();
  const puntoDe = (id: string) => modelo.find((c) => c.jugador.id === id)!.punto;
  // Intercambia el punto de los dos primeros de la línea; el tercero, en su sitio.
  examen.colocar(alumno[0].id, puntoDe(alumno[1].id));
  examen.colocar(alumno[1].id, puntoDe(alumno[0].id));
  examen.colocar(alumno[2].id, puntoDe(alumno[2].id));
}

describe('ExamenStore', () => {
  it('012-E6/E7 (catálogo): solo aparecen sistemas de recepción examinables', () => {
    const examinable = sistemaExaminable('ok');
    const incompleto: Sistema = {
      ...sistemaExaminable('incompleto'),
      formaciones: { 1: examinable.formaciones[1] },
    };
    const examen = crearExamenStore([examinable, incompleto]);

    expect(examen.catalogo().map((s) => s.id)).toEqual(['ok']);
  });

  it('064-E10: el examen solo lista sistemas de los equipos cargados', () => {
    // El catálogo del examen deriva de SistemaStore.sistemas(), que la spec 064 ya deja
    // acotado a los equipos visibles: aquí solo hay masculino.
    const examen = crearExamenStore([sistemaExaminable('m1', 'masculino')]);

    expect(examen.catalogo().every((s) => s.equipoId === 'masculino')).toBe(true);
    expect(examen.equipoActivo()).toBe('masculino');
  });

  it('012: el examen por posición y por línea necesitan un titular; por sistema no', () => {
    const examen = crearExamenStore([sistemaExaminable('s1')]);
    examen.activarSistema('s1');

    examen.seleccionarTipo('puesto');
    expect(examen.necesitaTitular()).toBe(true);

    examen.seleccionarTipo('sistema');
    expect(examen.necesitaTitular()).toBe(false);
  });

  it('012-E1: en el examen por puesto solo toca colocar al titular examinado', () => {
    const examen = crearExamenStore([sistemaExaminable('s1')]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('puesto');
    examen.seleccionarTitular('receptor1');

    expect(examen.jugadoresDelAlumno().map((j) => j.id)).toEqual(['receptor1']);
    expect(examen.dadosDeLaRotacion()).toHaveLength(5);
  });

  it('012-E2: en el examen por línea tocan los tres de la línea del examinado', () => {
    const examen = crearExamenStore([sistemaExaminable('s1')]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('linea');
    examen.seleccionarTitular('receptor1');

    expect(examen.jugadoresDelAlumno()).toHaveLength(3);
    expect(examen.dadosDeLaRotacion()).toHaveLength(3);
  });

  it('012-E3: en el examen por sistema tocan los seis y no hay nada dado', () => {
    const examen = crearExamenStore([sistemaExaminable('s1')]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('sistema');

    expect(examen.jugadoresDelAlumno()).toHaveLength(6);
    expect(examen.dadosDeLaRotacion()).toHaveLength(0);
  });

  it('no se puede validar una rotación con fichas sin colocar', () => {
    const examen = crearExamenStore([sistemaExaminable('s1')]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('puesto');
    examen.seleccionarTitular('receptor1');

    examen.confirmarRotacion();

    expect(examen.correccionRotacionActiva()).toBeNull();
  });

  it('057-E7 / 060-E1: validar una rotación bien colocada la registra, pero su nota solo se ve al terminar', async () => {
    const sistema = sistemaExaminable('s1');
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('puesto');
    examen.seleccionarTitular('receptor1');
    examen.empezarExamen();

    for (const r of examen.rotacionesExaminablesActuales()) {
      examen.seleccionarRotacion(r);
      const puntoIdeal = sistema.formaciones[r]!.find((c) => c.jugador.id === 'receptor1')!.punto;
      examen.colocar('receptor1', puntoIdeal);
      examen.confirmarRotacion();
      // Durante el examen, validar no expone veredicto (spec 060).
      expect(examen.correccionRotacionActiva()).toBeNull();
    }

    await examen.terminarExamen();

    examen.seleccionarRotacion(examen.rotacionesExaminablesActuales()[0]);
    expect(examen.correccionRotacionActiva()?.nota).toBe(10);
    expect(examen.correccionRotacionActiva()?.faltas).toHaveLength(0);
  });

  /** Coloca al alumno en su sitio ideal en la rotación activa y valida. */
  function validarRotacionBien(examen: ExamenStore, sistema: Sistema): void {
    const rotacion = examen.rotacionActiva();
    for (const jugador of examen.jugadoresDelAlumno()) {
      const punto = sistema.formaciones[rotacion]!.find((c) => c.jugador.id === jugador.id)!.punto;
      examen.colocar(jugador.id, punto);
    }
    examen.confirmarRotacion();
  }

  it('066-E2: validar una rotación salta a la siguiente sin validar', () => {
    const sistema = sistemaExaminable('s1');
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('sistema'); // examen por sistema: las seis rotaciones examinables
    examen.empezarExamen();
    const rotaciones = examen.rotacionesExaminablesActuales();
    expect(examen.rotacionActiva()).toBe(rotaciones[0]);

    validarRotacionBien(examen, sistema);

    expect(examen.rotacionActiva()).toBe(rotaciones[1]);
  });

  it('066-E3/E6: validar la última rotación sin validar deja el examen listo para entregar', () => {
    const sistema = sistemaExaminable('s1');
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('sistema');
    examen.empezarExamen();

    for (const _ of examen.rotacionesExaminablesActuales()) {
      validarRotacionBien(examen, sistema);
    }

    expect(examen.todasLasExaminablesValidadas()).toBe(true);
    // La rotación activa no cambió al validar la última: no hay ninguna sin validar a la que ir.
  });

  it('057-E11: la corrección de una rotación validada no se pierde al cambiar de pestaña', () => {
    const sistema = sistemaExaminable('s1');
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('linea');
    examen.seleccionarTitular('receptor1');
    for (const colocacion of examen.jugadoresDelAlumno()) {
      const puntoIdeal = sistema.formaciones[1]!.find((c) => c.jugador.id === colocacion.id)!.punto;
      examen.colocar(colocacion.id, puntoIdeal);
    }
    examen.confirmarRotacion();

    examen.seleccionarRotacion(4);
    examen.seleccionarRotacion(1);

    // El registro sobrevive al cambio de pestaña (habilita el boletín); el veredicto sigue
    // oculto hasta terminar (spec 060), así que se comprueba sobre el mapa, no sobre el computed.
    expect(examen.correccionesPorRotacion()[1]?.nota).toBe(10);
  });

  it('013-E9 / 057: superar el examen por sistema con nota suficiente concede la insignia de oro y la guarda', async () => {
    const sistema = sistemaExaminable('s1');
    const registrados: { sistemaId: string; tipo: string; titularId: string | null }[] = [];
    const insignias: InsigniasRepository = {
      listar: async () => [],
      registrar: async (sistemaId, tipo, titularId) => {
        registrados.push({ sistemaId, tipo, titularId });
      },
    };
    const examen = crearExamenStore([sistema], insignias);
    examen.activarSistema('s1');
    examen.seleccionarTipo('sistema');

    for (const r of [1, 2, 3, 4, 5, 6] as const) {
      examen.seleccionarRotacion(r);
      for (const colocacion of sistema.formaciones[r]!) {
        examen.colocar(colocacion.jugador.id, colocacion.punto);
      }
    }

    await examen.terminarExamen();

    expect(examen.correccionExamen()?.nota).toBe(10);
    expect(examen.correccionExamen()?.insignia).toBe('oro');
    expect(examen.insigniaGuardada()).toBe(true);
    expect(registrados).toEqual([{ sistemaId: 's1', tipo: 'sistema', titularId: null }]);
    expect(examen.fase()).toBe('terminado');
  });

  it('013-E11: el examen por sistema no permite corregir una rotación suelta', () => {
    const examen = crearExamenStore([sistemaExaminable('s1')]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('sistema');

    expect(examen.permiteCorregirRotacionSuelta()).toBe(false);

    examen.seleccionarTipo('puesto');
    examen.seleccionarTitular('receptor1');
    expect(examen.permiteCorregirRotacionSuelta()).toBe(true);
  });

  it('057-E1: el examen empieza en fase de configuración, sin sistema ni tipo elegidos', () => {
    const examen = crearExamenStore([sistemaExaminable('s1')]);

    expect(examen.fase()).toBe('configurando');
    expect(examen.configuracionCompleta()).toBe(false);
  });

  it('057-E1: la configuración se completa al elegir sistema, tipo y (si hace falta) titular', () => {
    const examen = crearExamenStore([sistemaExaminable('s1')]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('puesto');
    expect(examen.configuracionCompleta()).toBe(false);

    examen.seleccionarTitular('receptor1');
    expect(examen.configuracionCompleta()).toBe(true);
  });

  it('057-E2: empezar el examen pasa a la fase "en-curso" y no se puede volver a configurar', () => {
    const examen = crearExamenStore([sistemaExaminable('s1')]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('sistema');

    examen.empezarExamen();

    expect(examen.fase()).toBe('en-curso');
  });

  it('cancelarExamen vuelve a la hoja de inscripción y descarta lo colocado y validado', () => {
    const sistema = sistemaExaminable('s1');
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('puesto');
    examen.seleccionarTitular('receptor1');
    examen.empezarExamen();
    const puntoIdeal = sistema.formaciones[1]!.find((c) => c.jugador.id === 'receptor1')!.punto;
    examen.colocar('receptor1', puntoIdeal);
    examen.confirmarRotacion();
    expect(examen.fase()).toBe('en-curso');

    examen.cancelarExamen();

    expect(examen.fase()).toBe('configurando');
    expect(examen.entrega()).toEqual({});
    expect(examen.correccionesPorRotacion()).toEqual({});
    expect(examen.correccionExamen()).toBeNull();
  });

  it('057-E5: la nota final es la media de las rotaciones examinadas, no de las seis', async () => {
    const plantillaEquipo = plantillaConLiberoQueSustituyeACentral2();
    const sistema = sistemaExaminableConPlantilla('s1', plantillaEquipo);
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('puesto');
    examen.seleccionarTitular('central2');

    const rotaciones = examen.rotacionesExaminablesActuales();
    expect(rotaciones.length).toBeGreaterThan(0);
    expect(rotaciones.length).toBeLessThan(6);

    for (const r of rotaciones) {
      examen.seleccionarRotacion(r);
      for (const colocacion of examen.jugadoresDelAlumno()) {
        const puntoIdeal = sistema.formaciones[r]!.find(
          (c) => c.jugador.id === colocacion.id,
        )!.punto;
        examen.colocar(colocacion.id, puntoIdeal);
      }
    }

    await examen.terminarExamen();

    expect(examen.correccionExamen()?.nota).toBe(10);
  });

  it('058-E1: el líbero aparece entre los titulares cuando el sistema lo tiene y entra en pista', () => {
    const sistema = sistemaExaminableConPlantilla('s1', plantillaConLiberoQueSustituyeACentral2());
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');

    expect(examen.titulares().some((j) => j.id === 'libero')).toBe(true);
  });

  it('058-E2: un sistema sin líbero no lo ofrece entre los titulares', () => {
    const examen = crearExamenStore([sistemaExaminable('s1')]);
    examen.activarSistema('s1');

    expect(examen.titulares().some((j) => j.id === 'libero')).toBe(false);
  });

  it('058-E5: un líbero que nunca entra en pista no se ofrece entre los titulares', () => {
    const sistema = sistemaExaminableConPlantilla('s1', plantillaConLiberoQueNuncaJuega());
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');

    expect(examen.titulares().some((j) => j.id === 'libero')).toBe(false);
  });

  it('060-E1: validar una rotación con falta no expone su veredicto durante el examen', () => {
    const sistema = sistemaExaminable('s1');
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('linea');
    examen.seleccionarTitular('central1');
    examen.empezarExamen();
    colocarLineaConFalta(examen, sistema);

    examen.confirmarRotacion();

    // La rotación queda registrada (habilita el boletín), pero la falta no se ve todavía.
    expect(examen.correccionRotacionActiva()).toBeNull();
  });

  it('060-E2: validar una rotación en regla se ve igual que validar una con falta', () => {
    const sistema = sistemaExaminable('s1');
    const conFalta = crearExamenStore([sistema]);
    conFalta.activarSistema('s1');
    conFalta.seleccionarTipo('linea');
    conFalta.seleccionarTitular('central1');
    conFalta.empezarExamen();
    colocarLineaConFalta(conFalta, sistema);
    conFalta.confirmarRotacion();

    const enRegla = crearExamenStore([sistema]);
    enRegla.activarSistema('s1');
    enRegla.seleccionarTipo('linea');
    enRegla.seleccionarTitular('central1');
    enRegla.empezarExamen();
    for (const c of enRegla.jugadoresDelAlumno()) {
      enRegla.colocar(
        c.id,
        sistema.formaciones[enRegla.rotacionActiva()]!.find((x) => x.jugador.id === c.id)!.punto,
      );
    }
    enRegla.confirmarRotacion();

    expect(conFalta.correccionRotacionActiva()).toEqual(enRegla.correccionRotacionActiva());
  });

  it('060-E3: volver a una rotación ya validada con falta sigue sin mostrar su veredicto', () => {
    const sistema = sistemaExaminable('s1');
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('linea');
    examen.seleccionarTitular('central1');
    examen.empezarExamen();
    colocarLineaConFalta(examen, sistema);
    examen.confirmarRotacion();

    examen.seleccionarRotacion(4);
    examen.seleccionarRotacion(1);

    expect(examen.correccionRotacionActiva()).toBeNull();
  });

  it('060-E4: el boletín final sí muestra la falta de cada rotación', async () => {
    const sistema = sistemaExaminable('s1');
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('linea');
    examen.seleccionarTitular('central1');
    examen.empezarExamen();
    for (const r of examen.rotacionesExaminablesActuales()) {
      examen.seleccionarRotacion(r);
      colocarLineaConFalta(examen, sistema);
      examen.confirmarRotacion();
    }

    await examen.terminarExamen();

    const rotacion = examen.rotacionesExaminablesActuales()[0];
    examen.seleccionarRotacion(rotacion);
    expect(examen.correccionRotacionActiva()?.faltas.length ?? 0).toBeGreaterThan(0);
    expect(examen.correccionesPorRotacion()[rotacion]?.faltas.length ?? 0).toBeGreaterThan(0);
  });

  it('060-E5: una falta oculta durante el examen sigue anulando la nota de esa rotación', async () => {
    const sistema = sistemaExaminable('s1');
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('linea');
    examen.seleccionarTitular('central1');
    examen.empezarExamen();
    const rotaciones = examen.rotacionesExaminablesActuales();
    for (const [i, r] of rotaciones.entries()) {
      examen.seleccionarRotacion(r);
      if (i === 0) {
        colocarLineaConFalta(examen, sistema);
      } else {
        for (const c of examen.jugadoresDelAlumno()) {
          examen.colocar(c.id, sistema.formaciones[r]!.find((x) => x.jugador.id === c.id)!.punto);
        }
      }
      examen.confirmarRotacion();
    }

    await examen.terminarExamen();

    expect(examen.correccionesPorRotacion()[rotaciones[0]]?.nota).toBe(0);
    expect(examen.correccionExamen()?.insignia).toBeNull();
  });

  it('060-E6: reiniciar el examen no arrastra correcciones del intento anterior', () => {
    const sistema = sistemaExaminable('s1');
    const examen = crearExamenStore([sistema]);
    examen.activarSistema('s1');
    examen.seleccionarTipo('linea');
    examen.seleccionarTitular('central1');
    examen.empezarExamen();
    colocarLineaConFalta(examen, sistema);
    examen.confirmarRotacion();

    examen.cancelarExamen();

    expect(examen.correccionesPorRotacion()).toEqual({});
    expect(examen.correccionExamen()).toBeNull();
  });

  it('058-E3/E4/E6: examinar al líbero coloca solo su ficha, por posición, y guarda su propia insignia', async () => {
    const sistema = sistemaExaminableConPlantilla('s1', plantillaConLiberoQueSustituyeACentral2());
    const registrados: { sistemaId: string; tipo: string; titularId: string | null }[] = [];
    const insignias: InsigniasRepository = {
      listar: async () => [],
      registrar: async (sistemaId, tipo, titularId) => {
        registrados.push({ sistemaId, tipo, titularId });
      },
    };
    const examen = crearExamenStore([sistema], insignias);
    examen.activarSistema('s1');
    examen.seleccionarTipo('puesto');
    examen.seleccionarTitular('libero');

    const rotaciones = examen.rotacionesExaminablesActuales();
    expect(rotaciones.length).toBeGreaterThan(0);

    for (const r of rotaciones) {
      examen.seleccionarRotacion(r);
      expect(examen.jugadoresDelAlumno().map((j) => j.id)).toEqual(['libero']);
      const puntoIdeal = sistema.formaciones[r]!.find((c) => c.jugador.id === 'libero')!.punto;
      examen.colocar('libero', puntoIdeal);
    }

    await examen.terminarExamen();

    expect(examen.correccionExamen()?.nota).toBe(10);
    expect(registrados).toEqual([{ sistemaId: 's1', tipo: 'puesto', titularId: 'libero' }]);
  });
});
