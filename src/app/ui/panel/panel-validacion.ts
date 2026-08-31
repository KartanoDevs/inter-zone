import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { TipoComparacion } from '../../domain/modelos';

export interface ItemValidacion {
  readonly tipo: TipoComparacion;
  readonly etiquetas: readonly string[];
}

/**
 * Badge flotante sobre el campo. Traduce `infracciones`/`avisos` de `validarFormacion`
 * a una pastilla compacta; no decide qué es infracción ni qué es aviso. No se muestra
 * nada mientras falten jugadores por colocar, ni cuando la rotación es legal y limpia.
 */
@Component({
  selector: 'app-panel-validacion',
  imports: [],
  templateUrl: './panel-validacion.html',
  styleUrl: './panel-validacion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelValidacion {
  readonly completo = input.required<boolean>();
  readonly infracciones = input.required<readonly ItemValidacion[]>();
  readonly avisos = input.required<readonly ItemValidacion[]>();

  protected readonly hayFalta = computed(() => this.completo() && this.infracciones().length > 0);
  protected readonly hayAviso = computed(
    () => this.completo() && !this.hayFalta() && this.avisos().length > 0,
  );
  protected readonly visible = computed(() => this.hayFalta() || this.hayAviso());

  protected readonly etiquetas = computed(() => {
    const items = this.hayFalta() ? this.infracciones() : this.avisos();
    const todas = items.flatMap((item) => item.etiquetas);
    return Array.from(new Set(todas)).join(' · ');
  });
}
