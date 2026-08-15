import type { ConfiguracionRoles, OrdenSaque, RolId } from './modelos';

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

/**
 * El índice de un rol (1 o 2 en `receptor`/`central`) se declara en la plantilla; no hay
 * función que lo derive (spec 018). La convención real del entrenador no sale de un único
 * recorrido del orden de saque, así que esta es la única comprobación que queda: que los
 * índices declarados sean coherentes.
 */
export function validarPlantilla(orden: OrdenSaque, configuracion: ConfiguracionRoles): boolean {
  return (
    sinJugadoresRepetidos(orden) && indicesConsistentes(orden, configuracion) && composicionValida(orden)
  );
}
