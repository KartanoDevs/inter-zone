import { describe, expect, it } from 'vitest';
import type { Jugador, OrdenSaque, PlantillaEquipo, Sistema } from '../domain/modelos';
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
});
