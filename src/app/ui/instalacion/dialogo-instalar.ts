import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Modal } from '../comun/modal';
import { InstalacionStore } from '../../application/instalacion.store';

/**
 * Aviso de instalación de la PWA (spec posterior a la 067): se muestra desde `App` cuando
 * `InstalacionStore.visible()` lo pide. Con prompt nativo disponible (Android/Chrome), un botón
 * dispara `beforeinstallprompt`; en iOS/Safari, que nunca ofrece ese prompt, se enseñan los
 * pasos manuales de "Compartir → Añadir a pantalla de inicio" en su lugar.
 */
@Component({
  selector: 'app-dialogo-instalar',
  imports: [Modal],
  templateUrl: './dialogo-instalar.html',
  styleUrl: './dialogo-instalar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogoInstalar {
  protected readonly store = inject(InstalacionStore);

  protected instalar(): void {
    void this.store.instalar();
  }

  protected cerrar(): void {
    void this.store.cerrar();
  }
}
