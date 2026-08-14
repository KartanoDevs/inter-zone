import type { Formacion, PlantillaEquipo, Sistema } from './modelos';
import { validarFormacion } from './validacion';

function mismosJugadores(formacion: Formacion, plantilla: PlantillaEquipo): boolean {
  const idsFormacion = formacion.map((colocacion) => colocacion.jugador.id).sort();
  const idsPlantilla = plantilla.ordenSaque.map((jugador) => jugador.id).sort();
  return JSON.stringify(idsFormacion) === JSON.stringify(idsPlantilla);
}

export function guardarFormacion(sistema: Sistema, rotacion: number, formacion: Formacion): Sistema | null {
  if (!mismosJugadores(formacion, sistema.plantilla)) {
    return null;
  }
  const resultado = validarFormacion(formacion, sistema.plantilla.ordenSaque, rotacion);
  if (resultado.infracciones.length > 0) {
    return null;
  }
  return { ...sistema, formaciones: { ...sistema.formaciones, [rotacion]: formacion } };
}

export function sistemaCompleto(sistema: Sistema): boolean {
  return [1, 2, 3, 4, 5, 6].every((rotacion) => sistema.formaciones[rotacion as 1 | 2 | 3 | 4 | 5 | 6] !== undefined);
}

export function borrarRotacion(sistema: Sistema, rotacion: number): Sistema {
  const formaciones = { ...sistema.formaciones };
  delete formaciones[rotacion as 1 | 2 | 3 | 4 | 5 | 6];
  return { ...sistema, formaciones };
}
