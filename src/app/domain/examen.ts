import type { Jugador, Sistema } from './modelos';
import { formacionEnRotacion } from './rotacion';

export type TipoExamen = 'puesto' | 'linea' | 'sistema';

export type Examen = { readonly tipo: 'puesto' | 'linea'; readonly titularId: string } | { readonly tipo: 'sistema' };

export function jugadoresAColocar(examen: Examen, sistema: Sistema, rotacion: number): readonly Jugador[] {
  const posiciones = formacionEnRotacion(sistema.plantilla.ordenSaque, rotacion);
  const indice = posiciones.findIndex((j) => j.id === (examen as { titularId: string }).titularId);
  return [posiciones[indice]];
}
