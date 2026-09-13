import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AccesoStore } from '../../application/acceso.store';

type Modo = 'entrar' | 'crear-cuenta';

/**
 * Pantalla de entrar / crear cuenta (spec 050). Sin `TestBed`: se verifica mirándola, como el
 * resto de `ui/` — la lógica que importa (qué hace `entrar`/`crearCuenta` con la respuesta del
 * servidor) ya está probada en `AccesoStore`.
 */
@Component({
  selector: 'app-pantalla-acceso',
  templateUrl: './pantalla-acceso.html',
  styleUrl: './pantalla-acceso.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PantallaAcceso {
  protected readonly store = inject(AccesoStore);
  protected readonly modo = signal<Modo>('entrar');
  protected readonly enviando = signal(false);

  protected cambiarModo(modo: Modo): void {
    this.modo.set(modo);
    this.store.error.set(null);
  }

  protected async enviar(
    email: string,
    contrasena: string,
    repetirContrasena?: string,
  ): Promise<void> {
    if (this.modo() === 'crear-cuenta' && contrasena !== repetirContrasena) {
      return;
    }
    this.enviando.set(true);
    try {
      if (this.modo() === 'entrar') {
        await this.store.entrar(email, contrasena);
      } else {
        await this.store.crearCuenta(email, contrasena);
      }
    } finally {
      this.enviando.set(false);
    }
  }
}
