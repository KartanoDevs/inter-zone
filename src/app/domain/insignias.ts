import type { TipoExamen } from './examen';
import type { Jugador, PlantillaEquipo, Sistema } from './modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO, etiquetaDe } from './roles';

/** Una insignia ganada por la cuenta con sesión: qué sistema, qué tipo de examen y, si el tipo
 * lo exige (todos salvo `'sistema'`), qué titular se examinó — mismos tres ejes que identifican
 * un `Examen` (spec 012). `obtenidaEn` es la fecha en que se ganó por primera vez (spec 056,
 * E3): repetir el examen no la actualiza. */
export interface InsigniaGanada {
  readonly sistemaId: string;
  readonly tipo: TipoExamen;
  readonly titularId: string | null;
  readonly obtenidaEn: string;
}

/** Lo que un sistema ha aportado a la vitrina para una cuenta (spec 061): qué puestos tiene con
 * bronce (examen por puesto) y con plata (examen por línea), y la fecha en que se ganó el oro
 * (examen de sistema completo) si lo tiene. `dominado` es exactamente `oro !== null`. */
export interface ResumenDeMedallas {
  readonly bronce: readonly string[];
  readonly plata: readonly string[];
  readonly oro: string | null;
  readonly dominado: boolean;
}

function titularesDe(plantilla: PlantillaEquipo): readonly Jugador[] {
  return plantilla.libero ? [...plantilla.ordenSaque, plantilla.libero.jugador] : plantilla.ordenSaque;
}

/** La etiqueta de puesto de un `titularId` de una insignia (spec 061): siempre desde la
 * configuración de roles por defecto, igual que `ficha-vista.ts` para el resto de la pista. */
function etiquetaDeTitular(plantilla: PlantillaEquipo, titularId: string | null): string | null {
  const jugador = titularesDe(plantilla).find((j) => j.id === titularId);
  return jugador ? etiquetaDe(jugador, CONFIGURACION_ROLES_POR_DEFECTO) : null;
}

export function resumenDeMedallas(
  sistemaId: string,
  plantilla: PlantillaEquipo,
  insignias: readonly InsigniaGanada[],
): ResumenDeMedallas {
  const delSistema = [...insignias.filter((i) => i.sistemaId === sistemaId)].sort((a, b) =>
    a.obtenidaEn.localeCompare(b.obtenidaEn),
  );
  const puestosPara = (tipo: TipoExamen): readonly string[] =>
    delSistema
      .filter((i) => i.tipo === tipo)
      .map((i) => etiquetaDeTitular(plantilla, i.titularId))
      .filter((etiqueta): etiqueta is string => etiqueta !== null);

  const oro = delSistema.find((i) => i.tipo === 'sistema')?.obtenidaEn ?? null;

  return {
    bronce: puestosPara('puesto'),
    plata: puestosPara('linea'),
    oro,
    dominado: oro !== null,
  };
}

/** El contador de la vitrina (spec 061, E7): cuántos sistemas de recepción tiene dominados la
 * cuenta —es decir, con oro— sobre el total de sistemas de recepción. Los de defensa no cuentan
 * (no tienen examen, spec 012). */
export interface RecuentoDeSistemas {
  readonly dominados: number;
  readonly total: number;
}

export function recuentoDeSistemas(
  sistemas: readonly Sistema[],
  insignias: readonly InsigniaGanada[],
): RecuentoDeSistemas {
  const recepcion = sistemas.filter((s) => s.tipo === 'recepcion');
  const dominados = recepcion.filter((s) =>
    insignias.some((i) => i.sistemaId === s.id && i.tipo === 'sistema'),
  ).length;
  return { dominados, total: recepcion.length };
}
