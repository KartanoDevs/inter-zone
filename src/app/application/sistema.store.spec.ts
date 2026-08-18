import { describe, expect, it } from 'vitest';
import type { EquipoId, Formacion, Jugador, OrdenSaque, PlantillaEquipo, Sistema } from '../domain/modelos';
import type { Ajustes, AjustesRepository, SistemaRepository } from '../domain/puertos';
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

function sistemaBase(id: string, nombre: string, equipoId: EquipoId = 'masculino'): Sistema {
  return { id, nombre, tipo: 'recepcion', equipoId, plantilla: plantilla(), formaciones: {}, explicacionesRotacion: {} };
}

function plantillaConLibero(sustituidoId: string): PlantillaEquipo {
  const sustitutosPorRotacion = { 1: sustituidoId, 2: sustituidoId, 3: sustituidoId, 4: sustituidoId, 5: sustituidoId, 6: sustituidoId };
  return { nombre: 'Equipo A', ordenSaque: ordenConCentral2(), libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion } };
}

function sistemaConLibero(id: string, nombre: string): Sistema {
  return {
    id,
    nombre,
    tipo: 'recepcion',
    equipoId: 'masculino',
    plantilla: plantillaConLibero('central2'),
    formaciones: {},
    explicacionesRotacion: {},
  };
}

type Llamada =
  | { readonly metodo: 'crear'; readonly argumento: Sistema }
  | { readonly metodo: 'actualizar'; readonly argumento: Sistema }
  | { readonly metodo: 'borrar'; readonly argumento: string };

/** Doble en memoria, granular (spec 031): un mapa por id en vez de un array reemplazado entero,
 * y un registro de llamadas para poder comprobar qué tocó cada operación y qué no. */
class RepositorioFake implements SistemaRepository {
  private readonly mapa: Map<string, Sistema>;
  readonly llamadas: Llamada[] = [];

  constructor(sistemas: readonly Sistema[] = []) {
    this.mapa = new Map(sistemas.map((s) => [s.id, s]));
  }

  async listar(): Promise<readonly Sistema[]> {
    return [...this.mapa.values()];
  }

  async crear(sistema: Sistema): Promise<void> {
    this.llamadas.push({ metodo: 'crear', argumento: sistema });
    this.mapa.set(sistema.id, sistema);
  }

  async actualizar(sistema: Sistema): Promise<void> {
    this.llamadas.push({ metodo: 'actualizar', argumento: sistema });
    this.mapa.set(sistema.id, sistema);
  }

  async borrar(id: string): Promise<void> {
    this.llamadas.push({ metodo: 'borrar', argumento: id });
    this.mapa.delete(id);
  }
}

const AJUSTES_POR_DEFECTO: Ajustes = {
  validacionDesactivada: false,
  ayudaPosicionDesactivada: false,
  ordenRotacionCronologico: false,
  mostrarNumerosMetros: false,
};

class AjustesRepositorioFake implements AjustesRepository {
  private ajustes: Ajustes = AJUSTES_POR_DEFECTO;

  async leer(): Promise<Ajustes> {
    return this.ajustes;
  }

  async guardar(ajustes: Ajustes): Promise<void> {
    this.ajustes = ajustes;
  }
}

describe('SistemaStore', () => {
  it('009-E1: arrancar con sistemas ya guardados activa el primero del catálogo ordenado', async () => {
    const defensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
    const recepcionB = sistemaBase('r2', 'Recepción B');
    const recepcionA = sistemaBase('r1', 'Recepción A');
    const store = new SistemaStore(new RepositorioFake([defensa, recepcionB, recepcionA]));

    await store.cargar();

    expect(store.sistemaActivoId()).toBe('r1');
  });

  it('009-E2: arrancar con el catálogo vacío no deja ningún sistema activo', async () => {
    const store = new SistemaStore(new RepositorioFake([]));

    await store.cargar();

    expect(store.sistemaActivoId()).toBeNull();
    expect(store.borrador()).toEqual([]);
  });

  it('009-E3: activar un sistema carga la formación guardada de su rotación activa', async () => {
    const [colocador] = plantilla().ordenSaque;
    const conFormacion: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 } }] },
    };
    const store = new SistemaStore(new RepositorioFake([conFormacion, sistemaBase('r2', 'Dos')]));
    await store.cargar();

    store.activarSistema('r1');

    expect(store.borrador()).toEqual(conFormacion.formaciones[1]);
  });

  it('009-E4: cambiar de rotación sin cambios pendientes recarga directamente', async () => {
    const [colocador] = plantilla().ordenSaque;
    const sistema: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      formaciones: { 2: [{ jugador: colocador, punto: { x: 1, y: 1 } }] },
    };
    const store = new SistemaStore(new RepositorioFake([sistema]));
    await store.cargar();

    store.seleccionarRotacion(2);

    expect(store.rotacionActiva()).toBe(2);
    expect(store.borrador()).toEqual(sistema.formaciones[2]);
  });

  it('009-E5: cambiar a una rotación sin guardar deja el campo vacío', async () => {
    const sistema = sistemaBase('r1', 'Uno');
    const store = new SistemaStore(new RepositorioFake([sistema]));
    await store.cargar();

    store.seleccionarRotacion(3);

    expect(store.borrador()).toEqual([]);
  });

  it('009-E6: cambiar de rotación con cambios sin guardar pide confirmar', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 1, y: 1 });

    store.seleccionarRotacion(2);

    expect(store.rotacionActiva()).toBe(1);
    expect(store.cambioPendiente()).toEqual({ tipo: 'rotacion', valor: 2 });
  });

  it('009-E7: confirmar el aviso descarta los cambios y cambia de rotación', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 1, y: 1 });
    store.seleccionarRotacion(2);

    store.confirmarCambio();

    expect(store.rotacionActiva()).toBe(2);
    expect(store.cambioPendiente()).toBeNull();
    expect(store.borrador()).toEqual([]);
  });

  it('009-E8: cancelar el aviso mantiene la rotación y los cambios', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 1, y: 1 });
    store.seleccionarRotacion(2);

    store.cancelarCambio();

    expect(store.rotacionActiva()).toBe(1);
    expect(store.cambioPendiente()).toBeNull();
    expect(store.borrador().some((c) => c.jugador.id === colocador.id)).toBe(true);
  });

  it('009-E9: colocar un jugador lo añade al borrador', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    const [colocador] = plantilla().ordenSaque;

    store.colocarOMover(colocador.id, { x: 2, y: 2 });

    expect(store.borrador()).toEqual([{ jugador: colocador, punto: { x: 2, y: 2 } }]);
  });

  it('009-E10: mover un jugador ya colocado lo traslada sin duplicarlo', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 2, y: 2 });

    store.colocarOMover(colocador.id, { x: 3, y: 3 });

    expect(store.borrador()).toEqual([{ jugador: colocador, punto: { x: 3, y: 3 } }]);
  });

  it('009-E11: quitar un jugador lo retira del borrador', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 2, y: 2 });

    store.quitar(colocador.id);

    expect(store.borrador()).toEqual([]);
  });

  it('009-E12: la validación se actualiza al mover un jugador, sin guardar', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
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

  it('009-E13: guardar está bloqueado si el borrador está incompleto o es ilegal', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    const [colocador] = plantilla().ordenSaque;

    expect(store.puedeGuardar()).toBe(false);

    store.colocarOMover(colocador.id, { x: 1, y: 1 });

    expect(store.puedeGuardar()).toBe(false);
  });

  it('009-E14: guardar confirma el borrador en el sistema activo y lo persiste', async () => {
    const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
    const store = new SistemaStore(repositorio);
    await store.cargar();
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

    await store.guardar();

    expect(store.sistemaActivo()?.formaciones[1]).toEqual(store.borrador());
    const persistidos = await repositorio.listar();
    expect(persistidos[0]?.formaciones[1]).toEqual(store.borrador());
  });

  it('009-E15: guardar deja de haber cambios pendientes', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
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
    await store.guardar();

    store.seleccionarRotacion(2);

    expect(store.rotacionActiva()).toBe(2);
    expect(store.cambioPendiente()).toBeNull();
  });

  it('009-E16: vaciar deja el borrador de la rotación activa sin ninguna ficha', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    const [colocador] = plantilla().ordenSaque;
    store.colocarOMover(colocador.id, { x: 1, y: 1 });

    store.vaciar();

    expect(store.borrador()).toEqual([]);
  });

  it('010-E1: el catálogo se muestra ordenado, recepción antes que defensa', async () => {
    const defensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
    const store = new SistemaStore(new RepositorioFake([defensa, sistemaBase('r1', 'Recepción')]));
    await store.cargar();

    expect(store.catalogo().map((s) => s.id)).toEqual(['r1', 'd1']);
  });

  it('010-E2: crear un sistema nuevo lo deja activo con la pizarra vacía', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();

    const creado = await store.crear('Recepción 5-1', 'recepcion', 'masculino');

    expect(creado).toBe(true);
    expect(store.sistemaActivoId()).not.toBe('r1');
    expect(store.sistemaActivo()?.nombre).toBe('Recepción 5-1');
    expect(store.rotacionActiva()).toBe(1);
    expect(store.borrador()).toEqual([]);
  });

  it('027-E1: enfocar un jugador lo deja seleccionado, sustituyendo a cualquier otro', async () => {
    const [colocador, receptor1] = plantilla().ordenSaque;
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    store.seleccionarJugador(colocador.id);

    store.enfocarJugador(receptor1.id);

    expect(store.jugadorSeleccionadoId()).toBe(receptor1.id);
  });

  it('027-E3: quitar al jugador seleccionado lo deselecciona', async () => {
    const [colocador] = plantilla().ordenSaque;
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    store.colocarOMover(colocador.id, { x: 1, y: 1 });
    store.enfocarJugador(colocador.id);

    store.quitar(colocador.id);

    expect(store.jugadorSeleccionadoId()).toBeNull();
  });

  it('027-E3b: quitar a otro jugador no toca la selección actual', async () => {
    const [colocador, receptor1] = plantilla().ordenSaque;
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    store.colocarOMover(receptor1.id, { x: 1, y: 1 });
    store.enfocarJugador(colocador.id);

    store.quitar(receptor1.id);

    expect(store.jugadorSeleccionadoId()).toBe(colocador.id);
  });

  it('027-E4: deseleccionar limpia la selección', async () => {
    const [colocador] = plantilla().ordenSaque;
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    store.seleccionarJugador(colocador.id);

    store.deseleccionarJugador();

    expect(store.jugadorSeleccionadoId()).toBeNull();
  });

  it('026-E10: clonar el sistema activo deja el clon activo, en R1', async () => {
    const [colocador] = plantilla().ordenSaque;
    const original: Sistema = { ...sistemaBase('r1', 'Uno'), formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 } }] } };
    const store = new SistemaStore(new RepositorioFake([original]));
    await store.cargar();
    store.seleccionarRotacion(1);

    const clonado = await store.clonar('Uno (copia)');

    expect(clonado).toBe(true);
    expect(store.sistemaActivoId()).not.toBe('r1');
    expect(store.sistemaActivo()?.nombre).toBe('Uno (copia)');
    expect(store.rotacionActiva()).toBe(1);
    expect(store.catalogo().map((s) => s.nombre)).toEqual(['Uno', 'Uno (copia)']);
  });

  it('026-E12 (aplicación): un nombre inválido no clona nada', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();

    const clonado = await store.clonar('Uno');

    expect(clonado).toBe(false);
    expect(store.catalogo().map((s) => s.id)).toEqual(['r1']);
  });

  it('010-E6: renombrar el sistema activo actualiza su nombre', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();

    const renombrado = await store.renombrarActivo('Uno renombrado');

    expect(renombrado).toBe(true);
    expect(store.sistemaActivo()?.nombre).toBe('Uno renombrado');
  });

  it('010-E7: borrar un sistema lo quita del catálogo y activa otro', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Recepción A'), sistemaBase('r2', 'Recepción B')]));
    await store.cargar();
    store.activarSistema('r1');

    await store.borrar('r1');

    expect(store.catalogo().map((s) => s.id)).toEqual(['r2']);
    expect(store.sistemaActivoId()).toBe('r2');
  });

  it('010-E8: sin jugador seleccionado, el panel muestra la explicación de la rotación', async () => {
    const conExplicacion: Sistema = { ...sistemaBase('r1', 'Uno'), explicacionesRotacion: { 1: 'Explicación de la rotación' } };
    const store = new SistemaStore(new RepositorioFake([conExplicacion]));
    await store.cargar();

    expect(store.explicacionMostrada()).toBe('Explicación de la rotación');
  });

  it('010-E9: seleccionar un jugador muestra su explicación en el panel', async () => {
    const [colocador] = plantilla().ordenSaque;
    const conJugadorExplicado: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 }, explicacion: 'Se esconde tras el opuesto' }] },
    };
    const store = new SistemaStore(new RepositorioFake([conJugadorExplicado]));
    await store.cargar();

    store.seleccionarJugador(colocador.id);

    expect(store.jugadorSeleccionadoId()).toBe(colocador.id);
    expect(store.explicacionMostrada()).toBe('Se esconde tras el opuesto');
  });

  it('010-E10: tocar de nuevo al jugador seleccionado lo deselecciona', async () => {
    const [colocador] = plantilla().ordenSaque;
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    store.seleccionarJugador(colocador.id);

    store.seleccionarJugador(colocador.id);

    expect(store.jugadorSeleccionadoId()).toBeNull();
  });

  it('010-E11: cambiar de rotación deselecciona al jugador', async () => {
    const [colocador] = plantilla().ordenSaque;
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();
    store.seleccionarJugador(colocador.id);

    store.seleccionarRotacion(2);

    expect(store.jugadorSeleccionadoId()).toBeNull();
  });

  it('010-E13a: editar el texto sin selección lo guarda como explicación de la rotación', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();

    await store.guardarExplicacion('Explicación nueva de la rotación');

    expect(store.sistemaActivo()?.explicacionesRotacion[1]).toBe('Explicación nueva de la rotación');
  });

  it('010-E13b: editar el texto con un jugador seleccionado lo guarda como explicación suya', async () => {
    const [colocador] = plantilla().ordenSaque;
    const conColocadorEnR1: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 } }] },
    };
    const store = new SistemaStore(new RepositorioFake([conColocadorEnR1]));
    await store.cargar();
    store.seleccionarJugador(colocador.id);

    await store.guardarExplicacion('Explicación nueva del jugador');

    const colocacion = store.sistemaActivo()?.formaciones[1]?.find((c) => c.jugador.id === colocador.id);
    expect(colocacion?.explicacion).toBe('Explicación nueva del jugador');
  });

  it('025 (aplicación): sin descripción, el store la muestra vacía', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();

    expect(store.descripcionSistemaActivo()).toBe('');
  });

  it('025 (aplicación): la descripción del sistema activo se lee del store', async () => {
    const conDescripcion: Sistema = { ...sistemaBase('r1', 'Uno'), descripcion: 'Recepción a 3 en 5-1.' };
    const store = new SistemaStore(new RepositorioFake([conDescripcion]));
    await store.cargar();

    expect(store.descripcionSistemaActivo()).toBe('Recepción a 3 en 5-1.');
  });

  it('025 (aplicación): guardar la descripción la deja en el sistema activo', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();

    await store.guardarDescripcion('Texto nuevo del sistema');

    expect(store.sistemaActivo()?.descripcion).toBe('Texto nuevo del sistema');
    expect(store.descripcionSistemaActivo()).toBe('Texto nuevo del sistema');
  });

  it('011-E13: quién está disponible cambia con la rotación — el líbero solo cuando le toca', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaConLibero('r1', 'Uno')]));
    await store.cargar();

    // R1: central2 es zaguero en esta plantilla -> juega el líbero.
    expect(store.posicionesActivas()?.some((j) => j.id === 'libero')).toBe(true);
    expect(store.posicionesActivas()?.some((j) => j.id === 'central2')).toBe(false);

    store.seleccionarRotacion(4); // R4: central2 es delantero -> juega el titular.

    expect(store.posicionesActivas()?.some((j) => j.id === 'central2')).toBe(true);
    expect(store.posicionesActivas()?.some((j) => j.id === 'libero')).toBe(false);
  });

  it('011-E14 (revisa firma por rotación): cambiar a quién sustituye el líbero en R1 se refleja en el sistema activo', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaConLibero('r1', 'Uno')]));
    await store.cargar();

    await store.cambiarSustitutoLibero(1, 'opuesto');

    expect(store.sistemaActivo()?.plantilla.libero?.sustitutosPorRotacion[1]).toBe('opuesto');
  });

  describe('sistemas de defensa', () => {
    it('021-E7: cambiar de vía sin cambios pendientes carga lo guardado en esa vía', async () => {
      const [colocador] = plantilla().ordenSaque;
      const sistemaDefensa: Sistema = {
        ...sistemaBase('d1', 'Defensa'),
        tipo: 'defensa',
        defensas: { 1: { z3: [{ jugador: colocador, punto: { x: 8, y: 1 } }] } },
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();

      store.seleccionarVia('z3');

      expect(store.borrador()).toEqual(sistemaDefensa.defensas![1]!.z3);
    });

    it('021-E8: cambiar de vía con cambios sin guardar pide confirmar', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });

      store.seleccionarVia('z3');

      expect(store.viaActiva()).toBe('z4');
      expect(store.cambioPendiente()).toEqual({ tipo: 'via', valor: 'z3' });
    });

    it('021-E11: en defensa nunca hay falta ni aviso, aunque los seis estén amontonados', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      const orden = plantilla().ordenSaque;

      orden.forEach((jugador) => store.colocarOMover(jugador.id, { x: 4.5, y: 4.5 }));

      expect(store.resultadoValidacion()).toBeNull();
    });

    it('021-E10: colocar, mover y quitar un defensor funciona igual que en recepción', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      const [colocador] = plantilla().ordenSaque;

      store.colocarOMover(colocador.id, { x: 1, y: 1 });
      expect(store.borrador()).toEqual([{ jugador: colocador, punto: { x: 1, y: 1 } }]);

      store.colocarOMover(colocador.id, { x: 2, y: 2 });
      expect(store.borrador()).toEqual([{ jugador: colocador, punto: { x: 2, y: 2 } }]);

      store.quitar(colocador.id);
      expect(store.borrador()).toEqual([]);
    });

    it('021-E14: vaciar la vía activa la deja sin ningún defensor, sin afectar a otras', async () => {
      const [colocador] = plantilla().ordenSaque;
      const sistemaDefensa: Sistema = {
        ...sistemaBase('d1', 'Defensa'),
        tipo: 'defensa',
        defensas: { 1: { z3: [{ jugador: colocador, punto: { x: 8, y: 1 } }] } },
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      store.seleccionarVia('z3');

      store.vaciar();

      expect(store.borrador()).toEqual([]);
      expect(store.hayCambiosSinGuardar()).toBe(true);
    });

    it('021-E12 (store): con los seis colocados se puede guardar, aunque estén amontonados', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      const orden = plantilla().ordenSaque;

      expect(store.puedeGuardar()).toBe(false);

      orden.forEach((jugador) => store.colocarOMover(jugador.id, { x: 4.5, y: 4.5 }));

      expect(store.puedeGuardar()).toBe(true);
    });

    it('021-E13 (store): guardar asocia la defensa a la rotación y la vía activas', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      const orden = plantilla().ordenSaque;
      orden.forEach((jugador) => store.colocarOMover(jugador.id, { x: 4.5, y: 4.5 }));

      await store.guardar();

      expect(store.sistemaActivo()?.defensas?.[1]?.z4).toEqual(store.borrador());
      expect(store.hayCambiosSinGuardar()).toBe(false);
    });

    it('021-E8b: confirmar el aviso descarta los cambios y cambia de vía', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
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
    it('022-E4: pintar celdas las marca como responsabilidad del jugador', async () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: [{ jugador: colocador, punto: { x: 1, y: 1 }, celdas: [] }] },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      await store.cargar();

      store.pintarCelda(colocador.id, { columna: 2, fila: 2 });
      store.pintarCelda(colocador.id, { columna: 2, fila: 3 });

      const celdas = store.borrador().find((c) => c.jugador.id === colocador.id)?.celdas;
      expect(celdas).toEqual([
        { columna: 2, fila: 2 },
        { columna: 2, fila: 3 },
      ]);
    });

    it('022-E5: borrar una celda ya pintada por el jugador la despinta', async () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: [{ jugador: colocador, punto: { x: 1, y: 1 }, celdas: [] }] },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      await store.cargar();
      store.pintarCelda(colocador.id, { columna: 2, fila: 2 });
      store.pintarCelda(colocador.id, { columna: 2, fila: 3 });

      store.borrarCelda(colocador.id, { columna: 2, fila: 2 });

      const celdas = store.borrador().find((c) => c.jugador.id === colocador.id)?.celdas;
      expect(celdas).toEqual([{ columna: 2, fila: 3 }]);
    });

    it('022-E6: dos jugadores pueden compartir la misma celda', async () => {
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
      await store.cargar();
      store.pintarCelda(colocador.id, { columna: 2, fila: 2 });

      store.pintarCelda(receptor1.id, { columna: 2, fila: 2 });

      const formacion = store.borrador();
      expect(formacion.find((c) => c.jugador.id === colocador.id)?.celdas).toEqual([{ columna: 2, fila: 2 }]);
      expect(formacion.find((c) => c.jugador.id === receptor1.id)?.celdas).toEqual([{ columna: 2, fila: 2 }]);
    });

    it('mover un jugador con celdas pintadas conserva sus celdas', async () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: [{ jugador: colocador, punto: { x: 1, y: 1 }, celdas: [] }] },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      await store.cargar();
      store.pintarCelda(colocador.id, { columna: 2, fila: 2 });

      store.colocarOMover(colocador.id, { x: 3, y: 3 });

      const celdas = store.borrador().find((c) => c.jugador.id === colocador.id)?.celdas;
      expect(celdas).toEqual([{ columna: 2, fila: 2 }]);
    });

    it('mover un jugador con explicación guardada conserva su explicación', async () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: [{ jugador: colocador, punto: { x: 1, y: 1 }, explicacion: 'Se esconde tras el opuesto' }] },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      await store.cargar();

      store.colocarOMover(colocador.id, { x: 3, y: 3 });

      const explicacion = store.borrador().find((c) => c.jugador.id === colocador.id)?.explicacion;
      expect(explicacion).toBe('Se esconde tras el opuesto');
    });

    it('022-E8: la zona pintada se guarda junto con la formación', async () => {
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
      await store.cargar();
      store.pintarCelda(orden[0].id, { columna: 16, fila: 16 });

      await store.guardar();

      const guardado = store.sistemaActivo()?.formaciones[1]?.find((c) => c.jugador.id === orden[0].id);
      expect(guardado?.celdas).toEqual([{ columna: 16, fila: 16 }]);
    });

    it('022-E9: pintar sin guardar cuenta como cambio pendiente al cambiar de rotación', async () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: [{ jugador: colocador, punto: { x: 1, y: 1 } }] },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      await store.cargar();
      expect(store.hayCambiosSinGuardar()).toBe(false);

      store.pintarCelda(colocador.id, { columna: 0, fila: 0 });

      expect(store.hayCambiosSinGuardar()).toBe(true);
      store.seleccionarRotacion(2);
      expect(store.cambioPendiente()).toEqual({ tipo: 'rotacion', valor: 2 });
    });

    it('022-E10: la zona se guarda igual en defensa, por rotación y vía', async () => {
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
      await store.cargar();
      store.pintarCelda(orden[0].id, { columna: 9, fila: 9 });

      await store.guardar();

      const guardado = store.sistemaActivo()?.defensas?.[1]?.z4?.find((c) => c.jugador.id === orden[0].id);
      expect(guardado?.celdas).toEqual([{ columna: 9, fila: 9 }]);
    });
  });

  describe('zona por defecto (spec 024)', () => {
    it('024-E1: en un sistema de recepción, seleccionar un jugador no muestra ninguna zona', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
      await store.cargar();
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });

      store.seleccionarJugador(colocador.id);

      expect(store.celdasJugadorSeleccionado()).toEqual([]);
    });

    it('024-E2: las celdas ya guardadas en un sistema de recepción no se pierden al guardar de nuevo', async () => {
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
      await store.cargar();

      await store.guardar();

      const guardado = store.sistemaActivo()?.formaciones[1]?.find((c) => c.jugador.id === orden[0].id);
      expect(guardado?.celdas).toEqual([{ columna: 16, fila: 16 }]);
    });

    it('024-E3: seleccionar un jugador sin celdas pintadas muestra el bloque de 2×2 más cercano a su punto', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
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

    it('024-E5: el bloque por defecto se recalcula al mover la ficha mientras no se ha pintado nada', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
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

    it('024-E6: pintar una celda nueva sobre el bloque por defecto lo congela añadiendo esa celda', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
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

    it('024-E7: borrar una celda del bloque por defecto la convierte en zona explícita con las celdas restantes', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
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

    it('024-E8: el bloque por defecto no se guarda si nadie lo ha tocado', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      const orden = plantilla().ordenSaque;
      orden.forEach((jugador) => store.colocarOMover(jugador.id, { x: 4.5, y: 4.5 }));
      store.seleccionarJugador(orden[0].id);

      await store.guardar();

      const guardado = store.sistemaActivo()?.defensas?.[1]?.z4?.find((c) => c.jugador.id === orden[0].id);
      expect(guardado?.celdas).toBeUndefined();
    });
  });

  describe('spec 031 — guardar deja de arriesgar los demás', () => {
    it('031-E1: guardar una rotación no reescribe los demás sistemas', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno'), sistemaBase('r2', 'Dos')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();
      store.activarSistema('r1');
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

      await store.guardar();

      expect(repositorio.llamadas).toEqual([{ metodo: 'actualizar', argumento: expect.objectContaining({ id: 'r1' }) }]);
    });

    it('031-E2: crear un sistema no reescribe los que ya existían', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();

      await store.crear('Recepción nueva', 'recepcion', 'masculino');

      expect(repositorio.llamadas).toEqual([{ metodo: 'crear', argumento: expect.objectContaining({ nombre: 'Recepción nueva' }) }]);
    });

    it('031-E3: borrar un sistema no reescribe los que quedan', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno'), sistemaBase('r2', 'Dos')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();

      await store.borrar('r1');

      expect(repositorio.llamadas).toEqual([{ metodo: 'borrar', argumento: 'r1' }]);
    });

    it('031-E4: un nombre repetido se rechaza sin escribir nada', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();

      const creado = await store.crear('Uno', 'recepcion', 'masculino');

      expect(creado).toBe(false);
      expect(repositorio.llamadas).toEqual([]);
    });

    it('031-E5: cambiar un ajuste no toca el catálogo de sistemas, y sí queda guardado', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
      const ajustesRepositorio = new AjustesRepositorioFake();
      const store = new SistemaStore(repositorio, ajustesRepositorio);
      await store.cargar();

      await store.alternarValidacion();

      expect(repositorio.llamadas).toEqual([]);
      expect((await ajustesRepositorio.leer()).validacionDesactivada).toBe(true);
    });

    it('031-E6: al terminar de cargar, el catálogo ya está completo', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Recepción A'), sistemaBase('r2', 'Recepción B')]));
      expect(store.sistemas()).toEqual([]);

      await store.cargar();

      expect(store.sistemas()).toHaveLength(2);
      expect(store.sistemaActivoId()).toBe('r1');
    });

    it('031-E7: crear, renombrar, clonar y borrar siguen comportándose igual que antes de esta spec', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
      await store.cargar();

      const creado = await store.crear('Dos', 'recepcion', 'masculino');
      expect(creado).toBe(true);
      expect(store.sistemaActivo()?.nombre).toBe('Dos');

      const renombrado = await store.renombrarActivo('Dos renombrado');
      expect(renombrado).toBe(true);
      expect(store.sistemaActivo()?.nombre).toBe('Dos renombrado');

      const clonado = await store.clonar('Dos renombrado (copia)');
      expect(clonado).toBe(true);
      expect(store.catalogo().map((s) => s.nombre).sort()).toEqual(['Dos renombrado', 'Dos renombrado (copia)', 'Uno'].sort());

      const idClon = store.sistemaActivoId()!;
      await store.borrar(idClon);
      expect(store.catalogo().some((s) => s.id === idClon)).toBe(false);
      expect(store.catalogo()).toHaveLength(2);
    });
  });

  describe('spec 032 — cada sistema pertenece a un equipo', () => {
    it('032-E5: el catálogo solo muestra los sistemas del equipo activo', async () => {
      const store = new SistemaStore(
        new RepositorioFake([sistemaBase('m1', 'Recepción M', 'masculino'), sistemaBase('f1', 'Recepción F', 'femenino')]),
      );

      await store.cargar();

      expect(store.catalogo().map((s) => s.id)).toEqual(['m1']);
    });

    it('032-E6: cambiar de equipo activa el primero del catálogo del equipo nuevo', async () => {
      const store = new SistemaStore(
        new RepositorioFake([sistemaBase('m1', 'Recepción M', 'masculino'), sistemaBase('f1', 'Recepción F', 'femenino')]),
      );
      await store.cargar();

      store.seleccionarEquipo('femenino');

      expect(store.equipoActivo()).toBe('femenino');
      expect(store.sistemaActivoId()).toBe('f1');
      expect(store.catalogo().map((s) => s.id)).toEqual(['f1']);
    });

    it('032-E6b: cambiar a un equipo sin sistemas no deja ninguno activo', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('m1', 'Recepción M', 'masculino')]));
      await store.cargar();

      store.seleccionarEquipo('femenino');

      expect(store.sistemaActivoId()).toBeNull();
      expect(store.catalogo()).toEqual([]);
    });

    it('032-E7: cambiar de equipo con cambios sin guardar pide confirmar', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('m1', 'Uno', 'masculino')]));
      await store.cargar();
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });

      store.seleccionarEquipo('femenino');

      expect(store.equipoActivo()).toBe('masculino');
      expect(store.cambioPendiente()).toEqual({ tipo: 'equipo', valor: 'femenino' });
    });

    it('032-E7b: confirmar el cambio pendiente de equipo lo aplica y descarta los cambios', async () => {
      const store = new SistemaStore(
        new RepositorioFake([sistemaBase('m1', 'Uno', 'masculino'), sistemaBase('f1', 'Dos', 'femenino')]),
      );
      await store.cargar();
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });
      store.seleccionarEquipo('femenino');

      store.confirmarCambio();

      expect(store.equipoActivo()).toBe('femenino');
      expect(store.sistemaActivoId()).toBe('f1');
      expect(store.cambioPendiente()).toBeNull();
      expect(store.borrador()).toEqual([]);
    });

    it('032-E7c: cancelar el cambio pendiente de equipo mantiene el equipo y los cambios', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('m1', 'Uno', 'masculino')]));
      await store.cargar();
      const [colocador] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 1, y: 1 });
      store.seleccionarEquipo('femenino');

      store.cancelarCambio();

      expect(store.equipoActivo()).toBe('masculino');
      expect(store.cambioPendiente()).toBeNull();
      expect(store.borrador().some((c) => c.jugador.id === colocador.id)).toBe(true);
    });

    it('032-E8: crear un sistema para el equipo activo lo deja activo, sin cambiar de equipo', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('m1', 'Uno', 'masculino')]));
      await store.cargar();

      const creado = await store.crear('Dos', 'recepcion', 'masculino');

      expect(creado).toBe(true);
      expect(store.equipoActivo()).toBe('masculino');
      expect(store.sistemaActivo()?.nombre).toBe('Dos');
    });

    it('032-E9: crear un sistema para el otro equipo cambia el equipo activo', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('m1', 'Uno', 'masculino')]));
      await store.cargar();

      const creado = await store.crear('Recepción F', 'recepcion', 'femenino');

      expect(creado).toBe(true);
      expect(store.equipoActivo()).toBe('femenino');
      expect(store.sistemaActivo()?.nombre).toBe('Recepción F');
      expect(store.sistemaActivo()?.equipoId).toBe('femenino');
    });
  });
});
