import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { AccesoStore } from './application/acceso.store';
import { SistemaStore } from './application/sistema.store';
import { PantallaAcceso } from './ui/acceso/pantalla-acceso';
import { Tablero } from './ui/tablero/tablero';

@Component({
  selector: 'app-root',
  imports: [Tablero, PantallaAcceso],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly acceso = inject(AccesoStore);
  private readonly sistemaStore = inject(SistemaStore);

  constructor() {
    // El catálogo se pide en cuanto hay alguien identificado (spec 050) — al arrancar con una
    // sesión ya viva (E6), o justo después de entrar o crear cuenta desde la pantalla de acceso
    // (E2, E4). Nunca antes (E1): sin sesión, `AccesoStore.usuario()` se queda en `null` y este
    // efecto no llega a dispararse.
    effect(() => {
      if (this.acceso.usuario()) {
        void this.sistemaStore.cargar();
      }
    });
  }
}
