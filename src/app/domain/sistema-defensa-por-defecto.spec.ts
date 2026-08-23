import { describe, expect, it } from 'vitest';
import type { CasoColocador, ColocacionDefensa, FormacionDefensa, PuestoDefensa, SituacionDefensa } from './modelos';
import { PLANTILLA_GLOBAL } from './plantilla-global';
import { guardarVarianteDefensa } from './sistema-defensa';
import { sistemaDefensaPorDefecto } from './sistema-defensa-por-defecto';

const CASOS: readonly CasoColocador[] = ['delantero', 'trasero'];
/** Situaciones con material de referencia (`docs/voley/sistema_defensivo_unificado.md`): el
 * ataque por 1 y la posición inicial nacen vacíos (spec 038, E20). */
const SITUACIONES_CON_MATERIAL: readonly SituacionDefensa[] = ['z4', 'z3', 'z2', 'pipe'];

const SISTEMA = sistemaDefensaPorDefecto(PLANTILLA_GLOBAL);

function formacionDe(caso: CasoColocador, situacion: SituacionDefensa): FormacionDefensa {
  return SISTEMA.defensas?.find((v) => v.caso === caso && v.situacion === situacion)?.formacion ?? [];
}

function conPuesto(formacion: FormacionDefensa, puesto: PuestoDefensa): ColocacionDefensa | undefined {
  return formacion.find((c) => c.puesto === puesto);
}

/** Recorre las combinaciones (caso, situación) sembradas con material de referencia. */
function cadaFormacionSembrada(comprobar: (formacion: FormacionDefensa, caso: CasoColocador, situacion: SituacionDefensa, etiqueta: string) => void): void {
  for (const caso of CASOS) {
    for (const situacion of SITUACIONES_CON_MATERIAL) {
      // z2 solo existe para el caso trasero (spec 038, E4).
      if (caso === 'delantero' && situacion === 'z2') continue;
      comprobar(formacionDe(caso, situacion), caso, situacion, `${caso}/${situacion}`);
    }
  }
}

describe('sistemaDefensaPorDefecto', () => {
  it('030-E1: cada formación sembrada coloca a los seis puestos, sin repetir ninguno', () => {
    cadaFormacionSembrada((formacion, _caso, _situacion, etiqueta) => {
      const puestos = formacion.map((c) => c.puesto).sort();
      expect(puestos, etiqueta).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  it('030-E2: el puesto 5 (líbero) está siempre en la esquina de zaga izquierda', () => {
    cadaFormacionSembrada((formacion, _caso, _situacion, etiqueta) => {
      const puesto5 = conPuesto(formacion, 5);
      expect(puesto5, etiqueta).toBeDefined();
      expect(puesto5!.punto.x, `${etiqueta} x`).toBeLessThan(3);
      expect(puesto5!.punto.y, `${etiqueta} y`).toBeGreaterThan(3);
    });
  });

  it('030-E3: el puesto 6 (receptor zaguero) está siempre en el centro-fondo', () => {
    cadaFormacionSembrada((formacion, _caso, _situacion, etiqueta) => {
      const puesto6 = conPuesto(formacion, 6);
      expect(puesto6, etiqueta).toBeDefined();
      expect(puesto6!.punto.x, `${etiqueta} x`).toBeGreaterThanOrEqual(3);
      expect(puesto6!.punto.x, `${etiqueta} x`).toBeLessThan(6);
      expect(puesto6!.punto.y, `${etiqueta} y`).toBeGreaterThan(6);
    });
  });

  it('030-E4: el puesto 1 (colocador u opuesto en zaga) está siempre en la esquina de zaga derecha', () => {
    cadaFormacionSembrada((formacion, _caso, _situacion, etiqueta) => {
      const puesto1 = conPuesto(formacion, 1);
      expect(puesto1, etiqueta).toBeDefined();
      expect(puesto1!.punto.x, `${etiqueta} x`).toBeGreaterThanOrEqual(6);
      expect(puesto1!.punto.y, `${etiqueta} y`).toBeGreaterThan(3);
    });
  });

  it('030-E5: el puesto 3 (central) está siempre junto a la red', () => {
    cadaFormacionSembrada((formacion, _caso, _situacion, etiqueta) => {
      const puesto3 = conPuesto(formacion, 3);
      expect(puesto3, etiqueta).toBeDefined();
      expect(puesto3!.punto.y, `${etiqueta} y`).toBeLessThan(1);
    });
    // Solo contra el centro y la pipe se queda en el tercio central: contra los extremos se
    // desplaza al lado del ataque para cerrar el doble bloqueo.
    for (const situacion of ['z3', 'pipe'] as const) {
      const puesto3 = conPuesto(formacionDe('trasero', situacion), 3)!;
      expect(puesto3.punto.x, situacion).toBeGreaterThanOrEqual(3);
      expect(puesto3.punto.x, situacion).toBeLessThan(6);
    }
  });

  it('030-E6: contra los extremos, el puesto 3 cierra el doble bloqueo con el puesto de banda', () => {
    // Contra un ataque por zona 2 rival (nuestra izquierda) bloquea la banda 4; contra zona 4
    // rival, la banda 2.
    const bandaPorSituacion: Readonly<Record<'z2' | 'z4', PuestoDefensa>> = { z2: 4, z4: 2 };

    for (const caso of CASOS) {
      for (const situacion of ['z2', 'z4'] as const) {
        if (caso === 'delantero' && situacion === 'z2') continue; // no existe para este caso
        const formacion = formacionDe(caso, situacion);
        const central = conPuesto(formacion, 3)!;
        const banda = conPuesto(formacion, bandaPorSituacion[situacion])!;
        const etiqueta = `${caso}/${situacion}`;

        expect(central.punto.y, `${etiqueta} central en la red`).toBeLessThan(1);
        expect(banda.punto.y, `${etiqueta} banda en la red`).toBeLessThan(1);
        const ladoIzquierdo = situacion === 'z2';
        expect(central.punto.x < 4.5, `${etiqueta} central en el lado del ataque`).toBe(ladoIzquierdo);
        expect(banda.punto.x < 4.5, `${etiqueta} banda en el lado del ataque`).toBe(ladoIzquierdo);

        const compartidas = (central.celdas ?? []).filter((celda) =>
          (banda.celdas ?? []).some((otra) => otra.columna === celda.columna && otra.fila === celda.fila),
        );
        expect(compartidas.length, `${etiqueta} el doble bloqueo cierra sin costura`).toBeGreaterThan(0);
      }
    }
  });

  it('030-E7: contra la pipe solo bloquea el puesto 3, y las bandas 2 y 4 se descuelgan a 3 metros', () => {
    for (const caso of CASOS) {
      const formacion = formacionDe(caso, 'pipe');
      const central = conPuesto(formacion, 3)!;
      const banda4 = conPuesto(formacion, 4)!;
      const banda2 = conPuesto(formacion, 2)!;

      expect(central.punto.y, `${caso} central`).toBeLessThan(1);
      expect(banda4.punto.y, `${caso} banda 4`).toBeGreaterThan(2.5);
      expect(banda4.punto.y, `${caso} banda 4`).toBeLessThan(3.5);
      expect(banda2.punto.y, `${caso} banda 2`).toBeGreaterThan(2.5);
      expect(banda2.punto.y, `${caso} banda 2`).toBeLessThan(3.5);
    }
  });

  it('030-E8: cada caso trae formación en las situaciones con material de referencia, con los seis puestos', () => {
    for (const caso of CASOS) {
      for (const situacion of SITUACIONES_CON_MATERIAL) {
        if (caso === 'delantero' && situacion === 'z2') continue;
        const puestos = formacionDe(caso, situacion)
          .map((c) => c.puesto)
          .sort();
        expect(puestos, `${caso}/${situacion}`).toEqual([1, 2, 3, 4, 5, 6]);
      }
    }
  });

  it('030-E10: cada puesto de cada formación sembrada trae zona de responsabilidad, dentro del campo', () => {
    cadaFormacionSembrada((formacion, _caso, _situacion, etiqueta) => {
      for (const colocacion of formacion) {
        const celdas = colocacion.celdas ?? [];
        expect(celdas.length, `${etiqueta} puesto ${colocacion.puesto}`).toBeGreaterThan(0);
        for (const celda of celdas) {
          expect(celda.columna, `${etiqueta} puesto ${colocacion.puesto} columna`).toBeGreaterThanOrEqual(0);
          expect(celda.columna, `${etiqueta} puesto ${colocacion.puesto} columna`).toBeLessThanOrEqual(17);
          expect(celda.fila, `${etiqueta} puesto ${colocacion.puesto} fila`).toBeGreaterThanOrEqual(0);
          expect(celda.fila, `${etiqueta} puesto ${colocacion.puesto} fila`).toBeLessThanOrEqual(17);
        }
      }
    });
  });

  it('030-E11: cada puesto trae explicación propia y cada variante su explicación de conjunto', () => {
    cadaFormacionSembrada((formacion, _caso, _situacion, etiqueta) => {
      for (const colocacion of formacion) {
        expect(colocacion.explicacion?.trim(), `${etiqueta} puesto ${colocacion.puesto}`).toBeTruthy();
      }
    });
    for (const caso of CASOS) {
      for (const situacion of SITUACIONES_CON_MATERIAL) {
        if (caso === 'delantero' && situacion === 'z2') continue;
        const variante = SISTEMA.defensas?.find((v) => v.caso === caso && v.situacion === situacion);
        expect(variante?.explicacion?.trim(), `${caso}/${situacion}`).toBeTruthy();
      }
    }
  });

  it('030-E12: el sistema trae descripción general', () => {
    expect(SISTEMA.descripcion?.trim()).toBeTruthy();
  });

  it('030-E14: es un sistema corriente, se puede editar y volver a guardar', () => {
    const formacion = formacionDe('trasero', 'z4');
    const puesto5 = conPuesto(formacion, 5)!;
    const movida = formacion.map((c) => (c.puesto === puesto5.puesto ? { ...c, punto: { x: 2.5, y: 7 } } : c));

    const variante = SISTEMA.defensas!.find((v) => v.caso === 'trasero' && v.situacion === 'z4')!;
    const guardado = guardarVarianteDefensa(SISTEMA, 'trasero', 'z4', variante.bloqueadores, movida);

    expect(guardado).not.toBeNull();
    const puestoGuardado = guardado!.defensas?.find((v) => v.caso === 'trasero' && v.situacion === 'z4')?.formacion.find((c) => c.puesto === 5);
    expect(puestoGuardado?.punto).toEqual({ x: 2.5, y: 7 });
  });

  it('030-E9: las formaciones contra zona 2 y contra zona 4 son simétricas (caso trasero)', () => {
    const reflejados = formacionDe('trasero', 'z2')
      .map((c) => `${(9 - c.punto.x).toFixed(2)},${c.punto.y.toFixed(2)}`)
      .sort();
    const enZ4 = formacionDe('trasero', 'z4')
      .map((c) => `${c.punto.x.toFixed(2)},${c.punto.y.toFixed(2)}`)
      .sort();

    expect(reflejados).toEqual(enZ4);

    // Las zonas de responsabilidad se reflejan igual: la columna c pasa a ser la 17 - c.
    const celdasReflejadas = formacionDe('trasero', 'z2')
      .map((c) =>
        (c.celdas ?? [])
          .map((celda) => `${17 - celda.columna},${celda.fila}`)
          .sort()
          .join(' '),
      )
      .sort();
    const celdasEnZ4 = formacionDe('trasero', 'z4')
      .map((c) =>
        (c.celdas ?? [])
          .map((celda) => `${celda.columna},${celda.fila}`)
          .sort()
          .join(' '),
      )
      .sort();

    expect(celdasReflejadas).toEqual(celdasEnZ4);
  });

  it('039-E13: el sembrado trae doble bloqueo contra bandas y centro, e individual contra la pipe', () => {
    for (const caso of CASOS) {
      for (const situacion of SITUACIONES_CON_MATERIAL) {
        if (caso === 'delantero' && situacion === 'z2') continue;
        const variante = SISTEMA.defensas?.find((v) => v.caso === caso && v.situacion === situacion);
        const esperado = situacion === 'pipe' ? 1 : 2;
        expect(variante?.bloqueadores, `${caso}/${situacion}`).toBe(esperado);
      }
    }
  });
});
