import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal } from '@angular/core';

export type IconoSpeeddial = 'nuevo' | 'lapiz' | 'clonar' | 'papelera';

export interface AccionSpeeddial {
  readonly id: string;
  readonly etiqueta: string;
  readonly icono: IconoSpeeddial;
  readonly peligro?: boolean;
  readonly deshabilitada?: boolean;
}

/**
 * Botón flotante que despliega un puñado de acciones en columna. Genérico: no sabe qué
 * significa "nuevo sistema" o "borrar" — solo pinta lo que le llega y avisa de cuál se ha
 * elegido. Sustituye a los botones sueltos que antes vivían en `BarraSistemas`.
 */
@Component({
  selector: 'app-speeddial',
  imports: [],
  templateUrl: './speeddial.html',
  styleUrl: './speeddial.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'cerrar()',
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class Speeddial {
  readonly acciones = input.required<readonly AccionSpeeddial[]>();

  readonly elegir = output<string>();

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly abierto = signal(false);

  protected alternar(): void {
    this.abierto.update((valor) => !valor);
  }

  protected elegirAccion(accion: AccionSpeeddial): void {
    if (accion.deshabilitada) {
      return;
    }
    this.abierto.set(false);
    this.elegir.emit(accion.id);
  }

  protected cerrar(): void {
    this.abierto.set(false);
  }

  protected onDocumentClick(evento: MouseEvent): void {
    if (this.abierto() && !this.elementRef.nativeElement.contains(evento.target as Node)) {
      this.abierto.set(false);
    }
  }

  protected desplazamiento(indice: number): string {
    return `${58 + indice * 52}px`;
  }

  protected retardo(indice: number): string {
    return `${indice * 35}ms`;
  }
}
