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
 * Cambia a qué titular sustituye el líbero (spec 011, FIVB 19.3.1.1: puede ser cualquiera de
 * los seis, no solo el central). Como quién está en pista depende de la rotación, purga cada
 * formación guardada por separado, con el roster que le corresponde a esa rotación en la
 * plantilla nueva — no un único conjunto de ids válido para las seis a la vez.
 */
export function cambiarSustitutoLibero(sistema: Sistema, sustituidoId: string): Sistema {
  if (!sistema.plantilla.libero) {
    return sistema;
  }
  const nuevaPlantilla = { ...sistema.plantilla, libero: { ...sistema.plantilla.libero, sustituidoId } };
  const formaciones = Object.fromEntries(
    Object.entries(sistema.formaciones).map(([rotacion, formacion]) => {
      const idsValidos = new Set(jugadoresEnPista(nuevaPlantilla, Number(rotacion)).map((jugador) => jugador.id));
      return [rotacion, (formacion ?? []).filter((colocacion) => idsValidos.has(colocacion.jugador.id))];
    }),
  ) as Sistema['formaciones'];
  return { ...sistema, plantilla: nuevaPlantilla, formaciones };
}
