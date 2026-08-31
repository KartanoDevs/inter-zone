import type {
  CasoColocador,
  ColocacionDefensa,
  FormacionDefensa,
  NumeroBloqueadores,
  Punto,
  PuestoDefensa,
  SituacionDefensa,
  Sistema,
} from './modelos';

const PUESTOS = [1, 2, 3, 4, 5, 6] as const;
const PUESTOS_DELANTEROS: readonly PuestoDefensa[] = [2, 3, 4];
/** Un puesto delantero deja de contar como posible bloqueador más allá de la línea de 3 metros
 * (spec 039, E10): descolgarse a por una finta lo saca del bloqueo sin tocar el número
 * declarado. */
const LIMITE_LINEA_TRES_METROS = 3;

function losSeisPuestos(formacion: FormacionDefensa): boolean {
  const puestos = formacion.map((c) => c.puesto).sort();
  return puestos.length === 6 && PUESTOS.every((puesto, indice) => puestos[indice] === puesto);
}

/** Guarda una variante de defensa para un caso, una situación y un número de bloqueadores
 * (spec 038, ampliado por la 039). A diferencia de `guardarFormacion`, nunca valida posición:
 * en defensa la validación no existe. Rechaza formaciones que no cubran exactamente los seis
 * puestos, sin repetir ninguno, y rechaza declarar bloqueadores en la postura inicial (spec 039,
 * E5): esa situación no tiene ataque marcado, así que tampoco tiene sentido un bloqueo. */
export function guardarVarianteDefensa(
  sistema: Sistema,
  caso: CasoColocador,
  situacion: SituacionDefensa,
  bloqueadores: NumeroBloqueadores,
  formacion: FormacionDefensa,
  desplazamientoSombra?: Punto,
): Sistema | null {
  if (situacion === 'inicial' && bloqueadores !== 0) {
    return null;
  }
  if (!losSeisPuestos(formacion)) {
    return null;
  }
  const otras = (sistema.defensas ?? []).filter(
    (v) => !(v.caso === caso && v.situacion === situacion && v.bloqueadores === bloqueadores),
  );
  const defensas = [
    ...otras,
    {
      caso,
      situacion,
      bloqueadores,
      formacion,
      ...(desplazamientoSombra ? { desplazamientoSombra } : {}),
    },
  ];
  return { ...sistema, defensas };
}

/** Quién bloquea en una formación, derivado de la posición de los puestos delanteros (spec 039,
 * E9-E11): los `n` más cercanos a la red (menor `y`), sin llegar nunca a más puestos delanteros
 * de los que estén colocados en el campo. Un puesto que se ha descolgado a la línea de 3 metros
 * o más allá deja de contar (E10) — la cercanía a la red decide, no una etiqueta fija. */
export function puestosQueBloquean(
  formacion: FormacionDefensa,
  bloqueadores: NumeroBloqueadores,
): readonly PuestoDefensa[] {
  const candidatos = formacion
    .filter(
      (c): c is ColocacionDefensa =>
        PUESTOS_DELANTEROS.includes(c.puesto) && c.punto.y < LIMITE_LINEA_TRES_METROS,
    )
    .sort((a, b) => a.punto.y - b.punto.y);
  return candidatos.slice(0, bloqueadores).map((c) => c.puesto);
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
    v.caso === caso && v.situacion === situacion && v.bloqueadores === bloqueadores
      ? { ...v, explicacion }
      : v,
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
  const variante = sistema.defensas?.find(
    (v) => v.caso === caso && v.situacion === situacion && v.bloqueadores === bloqueadores,
  );
  if (!variante?.formacion.some((c) => c.puesto === puesto)) {
    return null;
  }
  const explicacion = texto.trim().length === 0 ? undefined : texto;
  const nuevaFormacion = variante.formacion.map((c) =>
    c.puesto === puesto ? { ...c, explicacion } : c,
  );
  const defensas = sistema.defensas!.map((v) =>
    v.caso === caso && v.situacion === situacion && v.bloqueadores === bloqueadores
      ? { ...v, formacion: nuevaFormacion }
      : v,
  );
  return { ...sistema, defensas };
}
