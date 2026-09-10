import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AccesoStore } from '../../application/acceso.store';
import { InsigniasStore } from '../../application/insignias.store';
import { SistemaStore } from '../../application/sistema.store';
import { estadoDe } from '../../domain/catalogo-sistemas';
import type { InsigniaGanada, ResumenDeMedallas } from '../../domain/insignias';
import { recuentoDeSistemas, resumenDeMedallas } from '../../domain/insignias';
import type { Sistema } from '../../domain/modelos';
import { Modal } from '../comun/modal';

/** Una pieza del mosaico: el sistema y su resumen de medallas ya calculado. `total` ordena el
 * mosaico (dominados primero, luego con alguna medalla, luego vacíos — spec 061, E12b). */
interface PiezaVitrina {
  readonly sistema: Sistema;
  readonly resumen: ResumenDeMedallas;
  readonly total: number;
}

type Tier = 'bronce' | 'plata' | 'oro';

const MEDALLA_SRC: Readonly<Record<Tier, string>> = {
  bronce: 'medals/bronze.png',
  plata: 'medals/silver.png',
  oro: 'medals/gold.png',
};

const TIER_NOMBRE: Readonly<Record<Tier, string>> = {
  bronce: 'Bronce',
  plata: 'Plata',
  oro: 'Oro',
};
const TIER_DESC: Readonly<Record<Tier, string>> = {
  bronce: 'Examen por puesto',
  plata: 'Examen por línea',
  oro: 'Examen de sistema completo',
};

/**
 * La vitrina de medallas de la ventana Cuenta (spec 061): un mosaico con una pieza por sistema
 * de recepción, cada una con las tres ranuras de medalla, y un panel de detalle al elegir una.
 * Toda la lógica —qué medallas tiene cada sistema, el recuento— vive en `domain/insignias.ts` y
 * está probada ahí; este componente solo la pinta.
 */
@Component({
  selector: 'app-vitrina-medallas',
  imports: [Modal],
  templateUrl: './vitrina-medallas.html',
  styleUrl: './vitrina-medallas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VitrinaMedallas {
  private readonly insigniasStore = inject(InsigniasStore);
  private readonly sistemaStore = inject(SistemaStore);
  private readonly acceso = inject(AccesoStore);

  protected readonly cargando = this.insigniasStore.cargando;
  protected readonly error = this.insigniasStore.error;
  protected readonly medallaSrc = MEDALLA_SRC;

  protected readonly tiers: readonly Tier[] = ['bronce', 'plata', 'oro'];

  /** El detalle abierto, o `null`. Guarda el id del elemento del mosaico que lo abrió para
   * devolverle el foco al cerrar (E17). */
  protected readonly detalle = signal<{
    readonly pieza: PiezaVitrina;
    readonly origenId: string;
  } | null>(null);

  /** Los sistemas de recepción que le tocan al usuario (spec 061, P3): todos si es admin —igual
   * que en el resto de la app, `puedeGestionarEquipo`—, o los de los equipos donde tiene
   * membresía si no. Una medalla cuyo sistema ya no está aquí (borrado, o sin validar desde la
   * spec 069) no tiene pieza (E20, 069-E2/E4). Solo sistemas **validados**: uno sin validar
   * —nunca lo estuvo, o se le retiró la validación después— no aparece aunque tenga medallas
   * ya ganadas; siguen guardadas (spec 056) y reaparecen intactas si se vuelve a validar
   * (069-E3). El filtro de equipo se aplica igual que siempre, sin cambios (069-E7). */
  private readonly sistemasDelUsuario = computed<readonly Sistema[]>(() => {
    const usuario = this.acceso.usuario();
    if (!usuario) {
      return [];
    }
    const recepcion = this.sistemaStore
      .sistemas()
      .filter((s) => s.tipo === 'recepcion' && estadoDe(s) === 'validado');
    if (usuario.esAdmin) {
      return recepcion;
    }
    const equipos = new Set(usuario.membresias.map((m) => m.equipoId));
    return recepcion.filter((s) => equipos.has(s.equipoId));
  });

  protected readonly piezas = computed<readonly PiezaVitrina[]>(() => {
    const insignias = this.insigniasStore.insignias();
    return this.sistemasDelUsuario()
      .map((sistema) => {
        const resumen = resumenDeMedallas(sistema.id, sistema.plantilla, insignias);
        return {
          sistema,
          resumen,
          total: resumen.bronce.length + resumen.plata.length + (resumen.oro ? 1 : 0),
        };
      })
      .sort(ordenar);
  });

  protected readonly recuento = computed(() =>
    recuentoDeSistemas(this.sistemasDelUsuario(), this.insigniasStore.insignias()),
  );

  /** Solo hay algo que enseñar si el usuario tiene al menos una medalla en un sistema visible
   * (E11). Un usuario sin equipos, o con equipos pero sin ninguna medalla, ve el mismo mensaje. */
  protected readonly vacia = computed(() => this.piezas().every((p) => p.total === 0));

  cargar(): void {
    void this.insigniasStore.cargar();
  }

  protected tieneMedalla(resumen: ResumenDeMedallas, tier: Tier): boolean {
    return tier === 'oro' ? resumen.oro !== null : resumen[tier].length > 0;
  }

  protected etiquetaPieza(pieza: PiezaVitrina): string {
    if (pieza.total === 0) {
      return `${pieza.sistema.nombre}: sin medallas todavía. Abrir detalle.`;
    }
    const ganadas = this.tiers
      .filter((t) => this.tieneMedalla(pieza.resumen, t))
      .map((t) => TIER_NOMBRE[t]);
    const dominado = pieza.resumen.dominado ? ', sistema dominado' : '';
    return `${pieza.sistema.nombre}: ${ganadas.join(', ')} conseguidas${dominado}. Abrir detalle.`;
  }

  protected abrirDetalle(pieza: PiezaVitrina): void {
    this.detalle.set({ pieza, origenId: idPieza(pieza) });
  }

  protected cerrarDetalle(): void {
    const origenId = this.detalle()?.origenId;
    this.detalle.set(null);
    if (origenId) {
      // El foco vuelve a la pieza de la que se salió (E17). En el siguiente tick, cuando el
      // overlay ya no está en el DOM.
      queueMicrotask(() => document.getElementById(origenId)?.focus());
    }
  }

  protected idPieza(pieza: PiezaVitrina): string {
    return idPieza(pieza);
  }

  protected tierNombre(tier: Tier): string {
    return TIER_NOMBRE[tier];
  }

  protected tierDesc(tier: Tier): string {
    return TIER_DESC[tier];
  }

  protected puestosDe(resumen: ResumenDeMedallas, tier: Tier): readonly string[] {
    return tier === 'oro' ? [] : resumen[tier];
  }

  protected fechaOro(resumen: ResumenDeMedallas): string | null {
    if (!resumen.oro) {
      return null;
    }
    return new Date(resumen.oro).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}

function idPieza(pieza: PiezaVitrina): string {
  return `vitrina-pieza-${pieza.sistema.id}`;
}

/** Dominados primero, luego los que tienen alguna medalla, luego los vacíos; a igualdad, por
 * nombre del sistema para que el orden sea estable (spec 061, E12b). */
function ordenar(a: PiezaVitrina, b: PiezaVitrina): number {
  const rango = (p: PiezaVitrina): number => (p.resumen.dominado ? 0 : p.total > 0 ? 1 : 2);
  return rango(a) - rango(b) || a.sistema.nombre.localeCompare(b.sistema.nombre, 'es');
}
