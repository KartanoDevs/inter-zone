import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/**
 * Barra horizontal 0-10 en enteros, con una marca por valor, arrastrable con el puntero o con
 * las flechas del teclado (Home/End para los extremos). Misma semántica que `Knob` — mismo
 * valor, mismos eventos — en un formato lineal en vez de circular, para comparar los dos (spec
 * 045: "en lugar de solo el knob, quiero ver cómo se hace con otra barra").
 */
@Component({
  selector: 'app-barra',
  imports: [],
  templateUrl: './barra.html',
  styleUrl: './barra.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'slider',
    tabindex: '0',
    'aria-valuemin': '0',
    'aria-valuemax': '10',
    '[attr.aria-label]': 'etiqueta()',
    '[attr.aria-valuenow]': 'valor()',
    '(pointerdown)': 'iniciarArrastre($event)',
    '(keydown)': 'onTecla($event)',
  },
})
export class Barra {
  readonly valor = input.required<number>();
  readonly etiqueta = input('');

  readonly valorCambiado = output<number>();

  protected readonly marcas = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  protected readonly porcentaje = computed(() => (this.valor() / 10) * 100);

  private valorDeX(el: HTMLElement, clientX: number): number {
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * 10;
  }

  protected iniciarArrastre(evento: PointerEvent): void {
    const el = evento.currentTarget as HTMLElement;
    el.setPointerCapture(evento.pointerId);
    this.valorCambiado.emit(this.valorDeX(el, evento.clientX));

    const mover = (e: PointerEvent): void => {
      this.valorCambiado.emit(this.valorDeX(el, e.clientX));
    };
    const soltar = (e: PointerEvent): void => {
      el.releasePointerCapture(e.pointerId);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerup', soltar);
      el.removeEventListener('pointercancel', soltar);
    };
    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
  }

  protected onTecla(evento: KeyboardEvent): void {
    const actual = this.valor();
    if (evento.key === 'ArrowUp' || evento.key === 'ArrowRight') {
      this.valorCambiado.emit(actual + 1);
    } else if (evento.key === 'ArrowDown' || evento.key === 'ArrowLeft') {
      this.valorCambiado.emit(actual - 1);
    } else if (evento.key === 'Home') {
      this.valorCambiado.emit(0);
    } else if (evento.key === 'End') {
      this.valorCambiado.emit(10);
    } else {
      return;
    }
    evento.preventDefault();
  }
}
