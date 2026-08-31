import { describe, expect, it } from 'vitest';
import type {
  CasoColocador,
  ColocacionDefensa,
  FormacionDefensa,
  PuestoDefensa,
  SituacionDefensa,
} from './modelos';
import { PLANTILLA_GLOBAL } from './plantilla-global';
import { guardarVarianteDefensa } from './sistema-defensa';
import {
  formacionDefensaPorDefecto,
  sistemaDefensaPorDefecto,
} from './sistema-defensa-por-defecto';
import { DISTANCIA_MINIMA_ENTRE_JUGADORES } from './separacion';

const CASOS: readonly CasoColocador[] = ['delantero', 'trasero'];
/** Situaciones con material de referencia (`docs/voley/sistema_defensivo_unificado.md`): el
 * ataque por 1 y la posición inicial nacen vacíos (spec 038, E20). */
const SITUACIONES_CON_MATERIAL: readonly SituacionDefensa[] = ['z4', 'z3', 'z2', 'pipe'];

const SISTEMA = sistemaDefensaPorDefecto(PLANTILLA_GLOBAL);

function formacionDe(caso: CasoColocador, situacion: SituacionDefensa): FormacionDefensa {
  return (
    SISTEMA.defensas?.find((v) => v.caso === caso && v.situacion === situacion)?.formacion ?? []
  );
}

function conPuesto(
  formacion: FormacionDefensa,
  puesto: PuestoDefensa,
): ColocacionDefensa | undefined {
  return formacion.find((c) => c.puesto === puesto);
}

/** Recorre las combinaciones (caso, situación) sembradas con material de referencia. */
function cadaFormacionSembrada(
  comprobar: (
    formacion: FormacionDefensa,
    caso: CasoColocador,
    situacion: SituacionDefensa,
    etiqueta: string,
  ) => void,
): void {
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
        expect(central.punto.x < 4.5, `${etiqueta} central en el lado del ataque`).toBe(
          ladoIzquierdo,
        );
        expect(banda.punto.x < 4.5, `${etiqueta} banda en el lado del ataque`).toBe(ladoIzquierdo);

        const compartidas = (central.celdas ?? []).filter((celda) =>
          (banda.celdas ?? []).some(
            (otra) => otra.columna === celda.columna && otra.fila === celda.fila,
          ),
        );
        expect(
          compartidas.length,
          `${etiqueta} el doble bloqueo cierra sin costura`,
        ).toBeGreaterThan(0);
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
          expect(
            celda.columna,
            `${etiqueta} puesto ${colocacion.puesto} columna`,
          ).toBeGreaterThanOrEqual(0);
          expect(
            celda.columna,
            `${etiqueta} puesto ${colocacion.puesto} columna`,
          ).toBeLessThanOrEqual(17);
          expect(celda.fila, `${etiqueta} puesto ${colocacion.puesto} fila`).toBeGreaterThanOrEqual(
            0,
          );
          expect(celda.fila, `${etiqueta} puesto ${colocacion.puesto} fila`).toBeLessThanOrEqual(
            17,
          );
        }
      }
    });
  });

  it('030-E11: cada puesto trae explicación propia y cada variante su explicación de conjunto', () => {
    cadaFormacionSembrada((formacion, _caso, _situacion, etiqueta) => {
      for (const colocacion of formacion) {
        expect(
          colocacion.explicacion?.trim(),
          `${etiqueta} puesto ${colocacion.puesto}`,
        ).toBeTruthy();
      }
    });
    for (const caso of CASOS) {
      for (const situacion of SITUACIONES_CON_MATERIAL) {
        if (caso === 'delantero' && situacion === 'z2') continue;
        const variante = SISTEMA.defensas?.find(
          (v) => v.caso === caso && v.situacion === situacion,
        );
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
    const movida = formacion.map((c) =>
      c.puesto === puesto5.puesto ? { ...c, punto: { x: 2.5, y: 7 } } : c,
    );

    const variante = SISTEMA.defensas!.find((v) => v.caso === 'trasero' && v.situacion === 'z4')!;
    const guardado = guardarVarianteDefensa(
      SISTEMA,
      'trasero',
      'z4',
      variante.bloqueadores,
      movida,
    );

    expect(guardado).not.toBeNull();
    const puestoGuardado = guardado!.defensas
      ?.find((v) => v.caso === 'trasero' && v.situacion === 'z4')
      ?.formacion.find((c) => c.puesto === 5);
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

  it('042-E1 (reemplazado por 049-E4/E5/E8/E11): con 0 bloqueadores, formacionDefensaPorDefecto ya no devuelve la defensa de referencia sembrada', () => {
    // Este escenario afirmaba que formacionDefensaPorDefecto(situacion), para toda situación con
    // material, coincidía con la defensa de referencia sembrada. La spec 049 lo sustituye: con 0
    // bloqueadores (su valor por defecto), z4, z3 y z2 muestran la postura base —basculada hacia
    // el ataque en z4/z2 (049-E4, E10), sin bascular en z3 (049-E5)— y pipe también pasa a mostrar
    // siempre la postura base (049-E11), no ya su propia defensa de referencia. El comportamiento
    // vigente por situación queda cubierto por los escenarios E1-E11 de la spec 049; este test se
    // deja aquí, vacío de aserciones propias, como puntero histórico — ver esos escenarios en
    // sistema-defensa-por-defecto.spec.ts para el comportamiento actual.
    expect(
      formacionDefensaPorDefecto('pipe')
        .map((c) => c.puesto)
        .sort(),
    ).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('042-E2: formacionDefensaPorDefecto coloca la postura base en inicial y en z1, tres en la red y tres en zaga, dentro del campo', () => {
    for (const situacion of ['inicial', 'z1'] as const) {
      const postura = formacionDefensaPorDefecto(situacion);
      expect(postura.map((c) => c.puesto).sort(), situacion).toEqual([1, 2, 3, 4, 5, 6]);
      for (const colocacion of postura) {
        expect(
          colocacion.punto.x,
          `${situacion} puesto ${colocacion.puesto} x`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          colocacion.punto.x,
          `${situacion} puesto ${colocacion.puesto} x`,
        ).toBeLessThanOrEqual(9);
        expect(
          colocacion.punto.y,
          `${situacion} puesto ${colocacion.puesto} y`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          colocacion.punto.y,
          `${situacion} puesto ${colocacion.puesto} y`,
        ).toBeLessThanOrEqual(9);
      }
      const enRed = [2, 3, 4].map((puesto) => conPuesto(postura, puesto as PuestoDefensa)!);
      const enZaga = [1, 5, 6].map((puesto) => conPuesto(postura, puesto as PuestoDefensa)!);
      for (const colocacion of enRed) {
        expect(
          colocacion.punto.y,
          `${situacion} puesto ${colocacion.puesto} en la red`,
        ).toBeLessThan(3);
      }
      for (const colocacion of enZaga) {
        expect(
          colocacion.punto.y,
          `${situacion} puesto ${colocacion.puesto} en zaga`,
        ).toBeGreaterThan(3);
      }
    }
  });

  it('039-E13: el sembrado trae doble bloqueo contra bandas y centro, e individual contra la pipe', () => {
    for (const caso of CASOS) {
      for (const situacion of SITUACIONES_CON_MATERIAL) {
        if (caso === 'delantero' && situacion === 'z2') continue;
        const variante = SISTEMA.defensas?.find(
          (v) => v.caso === caso && v.situacion === situacion,
        );
        const esperado = situacion === 'pipe' ? 1 : 2;
        expect(variante?.bloqueadores, `${caso}/${situacion}`).toBe(esperado);
      }
    }
  });

  it('049-E1: ataque por 4 con 1 bloqueador — el CO delantero se pega a la red frente al atacante', () => {
    const formacion = formacionDefensaPorDefecto('z4', 1);
    const co = conPuesto(formacion, 2)!;

    expect(co.punto).toEqual({ x: 8, y: 0.4 });
  });

  it('049-E2: ataque por 4 con 2 bloqueadores — el Ce se suma a la izquierda del CO', () => {
    const formacion = formacionDefensaPorDefecto('z4', 2);
    const co = conPuesto(formacion, 2)!;
    const ce = conPuesto(formacion, 3)!;

    expect(co.punto).toEqual({ x: 8, y: 0.4 });
    expect(ce.punto).toEqual({ x: 7.1, y: 0.4 });
  });

  it('049-E3: ataque por 4 con 3 bloqueadores — el R se suma a la izquierda del Ce', () => {
    const formacion = formacionDefensaPorDefecto('z4', 3);
    const co = conPuesto(formacion, 2)!;
    const ce = conPuesto(formacion, 3)!;
    const r = conPuesto(formacion, 4)!;

    expect(co.punto).toEqual({ x: 8, y: 0.4 });
    expect(ce.punto).toEqual({ x: 7.1, y: 0.4 });
    expect(r.punto).toEqual({ x: 6.2, y: 0.4 });
  });

  it('049-E4: ataque por 4 con 0 bloqueadores — postura base basculada, nadie en la red', () => {
    const postura = formacionDefensaPorDefecto('inicial', 0);
    const formacion = formacionDefensaPorDefecto('z4', 0);

    for (const puesto of [1, 2, 3, 4, 5, 6] as const) {
      const colocacion = conPuesto(formacion, puesto)!;
      const base = conPuesto(postura, puesto)!;
      expect(colocacion.punto, `puesto ${puesto}`).toEqual({
        x: base.punto.x + 1,
        y: base.punto.y,
      });
    }
  });

  it('049-E5: ataque por 3 con 1 bloqueador — el Ce se pega a la red frente al atacante, sin basculación', () => {
    const postura = formacionDefensaPorDefecto('inicial', 0);
    const formacion = formacionDefensaPorDefecto('z3', 1);
    const ce = conPuesto(formacion, 3)!;

    expect(ce.punto).toEqual({ x: 4.5, y: 0.4 });
    for (const puesto of [1, 2, 4, 5, 6] as const) {
      const colocacion = conPuesto(formacion, puesto)!;
      const base = conPuesto(postura, puesto)!;
      expect(colocacion.punto, `puesto ${puesto}`).toEqual(base.punto);
    }
  });

  it('049-E6: ataque por 3 con 2 bloqueadores — el CO se suma a la derecha del Ce', () => {
    const formacion = formacionDefensaPorDefecto('z3', 2);
    const ce = conPuesto(formacion, 3)!;
    const co = conPuesto(formacion, 2)!;

    expect(ce.punto).toEqual({ x: 4.5, y: 0.4 });
    expect(co.punto).toEqual({ x: 5.4, y: 0.4 });
  });

  it('049-E7: ataque por 3 con 3 bloqueadores — el R se suma a la izquierda del Ce', () => {
    const formacion = formacionDefensaPorDefecto('z3', 3);
    const ce = conPuesto(formacion, 3)!;
    const co = conPuesto(formacion, 2)!;
    const r = conPuesto(formacion, 4)!;

    expect(ce.punto).toEqual({ x: 4.5, y: 0.4 });
    expect(co.punto).toEqual({ x: 5.4, y: 0.4 });
    expect(r.punto).toEqual({ x: 3.6, y: 0.4 });
  });

  it('049-E8: ataque por 2 con 1 bloqueador — el R delantero se pega a la red frente al atacante', () => {
    const postura = formacionDefensaPorDefecto('inicial', 0);
    const formacion = formacionDefensaPorDefecto('z2', 1);
    const r = conPuesto(formacion, 4)!;

    expect(r.punto).toEqual({ x: 1, y: 0.4 });
    for (const puesto of [1, 2, 3, 5, 6] as const) {
      const colocacion = conPuesto(formacion, puesto)!;
      const base = conPuesto(postura, puesto)!;
      expect(colocacion.punto, `puesto ${puesto}`).toEqual({
        x: base.punto.x - 1,
        y: base.punto.y,
      });
    }
  });

  it('049-E9: ataque por 2 con 2 bloqueadores — el Ce se suma a la derecha del R', () => {
    const formacion = formacionDefensaPorDefecto('z2', 2);
    const r = conPuesto(formacion, 4)!;
    const ce = conPuesto(formacion, 3)!;

    expect(r.punto).toEqual({ x: 1, y: 0.4 });
    expect(ce.punto).toEqual({ x: 1.9, y: 0.4 });
  });

  it('049-E10: ataque por 2 con 3 bloqueadores — el CO se suma a la derecha del Ce', () => {
    const formacion = formacionDefensaPorDefecto('z2', 3);
    const r = conPuesto(formacion, 4)!;
    const ce = conPuesto(formacion, 3)!;
    const co = conPuesto(formacion, 2)!;

    expect(r.punto).toEqual({ x: 1, y: 0.4 });
    expect(ce.punto).toEqual({ x: 1.9, y: 0.4 });
    expect(co.punto).toEqual({ x: 2.8, y: 0.4 });
  });

  it('049-E14: el sistema sembrado de demostración no cambia — sigue con el material de referencia de la spec 030', () => {
    // z4 con 2 bloqueadores es justo el caso que 049-E2 recalcula por defecto; el sembrado, al
    // estar ya guardado, debe seguir mostrando el material de referencia original, no el defecto.
    const co = conPuesto(formacionDe('trasero', 'z4'), 2)!;
    const ce = conPuesto(formacionDe('trasero', 'z4'), 3)!;
    expect(co.punto).toEqual({ x: 7.6, y: 0.4 });
    expect(ce.punto).toEqual({ x: 6.1, y: 0.4 });
  });

  it('049-E11: pipe, ataque por 1 y postura inicial — siempre la postura base, con cualquier número de bloqueadores', () => {
    const postura = formacionDefensaPorDefecto('inicial', 0);
    for (const situacion of ['pipe', 'z1', 'inicial'] as const) {
      for (const bloqueadores of [0, 1, 2, 3] as const) {
        if (situacion === 'inicial' && bloqueadores !== 0) continue; // spec 039-E4
        const formacion = formacionDefensaPorDefecto(situacion, bloqueadores);
        for (const puesto of [1, 2, 3, 4, 5, 6] as const) {
          const colocacion = conPuesto(formacion, puesto)!;
          const base = conPuesto(postura, puesto)!;
          expect(colocacion.punto, `${situacion}/${bloqueadores} puesto ${puesto}`).toEqual(
            base.punto,
          );
        }
      }
    }
  });

  it('049-E15: el defecto nunca junta a dos puestos por debajo de la distancia mínima', () => {
    for (const situacion of ['z4', 'z3', 'z2', 'pipe', 'z1', 'inicial'] as const) {
      for (const bloqueadores of [0, 1, 2, 3] as const) {
        if (situacion === 'inicial' && bloqueadores !== 0) continue; // spec 039-E4
        const formacion = formacionDefensaPorDefecto(situacion, bloqueadores);
        for (let i = 0; i < formacion.length; i++) {
          for (let j = i + 1; j < formacion.length; j++) {
            const a = formacion[i].punto;
            const b = formacion[j].punto;
            const distancia = Math.hypot(a.x - b.x, a.y - b.y);
            expect(
              distancia,
              `${situacion}/${bloqueadores} puestos ${formacion[i].puesto}-${formacion[j].puesto}`,
            ).toBeGreaterThanOrEqual(DISTANCIA_MINIMA_ENTRE_JUGADORES - 1e-9);
          }
        }
      }
    }
  });
});
