import type { CasoColocador, FormacionDefensa, NumeroBloqueadores, PuestoDefensa, SituacionDefensa, Sistema } from './modelos';

const PUESTOS = [1, 2, 3, 4, 5, 6] as const;

function losSeisPuestos(formacion: FormacionDefensa): boolean {
  const puestos = formacion.map((c) => c.puesto).sort();
  return puestos.length === 6 && PUESTOS.every((puesto, indice) => puestos[indice] === puesto);
}

/** Guarda una variante de defensa para un caso, una situación y un número de bloqueadores
 * (spec 038, ampliado por la 039). A diferencia de `guardarFormacion`, nunca valida posición:
 * en defensa la validación no existe. Rechaza formaciones que no cubran exactamente los seis
 * puestos, sin repetir ninguno. */
export function guardarVarianteDefensa(
  sistema: Sistema,
  caso: CasoColocador,
  situacion: SituacionDefensa,
  bloqueadores: NumeroBloqueadores,
  formacion: FormacionDefensa,
): Sistema | null {
  if (!losSeisPuestos(formacion)) {
    return null;
  }
  const otras = (sistema.defensas ?? []).filter(
    (v) => !(v.caso === caso && v.situacion === situacion && v.bloqueadores === bloqueadores),
  );
  const defensas = [...otras, { caso, situacion, bloqueadores, formacion }];
  return { ...sistema, defensas };
}

/** Explicación de conjunto de una variante de defensa (spec 038, E18): va ligada a
 * (caso, situación, bloqueadores), nunca a una rotación. Texto en blanco la borra, igual que
 * `explicarRotacion` en recepción. */
export function explicarVariante(
  sistema: Sistema,
  caso: CasoColocador,
  situacion: SituacionDefensa,
  bloqueadores: NumeroBloqueadores,
  texto: string,
): Sistema {
  const explicacion = texto.trim().length === 0 ? undefined : texto;
  const defensas = (sistema.defensas ?? []).map((v) =>
    v.caso === caso && v.situacion === situacion && v.bloqueadores === bloqueadores ? { ...v, explicacion } : v,
  );
  return { ...sistema, defensas };
}

/** Explicación de un puesto concreto dentro de una variante de defensa (spec 038, E18). `null`
 * si esa variante no existe o no coloca ese puesto. */
export function explicarPuesto(
  sistema: Sistema,
  caso: CasoColocador,
  situacion: SituacionDefensa,
  bloqueadores: NumeroBloqueadores,
  puesto: PuestoDefensa,
  texto: string,
): Sistema | null {
  const variante = sistema.defensas?.find((v) => v.caso === caso && v.situacion === situacion && v.bloqueadores === bloqueadores);
  if (!variante?.formacion.some((c) => c.puesto === puesto)) {
    return null;
  }
  const explicacion = texto.trim().length === 0 ? undefined : texto;
  const nuevaFormacion = variante.formacion.map((c) => (c.puesto === puesto ? { ...c, explicacion } : c));
  const defensas = sistema.defensas!.map((v) =>
    v.caso === caso && v.situacion === situacion && v.bloqueadores === bloqueadores ? { ...v, formacion: nuevaFormacion } : v,
  );
  return { ...sistema, defensas };
}
