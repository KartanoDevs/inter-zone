import type { Formacion, OrdenSaque, Sistema } from './modelos';
import { jugadoresEnPista } from './rotacion';
import { validarFormacion } from './validacion';

function mismosJugadores(formacion: Formacion, posiciones: OrdenSaque): boolean {
  const idsFormacion = formacion.map((colocacion) => colocacion.jugador.id).sort();
  const idsPosiciones = posiciones.map((jugador) => jugador.id).sort();
  return JSON.stringify(idsFormacion) === JSON.stringify(idsPosiciones);
}

/** Reaplica, por id de jugador, la explicación que tuviera en la formación anterior de esa rotación. */
function conExplicacionesConservadas(
  formacion: Formacion,
  anterior: Formacion | undefined,
): Formacion {
  if (!anterior) {
    return formacion;
  }
  const explicacionPorId = new Map<string, string>();
  for (const colocacion of anterior) {
    if (colocacion.explicacion !== undefined) {
      explicacionPorId.set(colocacion.jugador.id, colocacion.explicacion);
    }
  }
  return formacion.map((c) => {
    const explicacion = c.explicacion ?? explicacionPorId.get(c.jugador.id);
    return explicacion === undefined ? c : { ...c, explicacion };
  });
}

/**
 * `validar = false` (spec 017) salta la comprobación de falta posicional, para guardar una
 * formación a propósito ilegal (enseñar un error, anotar una jugada real). El roster —que los
 * seis colocados sean exactamente quienes están en pista en esa rotación— nunca se salta: no
 * tendría sentido guardar con un jugador que no juega esa rotación, se valide o no la postura.
 */
export function guardarFormacion(
  sistema: Sistema,
  rotacion: number,
  formacion: Formacion,
  validar = true,
): Sistema | null {
  const posiciones = jugadoresEnPista(sistema.plantilla, rotacion);
  if (!mismosJugadores(formacion, posiciones)) {
    return null;
  }
  if (validar && validarFormacion(formacion, posiciones).infracciones.length > 0) {
    return null;
  }
  const anterior = sistema.formaciones[rotacion as 1 | 2 | 3 | 4 | 5 | 6];
  const formacionFinal = conExplicacionesConservadas(formacion, anterior);
  return { ...sistema, formaciones: { ...sistema.formaciones, [rotacion]: formacionFinal } };
}

export function sistemaCompleto(sistema: Sistema): boolean {
  return [1, 2, 3, 4, 5, 6].every(
    (rotacion) => sistema.formaciones[rotacion as 1 | 2 | 3 | 4 | 5 | 6] !== undefined,
  );
}

export function borrarRotacion(sistema: Sistema, rotacion: number): Sistema {
  const r = rotacion as 1 | 2 | 3 | 4 | 5 | 6;
  const formaciones = { ...sistema.formaciones };
  delete formaciones[r];
  const explicacionesRotacion = { ...sistema.explicacionesRotacion };
  delete explicacionesRotacion[r];
  return { ...sistema, formaciones, explicacionesRotacion };
}

export function explicarRotacion(sistema: Sistema, rotacion: number, texto: string): Sistema {
  const explicacionesRotacion = { ...sistema.explicacionesRotacion };
  const r = rotacion as 1 | 2 | 3 | 4 | 5 | 6;
  if (texto.trim().length === 0) {
    delete explicacionesRotacion[r];
  } else {
    explicacionesRotacion[r] = texto;
  }
  return { ...sistema, explicacionesRotacion };
}

export function explicarJugador(
  sistema: Sistema,
  rotacion: number,
  jugadorId: string,
  texto: string,
): Sistema | null {
  const r = rotacion as 1 | 2 | 3 | 4 | 5 | 6;
  const formacion = sistema.formaciones[r];
  if (!formacion?.some((c) => c.jugador.id === jugadorId)) {
    return null;
  }
  const explicacion = texto.trim().length === 0 ? undefined : texto;
  const nuevaFormacion = formacion.map((c) =>
    c.jugador.id === jugadorId ? { ...c, explicacion } : c,
  );
  return { ...sistema, formaciones: { ...sistema.formaciones, [r]: nuevaFormacion } };
}
