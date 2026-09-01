import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { AccesoStore } from './application/acceso.store';
import { SistemaStore } from './application/sistema.store';
import { ES_DESARROLLO } from './entorno';
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
  // Distingue visualmente el despliegue de desarrollo del de producción (ADR 0044): ambos
  // sirven el mismo código, solo cambia esta constante en tiempo de compilación.
  protected readonly esDesarrollo = ES_DESARROLLO;

  constructor() {
    // El catálogo se pide en cuanto hay alguien identificado (spec 050) — al arrancar con una
    // sesión ya viva (E6), o justo después de entrar o crear cuenta desde la pantalla de acceso
    // (E2, E4). Nunca antes (E1): sin sesión, `AccesoStore.usuario()` se queda en `null` y este
    // efecto no llega a dispararse.
    effect(() => {
      if (this.acceso.usuario()) {
        void this.sistemaStore.cargar(this.acceso.equiposVisibles());
      }
    });
  }
}
