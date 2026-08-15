import type { ConfiguracionRoles, Jugador, OrdenSaque, RolId } from './modelos';
import { formacionEnRotacion } from './rotacion';

function indicesConsistentes(orden: OrdenSaque, configuracion: ConfiguracionRoles): boolean {
  const indicesVistos = new Map<RolId, Set<1 | 2>>();
  for (const jugador of orden) {
    if (configuracion[jugador.rol].llevaIndice !== (jugador.indice !== undefined)) {
      return false;
    }
    if (jugador.indice === undefined) {
      continue;
    }
    const vistos = indicesVistos.get(jugador.rol) ?? new Set<1 | 2>();
    if (vistos.has(jugador.indice)) {
      return false;
    }
    vistos.add(jugador.indice);
    indicesVistos.set(jugador.rol, vistos);
  }
  return true;
}

function sinJugadoresRepetidos(orden: OrdenSaque): boolean {
  return new Set(orden.map((jugador) => jugador.id)).size === orden.length;
}

/**
 * Los seis titulares del orden de saque. El líbero nunca es uno de los seis: vive aparte
 * (`PlantillaEquipo.libero`) porque no ocupa una plaza fija — entra y sale según la rotación
 * (spec 011). Antes de la 011 el líbero sí podía ocupar la plaza de un central aquí dentro;
 * ya no: si aparece, la composición se rechaza igual que con cualquier otro rol de más.
 */
function composicionValida(orden: OrdenSaque): boolean {
  const conteo = new Map<RolId, number>();
  for (const jugador of orden) {
    conteo.set(jugador.rol, (conteo.get(jugador.rol) ?? 0) + 1);
  }

  return (
    conteo.get('colocador') === 1 &&
    conteo.get('receptor') === 2 &&
    conteo.get('central') === 2 &&
    conteo.get('opuesto') === 1
  );
}

export function validarPlantilla(orden: OrdenSaque, configuracion: ConfiguracionRoles): boolean {
  return (
    sinJugadoresRepetidos(orden) && indicesConsistentes(orden, configuracion) && composicionValida(orden)
  );
}

export function asignarIndices(orden: OrdenSaque, configuracion: ConfiguracionRoles): OrdenSaque {
  const [p1, p2, p3, p4, p5, p6] = formacionEnRotacion(orden, 1);
  // El índice se cuenta en el sentido en que gira la rotación (P2→P1→P6→P5→P4→P3→P2),
  // no en el orden en que se escribió `orden` (docs/dominio.md §2).
  const enSentidoDeRotacion: OrdenSaque = [p1, p6, p5, p4, p3, p2];

  const indicesPorId = new Map<string, 1 | 2>();
  const contadores = new Map<RolId, number>();
  for (const jugador of enSentidoDeRotacion) {
    if (!configuracion[jugador.rol].llevaIndice) {
      continue;
    }
    const siguiente = ((contadores.get(jugador.rol) ?? 0) + 1) as 1 | 2;
    contadores.set(jugador.rol, siguiente);
    indicesPorId.set(jugador.id, siguiente);
  }

  return orden.map((jugador): Jugador => {
    const indice = indicesPorId.get(jugador.id);
    return indice === undefined ? jugador : { ...jugador, indice };
  }) as unknown as OrdenSaque;
}
