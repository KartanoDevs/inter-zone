import type { PlantillaEquipo, Sistema, TipoSistema } from './modelos';

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

/** Sustituye la plantilla del sistema y retira de sus formaciones a quien ya no pertenece a ella. */
export function cambiarPlantilla(sistema: Sistema, nuevaPlantilla: PlantillaEquipo): Sistema {
  const idsValidos = new Set(nuevaPlantilla.ordenSaque.map((jugador) => jugador.id));
  const formaciones = Object.fromEntries(
    Object.entries(sistema.formaciones).map(([rotacion, formacion]) => [
      rotacion,
      (formacion ?? []).filter((colocacion) => idsValidos.has(colocacion.jugador.id)),
    ]),
  ) as Sistema['formaciones'];
  return { ...sistema, plantilla: nuevaPlantilla, formaciones };
}
