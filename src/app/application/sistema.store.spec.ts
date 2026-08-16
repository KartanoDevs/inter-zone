import { describe, expect, it } from 'vitest';
import type { Formacion, Jugador, OrdenSaque, PlantillaEquipo, Sistema } from '../domain/modelos';
import type { SistemaRepository } from '../domain/puertos';
import { SistemaStore } from './sistema.store';

function jugador(id: string, rol: Jugador['rol'], indice?: 1 | 2): Jugador {
  return indice === undefined ? { id, rol } : { id, rol, indice };
}

function ordenConCentral2(): OrdenSaque {
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
  return { nombre: 'Equipo A', ordenSaque: ordenConCentral2() };
}

function sistemaBase(id: string, nombre: string): Sistema {
  return { id, nombre, tipo: 'recepcion', plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };
}

function plantillaConLibero(sustituidoId: string): PlantillaEquipo {
  const sustitutosPorRotacion = { 1: sustituidoId, 2: sustituidoId, 3: sustituidoId, 4: sustituidoId, 5: sustituidoId, 6: sustituidoId };
  return { nombre: 'Equipo A', ordenSaque: ordenConCentral2(), libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion } };
}

function sistemaConLibero(id: string, nombre: string): Sistema {
  return { id, nombre, tipo: 'recepcion', plantilla: plantillaConLibero('central2'), formaciones: {}, explicacionesRotacion: {} };
}

class RepositorioFake implements SistemaRepository {
  constructor(private sistemas: readonly Sistema[] = []) {}

  listar(): readonly Sistema[] {
    return this.sistemas;
  }

  guardar(sistemas: readonly Sistema[]): void {
    this.sistemas = sistemas;
  }
}

describe('SistemaStore', () => {
  it('009-E1: arrancar con sistemas ya guardados activa el primero del catálogo ordenado', () => {
    const defensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
    const recepcionB = sistemaBase('r2', 'Recepción B');
    const recepcionA = sistemaBase('r1', 'Recepción A');

    const store = new SistemaStore(new RepositorioFake([defensa, recepcionB, recepcionA]));

    expect(store.sistemaActivoId()).toBe('r1');
  });

  it('009-E2: arrancar con el catálogo vacío no deja ningún sistema activo', () => {
    const store = new SistemaStore(new RepositorioFake([]));

    expect(store.sistemaActivoId()).toBeNull();
    expect(store.borrador()).toEqual([]);
  });

  it('009-E3: activar un sistema carga la formación guardada de su rotación activa', () => {
    const [colocador] = plantilla().ordenSaque;
    const conFormacion: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 } }] },
    };
    const store = new SistemaStore(new RepositorioFake([conFormacion, sistemaBase('r2', 'Dos')]));

    store.activarSistema('r1');

    expect(store.borrador()).toEqual(conFormacion.formaciones[1]);
  });

  it('009-E4: cambiar de rotación sin cambios pendientes recarga directamente', () => {
    const [colocador] = plantilla().ordenSaque;
    const sistema: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      formaciones: { 2: [{ jugador: colocador, punto: { x: 1, y: 1 } }] },
    };
    const store = new SistemaStore(new RepositorioFake([sistema]));

    store.seleccionarRotacion(2);

    expect(store.rotacionActiva()).toBe(2);
    expect(store.borrador()).toEqual(sistema.formaciones[2]);
  });

  it('009-E5: cambiar a una rotación sin guardar deja el campo vacío', () => {
    const sistema = sistemaBase('r1', 'Uno');
    const store = new SistemaStore(new RepositorioFake([sistema]));

    store.seleccionarRotacion(3);

    expect(store.borrador()).toEqual([]);
  });

  it('009-E6: cambiar de rotación con cambios sin guardar pide confirmar', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 1, y: 1 });

    store.seleccionarRotacion(2);

    expect(store.rotacionActiva()).toBe(1);
    expect(store.cambioPendiente()).toEqual({ tipo: 'rotacion', valor: 2 });
  });

  it('009-E7: confirmar el aviso descarta los cambios y cambia de rotación', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 1, y: 1 });
    store.seleccionarRotacion(2);

    store.confirmarCambio();

    expect(store.rotacionActiva()).toBe(2);
    expect(store.cambioPendiente()).toBeNull();
    expect(store.borrador()).toEqual([]);
  });

  it('009-E8: cancelar el aviso mantiene la rotación y los cambios', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 1, y: 1 });
    store.seleccionarRotacion(2);

    store.cancelarCambio();

    expect(store.rotacionActiva()).toBe(1);
    expect(store.cambioPendiente()).toBeNull();
    expect(store.borrador().some((c) => c.jugador.id === colocador.id)).toBe(true);
  });

  it('009-E9: colocar un jugador lo añade al borrador', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    const [colocador] = plantilla().ordenSaque;

    store.colocarOMover(colocador.id, { x: 2, y: 2 });

    expect(store.borrador()).toEqual([{ jugador: colocador, punto: { x: 2, y: 2 } }]);
  });

  it('009-E10: mover un jugador ya colocado lo traslada sin duplicarlo', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 2, y: 2 });

    store.colocarOMover(colocador.id, { x: 3, y: 3 });

    expect(store.borrador()).toEqual([{ jugador: colocador, punto: { x: 3, y: 3 } }]);
  });

  it('009-E11: quitar un jugador lo retira del borrador', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 2, y: 2 });

    store.quitar(colocador.id);

    expect(store.borrador()).toEqual([]);
  });

  it('009-E12: la validación se actualiza al mover un jugador, sin guardar', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    const orden = plantilla().ordenSaque;
    const puntosLegalesR1 = [
      { x: 8, y: 8 },
      { x: 8, y: 1 },
      { x: 4.5, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 6 },
      { x: 4.5, y: 6 },
    ];
    orden.forEach((jugador, indice) => store.colocarOMover(jugador.id, puntosLegalesR1[indice]));

    expect(store.resultadoValidacion()?.infracciones).toEqual([]);

    // Aplasta al colocador sobre el opuesto: provoca una infracción de orden lateral en R1.
    store.colocarOMover(orden[0].id, puntosLegalesR1[1]);

    expect(store.resultadoValidacion()?.infracciones.length).toBeGreaterThan(0);
  });

  it('009-E13: guardar está bloqueado si el borrador está incompleto o es ilegal', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    const [colocador] = plantilla().ordenSaque;

    expect(store.puedeGuardar()).toBe(false);

    store.colocarOMover(colocador.id, { x: 1, y: 1 });

    expect(store.puedeGuardar()).toBe(false);
  });

  it('009-E14: guardar confirma el borrador en el sistema activo y lo persiste', () => {
    const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
    const store = new SistemaStore(repositorio);
    const orden = plantilla().ordenSaque;
    const puntosLegalesR1 = [
      { x: 8, y: 8 },
      { x: 8, y: 1 },
      { x: 4.5, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 6 },
      { x: 4.5, y: 6 },
    ];
    orden.forEach((jugador, indice) => store.colocarOMover(jugador.id, puntosLegalesR1[indice]));

    store.guardar();

    expect(store.sistemaActivo()?.formaciones[1]).toEqual(store.borrador());
    expect(repositorio.listar()[0]?.formaciones[1]).toEqual(store.borrador());
  });

  it('009-E15: guardar deja de haber cambios pendientes', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    const orden = plantilla().ordenSaque;
    const puntosLegalesR1 = [
      { x: 8, y: 8 },
      { x: 8, y: 1 },
      { x: 4.5, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 6 },
      { x: 4.5, y: 6 },
    ];
    orden.forEach((jugador, indice) => store.colocarOMover(jugador.id, puntosLegalesR1[indice]));
    store.guardar();

    store.seleccionarRotacion(2);

    expect(store.rotacionActiva()).toBe(2);
    expect(store.cambioPendiente()).toBeNull();
  });

  it('009-E16: vaciar deja el borrador de la rotación activa sin ninguna ficha', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 1, y: 1 });

    store.vaciar();

    expect(store.borrador()).toEqual([]);
  });

  it('010-E1: el catálogo se muestra ordenado, recepción antes que defensa', () => {
    const defensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
    const store = new SistemaStore(new RepositorioFake([defensa, sistemaBase('r1', 'Recepción')]));

    expect(store.catalogo().map((s) => s.id)).toEqual(['r1', 'd1']);
  });

  it('010-E2: crear un sistema nuevo lo deja activo con la pizarra vacía', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));

    const creado = store.crear('Recepción 5-1', 'recepcion');

    expect(creado).toBe(true);
    expect(store.sistemaActivoId()).not.toBe('r1');
    expect(store.sistemaActivo()?.nombre).toBe('Recepción 5-1');
    expect(store.rotacionActiva()).toBe(1);
    expect(store.borrador()).toEqual([]);
  });

  it('010-E6: renombrar el sistema activo actualiza su nombre', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));

    const renombrado = store.renombrarActivo('Uno renombrado');

    expect(renombrado).toBe(true);
    expect(store.sistemaActivo()?.nombre).toBe('Uno renombrado');
  });

  it('010-E7: borrar un sistema lo quita del catálogo y activa otro', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Recepción A'), sistemaBase('r2', 'Recepción B')]));
    store.activarSistema('r1');

    store.borrar('r1');

    expect(store.catalogo().map((s) => s.id)).toEqual(['r2']);
    expect(store.sistemaActivoId()).toBe('r2');
  });

  it('010-E8: sin jugador seleccionado, el panel muestra la explicación de la rotación', () => {
    const conExplicacion: Sistema = { ...sistemaBase('r1', 'Uno'), explicacionesRotacion: { 1: 'Explicación de la rotación' } };
    const store = new SistemaStore(new RepositorioFake([conExplicacion]));

    expect(store.explicacionMostrada()).toBe('Explicación de la rotación');
  });

  it('010-E9: seleccionar un jugador muestra su explicación en el panel', () => {
    const [colocador] = plantilla().ordenSaque;
    const conJugadorExplicado: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 }, explicacion: 'Se esconde tras el opuesto' }] },
    };
    const store = new SistemaStore(new RepositorioFake([conJugadorExplicado]));

    store.seleccionarJugador(colocador.id);

    expect(store.jugadorSeleccionadoId()).toBe(colocador.id);
    expect(store.explicacionMostrada()).toBe('Se esconde tras el opuesto');
  });

  it('010-E10: tocar de nuevo al jugador seleccionado lo deselecciona', () => {
    const [colocador] = plantilla().ordenSaque;
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    store.seleccionarJugador(colocador.id);

    store.seleccionarJugador(colocador.id);

    expect(store.jugadorSeleccionadoId()).toBeNull();
  });

  it('010-E11: cambiar de rotación deselecciona al jugador', () => {
    const [colocador] = plantilla().ordenSaque;
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    store.seleccionarJugador(colocador.id);

    store.seleccionarRotacion(2);

    expect(store.jugadorSeleccionadoId()).toBeNull();
  });

  it('010-E13a: editar el texto sin selección lo guarda como explicación de la rotación', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));

    store.guardarExplicacion('Explicación nueva de la rotación');

    expect(store.sistemaActivo()?.explicacionesRotacion[1]).toBe('Explicación nueva de la rotación');
  });

  it('010-E13b: editar el texto con un jugador seleccionado lo guarda como explicación suya', () => {
    const [colocador] = plantilla().ordenSaque;
    const conColocadorEnR1: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 } }] },
    };
    const store = new SistemaStore(new RepositorioFake([conColocadorEnR1]));
    store.seleccionarJugador(colocador.id);

    store.guardarExplicacion('Explicación nueva del jugador');

    const colocacion = store.sistemaActivo()?.formaciones[1]?.find((c) => c.jugador.id === colocador.id);
    expect(colocacion?.explicacion).toBe('Explicación nueva del jugador');
  });

  it('025 (aplicación): sin descripción, el store la muestra vacía', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));

    expect(store.descripcionSistemaActivo()).toBe('');
  });

  it('025 (aplicación): la descripción del sistema activo se lee del store', () => {
    const conDescripcion: Sistema = { ...sistemaBase('r1', 'Uno'), descripcion: 'Recepción a 3 en 5-1.' };
    const store = new SistemaStore(new RepositorioFake([conDescripcion]));

    expect(store.descripcionSistemaActivo()).toBe('Recepción a 3 en 5-1.');
  });

  it('025 (aplicación): guardar la descripción la deja en el sistema activo', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));

    store.guardarDescripcion('Texto nuevo del sistema');

    expect(store.sistemaActivo()?.descripcion).toBe('Texto nuevo del sistema');
    expect(store.descripcionSistemaActivo()).toBe('Texto nuevo del sistema');
  });

  it('011-E13: quién está disponible cambia con la rotación — el líbero solo cuando le toca', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaConLibero('r1', 'Uno')]));

    // R1: central2 es zaguero en esta plantilla -> juega el líbero.
    expect(store.posicionesActivas()?.some((j) => j.id === 'libero')).toBe(true);
    expect(store.posicionesActivas()?.some((j) => j.id === 'central2')).toBe(false);

    store.seleccionarRotacion(4); // R4: central2 es delantero -> juega el titular.

    expect(store.posicionesActivas()?.some((j) => j.id === 'central2')).toBe(true);
    expect(store.posicionesActivas()?.some((j) => j.id === 'libero')).toBe(false);
  });

  it('011-E14 (revisa firma por rotación): cambiar a quién sustituye el líbero en R1 se refleja en el sistema activo', () => {
    const store = new SistemaStore(new RepositorioFake([sistemaConLibero('r1', 'Uno')]));

    store.cambiarSustitutoLibero(1, 'opuesto');

    expect(store.sistemaActivo()?.plantilla.libero?.sustitutosPorRotacion[1]).toBe('opuesto');
  });

  describe('sistemas de defensa', () => {
    it('021-E7: cambiar de vía sin cambios pendientes carga lo guardado en esa vía', () => {
      const [colocador] = plantilla().ordenSaque;
      const sistemaDefensa: Sistema = {
        ...sistemaBase('d1', 'Defensa'),
        tipo: 'defensa',
        defensas: { 1: { z3: [{ jugador: colocador, punto: { x: 8, y: 1 } }] } },
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));

      store.seleccionarVia('z3');

      expect(store.borrador()).toEqual(sistemaDefensa.defensas![1]!.z3);
    });

    it('021-E8: cambiar de vía con cambios sin guardar pide confirmar', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });

      store.seleccionarVia('z3');

      expect(store.viaActiva()).toBe('z4');
      expect(store.cambioPendiente()).toEqual({ tipo: 'via', valor: 'z3' });
    });

    it('021-E11: en defensa nunca hay falta ni aviso, aunque los seis estén amontonados', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const orden = plantilla().ordenSaque;

      orden.forEach((jugador) => store.colocarOMover(jugador.id, { x: 4.5, y: 4.5 }));

      expect(store.resultadoValidacion()).toBeNull();
    });

    it('021-E10: colocar, mover y quitar un defensor funciona igual que en recepción', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const [colocador] = plantilla().ordenSaque;

      store.colocarOMover(colocador.id, { x: 1, y: 1 });
      expect(store.borrador()).toEqual([{ jugador: colocador, punto: { x: 1, y: 1 } }]);

      store.colocarOMover(colocador.id, { x: 2, y: 2 });
      expect(store.borrador()).toEqual([{ jugador: colocador, punto: { x: 2, y: 2 } }]);

      store.quitar(colocador.id);
      expect(store.borrador()).toEqual([]);
    });

    it('021-E14: vaciar la vía activa la deja sin ningún defensor, sin afectar a otras', () => {
      const [colocador] = plantilla().ordenSaque;
      const sistemaDefensa: Sistema = {
        ...sistemaBase('d1', 'Defensa'),
        tipo: 'defensa',
        defensas: { 1: { z3: [{ jugador: colocador, punto: { x: 8, y: 1 } }] } },
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      store.seleccionarVia('z3');

      store.vaciar();

      expect(store.borrador()).toEqual([]);
      expect(store.hayCambiosSinGuardar()).toBe(true);
    });

    it('021-E12 (store): con los seis colocados se puede guardar, aunque estén amontonados', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const orden = plantilla().ordenSaque;

      expect(store.puedeGuardar()).toBe(false);

      orden.forEach((jugador) => store.colocarOMover(jugador.id, { x: 4.5, y: 4.5 }));

      expect(store.puedeGuardar()).toBe(true);
    });

    it('021-E13 (store): guardar asocia la defensa a la rotación y la vía activas', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const orden = plantilla().ordenSaque;
      orden.forEach((jugador) => store.colocarOMover(jugador.id, { x: 4.5, y: 4.5 }));

      store.guardar();

      expect(store.sistemaActivo()?.defensas?.[1]?.z4).toEqual(store.borrador());
      expect(store.hayCambiosSinGuardar()).toBe(false);
    });

    it('021-E8b: confirmar el aviso descarta los cambios y cambia de vía', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });
      store.seleccionarVia('z3');

      store.confirmarCambio();

      expect(store.viaActiva()).toBe('z3');
      expect(store.cambioPendiente()).toBeNull();
      expect(store.borrador()).toEqual([]);
    });
  });

  describe('zonas de responsabilidad', () => {
    it('022-E4: pintar celdas las marca como responsabilidad del jugador', () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: [{ jugador: colocador, punto: { x: 1, y: 1 }, celdas: [] }] },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));

      store.pintarCelda(colocador.id, { columna: 2, fila: 2 });
      store.pintarCelda(colocador.id, { columna: 2, fila: 3 });

      const celdas = store.borrador().find((c) => c.jugador.id === colocador.id)?.celdas;
      expect(celdas).toEqual([
        { columna: 2, fila: 2 },
        { columna: 2, fila: 3 },
      ]);
    });

    it('022-E5: borrar una celda ya pintada por el jugador la despinta', () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: [{ jugador: colocador, punto: { x: 1, y: 1 }, celdas: [] }] },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      store.pintarCelda(colocador.id, { columna: 2, fila: 2 });
      store.pintarCelda(colocador.id, { columna: 2, fila: 3 });

      store.borrarCelda(colocador.id, { columna: 2, fila: 2 });

      const celdas = store.borrador().find((c) => c.jugador.id === colocador.id)?.celdas;
      expect(celdas).toEqual([{ columna: 2, fila: 3 }]);
    });

    it('022-E6: dos jugadores pueden compartir la misma celda', () => {
      const [colocador, receptor1] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: {
          1: [
            { jugador: colocador, punto: { x: 1, y: 1 }, celdas: [] },
            { jugador: receptor1, punto: { x: 2, y: 2 }, celdas: [] },
          ],
        },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      store.pintarCelda(colocador.id, { columna: 2, fila: 2 });

      store.pintarCelda(receptor1.id, { columna: 2, fila: 2 });

      const formacion = store.borrador();
      expect(formacion.find((c) => c.jugador.id === colocador.id)?.celdas).toEqual([{ columna: 2, fila: 2 }]);
      expect(formacion.find((c) => c.jugador.id === receptor1.id)?.celdas).toEqual([{ columna: 2, fila: 2 }]);
    });

    it('mover un jugador con celdas pintadas conserva sus celdas', () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: [{ jugador: colocador, punto: { x: 1, y: 1 }, celdas: [] }] },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      store.pintarCelda(colocador.id, { columna: 2, fila: 2 });

      store.colocarOMover(colocador.id, { x: 3, y: 3 });

      const celdas = store.borrador().find((c) => c.jugador.id === colocador.id)?.celdas;
      expect(celdas).toEqual([{ columna: 2, fila: 2 }]);
    });

    it('mover un jugador con explicación guardada conserva su explicación', () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: [{ jugador: colocador, punto: { x: 1, y: 1 }, explicacion: 'Se esconde tras el opuesto' }] },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));

      store.colocarOMover(colocador.id, { x: 3, y: 3 });

      const explicacion = store.borrador().find((c) => c.jugador.id === colocador.id)?.explicacion;
      expect(explicacion).toBe('Se esconde tras el opuesto');
    });

    it('022-E8: la zona pintada se guarda junto con la formación', () => {
      const orden = plantilla().ordenSaque;
      const puntosLegalesR1 = [
        { x: 8, y: 8 },
        { x: 8, y: 1 },
        { x: 4.5, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 6 },
        { x: 4.5, y: 6 },
      ];
      const formacionInicial: Formacion = orden.map((jugador, indice) => ({
        jugador,
        punto: puntosLegalesR1[indice],
        ...(indice === 0 ? { celdas: [] } : {}),
      }));
      const sistema: Sistema = { ...sistemaBase('r1', 'Uno'), formaciones: { 1: formacionInicial } };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      store.pintarCelda(orden[0].id, { columna: 16, fila: 16 });

      store.guardar();

      const guardado = store.sistemaActivo()?.formaciones[1]?.find((c) => c.jugador.id === orden[0].id);
      expect(guardado?.celdas).toEqual([{ columna: 16, fila: 16 }]);
    });

    it('022-E9: pintar sin guardar cuenta como cambio pendiente al cambiar de rotación', () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: [{ jugador: colocador, punto: { x: 1, y: 1 } }] },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      expect(store.hayCambiosSinGuardar()).toBe(false);

      store.pintarCelda(colocador.id, { columna: 0, fila: 0 });

      expect(store.hayCambiosSinGuardar()).toBe(true);
      store.seleccionarRotacion(2);
      expect(store.cambioPendiente()).toEqual({ tipo: 'rotacion', valor: 2 });
    });

    it('022-E10: la zona se guarda igual en defensa, por rotación y vía', () => {
      const orden = plantilla().ordenSaque;
      const formacionInicial: Formacion = orden.map((jugador, indice) => ({
        jugador,
        punto: { x: 4.5, y: 4.5 },
        ...(indice === 0 ? { celdas: [] } : {}),
      }));
      const sistemaDefensa: Sistema = {
        ...sistemaBase('d1', 'Defensa'),
        tipo: 'defensa',
        defensas: { 1: { z4: formacionInicial } },
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      store.pintarCelda(orden[0].id, { columna: 9, fila: 9 });

      store.guardar();

      const guardado = store.sistemaActivo()?.defensas?.[1]?.z4?.find((c) => c.jugador.id === orden[0].id);
      expect(guardado?.celdas).toEqual([{ columna: 9, fila: 9 }]);
    });
  });

  describe('zona por defecto (spec 024)', () => {
    it('024-E1: en un sistema de recepción, seleccionar un jugador no muestra ninguna zona', () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });

      store.seleccionarJugador(colocador.id);

      expect(store.celdasJugadorSeleccionado()).toEqual([]);
    });

    it('024-E2: las celdas ya guardadas en un sistema de recepción no se pierden al guardar de nuevo', () => {
      const orden = plantilla().ordenSaque;
      const puntosLegalesR1 = [
        { x: 8, y: 8 },
        { x: 8, y: 1 },
        { x: 4.5, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 6 },
        { x: 4.5, y: 6 },
      ];
      const formacionConCeldas: Formacion = orden.map((jugador, indice) => ({
        jugador,
        punto: puntosLegalesR1[indice],
        ...(indice === 0 ? { celdas: [{ columna: 16, fila: 16 }] } : {}),
      }));
      const sistema: Sistema = { ...sistemaBase('r1', 'Uno'), formaciones: { 1: formacionConCeldas } };
      const store = new SistemaStore(new RepositorioFake([sistema]));

      store.guardar();

      const guardado = store.sistemaActivo()?.formaciones[1]?.find((c) => c.jugador.id === orden[0].id);
      expect(guardado?.celdas).toEqual([{ columna: 16, fila: 16 }]);
    });

    it('024-E3: seleccionar un jugador sin celdas pintadas muestra el bloque de 2×2 más cercano a su punto', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });

      store.seleccionarJugador(colocador.id);

      expect(store.celdasJugadorSeleccionado()).toEqual([
        { columna: 1, fila: 1 },
        { columna: 2, fila: 1 },
        { columna: 1, fila: 2 },
        { columna: 2, fila: 2 },
      ]);
    });

    it('024-E5: el bloque por defecto se recalcula al mover la ficha mientras no se ha pintado nada', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });
      store.seleccionarJugador(colocador.id);

      store.colocarOMover(colocador.id, { x: 5, y: 5 });

      expect(store.celdasJugadorSeleccionado()).toEqual([
        { columna: 9, fila: 9 },
        { columna: 10, fila: 9 },
        { columna: 9, fila: 10 },
        { columna: 10, fila: 10 },
      ]);
    });

    it('024-E6: pintar una celda nueva sobre el bloque por defecto lo congela añadiendo esa celda', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });
      store.seleccionarJugador(colocador.id);

      store.pintarCelda(colocador.id, { columna: 5, fila: 5 });

      const celdas = store.borrador().find((c) => c.jugador.id === colocador.id)?.celdas;
      expect(celdas).toEqual([
        { columna: 1, fila: 1 },
        { columna: 2, fila: 1 },
        { columna: 1, fila: 2 },
        { columna: 2, fila: 2 },
        { columna: 5, fila: 5 },
      ]);
    });

    it('024-E7: borrar una celda del bloque por defecto la convierte en zona explícita con las celdas restantes', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });
      store.seleccionarJugador(colocador.id);

      store.borrarCelda(colocador.id, { columna: 1, fila: 1 });

      const celdas = store.borrador().find((c) => c.jugador.id === colocador.id)?.celdas;
      expect(celdas).toEqual([
        { columna: 2, fila: 1 },
        { columna: 1, fila: 2 },
        { columna: 2, fila: 2 },
      ]);
    });

    it('024-E8: el bloque por defecto no se guarda si nadie lo ha tocado', () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      const orden = plantilla().ordenSaque;
      orden.forEach((jugador) => store.colocarOMover(jugador.id, { x: 4.5, y: 4.5 }));
      store.seleccionarJugador(orden[0].id);

      store.guardar();

      const guardado = store.sistemaActivo()?.defensas?.[1]?.z4?.find((c) => c.jugador.id === orden[0].id);
      expect(guardado?.celdas).toBeUndefined();
    });
  });
});
