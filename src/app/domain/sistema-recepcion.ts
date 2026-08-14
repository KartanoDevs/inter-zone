import type { Formacion, PlantillaEquipo, Sistema } from './modelos';
import { validarFormacion } from './validacion';

function mismosJugadores(formacion: Formacion, plantilla: PlantillaEquipo): boolean {
  const idsFormacion = formacion.map((colocacion) => colocacion.jugador.id).sort();
  const idsPlantilla = plantilla.ordenSaque.map((jugador) => jugador.id).sort();
  return JSON.stringify(idsFormacion) === JSON.stringify(idsPlantilla);
}

/** Reaplica, por id de jugador, la explicación que tuviera en la formación anterior de esa rotación. */
function conExplicacionesConservadas(formacion: Formacion, anterior: Formacion | undefined): Formacion {
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

export function guardarFormacion(sistema: Sistema, rotacion: number, formacion: Formacion): Sistema | null {
  if (!mismosJugadores(formacion, sistema.plantilla)) {
    return null;
  }
  const resultado = validarFormacion(formacion, sistema.plantilla.ordenSaque, rotacion);
  if (resultado.infracciones.length > 0) {
    return null;
  }
  const anterior = sistema.formaciones[rotacion as 1 | 2 | 3 | 4 | 5 | 6];
  const formacionFinal = conExplicacionesConservadas(formacion, anterior);
  return { ...sistema, formaciones: { ...sistema.formaciones, [rotacion]: formacionFinal } };
}

export function sistemaCompleto(sistema: Sistema): boolean {
  return [1, 2, 3, 4, 5, 6].every((rotacion) => sistema.formaciones[rotacion as 1 | 2 | 3 | 4 | 5 | 6] !== undefined);
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

export function explicarJugador(sistema: Sistema, rotacion: number, jugadorId: string, texto: string): Sistema | null {
  const r = rotacion as 1 | 2 | 3 | 4 | 5 | 6;
  const formacion = sistema.formaciones[r];
  if (!formacion?.some((c) => c.jugador.id === jugadorId)) {
    return null;
  }
  const explicacion = texto.trim().length === 0 ? undefined : texto;
  const nuevaFormacion = formacion.map((c) => (c.jugador.id === jugadorId ? { ...c, explicacion } : c));
  return { ...sistema, formaciones: { ...sistema.formaciones, [r]: nuevaFormacion } };
}
