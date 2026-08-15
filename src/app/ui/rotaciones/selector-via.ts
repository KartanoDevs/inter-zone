import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { ViaAtaque } from '../../domain/modelos';

const ETIQUETAS: Readonly<Record<ViaAtaque, string>> = { z2: 'Zona 2', z3: 'Zona 3', z4: 'Zona 4', pipe: 'Pipe' };
const VIAS: readonly ViaAtaque[] = ['z2', 'z3', 'z4', 'pipe'];

/**
 * Pestañas de la vía de ataque activa, solo para sistemas de defensa (spec 021). Orden de
 * izquierda a derecha igual que se lee la pista: zona 2 (nuestra izquierda), zona 3 (centro),
 * zona 4 (nuestra derecha), y el pipe al final.
 */
@Component({
  selector: 'app-selector-via',
  imports: [],
  templateUrl: './selector-via.html',
  styleUrl: './selector-via.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorVia {
  readonly viaActiva = input.required<ViaAtaque>();

  readonly seleccionar = output<ViaAtaque>();

  protected readonly vias = VIAS;
  protected readonly etiquetas = ETIQUETAS;
}
