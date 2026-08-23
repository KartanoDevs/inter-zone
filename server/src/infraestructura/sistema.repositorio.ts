import type {
  Celda,
  Colocacion,
  ColocacionDefensa,
  EquipoId,
  Formacion,
  FormacionDefensa,
  Jugador,
  PlantillaEquipo,
  RolId,
  Sistema,
  TipoSistema,
  VarianteDefensa,
} from '../../../src/app/domain/modelos';
import { prisma } from './prisma';

/** El servidor importa `src/app/domain/` directamente (ADR 0025): es TypeScript puro, sin
 * ningún import externo, portable a Node tal cual. Reutilizarlo aquí evita duplicar las reglas
 * de voleibol que ya viven ahí — en concreto, `jugadoresEnPista` para comprobar el roster de
 * una formación de recepción (spec 033, E5). */
import { jugadoresEnPista } from '../../../src/app/domain/rotacion';

const ROTACIONES = [1, 2, 3, 4, 5, 6] as const;
type RotacionValida = (typeof ROTACIONES)[number];
const PUESTOS = [1, 2, 3, 4, 5, 6] as const;
type PuestoValido = (typeof PUESTOS)[number];

/** Rejilla de 18×18 celdas de 0,5 m (`src/app/domain/rejilla.ts`, `TAMANO_CELDA`). El índice
 * lineal es lo que guardan `colocacion.celdas` y `colocacion_defensa.celdas`
 * (docs/modelo-de-datos.md §5). */
const CELDAS_POR_LADO = 18;

function celdaAIndice(celda: Celda): number {
  return celda.fila * CELDAS_POR_LADO + celda.columna;
}

function indiceACelda(indice: number): Celda {
  return { fila: Math.floor(indice / CELDAS_POR_LADO), columna: indice % CELDAS_POR_LADO };
}

export class SistemaNoEncontrado extends Error {}
export class ConflictoDeConcurrencia extends Error {}
export class RosterInvalido extends Error {}

/** `Sistema` de dominio no lleva fechas (ADR 0012): `actualizadoEn` es metadato de esta
 * frontera HTTP, no del tipo de dominio — igual que `creadoEn`/`actualizadoEn` ya vivían solo
 * en `LocalStorageSistemaRepository`, nunca en `Sistema`. Un cliente lo necesita para el
 * `If-Match` de la próxima escritura (spec 033, E6/E7). */
export type SistemaConMetadatos = Sistema & { readonly actualizadoEn: string };

interface FilaJugador {
  readonly id: string;
  readonly rol: string;
  readonly indice: number | null;
  readonly orden_saque: number | null;
}

function jugadorDeFila(fila: FilaJugador): Jugador {
  return fila.indice === null
    ? { id: fila.id, rol: fila.rol as RolId }
    : { id: fila.id, rol: fila.rol as RolId, indice: fila.indice as 1 | 2 };
}

/** Reconstruye la plantilla desde el catálogo fijo de `jugador` (docs/modelo-de-datos.md §5):
 * los seis titulares en su orden de saque, y el líbero con el sustituto de cada rotación —
 * que sí varía por sistema, porque `cambiarSustitutoLibero` lo guarda por sistema, no por
 * equipo. */
function plantillaDesde(
  filasJugador: readonly FilaJugador[],
  nombreEquipo: string,
  sustitutosPorRotacion: Readonly<Record<RotacionValida, string | null>>,
): PlantillaEquipo {
  const ordenSaque = filasJugador
    .filter((j) => j.orden_saque !== null)
    .sort((a, b) => a.orden_saque! - b.orden_saque!)
    .map(jugadorDeFila);
  const liberoFila = filasJugador.find((j) => j.rol === 'libero');
  return {
    nombre: nombreEquipo,
    ordenSaque: ordenSaque as unknown as PlantillaEquipo['ordenSaque'],
    ...(liberoFila ? { libero: { jugador: jugadorDeFila(liberoFila), sustitutosPorRotacion } } : {}),
  };
}

async function equipoUuidDe(equipoId: EquipoId): Promise<string> {
  const fila = await prisma.equipo.findUniqueOrThrow({ where: { clave: equipoId } });
  return fila.id;
}

interface FilaColocacionCruda {
  readonly formacion_id: string;
  readonly rotacion: number;
  readonly jugador_id: string;
  readonly x: number;
  readonly y: number;
  readonly explicacion: string | null;
  readonly celdas: readonly number[] | null;
}

/** Todas las colocaciones de recepción de un sistema, con su formación de origen, en una sola
 * consulta. */
async function colocacionesDe(sistemaId: string): Promise<readonly FilaColocacionCruda[]> {
  return prisma.$queryRaw<FilaColocacionCruda[]>`
    SELECT f.id AS formacion_id, f.rotacion, c.jugador_id, c.x, c.y, c.explicacion, c.celdas
    FROM colocacion c
    JOIN formacion f ON f.id = c.formacion_id
    WHERE f.sistema_id = ${sistemaId}::uuid
  `;
}

interface FilaColocacionDefensaCruda {
  readonly formacion_id: string;
  readonly caso: string;
  readonly situacion: string;
  readonly bloqueadores: number;
  readonly variante_explicacion: string | null;
  readonly sombra_dx: number | null;
  readonly sombra_dy: number | null;
  readonly puesto: number;
  readonly x: number;
  readonly y: number;
  readonly explicacion: string | null;
  readonly celdas: readonly number[] | null;
}

/** Todas las colocaciones de defensa de un sistema, con su variante de origen, en una sola
 * consulta — en un sistema de defensa completo son hasta 34 variantes (spec 039). */
async function colocacionesDefensaDe(sistemaId: string): Promise<readonly FilaColocacionDefensaCruda[]> {
  return prisma.$queryRaw<FilaColocacionDefensaCruda[]>`
    SELECT fd.id AS formacion_id, fd.caso, fd.situacion, fd.bloqueadores,
           fd.explicacion AS variante_explicacion, fd.sombra_dx, fd.sombra_dy,
           cd.puesto, cd.x, cd.y, cd.explicacion, cd.celdas
    FROM colocacion_defensa cd
    JOIN formacion_defensa fd ON fd.id = cd.formacion_id
    WHERE fd.sistema_id = ${sistemaId}::uuid
  `;
}

interface FilaSistema {
  readonly id: string;
  readonly tipo: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly actualizado_en: Date;
  readonly rotaciones: readonly {
    readonly rotacion: number;
    readonly explicacion: string | null;
    readonly libero_sustituye_a: string | null;
  }[];
}

function ensamblarDefensas(colocacionesCrudas: readonly FilaColocacionDefensaCruda[]): readonly VarianteDefensa[] {
  const porVariante = new Map<
    string,
    { caso: string; situacion: string; bloqueadores: number; explicacion: string | null; sombra_dx: number | null; sombra_dy: number | null; colocaciones: ColocacionDefensa[] }
  >();
  for (const c of colocacionesCrudas) {
    let entrada = porVariante.get(c.formacion_id);
    if (!entrada) {
      entrada = {
        caso: c.caso,
        situacion: c.situacion,
        bloqueadores: c.bloqueadores,
        explicacion: c.variante_explicacion,
        sombra_dx: c.sombra_dx,
        sombra_dy: c.sombra_dy,
        colocaciones: [],
      };
      porVariante.set(c.formacion_id, entrada);
    }
    let colocacion: ColocacionDefensa = { puesto: c.puesto as PuestoValido, punto: { x: c.x, y: c.y } };
    if (c.explicacion !== null) {
      colocacion = { ...colocacion, explicacion: c.explicacion };
    }
    if (c.celdas !== null) {
      colocacion = { ...colocacion, celdas: c.celdas.map(indiceACelda) };
    }
    entrada.colocaciones.push(colocacion);
  }
  return [...porVariante.values()].map((v) => ({
    caso: v.caso as VarianteDefensa['caso'],
    situacion: v.situacion as VarianteDefensa['situacion'],
    bloqueadores: v.bloqueadores as VarianteDefensa['bloqueadores'],
    formacion: v.colocaciones as FormacionDefensa,
    ...(v.explicacion !== null ? { explicacion: v.explicacion } : {}),
    ...(v.sombra_dx !== null && v.sombra_dy !== null ? { desplazamientoSombra: { x: v.sombra_dx, y: v.sombra_dy } } : {}),
  }));
}

function ensamblarSistema(
  fila: FilaSistema,
  equipoId: EquipoId,
  nombreEquipo: string,
  filasJugador: readonly FilaJugador[],
  colocacionesCrudas: readonly FilaColocacionCruda[],
  colocacionesDefensaCrudas: readonly FilaColocacionDefensaCruda[],
): Sistema {
  const sustitutosPorRotacion = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null } as Record<RotacionValida, string | null>;
  const explicacionesRotacion: Partial<Record<RotacionValida, string>> = {};
  for (const r of fila.rotaciones) {
    const rotacion = r.rotacion as RotacionValida;
    sustitutosPorRotacion[rotacion] = r.libero_sustituye_a;
    if (r.explicacion !== null) {
      explicacionesRotacion[rotacion] = r.explicacion;
    }
  }

  const plantilla = plantillaDesde(filasJugador, nombreEquipo, sustitutosPorRotacion);
  const jugadorPorId = new Map(plantilla.ordenSaque.map((j) => [j.id, j] as const));
  if (plantilla.libero) {
    jugadorPorId.set(plantilla.libero.jugador.id, plantilla.libero.jugador);
  }

  const porFormacion = new Map<string, { rotacion: RotacionValida; colocaciones: Colocacion[] }>();
  for (const c of colocacionesCrudas) {
    let entrada = porFormacion.get(c.formacion_id);
    if (!entrada) {
      entrada = { rotacion: c.rotacion as RotacionValida, colocaciones: [] };
      porFormacion.set(c.formacion_id, entrada);
    }
    const jugador = jugadorPorId.get(c.jugador_id);
    if (!jugador) {
      throw new Error(`Jugador desconocido en los datos guardados: ${c.jugador_id}`);
    }
    let colocacion: Colocacion = { jugador, punto: { x: c.x, y: c.y } };
    if (c.explicacion !== null) {
      colocacion = { ...colocacion, explicacion: c.explicacion };
    }
    if (c.celdas !== null) {
      colocacion = { ...colocacion, celdas: c.celdas.map(indiceACelda) };
    }
    entrada.colocaciones.push(colocacion);
  }

  const formaciones: Partial<Record<RotacionValida, Formacion>> = {};
  for (const { rotacion, colocaciones } of porFormacion.values()) {
    formaciones[rotacion] = colocaciones;
  }

  const defensas = ensamblarDefensas(colocacionesDefensaCrudas);

  return {
    id: fila.id,
    nombre: fila.nombre,
    tipo: fila.tipo as TipoSistema,
    equipoId,
    plantilla,
    formaciones,
    ...(fila.descripcion !== null ? { descripcion: fila.descripcion } : {}),
    explicacionesRotacion,
    ...(defensas.length > 0 ? { defensas } : {}),
  };
}

export async function listar(equipoId: EquipoId): Promise<readonly SistemaConMetadatos[]> {
  const equipoRow = await prisma.equipo.findUniqueOrThrow({ where: { clave: equipoId } });
  const filasJugador = await prisma.jugador.findMany();
  const sistemas = await prisma.sistema.findMany({
    where: { equipo_id: equipoRow.id },
    include: { rotaciones: true },
    orderBy: { nombre: 'asc' },
  });
  const resultado: SistemaConMetadatos[] = [];
  for (const fila of sistemas) {
    const colocacionesCrudas = await colocacionesDe(fila.id);
    const colocacionesDefensaCrudas = await colocacionesDefensaDe(fila.id);
    const sistema = ensamblarSistema(fila, equipoId, equipoRow.nombre, filasJugador, colocacionesCrudas, colocacionesDefensaCrudas);
    resultado.push({ ...sistema, actualizadoEn: fila.actualizado_en.toISOString() });
  }
  return resultado;
}

/** Reconstruye la plantilla desde el catálogo `jugador` (fuente de verdad), tomando del
 * sistema entrante solo lo que es dato legítimo del entrenador: a quién sustituye el líbero en
 * cada rotación. El resto de `sistema.plantilla` —el orden de saque, quién es cada jugador— NO
 * se usa nunca para validar: si se usara, un payload podría mentir sobre su propia plantilla
 * para colar un roster inválido en `comprobarRoster` (spec 033, E5). */
async function plantillaConfiable(sistema: Sistema): Promise<PlantillaEquipo> {
  const equipoRow = await prisma.equipo.findUniqueOrThrow({ where: { clave: sistema.equipoId } });
  const filasJugador = await prisma.jugador.findMany();
  const sustitutosPorRotacion = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null } as Record<RotacionValida, string | null>;
  for (const r of ROTACIONES) {
    sustitutosPorRotacion[r] = sistema.plantilla.libero?.sustitutosPorRotacion[r] ?? null;
  }
  return plantillaDesde(filasJugador, equipoRow.nombre, sustitutosPorRotacion);
}

/** Comprueba que el roster de cada formación de recepción del sistema es exactamente el que
 * toca en esa rotación, según la plantilla confiable (spec 033, E5) — estructura, no legalidad:
 * `validarFormacion` no se reutiliza aquí a propósito (docs/modelo-de-datos.md §6, «la falta
 * de posición no es un CHECK»). En defensa ya no hay roster que comprobar contra la plantilla
 * (spec 038): la comprobación equivalente ahí es "los seis puestos, sin repetir", que
 * `escribirDefensas` ya exige vía el CHECK de la PK compuesta `(formacion_id, puesto)`. */
function comprobarRoster(sistema: Sistema, plantilla: PlantillaEquipo): void {
  for (const [rot, formacion] of Object.entries(sistema.formaciones)) {
    if (!formacion) {
      continue;
    }
    const rotacion = Number(rot) as RotacionValida;
    const rosterEsperado = new Set(jugadoresEnPista(plantilla, rotacion).map((j) => j.id));
    const rosterRecibido = new Set(formacion.map((c) => c.jugador.id));
    const mismoTamano = rosterEsperado.size === rosterRecibido.size;
    const mismosIds = mismoTamano && [...rosterEsperado].every((id) => rosterRecibido.has(id));
    if (!mismosIds) {
      throw new RosterInvalido(`Roster inválido en R${rotacion}: se esperaba ${[...rosterEsperado].join(', ')}`);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Transaccion = any;

async function escribirFormaciones(tx: Transaccion, sistema: Sistema): Promise<void> {
  for (const [rot, formacion] of Object.entries(sistema.formaciones)) {
    if (!formacion) {
      continue;
    }
    const rotacion = Number(rot) as RotacionValida;
    const formacionId = crypto.randomUUID();
    await tx.formacion.create({ data: { id: formacionId, sistema_id: sistema.id, rotacion } });
    for (const colocacion of formacion) {
      const celdas = colocacion.celdas === undefined ? null : colocacion.celdas.map(celdaAIndice);
      await tx.$executeRaw`
        INSERT INTO colocacion (formacion_id, jugador_id, x, y, explicacion, celdas)
        VALUES (${formacionId}::uuid, ${colocacion.jugador.id}, ${colocacion.punto.x}, ${colocacion.punto.y},
                ${colocacion.explicacion ?? null}, ${celdas}::integer[])
      `;
    }
  }
}

async function escribirDefensas(tx: Transaccion, sistema: Sistema): Promise<void> {
  for (const variante of sistema.defensas ?? []) {
    const formacionId = crypto.randomUUID();
    await tx.formacion_defensa.create({
      data: {
        id: formacionId,
        sistema_id: sistema.id,
        caso: variante.caso,
        situacion: variante.situacion,
        bloqueadores: variante.bloqueadores,
        explicacion: variante.explicacion ?? null,
        sombra_dx: variante.desplazamientoSombra?.x ?? null,
        sombra_dy: variante.desplazamientoSombra?.y ?? null,
      },
    });
    for (const colocacion of variante.formacion) {
      const celdas = colocacion.celdas === undefined ? null : colocacion.celdas.map(celdaAIndice);
      await tx.$executeRaw`
        INSERT INTO colocacion_defensa (formacion_id, puesto, x, y, explicacion, celdas)
        VALUES (${formacionId}::uuid, ${colocacion.puesto}, ${colocacion.punto.x}, ${colocacion.punto.y},
                ${colocacion.explicacion ?? null}, ${celdas}::integer[])
      `;
    }
  }
}

/** Crea un sistema con sus seis filas de `sistema_rotacion` ya listas (docs/modelo-de-datos.md
 * §5: «nunca un subconjunto»), y las formaciones/defensas que ya traiga. Devuelve
 * `actualizadoEn` para que el cliente tenga ya el testigo de concurrencia de la próxima
 * escritura. */
export async function crear(sistema: Sistema): Promise<string> {
  comprobarRoster(sistema, await plantillaConfiable(sistema));
  const equipoUuid = await equipoUuidDe(sistema.equipoId);
  return prisma.$transaction(async (tx) => {
    const creado = await tx.sistema.create({
      data: {
        id: sistema.id,
        equipo_id: equipoUuid,
        tipo: sistema.tipo,
        nombre: sistema.nombre,
        descripcion: sistema.descripcion ?? null,
      },
    });
    await tx.sistema_rotacion.createMany({
      data: ROTACIONES.map((r) => ({
        sistema_id: sistema.id,
        rotacion: r,
        explicacion: sistema.explicacionesRotacion[r] ?? null,
        libero_sustituye_a: sistema.plantilla.libero?.sustitutosPorRotacion[r] ?? null,
      })),
    });
    await escribirFormaciones(tx, sistema);
    await escribirDefensas(tx, sistema);
    return creado.actualizado_en.toISOString();
  });
}

/** Sustituye un sistema por su versión actualizada, solo si `testigoIfMatch` coincide con su
 * `actualizado_en` actual (spec 033, E6/E7) — el testigo de concurrencia que
 * `docs/modelo-de-datos.md` documentó y que la spec 008 dejó pendiente. */
export async function actualizar(sistema: Sistema, testigoIfMatch: string): Promise<string> {
  comprobarRoster(sistema, await plantillaConfiable(sistema));
  return prisma.$transaction(async (tx) => {
    const actual = await tx.sistema.findUnique({ where: { id: sistema.id } });
    if (!actual) {
      throw new SistemaNoEncontrado(sistema.id);
    }
    if (actual.actualizado_en.toISOString() !== testigoIfMatch) {
      throw new ConflictoDeConcurrencia(sistema.id);
    }
    const actualizado = await tx.sistema.update({
      where: { id: sistema.id },
      data: { nombre: sistema.nombre, descripcion: sistema.descripcion ?? null, actualizado_en: new Date() },
    });
    for (const r of ROTACIONES) {
      await tx.sistema_rotacion.update({
        where: { sistema_id_rotacion: { sistema_id: sistema.id, rotacion: r } },
        data: {
          explicacion: sistema.explicacionesRotacion[r] ?? null,
          libero_sustituye_a: sistema.plantilla.libero?.sustitutosPorRotacion[r] ?? null,
        },
      });
    }
    await tx.formacion.deleteMany({ where: { sistema_id: sistema.id } }); // cascada: colocacion también
    await tx.formacion_defensa.deleteMany({ where: { sistema_id: sistema.id } }); // cascada: colocacion_defensa también
    await escribirFormaciones(tx, sistema);
    await escribirDefensas(tx, sistema);
    return actualizado.actualizado_en.toISOString();
  });
}

export async function borrar(id: string): Promise<void> {
  try {
    await prisma.sistema.delete({ where: { id } });
  } catch (error) {
    // P2025: Prisma no encontró la fila a borrar. Sin este catch, un id inexistente devolvía
    // 500 en vez de 404 — encontrado probando la API a mano, no lo cubría ningún escenario.
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: unknown }).code === 'P2025') {
      throw new SistemaNoEncontrado(id);
    }
    throw error;
  }
}
