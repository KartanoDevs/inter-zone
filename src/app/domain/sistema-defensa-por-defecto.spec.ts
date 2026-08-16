import { describe, expect, it } from 'vitest';
import type { Colocacion, Formacion, RolId, ViaAtaque } from './modelos';
import { PLANTILLA_GLOBAL } from './plantilla-global';
import { jugadoresEnPista } from './rotacion';
import { guardarFormacionDefensa } from './sistema-defensa';
import { sistemaDefensaPorDefecto } from './sistema-defensa-por-defecto';

const ROTACIONES = [1, 2, 3, 4, 5, 6] as const;
const VIAS: readonly ViaAtaque[] = ['z4', 'z3', 'z2', 'pipe'];

const SISTEMA = sistemaDefensaPorDefecto(PLANTILLA_GLOBAL);

function formacionDe(rotacion: (typeof ROTACIONES)[number], via: ViaAtaque): Formacion {
  return SISTEMA.defensas?.[rotacion]?.[via] ?? [];
}

/** Recorre las 24 formaciones (6 rotaciones × 4 vías) con una etiqueta legible para el fallo. */
function cadaFormacion(comprobar: (formacion: Formacion, etiqueta: string) => void): void {
  for (const rotacion of ROTACIONES) {
    for (const via of VIAS) {
      comprobar(formacionDe(rotacion, via), `R${rotacion}/${via}`);
    }
  }
}

function conRol(formacion: Formacion, rol: RolId): Colocacion | undefined {
  return formacion.find((c) => c.jugador.rol === rol);
}

/** Ids de quienes ocupan P1, P5 y P6 en una rotación: los tres que juegan de zagueros. */
function idsEnZaga(rotacion: (typeof ROTACIONES)[number]): ReadonlySet<string> {
  const enPista = jugadoresEnPista(PLANTILLA_GLOBAL, rotacion);
  return new Set([enPista[0].id, enPista[4].id, enPista[5].id]);
}

/** El jugador de un rol que está en zaga (o en delantera, con `zaguero: false`) en esa rotación:
 * así se distingue al receptor que defiende la 6 del que se queda en la red. */
function conRolEnLinea(
  formacion: Formacion,
  roles: readonly RolId[],
  rotacion: (typeof ROTACIONES)[number],
  zaguero: boolean,
): Colocacion | undefined {
  const zaga = idsEnZaga(rotacion);
  return formacion.find((c) => roles.includes(c.jugador.rol) && zaga.has(c.jugador.id) === zaguero);
}

/** Recorre las 24 formaciones dando también la rotación, para poder distinguir línea delantera
 * de zaguera. */
function cadaFormacionConRotacion(
  comprobar: (formacion: Formacion, rotacion: (typeof ROTACIONES)[number], via: ViaAtaque, etiqueta: string) => void,
): void {
  for (const rotacion of ROTACIONES) {
    for (const via of VIAS) {
      comprobar(formacionDe(rotacion, via), rotacion, via, `R${rotacion}/${via}`);
    }
  }
}

const COLOCADOR_U_OPUESTO: readonly RolId[] = ['colocador', 'opuesto'];

describe('sistemaDefensaPorDefecto', () => {
  it('030-E1: en las seis rotaciones la zaga es líbero, un receptor y colocador u opuesto', () => {
    for (const rotacion of ROTACIONES) {
      const enPista = jugadoresEnPista(PLANTILLA_GLOBAL, rotacion);
      const zaga = [enPista[0], enPista[4], enPista[5]]; // P1, P5, P6
      const roles = zaga.map((j) => j.rol);

      expect(roles.filter((rol) => rol === 'libero'), `R${rotacion}`).toHaveLength(1);
      expect(roles.filter((rol) => rol === 'receptor'), `R${rotacion}`).toHaveLength(1);
      expect(roles.filter((rol) => rol === 'colocador' || rol === 'opuesto'), `R${rotacion}`).toHaveLength(1);
    }
  });

  it('030-E2: el líbero defiende la zona 5 en las seis rotaciones y las cuatro vías', () => {
    cadaFormacion((formacion, etiqueta) => {
      const libero = conRol(formacion, 'libero');
      expect(libero, etiqueta).toBeDefined();
      expect(libero!.punto.x, `${etiqueta} x`).toBeLessThan(3);
      expect(libero!.punto.y, `${etiqueta} y`).toBeGreaterThan(3);
    });
  });

  it('030-E3: el receptor zaguero defiende la zona 6', () => {
    cadaFormacionConRotacion((formacion, rotacion, _via, etiqueta) => {
      const receptor = conRolEnLinea(formacion, ['receptor'], rotacion, true);
      expect(receptor, etiqueta).toBeDefined();
      expect(receptor!.punto.x, `${etiqueta} x`).toBeGreaterThanOrEqual(3);
      expect(receptor!.punto.x, `${etiqueta} x`).toBeLessThan(6);
      expect(receptor!.punto.y, `${etiqueta} y`).toBeGreaterThan(6);
    });
  });

  it('030-E4: el colocador o el opuesto, el que esté en zaga, defiende la zona 1', () => {
    cadaFormacionConRotacion((formacion, rotacion, _via, etiqueta) => {
      const zaguero = conRolEnLinea(formacion, COLOCADOR_U_OPUESTO, rotacion, true);
      expect(zaguero, etiqueta).toBeDefined();
      expect(zaguero!.punto.x, `${etiqueta} x`).toBeGreaterThanOrEqual(6);
      expect(zaguero!.punto.y, `${etiqueta} y`).toBeGreaterThan(3);
    });
  });

  it('030-E5: el central delantero está siempre junto a la red', () => {
    cadaFormacion((formacion, etiqueta) => {
      const central = conRol(formacion, 'central');
      expect(central, etiqueta).toBeDefined();
      expect(central!.punto.y, `${etiqueta} y`).toBeLessThan(1);
    });
    // Solo contra el centro y la pipe se queda en el tercio central: contra los extremos se
    // desplaza al lado del ataque para cerrar el doble bloqueo.
    for (const via of ['z3', 'pipe'] as const) {
      const central = conRol(formacionDe(1, via), 'central')!;
      expect(central.punto.x, via).toBeGreaterThanOrEqual(3);
      expect(central.punto.x, via).toBeLessThan(6);
    }
  });

  it('030-E6: contra los extremos, el central cierra el doble bloqueo con el jugador de banda', () => {
    // Contra un ataque por zona 2 rival (nuestra izquierda) bloquea la banda de zona 4, que es
    // el receptor delantero; contra zona 4 rival, la de zona 2, que es el colocador u opuesto.
    const bandaPorVia = { z2: ['receptor'] as const, z4: COLOCADOR_U_OPUESTO };

    for (const rotacion of ROTACIONES) {
      for (const via of ['z2', 'z4'] as const) {
        const formacion = formacionDe(rotacion, via);
        const central = conRol(formacion, 'central')!;
        const banda = conRolEnLinea(formacion, bandaPorVia[via], rotacion, false)!;
        const etiqueta = `R${rotacion}/${via}`;

        expect(central.punto.y, `${etiqueta} central en la red`).toBeLessThan(1);
        expect(banda.punto.y, `${etiqueta} banda en la red`).toBeLessThan(1);
        // Los dos, en el lado por donde viene el ataque.
        const ladoIzquierdo = via === 'z2';
        expect(central.punto.x < 4.5, `${etiqueta} central en el lado del ataque`).toBe(ladoIzquierdo);
        expect(banda.punto.x < 4.5, `${etiqueta} banda en el lado del ataque`).toBe(ladoIzquierdo);

        const compartidas = (central.celdas ?? []).filter((celda) =>
          (banda.celdas ?? []).some((otra) => otra.columna === celda.columna && otra.fila === celda.fila),
        );
        expect(compartidas.length, `${etiqueta} el doble bloqueo cierra sin costura`).toBeGreaterThan(0);
      }
    }
  });

  it('030-E7: contra la pipe solo bloquea el central, y las dos bandas se descuelgan a 3 metros', () => {
    for (const rotacion of ROTACIONES) {
      const formacion = formacionDe(rotacion, 'pipe');
      const central = conRol(formacion, 'central')!;
      const banda4 = conRolEnLinea(formacion, ['receptor'], rotacion, false)!;
      const banda2 = conRolEnLinea(formacion, COLOCADOR_U_OPUESTO, rotacion, false)!;

      expect(central.punto.y, `R${rotacion} central`).toBeLessThan(1);
      expect(banda4.punto.y, `R${rotacion} banda izquierda`).toBeGreaterThan(2.5);
      expect(banda4.punto.y, `R${rotacion} banda izquierda`).toBeLessThan(3.5);
      expect(banda2.punto.y, `R${rotacion} banda derecha`).toBeGreaterThan(2.5);
      expect(banda2.punto.y, `R${rotacion} banda derecha`).toBeLessThan(3.5);
    }
  });

  it('030-E8: las cuatro vías tienen formación en las seis rotaciones, con los seis en pista', () => {
    for (const rotacion of ROTACIONES) {
      expect(Object.keys(SISTEMA.defensas?.[rotacion] ?? {}).sort(), `R${rotacion}`).toEqual(['pipe', 'z2', 'z3', 'z4']);
      const esperado = jugadoresEnPista(PLANTILLA_GLOBAL, rotacion)
        .map((j) => j.id)
        .sort();
      for (const via of VIAS) {
        const ids = formacionDe(rotacion, via)
          .map((c) => c.jugador.id)
          .sort();
        expect(ids, `R${rotacion}/${via}`).toEqual(esperado);
      }
    }
  });

  it('030-E10: cada jugador de cada formación trae zona de responsabilidad, dentro del campo', () => {
    cadaFormacion((formacion, etiqueta) => {
      for (const colocacion of formacion) {
        const celdas = colocacion.celdas ?? [];
        expect(celdas.length, `${etiqueta} ${colocacion.jugador.id}`).toBeGreaterThan(0);
        for (const celda of celdas) {
          expect(celda.columna, `${etiqueta} ${colocacion.jugador.id} columna`).toBeGreaterThanOrEqual(0);
          expect(celda.columna, `${etiqueta} ${colocacion.jugador.id} columna`).toBeLessThanOrEqual(17);
          expect(celda.fila, `${etiqueta} ${colocacion.jugador.id} fila`).toBeGreaterThanOrEqual(0);
          expect(celda.fila, `${etiqueta} ${colocacion.jugador.id} fila`).toBeLessThanOrEqual(17);
        }
      }
    });
  });

  it('030-E11: cada jugador trae explicación propia y cada rotación su explicación de conjunto', () => {
    cadaFormacion((formacion, etiqueta) => {
      for (const colocacion of formacion) {
        expect(colocacion.explicacion?.trim(), `${etiqueta} ${colocacion.jugador.id}`).toBeTruthy();
      }
    });
    for (const rotacion of ROTACIONES) {
      expect(SISTEMA.explicacionesRotacion[rotacion]?.trim(), `R${rotacion}`).toBeTruthy();
    }
  });

  it('030-E12: el sistema trae descripción general', () => {
    expect(SISTEMA.descripcion?.trim()).toBeTruthy();
  });

  it('030-E14: es un sistema corriente, se puede editar y volver a guardar', () => {
    const formacion = formacionDe(1, 'z4');
    const libero = conRol(formacion, 'libero')!;
    const movida = formacion.map((c) => (c.jugador.id === libero.jugador.id ? { ...c, punto: { x: 2.5, y: 7 } } : c));

    const guardado = guardarFormacionDefensa(SISTEMA, 1, 'z4', movida);

    expect(guardado).not.toBeNull();
    expect(guardado!.defensas?.[1]?.z4?.find((c) => c.jugador.id === libero.jugador.id)?.punto).toEqual({ x: 2.5, y: 7 });
  });

  it('030-E9: las formaciones contra zona 2 y contra zona 4 son simétricas', () => {
    for (const rotacion of ROTACIONES) {
      const reflejados = formacionDe(rotacion, 'z2')
        .map((c) => `${(9 - c.punto.x).toFixed(2)},${c.punto.y.toFixed(2)}`)
        .sort();
      const enZ4 = formacionDe(rotacion, 'z4')
        .map((c) => `${c.punto.x.toFixed(2)},${c.punto.y.toFixed(2)}`)
        .sort();

      expect(reflejados, `R${rotacion}`).toEqual(enZ4);

      // Las zonas de responsabilidad se reflejan igual: la columna c pasa a ser la 17 - c.
      const celdasReflejadas = formacionDe(rotacion, 'z2')
        .map((c) =>
          (c.celdas ?? [])
            .map((celda) => `${17 - celda.columna},${celda.fila}`)
            .sort()
            .join(' '),
        )
        .sort();
      const celdasEnZ4 = formacionDe(rotacion, 'z4')
        .map((c) =>
          (c.celdas ?? [])
            .map((celda) => `${celda.columna},${celda.fila}`)
            .sort()
            .join(' '),
        )
        .sort();

      expect(celdasReflejadas, `R${rotacion} zonas`).toEqual(celdasEnZ4);
    }
  });
});
