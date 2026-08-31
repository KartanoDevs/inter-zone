import type {
  EquipoId,
  EstadoSistema,
  Jugador,
  PlantillaEquipo,
  Sistema,
  TipoSistema,
} from './modelos';
import { jugadoresEnPista } from './rotacion';

function nombreValido(nombre: string): boolean {
  return nombre.trim().length > 0;
}

/** La unicidad del nombre se comprueba dentro de (equipoId, tipo), no globalmente (spec 032):
 * masculino y femenino pueden tener cada uno su «5-1», igual que ya podían recepción y defensa. */
function colisiona(
  existentes: readonly Sistema[],
  idPropio: string | null,
  equipoId: EquipoId,
  tipo: TipoSistema,
  nombre: string,
): boolean {
  return existentes.some(
    (sistema) =>
      sistema.id !== idPropio &&
      sistema.equipoId === equipoId &&
      sistema.tipo === tipo &&
      sistema.nombre === nombre,
  );
}

export function crearSistema(
  id: string,
  nombre: string,
  tipo: TipoSistema,
  equipoId: EquipoId,
  plantilla: PlantillaEquipo,
  existentes: readonly Sistema[],
): Sistema | null {
  if (!nombreValido(nombre) || colisiona(existentes, null, equipoId, tipo, nombre)) {
    return null;
  }
  return { id, nombre, tipo, equipoId, plantilla, formaciones: {}, explicacionesRotacion: {} };
}

export function renombrarSistema(
  sistema: Sistema,
  nuevoNombre: string,
  existentes: readonly Sistema[],
): Sistema | null {
  if (
    !nombreValido(nuevoNombre) ||
    colisiona(existentes, sistema.id, sistema.equipoId, sistema.tipo, nuevoNombre)
  ) {
    return null;
  }
  return { ...sistema, nombre: nuevoNombre };
}

export function borrarSistema(sistemas: readonly Sistema[], id: string): readonly Sistema[] {
  return sistemas.filter((sistema) => sistema.id !== id);
}

/** Cambia la descripción general del sistema (spec 025). Texto en blanco la borra, igual que
 * `explicarRotacion` con la explicación de una rotación. */
export function describirSistema(sistema: Sistema, texto: string): Sistema {
  const descripcion = texto.trim().length === 0 ? undefined : texto;
  return { ...sistema, descripcion };
}

/**
 * Duplica un sistema entero — mismo tipo, misma plantilla (con cualquier personalización del
 * líbero que tuviera), formaciones, explicaciones y descripción — bajo un id y un nombre
 * nuevos (spec 026). Mismas reglas de nombre que `crearSistema`/`renombrarSistema`.
 */
export function clonarSistema(
  sistema: Sistema,
  id: string,
  nuevoNombre: string,
  existentes: readonly Sistema[],
): Sistema | null {
  if (
    !nombreValido(nuevoNombre) ||
    colisiona(existentes, null, sistema.equipoId, sistema.tipo, nuevoNombre)
  ) {
    return null;
  }
  return { ...sistema, id, nombre: nuevoNombre };
}

/** Ausente equivale a "borrador" (spec 051) — ver el comentario de `Sistema.estado`. */
export function estadoDe(sistema: Sistema): EstadoSistema {
  return sistema.estado ?? 'borrador';
}

export function validarSistema(sistema: Sistema): Sistema {
  return { ...sistema, estado: 'validado' };
}

/** Vuelve un sistema validado a borrador, por ejemplo para corregirlo (spec 051, E6). */
export function invalidarSistema(sistema: Sistema): Sistema {
  return { ...sistema, estado: 'borrador' };
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
 * rotación no sustituye a nadie. La formación guardada de esa rotación mantiene siempre a los
 * seis (invariante 2, `docs/dominio.md`): quien entra en pista hereda el punto exacto de quien
 * sale, con su explicación de enseñanza y sus celdas si las tenía — hablan de ese sitio de la
 * pizarra, no de quién lo ocupó antes (spec 043, corrige 017-E8). Las demás rotaciones no se
 * tocan, porque su sustituto no ha cambiado.
 */
export function cambiarSustitutoLibero(
  sistema: Sistema,
  rotacion: 1 | 2 | 3 | 4 | 5 | 6,
  sustituidoId: string | null,
): Sistema {
  const libero = sistema.plantilla.libero;
  if (!libero) {
    return sistema;
  }
  const rosterAnterior = jugadoresEnPista(sistema.plantilla, rotacion);
  const nuevaPlantilla = {
    ...sistema.plantilla,
    libero: {
      ...libero,
      sustitutosPorRotacion: { ...libero.sustitutosPorRotacion, [rotacion]: sustituidoId },
    },
  };
  const formacionRotacion = sistema.formaciones[rotacion];
  if (!formacionRotacion) {
    return { ...sistema, plantilla: nuevaPlantilla };
  }
  const rosterNuevo = jugadoresEnPista(nuevaPlantilla, rotacion);
  const relevos = new Map<string, Jugador>();
  rosterAnterior.forEach((anterior, indice) => {
    const nuevo = rosterNuevo[indice];
    if (nuevo.id !== anterior.id) {
      relevos.set(anterior.id, nuevo);
    }
  });
  const formaciones = {
    ...sistema.formaciones,
    [rotacion]: formacionRotacion.map((colocacion) => {
      const relevo = relevos.get(colocacion.jugador.id);
      return relevo ? { ...colocacion, jugador: relevo } : colocacion;
    }),
  };
  return { ...sistema, plantilla: nuevaPlantilla, formaciones };
}
