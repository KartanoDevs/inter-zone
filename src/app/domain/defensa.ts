import type { CasoColocador, Punto, SituacionDefensa } from './modelos';

/** Las situaciones de ataque que existen para cada caso del colocador rival (spec 038): la
 * lista depende de qué zonas de la red deja libres el colocador según esté delante o detrás.
 * Colocador delantero: ocupa su zona 2, así que ahí no hay ataque, pero el zaguero derecho sí
 * puede atacar (z1). Colocador trasero: ocupa su zona 1, así que no hay ataque por 1, pero su
 * zona 2 queda libre para el opuesto. */
const SITUACIONES_POR_CASO: Readonly<Record<CasoColocador, readonly SituacionDefensa[]>> = {
  delantero: ['inicial', 'z4', 'z3', 'pipe', 'z1'],
  trasero: ['inicial', 'z4', 'z3', 'z2', 'pipe'],
};

export function situacionesDe(caso: CasoColocador): readonly SituacionDefensa[] {
  return SITUACIONES_POR_CASO[caso];
}

/** La situación que corresponde al cambiar de caso (spec 038, E5): se conserva si sigue
 * existiendo en el caso nuevo, y si no, cae en la postura de base. */
export function situacionTrasCambioDeCaso(situacion: SituacionDefensa, casoNuevo: CasoColocador): SituacionDefensa {
  return situacionesDe(casoNuevo).includes(situacion) ? situacion : 'inicial';
}

/** El espejo de las zonas rivales (spec 038, E9-E10; mismo espejo que tenía `viaDeAtaque` en la
 * spec 021 para z4/z3/z2/pipe, `docs/dominio.md` §3). El ataque por 1 (zaguero derecho rival) no
 * tiene un tercio de red propio: solo se llega a él desde un punto que ya no cae en ninguno de
 * los otros cuatro, así que aquí basta con nunca devolver una situación fuera de `situacionesDe`. */
function situacionDelPunto(punto: Punto): SituacionDefensa {
  if (punto.y <= -3) {
    return 'pipe';
  }
  if (punto.x < 3) {
    return 'z2';
  }
  return punto.x < 6 ? 'z3' : 'z4';
}

export function situacionMasCercana(punto: Punto, caso: CasoColocador): SituacionDefensa {
  const situacion = situacionDelPunto(punto);
  const validas = situacionesDe(caso);
  if (validas.includes(situacion)) {
    return situacion;
  }
  // Único caso hoy: colocador delantero, punto en su zona 2 (no existe para este caso). El otro
  // lateral de red disponible es z3.
  return 'z3';
}
