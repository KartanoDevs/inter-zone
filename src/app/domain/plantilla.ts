import type { ConfiguracionRoles, Jugador, OrdenSaque, RolId } from './modelos';
import { rotar } from './rotacion';

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

function composicionValida(orden: OrdenSaque): boolean {
  const conteo = new Map<RolId, number>();
  for (const jugador of orden) {
    conteo.set(jugador.rol, (conteo.get(jugador.rol) ?? 0) + 1);
  }

  const centralesEstandar = conteo.get('central') === 2 && !conteo.has('libero');
  const centralConLibero = conteo.get('central') === 1 && conteo.get('libero') === 1;

  return (
    conteo.get('colocador') === 1 &&
    conteo.get('receptor') === 2 &&
    conteo.get('opuesto') === 1 &&
    (centralesEstandar || centralConLibero)
  );
}

export function validarPlantilla(orden: OrdenSaque, configuracion: ConfiguracionRoles): boolean {
  return (
    sinJugadoresRepetidos(orden) && indicesConsistentes(orden, configuracion) && composicionValida(orden)
  );
}

export function asignarIndices(orden: OrdenSaque, configuracion: ConfiguracionRoles): OrdenSaque {
  const desdeColocador = rotar(orden, orden.findIndex((jugador) => jugador.rol === 'colocador'));

  const indicesPorId = new Map<string, 1 | 2>();
  const contadores = new Map<RolId, number>();
  for (const jugador of desdeColocador) {
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
