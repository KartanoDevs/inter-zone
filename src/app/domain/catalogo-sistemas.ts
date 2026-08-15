import type { PlantillaEquipo, Sistema, TipoSistema } from './modelos';
import { jugadoresEnPista } from './rotacion';

function nombreValido(nombre: string): boolean {
  return nombre.trim().length > 0;
}

function colisiona(existentes: readonly Sistema[], idPropio: string | null, tipo: TipoSistema, nombre: string): boolean {
  return existentes.some((sistema) => sistema.id !== idPropio && sistema.tipo === tipo && sistema.nombre === nombre);
}

export function crearSistema(
  id: string,
  nombre: string,
  tipo: TipoSistema,
  plantilla: PlantillaEquipo,
  existentes: readonly Sistema[],
): Sistema | null {
  if (!nombreValido(nombre) || colisiona(existentes, null, tipo, nombre)) {
    return null;
  }
  return { id, nombre, tipo, plantilla, formaciones: {}, explicacionesRotacion: {} };
}

export function renombrarSistema(sistema: Sistema, nuevoNombre: string, existentes: readonly Sistema[]): Sistema | null {
  if (!nombreValido(nuevoNombre) || colisiona(existentes, sistema.id, sistema.tipo, nuevoNombre)) {
    return null;
  }
  return { ...sistema, nombre: nuevoNombre };
}

export function borrarSistema(sistemas: readonly Sistema[], id: string): readonly Sistema[] {
  return sistemas.filter((sistema) => sistema.id !== id);
}

const ORDEN_TIPO: Readonly<Record<TipoSistema, number>> = { recepcion: 0, defensa: 1 };

export function ordenarCatalogo(sistemas: readonly Sistema[]): readonly Sistema[] {
  return [...sistemas].sort(
    (a, b) => ORDEN_TIPO[a.tipo] - ORDEN_TIPO[b.tipo] || a.nombre.localeCompare(b.nombre, 'es'),
  );
}

/**
 * Cambia a qué titular sustituye el líbero, en una única rotación (spec 017: el sustituto se
 * declara rotación a rotación, no uno solo para las seis). `null` significa que en esa
 * rotación no sustituye a nadie. Purga solo la formación guardada de esa rotación, con el
 * roster que le corresponde en la plantilla nueva; las demás rotaciones no se tocan, porque
 * su sustituto no ha cambiado.
 */
export function cambiarSustitutoLibero(sistema: Sistema, rotacion: 1 | 2 | 3 | 4 | 5 | 6, sustituidoId: string | null): Sistema {
  const libero = sistema.plantilla.libero;
  if (!libero) {
    return sistema;
  }
  const nuevaPlantilla = {
    ...sistema.plantilla,
    libero: { ...libero, sustitutosPorRotacion: { ...libero.sustitutosPorRotacion, [rotacion]: sustituidoId } },
  };
  const formacionRotacion = sistema.formaciones[rotacion];
  if (!formacionRotacion) {
    return { ...sistema, plantilla: nuevaPlantilla };
  }
  const idsValidos = new Set(jugadoresEnPista(nuevaPlantilla, rotacion).map((jugador) => jugador.id));
  const formaciones = {
    ...sistema.formaciones,
    [rotacion]: formacionRotacion.filter((colocacion) => idsValidos.has(colocacion.jugador.id)),
  };
  return { ...sistema, plantilla: nuevaPlantilla, formaciones };
}
