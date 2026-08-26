import type { TipoExamen } from './examen';

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
