import { describe, expect, it } from 'vitest';
import type {
  ColocacionDefensa,
  EquipoId,
  EstadoSistema,
  Formacion,
  Jugador,
  OrdenSaque,
  PlantillaEquipo,
  Sistema,
} from '../domain/modelos';
import {
  ConflictoDeEdicion,
  ErrorDelServidor,
  ErrorDeRed,
  type Ajustes,
  type AjustesRepository,
  type SistemaRepository,
} from '../domain/puertos';
import { SistemaStore, type ColocacionBorrador } from './sistema.store';
import { formacionDefensaPorDefecto } from '../domain/sistema-defensa-por-defecto';

/** El borrador es genérico (jugador en recepción, puesto en defensa — spec 038); estos tests son
 * de recepción y siempre trabajan con `Colocacion`, así que este helper hace el narrowing. */
function esDeJugador(c: ColocacionBorrador, id: string): boolean {
  return 'jugador' in c && c.jugador.id === id;
}

function colocacionDeJugador(
  borrador: readonly ColocacionBorrador[],
  id: string,
):
  | {
      punto: { x: number; y: number };
      celdas?: readonly { columna: number; fila: number }[];
      explicacion?: string;
    }
  | undefined {
  const c = borrador.find((c) => esDeJugador(c, id));
  return c && 'jugador' in c ? c : undefined;
}

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
  return {
    id,
    nombre,
    tipo: 'recepcion',
    equipoId,
    plantilla: plantilla(),
    formaciones: {},
    explicacionesRotacion: {},
  };
}

function plantillaConLibero(sustituidoId: string): PlantillaEquipo {
  const sustitutosPorRotacion = {
    1: sustituidoId,
    2: sustituidoId,
    3: sustituidoId,
    4: sustituidoId,
    5: sustituidoId,
    6: sustituidoId,
  };
  return {
    nombre: 'Equipo A',
    ordenSaque: ordenConCentral2(),
    libero: { jugador: jugador('libero', 'libero'), sustitutosPorRotacion },
  };
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
  | {
      readonly metodo: 'cambiarEstado';
      readonly argumento: { readonly id: string; readonly estado: EstadoSistema };
    }
  | { readonly metodo: 'borrar'; readonly argumento: string };

/** Doble en memoria, granular (spec 031): un mapa por id en vez de un array reemplazado entero,
 * y un registro de llamadas para poder comprobar qué tocó cada operación y qué no.
 *
 * `fallarProximaVez` (spec 034) encola un error que revienta la siguiente escritura —cualquiera
 * de las tres, la que llegue primero— y luego el doble vuelve a comportarse con normalidad; así
 * un test puede simular "falla una vez, y al reintentar ya funciona" sin duplicar la clase. */
class RepositorioFake implements SistemaRepository {
  private readonly mapa: Map<string, Sistema>;
  readonly llamadas: Llamada[] = [];
  private readonly colaDeFallos: Error[] = [];

  constructor(sistemas: readonly Sistema[] = []) {
    this.mapa = new Map(sistemas.map((s) => [s.id, s]));
  }

  fallarProximaVez(error: Error): void {
    this.colaDeFallos.push(error);
  }

  private comprobarFallo(): void {
    const error = this.colaDeFallos.shift();
    if (error) {
      throw error;
    }
  }

  async listar(): Promise<readonly Sistema[]> {
    return [...this.mapa.values()];
  }

  async crear(sistema: Sistema): Promise<void> {
    this.comprobarFallo();
    this.llamadas.push({ metodo: 'crear', argumento: sistema });
    this.mapa.set(sistema.id, sistema);
  }

  async actualizar(sistema: Sistema): Promise<void> {
    this.comprobarFallo();
    this.llamadas.push({ metodo: 'actualizar', argumento: sistema });
    this.mapa.set(sistema.id, sistema);
  }

  async cambiarEstado(id: string, estado: EstadoSistema): Promise<void> {
    this.comprobarFallo();
    this.llamadas.push({ metodo: 'cambiarEstado', argumento: { id, estado } });
    const sistema = this.mapa.get(id);
    if (sistema) {
      this.mapa.set(id, { ...sistema, estado });
    }
  }

  async borrar(id: string): Promise<void> {
    this.comprobarFallo();
    this.llamadas.push({ metodo: 'borrar', argumento: id });
    this.mapa.delete(id);
  }
}

const AJUSTES_POR_DEFECTO: Ajustes = {
  validacionDesactivada: false,
  ayudaPosicionDesactivada: false,
  ordenRotacionCronologico: false,
  mostrarNumerosMetros: false,
  escalaSombra: 5,
};

/** `reintentar` (spec 034) es `() => void`: dispara la escritura de nuevo pero no da al llamador
 * un `Promise` que esperar. Un test que lo invoca necesita dejar pasar la cola de microtareas
 * antes de comprobar el resultado; un `setTimeout` la vacía entera, a cualquier profundidad de
 * `await`, sin depender de cuántos niveles tenga la cadena interna. */
function flushPromesas(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

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
    expect(store.borrador().some((c) => esDeJugador(c, colocador.id))).toBe(true);
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

    const creado = await store.crear('Recepción 5-1', 'recepcion', ['masculino']);

    expect(creado).toBe(true);
    expect(store.sistemaActivoId()).not.toBe('r1');
    expect(store.sistemaActivo()?.nombre).toBe('Recepción 5-1');
    expect(store.rotacionActiva()).toBe(1);
    expect(store.borrador()).toEqual([]);
  });

  describe('crear en varios equipos a la vez (spec 048)', () => {
    it('048-E1: marcar los dos equipos crea dos sistemas independientes, uno por equipo', async () => {
      const store = new SistemaStore(new RepositorioFake([]));
      await store.cargar();

      const creado = await store.crear('5-1 recepción', 'recepcion', ['masculino', 'femenino']);

      expect(creado).toBe(true);
      const enMasculino = store
        .sistemas()
        .find((s) => s.equipoId === 'masculino' && s.nombre === '5-1 recepción');
      const enFemenino = store
        .sistemas()
        .find((s) => s.equipoId === 'femenino' && s.nombre === '5-1 recepción');
      expect(enMasculino).toBeDefined();
      expect(enFemenino).toBeDefined();
      expect(enMasculino!.id).not.toBe(enFemenino!.id);
    });

    it('048-E2: marcar solo un equipo crea solo ahí', async () => {
      const store = new SistemaStore(new RepositorioFake([]));
      await store.cargar();

      await store.crear('5-1 recepción', 'recepcion', ['femenino']);

      expect(store.sistemas()).toHaveLength(1);
      expect(store.sistemas()[0].equipoId).toBe('femenino');
    });

    it('048-E3: si el nombre colisiona en uno de los equipos marcados, no se crea en ninguno', async () => {
      const yaExisteEnFemenino = { ...sistemaBase('f1', 'Dos'), equipoId: 'femenino' as const };
      const store = new SistemaStore(new RepositorioFake([yaExisteEnFemenino]));
      await store.cargar();

      const creado = await store.crear('Dos', 'recepcion', ['masculino', 'femenino']);

      expect(creado).toBe(false);
      expect(store.sistemas().filter((s) => s.nombre === 'Dos')).toHaveLength(1); // solo la ya existente
      expect(store.sistemas().some((s) => s.equipoId === 'masculino' && s.nombre === 'Dos')).toBe(
        false,
      );
    });

    it('048-E4: el equipo activo tras crear es el del primer equipo marcado', async () => {
      const store = new SistemaStore(new RepositorioFake([]));
      await store.cargar();
      store.seleccionarEquipo('femenino');

      await store.crear('5-1 recepción', 'recepcion', ['masculino', 'femenino']);

      expect(store.equipoActivo()).toBe('masculino');
      expect(store.sistemaActivo()?.equipoId).toBe('masculino');
    });

    it('048-E5: sin ningún equipo, no se crea nada', async () => {
      const store = new SistemaStore(new RepositorioFake([]));
      await store.cargar();

      const creado = await store.crear('5-1 recepción', 'recepcion', []);

      expect(creado).toBe(false);
      expect(store.sistemas()).toHaveLength(0);
    });
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
    const original: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      formaciones: { 1: [{ jugador: colocador, punto: { x: 8, y: 1 } }] },
    };
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

  it('039-E12: clonar un sistema de defensa se lleva todas sus variantes', async () => {
    const original: Sistema = {
      ...sistemaBase('d1', 'Defensa'),
      tipo: 'defensa',
      defensas: [
        {
          caso: 'delantero',
          situacion: 'z4',
          bloqueadores: 0,
          formacion: [{ puesto: 1, punto: { x: 1, y: 1 } }],
        },
        {
          caso: 'delantero',
          situacion: 'z4',
          bloqueadores: 2,
          formacion: [{ puesto: 1, punto: { x: 2, y: 2 } }],
        },
        {
          caso: 'trasero',
          situacion: 'pipe',
          bloqueadores: 1,
          formacion: [{ puesto: 1, punto: { x: 3, y: 3 } }],
        },
      ],
    };
    const store = new SistemaStore(new RepositorioFake([original]));
    await store.cargar();

    await store.clonar('Defensa (copia)');

    const clon = store.catalogo().find((s) => s.nombre === 'Defensa (copia)');
    expect(clon?.defensas).toEqual(original.defensas);
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
    const store = new SistemaStore(
      new RepositorioFake([sistemaBase('r1', 'Recepción A'), sistemaBase('r2', 'Recepción B')]),
    );
    await store.cargar();
    store.activarSistema('r1');

    await store.borrar('r1');

    expect(store.catalogo().map((s) => s.id)).toEqual(['r2']);
    expect(store.sistemaActivoId()).toBe('r2');
  });

  it('051-E2: validar el sistema activo cambia su estado y lo persiste', async () => {
    const repositorio = new RepositorioFake([sistemaBase('r1', 'Recepción A')]);
    const store = new SistemaStore(repositorio);
    await store.cargar();
    store.activarSistema('r1');

    await store.cambiarEstadoActivo('validado');

    expect(store.sistemaActivo()?.estado).toBe('validado');
    expect(repositorio.llamadas).toContainEqual({
      metodo: 'cambiarEstado',
      argumento: { id: 'r1', estado: 'validado' },
    });
  });

  it('010-E8: sin jugador seleccionado, el panel muestra la explicación de la rotación', async () => {
    const conExplicacion: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      explicacionesRotacion: { 1: 'Explicación de la rotación' },
    };
    const store = new SistemaStore(new RepositorioFake([conExplicacion]));
    await store.cargar();

    expect(store.explicacionMostrada()).toBe('Explicación de la rotación');
  });

  it('010-E9: seleccionar un jugador muestra su explicación en el panel', async () => {
    const [colocador] = plantilla().ordenSaque;
    const conJugadorExplicado: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      formaciones: {
        1: [
          { jugador: colocador, punto: { x: 8, y: 1 }, explicacion: 'Se esconde tras el opuesto' },
        ],
      },
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

    expect(store.sistemaActivo()?.explicacionesRotacion[1]).toBe(
      'Explicación nueva de la rotación',
    );
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

    const colocacion = store
      .sistemaActivo()
      ?.formaciones[1]?.find((c) => c.jugador.id === colocador.id);
    expect(colocacion?.explicacion).toBe('Explicación nueva del jugador');
  });

  it('025 (aplicación): sin descripción, el store la muestra vacía', async () => {
    const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
    await store.cargar();

    expect(store.descripcionSistemaActivo()).toBe('');
  });

  it('025 (aplicación): la descripción del sistema activo se lee del store', async () => {
    const conDescripcion: Sistema = {
      ...sistemaBase('r1', 'Uno'),
      descripcion: 'Recepción a 3 en 5-1.',
    };
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

  it('043 (aplicación): cambiar el sustituto con una formación de seis guardada la deja en seis, sin que la escritura falle', async () => {
    const plantillaCentral2 = plantillaConLibero('central2');
    const [colocador, receptor1, receptor2, central1, , opuesto] = plantillaCentral2.ordenSaque;
    const libero = plantillaCentral2.libero!.jugador;
    const sistema: Sistema = {
      ...sistemaConLibero('r1', 'Uno'),
      plantilla: plantillaCentral2,
      formaciones: {
        1: [
          { jugador: colocador, punto: { x: 8, y: 1 } },
          { jugador: receptor1, punto: { x: 4.5, y: 1 } },
          { jugador: receptor2, punto: { x: 1, y: 1 } },
          { jugador: central1, punto: { x: 1, y: 6 } },
          { jugador: libero, punto: { x: 4.5, y: 6 } },
          { jugador: opuesto, punto: { x: 8, y: 8 } },
        ],
      },
    };
    const repositorio = new RepositorioFake([sistema]);
    const store = new SistemaStore(repositorio);
    await store.cargar();

    await store.cambiarSustitutoLibero(1, 'opuesto');

    expect(store.sistemaActivo()?.formaciones[1]).toHaveLength(6);
    expect(repositorio.llamadas.filter((l) => l.metodo === 'actualizar')).toHaveLength(1);
  });

  describe('sistemas de defensa', () => {
    const puesto3: ColocacionDefensa = { puesto: 3, punto: { x: 8, y: 1 } };

    function sistemaDefensaVacio(id = 'd1', nombre = 'Defensa'): Sistema {
      return { ...sistemaBase(id, nombre), tipo: 'defensa' };
    }

    function seisPuestosEnCentro(): ColocacionDefensa[] {
      return ([1, 2, 3, 4, 5, 6] as const).map((puesto) => ({ puesto, punto: { x: 4.5, y: 4.5 } }));
    }

    it('038-E1: en un sistema de defensa la rotación no manda: hay caso y situación en su lugar', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();

      expect(store.casoActivo()).toBe('delantero');
      expect(store.situacionActiva()).toBe('z4');
    });

    it('038-E5: cambiar de caso sin cambios pendientes carga lo guardado en la nueva combinación', async () => {
      const sistemaDefensa: Sistema = {
        ...sistemaDefensaVacio(),
        defensas: [{ caso: 'trasero', situacion: 'z3', bloqueadores: 0, formacion: [puesto3] }],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      store.seleccionarSituacion('z3');

      store.seleccionarCaso('trasero');

      expect(store.borrador()).toEqual([puesto3]);
    });

    it('038-E6: cambiar de caso con cambios sin guardar pide confirmar', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();
      store.colocarOMover('p3', { x: 1, y: 1 });

      store.seleccionarCaso('trasero');

      expect(store.casoActivo()).toBe('delantero');
      expect(store.cambioPendiente()).toEqual({ tipo: 'caso', valor: 'trasero' });
    });

    it('038-E14: en defensa nunca hay falta ni aviso, aunque los seis estén amontonados', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();

      seisPuestosEnCentro().forEach((c) => store.colocarOMover(`p${c.puesto}`, c.punto));

      expect(store.resultadoValidacion()).toBeNull();
    });

    it('038-E13: colocar, mover y quitar un puesto funciona igual que un jugador en recepción', async () => {
      // spec 042: la variante nace con los seis puestos ya colocados (la defensa de referencia
      // de z4, la situación por defecto), no vacía — se comprueba el puesto 3 dentro de los seis.
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();
      expect(store.borrador()).toHaveLength(6);

      store.colocarOMover('p3', { x: 1, y: 1 });
      expect(store.borrador()).toHaveLength(6);
      expect(store.borrador().find((c) => 'puesto' in c && c.puesto === 3)).toEqual({
        puesto: 3,
        punto: { x: 1, y: 1 },
      });

      store.colocarOMover('p3', { x: 2, y: 2 });
      expect(store.borrador().find((c) => 'puesto' in c && c.puesto === 3)).toEqual({
        puesto: 3,
        punto: { x: 2, y: 2 },
      });

      store.quitar('p3');
      expect(store.borrador()).toHaveLength(5);
      expect(store.borrador().find((c) => 'puesto' in c && c.puesto === 3)).toBeUndefined();
    });

    it('038 (vaciar): vaciar la situación activa la deja sin ningún puesto, sin afectar a otras', async () => {
      const sistemaDefensa: Sistema = {
        ...sistemaDefensaVacio(),
        defensas: [{ caso: 'delantero', situacion: 'z3', bloqueadores: 0, formacion: [puesto3] }],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      store.seleccionarSituacion('z3');

      store.vaciar();

      expect(store.borrador()).toEqual([]);
      expect(store.hayCambiosSinGuardar()).toBe(true);
    });

    it('038-E15: con los seis puestos colocados se puede guardar, aunque estén amontonados', async () => {
      // spec 042: la variante ya nace con los seis colocados, así que puedeGuardar es cierto
      // desde el principio; amontonarlos en el centro no lo cambia (en defensa no hay falta).
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();
      expect(store.puedeGuardar()).toBe(true);

      seisPuestosEnCentro().forEach((c) => store.colocarOMover(`p${c.puesto}`, c.punto));

      expect(store.puedeGuardar()).toBe(true);

      store.quitar('p1');
      expect(store.puedeGuardar()).toBe(false);
    });

    it('038-E16: guardar asocia la defensa al caso y la situación activos', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();
      seisPuestosEnCentro().forEach((c) => store.colocarOMover(`p${c.puesto}`, c.punto));

      await store.guardar();

      const variante = store
        .sistemaActivo()
        ?.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z4');
      expect(variante?.formacion).toEqual(store.borrador());
      expect(store.hayCambiosSinGuardar()).toBe(false);
    });

    it('038 (confirmar cambio): confirmar el aviso descarta los cambios y cambia de caso', async () => {
      // spec 042: al no haber variante guardada para trasero/z4, el borrador vuelve a la postura
      // por defecto de z4 (seis puestos, sin celdas ni explicación) — no a vacío.
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();
      store.colocarOMover('p3', { x: 1, y: 1 });
      store.seleccionarCaso('trasero');

      store.confirmarCambio();

      expect(store.casoActivo()).toBe('trasero');
      expect(store.cambioPendiente()).toBeNull();
      expect(store.borrador()).toHaveLength(6);
      expect(store.borrador().find((c) => 'puesto' in c && c.puesto === 3)?.punto).not.toEqual({
        x: 1,
        y: 1,
      });
    });

    it('039-E2: cada número de bloqueadores guarda su propia colocación, sin arrastrar nada de otra', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();
      seisPuestosEnCentro().forEach((c) => store.colocarOMover(`p${c.puesto}`, c.punto));
      await store.guardar(); // variante 0 bloqueadores, todos en el centro

      store.seleccionarBloqueadores(2);
      const otraFormacion = seisPuestosEnCentro().map((c) => ({ ...c, punto: { x: 1, y: 1 } }));
      otraFormacion.forEach((c) => store.colocarOMover(`p${c.puesto}`, c.punto));
      await store.guardar();

      const variante0 = store
        .sistemaActivo()
        ?.defensas?.find(
          (v) => v.caso === 'delantero' && v.situacion === 'z4' && v.bloqueadores === 0,
        );
      const variante2 = store
        .sistemaActivo()
        ?.defensas?.find(
          (v) => v.caso === 'delantero' && v.situacion === 'z4' && v.bloqueadores === 2,
        );
      expect(variante0?.formacion[0].punto).toEqual({ x: 4.5, y: 4.5 });
      expect(variante2?.formacion[0].punto).toEqual({ x: 1, y: 1 });
    });

    it('039-E3 (corregido por 042): cambiar a un número de bloqueadores nunca guardado vuelve a la postura por defecto de la situación, no la variante de 2', async () => {
      const sistemaDefensa: Sistema = {
        ...sistemaDefensaVacio(),
        defensas: [
          { caso: 'delantero', situacion: 'z4', bloqueadores: 2, formacion: seisPuestosEnCentro() },
        ],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();

      store.seleccionarBloqueadores(1);

      expect(store.borrador()).toHaveLength(6);
      expect(store.borrador()).not.toEqual(seisPuestosEnCentro());
    });

    it('042-E1 (aplicación): una situación con material nunca guardada nace con la defensa de referencia', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar(); // caso delantero, situación z4 por defecto (038-E1)

      expect(store.borrador()).toEqual(formacionDefensaPorDefecto('z4'));
    });

    it('042-E2: inicial y z1 nacen con la postura base, no con los seis en el origen', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();

      store.seleccionarSituacion('inicial');

      expect(store.borrador()).toHaveLength(6);
      expect(store.borrador().every((c) => c.punto.x === 0 && c.punto.y === 0)).toBe(false);
    });

    it('042-E3: una variante ya guardada muestra lo guardado, no el defecto', async () => {
      // Mismo caso que 038-E5, con el foco puesto en que NO aparece la defensa de referencia.
      const sistemaDefensa: Sistema = {
        ...sistemaDefensaVacio(),
        defensas: [{ caso: 'delantero', situacion: 'z4', bloqueadores: 0, formacion: [puesto3] }],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();

      expect(store.borrador()).toEqual([puesto3]);
    });

    it('042-E4: la postura por defecto no se guarda si nadie la toca', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();
      expect(store.borrador()).toHaveLength(6); // se ve el defecto...

      store.seleccionarSituacion('inicial');
      store.seleccionarSituacion('z4');

      expect(store.sistemaActivo()?.defensas ?? []).toEqual([]); // ...pero no quedó guardado
    });

    it('039-E4: la situación inicial siempre tiene 0 bloqueadores, incluso tras seleccionar otro número antes', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();
      store.seleccionarBloqueadores(2);

      store.seleccionarSituacion('inicial');

      expect(store.bloqueadoresActivos()).toBe(0);
    });

    it('049-E12: una variante guardada no se ve afectada por el defecto por número de bloqueadores', async () => {
      const sistemaDefensa: Sistema = {
        ...sistemaDefensaVacio(),
        defensas: [
          { caso: 'delantero', situacion: 'z4', bloqueadores: 2, formacion: seisPuestosEnCentro() },
        ],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      store.seleccionarBloqueadores(2);

      expect(store.borrador()).toEqual(seisPuestosEnCentro());
    });

    it('049-E13: ninguna variante hereda la colocación guardada de otra — la de 3 bloqueadores sin guardar muestra el defecto, no la de 2 ya guardada', async () => {
      const sistemaDefensa: Sistema = {
        ...sistemaDefensaVacio(),
        defensas: [
          { caso: 'delantero', situacion: 'z4', bloqueadores: 2, formacion: seisPuestosEnCentro() },
        ],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();

      store.seleccionarBloqueadores(3);

      expect(store.borrador()).not.toEqual(seisPuestosEnCentro());
      expect(store.borrador()).toEqual(formacionDefensaPorDefecto('z4', 3));
    });

    it('039-E6: cambiar de número de bloqueadores con cambios sin guardar pide confirmar', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();
      store.colocarOMover('p3', { x: 1, y: 1 });

      store.seleccionarBloqueadores(2);

      expect(store.bloqueadoresActivos()).toBe(0);
      expect(store.cambioPendiente()).toEqual({ tipo: 'bloqueadores', valor: 2 });
    });

    it('039-E8: rehacer una variante no toca las demás de la misma situación', async () => {
      const sistemaDefensa: Sistema = {
        ...sistemaDefensaVacio(),
        defensas: [
          { caso: 'delantero', situacion: 'z4', bloqueadores: 0, formacion: seisPuestosEnCentro() },
          { caso: 'delantero', situacion: 'z4', bloqueadores: 2, formacion: [puesto3] },
        ],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      const nueva = seisPuestosEnCentro().map((c) => ({ ...c, punto: { x: 7, y: 7 } }));
      nueva.forEach((c) => store.colocarOMover(`p${c.puesto}`, c.punto));

      await store.guardar();

      const variante2 = store.sistemaActivo()?.defensas?.find((v) => v.bloqueadores === 2);
      expect(variante2?.formacion).toEqual([puesto3]);
    });

    it('040-E10: desplazar la sombra y guardar la asocia a la variante activa', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensaVacio()]));
      await store.cargar();
      seisPuestosEnCentro().forEach((c) => store.colocarOMover(`p${c.puesto}`, c.punto));
      store.desplazarSombra({ x: 1, y: 0.5 });

      await store.guardar();

      const variante = store
        .sistemaActivo()
        ?.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z4');
      expect(variante?.desplazamientoSombra).toEqual({ x: 1, y: 0.5 });
    });

    it('040-E11: al recargar el contexto, el desplazamiento guardado se recupera', async () => {
      const sistemaDefensa: Sistema = {
        ...sistemaDefensaVacio(),
        defensas: [
          {
            caso: 'delantero',
            situacion: 'z4',
            bloqueadores: 0,
            formacion: seisPuestosEnCentro(),
            desplazamientoSombra: { x: 0.5, y: -0.2 },
          },
        ],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));

      await store.cargar();

      expect(store.desplazamientoSombraEdicion()).toEqual({ x: 0.5, y: -0.2 });
    });

    it('040-E13: recentrar descarta el retoque; guardar de nuevo lo borra de la variante', async () => {
      const sistemaDefensa: Sistema = {
        ...sistemaDefensaVacio(),
        defensas: [
          {
            caso: 'delantero',
            situacion: 'z4',
            bloqueadores: 0,
            formacion: seisPuestosEnCentro(),
            desplazamientoSombra: { x: 0.5, y: -0.2 },
          },
        ],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();

      store.recentrarSombra();
      expect(store.desplazamientoSombraEdicion()).toBeNull();

      await store.guardar();

      const variante = store
        .sistemaActivo()
        ?.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z4');
      expect(variante?.desplazamientoSombra).toBeUndefined();
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

      const celdas = colocacionDeJugador(store.borrador(), colocador.id)?.celdas;
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

      const celdas = colocacionDeJugador(store.borrador(), colocador.id)?.celdas;
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
      expect(colocacionDeJugador(formacion, colocador.id)?.celdas).toEqual([
        { columna: 2, fila: 2 },
      ]);
      expect(colocacionDeJugador(formacion, receptor1.id)?.celdas).toEqual([
        { columna: 2, fila: 2 },
      ]);
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

      const celdas = colocacionDeJugador(store.borrador(), colocador.id)?.celdas;
      expect(celdas).toEqual([{ columna: 2, fila: 2 }]);
    });

    it('mover un jugador con explicación guardada conserva su explicación', async () => {
      const [colocador] = plantilla().ordenSaque;
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: {
          1: [
            {
              jugador: colocador,
              punto: { x: 1, y: 1 },
              explicacion: 'Se esconde tras el opuesto',
            },
          ],
        },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      await store.cargar();

      store.colocarOMover(colocador.id, { x: 3, y: 3 });

      const explicacion = colocacionDeJugador(store.borrador(), colocador.id)?.explicacion;
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
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: formacionInicial },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      await store.cargar();
      store.pintarCelda(orden[0].id, { columna: 16, fila: 16 });

      await store.guardar();

      const guardado = store
        .sistemaActivo()
        ?.formaciones[1]?.find((c) => c.jugador.id === orden[0].id);
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

    it('038-E17: la zona se guarda igual en defensa, por puesto', async () => {
      const formacionInicial: ColocacionDefensa[] = ([1, 2, 3, 4, 5, 6] as const).map((puesto) => ({
        puesto,
        punto: { x: 4.5, y: 4.5 },
        ...(puesto === 1 ? { celdas: [] } : {}),
      }));
      const sistemaDefensa: Sistema = {
        ...sistemaBase('d1', 'Defensa'),
        tipo: 'defensa',
        defensas: [
          { caso: 'delantero', situacion: 'z4', bloqueadores: 0, formacion: formacionInicial },
        ],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      store.pintarCelda('p1', { columna: 9, fila: 9 });

      await store.guardar();

      const variante = store
        .sistemaActivo()
        ?.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z4');
      const guardado = variante?.formacion.find((c) => c.puesto === 1);
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
      const sistema: Sistema = {
        ...sistemaBase('r1', 'Uno'),
        formaciones: { 1: formacionConCeldas },
      };
      const store = new SistemaStore(new RepositorioFake([sistema]));
      await store.cargar();

      await store.guardar();

      const guardado = store
        .sistemaActivo()
        ?.formaciones[1]?.find((c) => c.jugador.id === orden[0].id);
      expect(guardado?.celdas).toEqual([{ columna: 16, fila: 16 }]);
    });

    it('047-E1: seleccionar un puesto sin celdas pintadas no muestra ninguna zona', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      store.colocarOMover('p1', { x: 1, y: 1 });

      store.seleccionarJugador('p1');

      expect(store.celdasJugadorSeleccionado()).toEqual([]);
    });

    it('047: mover la ficha sin haber pintado nada sigue sin mostrar ninguna zona', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      store.colocarOMover('p1', { x: 1, y: 1 });
      store.seleccionarJugador('p1');

      store.colocarOMover('p1', { x: 5, y: 5 });

      expect(store.celdasJugadorSeleccionado()).toEqual([]);
    });

    it('047-E2: pintar la primera celda la añade sola, no un bloque de cuatro', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      store.colocarOMover('p1', { x: 1, y: 1 });
      store.seleccionarJugador('p1');

      store.pintarCelda('p1', { columna: 5, fila: 5 });

      const celdas = store.borrador().find((c) => 'puesto' in c && c.puesto === 1)?.celdas;
      expect(celdas).toEqual([{ columna: 5, fila: 5 }]);
    });

    it('047-E3: borrar sin haber pintado nada no hace nada', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      store.colocarOMover('p1', { x: 1, y: 1 });
      store.seleccionarJugador('p1');

      store.borrarCelda('p1', { columna: 1, fila: 1 });

      const celdas = store.borrador().find((c) => 'puesto' in c && c.puesto === 1)?.celdas;
      expect(celdas).toEqual([]);
    });

    it('024-E8: sin bloque por defecto, no pintar nada deja celdas sin guardar (undefined)', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      const puestos: ColocacionDefensa[] = ([1, 2, 3, 4, 5, 6] as const).map((puesto) => ({
        puesto,
        punto: { x: 4.5, y: 4.5 },
      }));
      puestos.forEach((c) => store.colocarOMover(`p${c.puesto}`, c.punto));
      store.seleccionarJugador('p1');

      await store.guardar();

      const variante = store
        .sistemaActivo()
        ?.defensas?.find((v) => v.caso === 'delantero' && v.situacion === 'z4');
      const guardado = variante?.formacion.find((c) => c.puesto === 1);
      expect(guardado?.celdas).toBeUndefined();
    });

    it('047-E4: una zona ya guardada se sigue mostrando igual al seleccionar', async () => {
      const celdasGuardadas = [
        { columna: 3, fila: 3 },
        { columna: 4, fila: 3 },
      ];
      const sistemaDefensa: Sistema = {
        ...sistemaBase('d1', 'Defensa'),
        tipo: 'defensa',
        defensas: [
          {
            caso: 'delantero',
            situacion: 'z4',
            bloqueadores: 0,
            formacion: [{ puesto: 1, punto: { x: 1, y: 1 }, celdas: celdasGuardadas }],
          },
        ],
      };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();

      store.seleccionarJugador('p1');

      expect(store.celdasJugadorSeleccionado()).toEqual(celdasGuardadas);
    });
  });

  describe('sin solapes entre fichas (spec 046)', () => {
    it('046-E7/E9: en defensa, mover un puesto sobre otro lo detiene a la distancia mínima', async () => {
      const sistemaDefensa: Sistema = { ...sistemaBase('d1', 'Defensa'), tipo: 'defensa' };
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa]));
      await store.cargar();
      store.colocarOMover('p1', { x: 4.5, y: 4.5 });

      store.colocarOMover('p2', { x: 4.5, y: 4.5 });

      const p1 = store.borrador().find((c) => 'puesto' in c && c.puesto === 1)!;
      const p2 = store.borrador().find((c) => 'puesto' in c && c.puesto === 2)!;
      expect(p1.punto).toEqual({ x: 4.5, y: 4.5 }); // el primero en llegar no se mueve
      expect(Math.hypot(p2.punto.x - p1.punto.x, p2.punto.y - p1.punto.y)).toBeCloseTo(0.9, 6);
    });

    it('046-E7/E9: en recepción, mover un jugador sobre otro lo detiene a la distancia mínima', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
      await store.cargar();
      const [colocador, receptor1] = plantilla().ordenSaque;
      store.colocarOMover(colocador.id, { x: 4.5, y: 4.5 });

      store.colocarOMover(receptor1.id, { x: 4.5, y: 4.5 });

      const cColocador = colocacionDeJugador(store.borrador(), colocador.id)!;
      const cReceptor1 = colocacionDeJugador(store.borrador(), receptor1.id)!;
      expect(cColocador.punto).toEqual({ x: 4.5, y: 4.5 });
      expect(
        Math.hypot(
          cReceptor1.punto.x - cColocador.punto.x,
          cReceptor1.punto.y - cColocador.punto.y,
        ),
      ).toBeCloseTo(0.9, 6);
    });

    it('046: sin nadie cerca, colocarOMover no desplaza el punto pedido', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
      await store.cargar();
      const [colocador] = plantilla().ordenSaque;

      store.colocarOMover(colocador.id, { x: 1, y: 1 });

      expect(colocacionDeJugador(store.borrador(), colocador.id)?.punto).toEqual({ x: 1, y: 1 });
    });
  });

  describe('pintado de zona de finta (spec 041)', () => {
    function sistemaDefensa(id = 'd1', nombre = 'Defensa'): Sistema {
      return { ...sistemaBase(id, nombre), tipo: 'defensa' };
    }

    it('041-E5: en modo finta, pintarCelda marca celdasFinta, sin tocar celdas', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa()]));
      await store.cargar();
      store.colocarOMover('p1', { x: 1, y: 1 });
      store.seleccionarModoPintado('finta');

      store.pintarCelda('p1', { columna: 5, fila: 5 });

      const colocacion = store.borrador().find((c) => 'puesto' in c && c.puesto === 1);
      expect(colocacion?.celdasFinta).toEqual([{ columna: 5, fila: 5 }]);
      expect(colocacion?.celdas).toBeUndefined();
    });

    it('041-E6: una celda puede ser de defensa y de finta a la vez; borrar una no borra la otra', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa()]));
      await store.cargar();
      store.colocarOMover('p1', { x: 1, y: 1 });
      store.pintarCelda('p1', { columna: 5, fila: 5 }); // modo defensa (por defecto)
      store.seleccionarModoPintado('finta');
      store.pintarCelda('p1', { columna: 5, fila: 5 });

      let colocacion = store.borrador().find((c) => 'puesto' in c && c.puesto === 1);
      expect(colocacion?.celdas).toContainEqual({ columna: 5, fila: 5 });
      expect(colocacion?.celdasFinta).toEqual([{ columna: 5, fila: 5 }]);

      store.borrarCelda('p1', { columna: 5, fila: 5 }); // sigue en modo finta

      colocacion = store.borrador().find((c) => 'puesto' in c && c.puesto === 1);
      expect(colocacion?.celdasFinta).toEqual([]);
      expect(colocacion?.celdas).toContainEqual({ columna: 5, fila: 5 });
    });

    it('041-E8: la zona de finta no tiene bloque por defecto', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa()]));
      await store.cargar();
      store.colocarOMover('p1', { x: 1, y: 1 });

      store.seleccionarJugador('p1');

      expect(store.celdasFintaJugadorSeleccionado()).toEqual([]);
    });

    it('044-E1: la acción de arrastre empieza en "pintar"', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa()]));
      await store.cargar();

      expect(store.accionArrastre()).toBe('pintar');
    });

    it('045-E1: clicar la opción ya activa la apaga (queda en null)', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa()]));
      await store.cargar();

      store.seleccionarAccionArrastre('pintar'); // ya estaba en 'pintar'

      expect(store.accionArrastre()).toBeNull();
    });

    it('045-E4: clicar una opción con la acción apagada la vuelve a activar', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa()]));
      await store.cargar();
      store.seleccionarAccionArrastre('pintar'); // apaga

      store.seleccionarAccionArrastre('pintar');

      expect(store.accionArrastre()).toBe('pintar');
    });

    it('044/045: seleccionarAccionArrastre cambia entre pintar y mover, con bloqueadores', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa()]));
      await store.cargar();
      store.seleccionarBloqueadores(1); // z4 admite bloqueadores; sin esto "mover" se ignora

      store.seleccionarAccionArrastre('mover');
      expect(store.accionArrastre()).toBe('mover');

      store.seleccionarAccionArrastre('pintar');
      expect(store.accionArrastre()).toBe('pintar');
    });

    it('045-E7: "Pintar" nunca se deshabilita, incluso sin bloqueadores', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa()]));
      await store.cargar();
      expect(store.bloqueadoresActivos()).toBe(0);

      store.seleccionarAccionArrastre('pintar'); // apaga desde el defecto
      store.seleccionarAccionArrastre('pintar'); // vuelve a activar

      expect(store.accionArrastre()).toBe('pintar');
    });

    it('045-E5: "puedeMoverBloqueo" es falso sin bloqueadores, y seleccionarlo se ignora', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa()]));
      await store.cargar();
      expect(store.puedeMoverBloqueo()).toBe(false);

      store.seleccionarAccionArrastre('mover');

      expect(store.accionArrastre()).toBe('pintar'); // no cambió: la petición se ignoró
    });

    it('045-E6: bajar a 0 bloqueadores con "mover" activo lo apaga, y no se reactiva solo', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaDefensa()]));
      await store.cargar();
      store.seleccionarBloqueadores(1);
      store.seleccionarAccionArrastre('mover');
      expect(store.accionArrastre()).toBe('mover');

      store.seleccionarBloqueadores(0);
      expect(store.accionArrastre()).toBeNull();

      store.seleccionarBloqueadores(2); // vuelven a existir bloqueadores
      expect(store.accionArrastre()).toBeNull(); // sigue sin reactivarse sola
    });
  });

  describe('escala del ancho de la sombra (spec 044, rango corregido por la 045)', () => {
    it('045-E8: la escala empieza en 5', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
      await store.cargar();

      expect(store.escalaSombra()).toBe(5);
    });

    it('044-E8: cambiar la escala la persiste a través de AjustesRepository', async () => {
      const ajustesRepositorio = new AjustesRepositorioFake();
      const store = new SistemaStore(
        new RepositorioFake([sistemaBase('r1', 'Uno')]),
        ajustesRepositorio,
      );
      await store.cargar();

      await store.cambiarEscalaSombra(8);

      const store2 = new SistemaStore(
        new RepositorioFake([sistemaBase('r1', 'Uno')]),
        ajustesRepositorio,
      );
      await store2.cargar();
      expect(store2.escalaSombra()).toBe(8);
    });

    it('045-E8: la escala se recorta a 0-10', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
      await store.cargar();

      await store.cambiarEscalaSombra(15);
      expect(store.escalaSombra()).toBe(10);

      await store.cambiarEscalaSombra(-3);
      expect(store.escalaSombra()).toBe(0);
    });

    it('045-E8: la escala se redondea a enteros', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
      await store.cargar();

      await store.cambiarEscalaSombra(6.7);

      expect(store.escalaSombra()).toBe(7);
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

      expect(repositorio.llamadas).toEqual([
        { metodo: 'actualizar', argumento: expect.objectContaining({ id: 'r1' }) },
      ]);
    });

    it('031-E2: crear un sistema no reescribe los que ya existían', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();

      await store.crear('Recepción nueva', 'recepcion', ['masculino']);

      expect(repositorio.llamadas).toEqual([
        { metodo: 'crear', argumento: expect.objectContaining({ nombre: 'Recepción nueva' }) },
      ]);
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

      const creado = await store.crear('Uno', 'recepcion', ['masculino']);

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
      const store = new SistemaStore(
        new RepositorioFake([sistemaBase('r1', 'Recepción A'), sistemaBase('r2', 'Recepción B')]),
      );
      expect(store.sistemas()).toEqual([]);

      await store.cargar();

      expect(store.sistemas()).toHaveLength(2);
      expect(store.sistemaActivoId()).toBe('r1');
    });

    it('031-E7: crear, renombrar, clonar y borrar siguen comportándose igual que antes de esta spec', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('r1', 'Uno')]));
      await store.cargar();

      const creado = await store.crear('Dos', 'recepcion', ['masculino']);
      expect(creado).toBe(true);
      expect(store.sistemaActivo()?.nombre).toBe('Dos');

      const renombrado = await store.renombrarActivo('Dos renombrado');
      expect(renombrado).toBe(true);
      expect(store.sistemaActivo()?.nombre).toBe('Dos renombrado');

      const clonado = await store.clonar('Dos renombrado (copia)');
      expect(clonado).toBe(true);
      expect(
        store
          .catalogo()
          .map((s) => s.nombre)
          .sort(),
      ).toEqual(['Dos renombrado', 'Dos renombrado (copia)', 'Uno'].sort());

      const idClon = store.sistemaActivoId()!;
      await store.borrar(idClon);
      expect(store.catalogo().some((s) => s.id === idClon)).toBe(false);
      expect(store.catalogo()).toHaveLength(2);
    });
  });

  describe('spec 032 — cada sistema pertenece a un equipo', () => {
    it('032-E5: el catálogo solo muestra los sistemas del equipo activo', async () => {
      const store = new SistemaStore(
        new RepositorioFake([
          sistemaBase('m1', 'Recepción M', 'masculino'),
          sistemaBase('f1', 'Recepción F', 'femenino'),
        ]),
      );

      await store.cargar();

      expect(store.catalogo().map((s) => s.id)).toEqual(['m1']);
    });

    it('032-E6: cambiar de equipo activa el primero del catálogo del equipo nuevo', async () => {
      const store = new SistemaStore(
        new RepositorioFake([
          sistemaBase('m1', 'Recepción M', 'masculino'),
          sistemaBase('f1', 'Recepción F', 'femenino'),
        ]),
      );
      await store.cargar();

      store.seleccionarEquipo('femenino');

      expect(store.equipoActivo()).toBe('femenino');
      expect(store.sistemaActivoId()).toBe('f1');
      expect(store.catalogo().map((s) => s.id)).toEqual(['f1']);
    });

    it('032-E6b: cambiar a un equipo sin sistemas no deja ninguno activo', async () => {
      const store = new SistemaStore(
        new RepositorioFake([sistemaBase('m1', 'Recepción M', 'masculino')]),
      );
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
        new RepositorioFake([
          sistemaBase('m1', 'Uno', 'masculino'),
          sistemaBase('f1', 'Dos', 'femenino'),
        ]),
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
      expect(store.borrador().some((c) => esDeJugador(c, colocador.id))).toBe(true);
    });

    it('032-E8: crear un sistema para el equipo activo lo deja activo, sin cambiar de equipo', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('m1', 'Uno', 'masculino')]));
      await store.cargar();

      const creado = await store.crear('Dos', 'recepcion', ['masculino']);

      expect(creado).toBe(true);
      expect(store.equipoActivo()).toBe('masculino');
      expect(store.sistemaActivo()?.nombre).toBe('Dos');
    });

    it('032-E9: crear un sistema para el otro equipo cambia el equipo activo', async () => {
      const store = new SistemaStore(new RepositorioFake([sistemaBase('m1', 'Uno', 'masculino')]));
      await store.cargar();

      const creado = await store.crear('Recepción F', 'recepcion', ['femenino']);

      expect(creado).toBe(true);
      expect(store.equipoActivo()).toBe('femenino');
      expect(store.sistemaActivo()?.nombre).toBe('Recepción F');
      expect(store.sistemaActivo()?.equipoId).toBe('femenino');
    });
  });

  describe('spec 034 — la pizarra no pierde trabajo cuando falla el guardado', () => {
    const puntosLegalesR1 = [
      { x: 8, y: 8 },
      { x: 8, y: 1 },
      { x: 4.5, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 6 },
      { x: 4.5, y: 6 },
    ];

    function colocarFormacionValida(store: SistemaStore): void {
      plantilla().ordenSaque.forEach((jugador, indice) =>
        store.colocarOMover(jugador.id, puntosLegalesR1[indice]),
      );
    }

    it('034-E5: si guardar falla, el borrador sigue ahí, sin persistirse', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();
      colocarFormacionValida(store);
      const borradorAntesDelFallo = store.borrador();
      repositorio.fallarProximaVez(new ErrorDeRed('sin conexion'));

      await store.guardar();

      expect(store.borrador()).toEqual(borradorAntesDelFallo);
      expect(store.sistemaActivo()?.formaciones[1]).toBeUndefined();
      const persistidos = await repositorio.listar();
      expect(persistidos[0]?.formaciones[1]).toBeUndefined();
    });

    it('034-E6: un guardado fallido se anuncia con un motivo y una forma de reintentar', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();
      colocarFormacionValida(store);
      repositorio.fallarProximaVez(new ErrorDeRed('sin conexion'));

      await store.guardar();

      expect(store.errorGuardado()?.mensaje).toMatch(/conectar con el servidor/);
      expect(typeof store.errorGuardado()?.reintentar).toBe('function');
    });

    it('034-E6b: cada motivo de fallo se anuncia con un mensaje distinto', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();
      colocarFormacionValida(store);
      repositorio.fallarProximaVez(new ConflictoDeEdicion('alguien mas guardo antes'));

      await store.guardar();

      expect(store.errorGuardado()?.mensaje).toMatch(/modificado este sistema/);
    });

    it('034-E7: reintentar tras un fallo aplica el cambio y borra el aviso', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();
      colocarFormacionValida(store);
      repositorio.fallarProximaVez(new ErrorDelServidor('caida temporal'));
      await store.guardar();
      const borradorPendiente = store.borrador();

      store.errorGuardado()?.reintentar();
      await flushPromesas();

      expect(store.errorGuardado()).toBeNull();
      expect(store.sistemaActivo()?.formaciones[1]).toEqual(borradorPendiente);
      const persistidos = await repositorio.listar();
      expect(persistidos[0]?.formaciones[1]).toEqual(borradorPendiente);
    });

    it('034-E8: cerrar el aviso no aplica ni descarta el cambio pendiente', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();
      colocarFormacionValida(store);
      const borradorPendiente = store.borrador();
      repositorio.fallarProximaVez(new ErrorDeRed('sin conexion'));
      await store.guardar();

      store.cerrarError();

      expect(store.errorGuardado()).toBeNull();
      expect(store.borrador()).toEqual(borradorPendiente);
      expect(store.sistemaActivo()?.formaciones[1]).toBeUndefined();
    });

    it('034-E9: crear y borrar avisan y se pueden reintentar por el mismo mecanismo', async () => {
      const repositorio = new RepositorioFake([sistemaBase('r1', 'Uno')]);
      const store = new SistemaStore(repositorio);
      await store.cargar();

      repositorio.fallarProximaVez(new ErrorDeRed('sin conexion'));
      const creado = await store.crear('Dos', 'recepcion', ['masculino']);

      expect(creado).toBe(false);
      expect(store.errorGuardado()).not.toBeNull();
      expect(store.catalogo().map((s) => s.nombre)).toEqual(['Uno']);

      store.errorGuardado()?.reintentar();
      await flushPromesas();

      expect(store.errorGuardado()).toBeNull();
      expect(
        store
          .catalogo()
          .map((s) => s.nombre)
          .sort(),
      ).toEqual(['Dos', 'Uno']);

      repositorio.fallarProximaVez(new ErrorDeRed('sin conexion'));
      const idNuevo = store.sistemaActivoId()!;
      await store.borrar(idNuevo);

      expect(store.errorGuardado()).not.toBeNull();
      expect(store.catalogo().some((s) => s.id === idNuevo)).toBe(true);
    });
  });
});
