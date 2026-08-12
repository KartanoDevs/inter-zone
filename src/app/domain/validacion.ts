import type {
  Aviso,
  Colocacion,
  Formacion,
  Infraccion,
  Jugador,
  OrdenSaque,
  ResultadoValidacion,
  TipoComparacion,
} from './modelos';
import { rotar } from './rotacion';

const MARGEN_TOLERANCIA = 0.05;

function colocacionDe(formacion: Formacion, jugador: Jugador): Colocacion {
  const colocacion = formacion.find((c) => c.jugador.id === jugador.id);
  if (!colocacion) {
    throw new Error(`Formación sin colocación para ${jugador.id}`);
  }
  return colocacion;
}

function evaluarMargen(
  margen: number,
  tipo: TipoComparacion,
  jugadores: readonly [Jugador, Jugador],
  infracciones: Infraccion[],
  avisos: Aviso[],
): void {
  if (margen <= 0) {
    infracciones.push({ tipo, jugadores });
  } else if (margen <= MARGEN_TOLERANCIA) {
    avisos.push({ tipo, jugadores });
  }
}

function evaluarProfundidad(
  zaguero: Colocacion,
  delantero: Colocacion,
  infracciones: Infraccion[],
  avisos: Aviso[],
): void {
  const margen = zaguero.punto.y - delantero.punto.y;
  evaluarMargen(margen, 'zaguero-delantero', [zaguero.jugador, delantero.jugador], infracciones, avisos);
}

function evaluarLibero(colocacion: Colocacion, infracciones: Infraccion[]): void {
  if (colocacion.jugador.rol === 'libero') {
    infracciones.push({ tipo: 'libero-delantero', jugadores: [colocacion.jugador] });
  }
}

function evaluarLateral(
  izquierda: Colocacion,
  derecha: Colocacion,
  infracciones: Infraccion[],
  avisos: Aviso[],
): void {
  const margen = derecha.punto.x - izquierda.punto.x;
  evaluarMargen(margen, 'orden-lateral', [izquierda.jugador, derecha.jugador], infracciones, avisos);
}

export function validarFormacion(
  formacion: Formacion,
  orden: OrdenSaque,
  rotacion: number,
): ResultadoValidacion {
  const posiciones = rotar(orden, rotacion);
  const [p1, p2, p3, p4, p5, p6] = posiciones.map((jugador) => colocacionDe(formacion, jugador));

  const infracciones: Infraccion[] = [];
  const avisos: Aviso[] = [];

  evaluarProfundidad(p1, p2, infracciones, avisos);
  evaluarProfundidad(p6, p3, infracciones, avisos);
  evaluarProfundidad(p5, p4, infracciones, avisos);

  evaluarLateral(p4, p3, infracciones, avisos);
  evaluarLateral(p3, p2, infracciones, avisos);
  evaluarLateral(p5, p6, infracciones, avisos);
  evaluarLateral(p6, p1, infracciones, avisos);

  evaluarLibero(p2, infracciones);
  evaluarLibero(p3, infracciones);
  evaluarLibero(p4, infracciones);

  return { infracciones, avisos };
}
