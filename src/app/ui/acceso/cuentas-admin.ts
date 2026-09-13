import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { UsuarioListado } from '../../domain/acceso';
import { UsuariosStore } from '../../application/usuarios.store';
import { DialogoConfirmacion } from '../comun/dialogo-confirmacion';

/**
 * Las cuentas existentes del admin (spec 068): verlas y borrarlas de forma definitiva.
 * Antes vivía pegada a la lista blanca en el mismo componente; se separó al dar a cada
 * vista su propio hueco en el menú de admin. Sin componente de test, como el resto de
 * `ui/` — la lógica ya está probada en `UsuariosStore`.
 */
@Component({
  selector: 'app-cuentas-admin',
  imports: [DialogoConfirmacion],
  templateUrl: './cuentas-admin.html',
  styleUrl: './cuentas-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CuentasAdmin {
  protected readonly usuarios = inject(UsuariosStore);

  protected readonly borrando = signal<UsuarioListado | null>(null);

  constructor() {
    void this.usuarios.cargar();
  }

  protected pedirBorrado(usuario: UsuarioListado): void {
    this.borrando.set(usuario);
  }

  protected cancelarBorrado(): void {
    this.borrando.set(null);
  }

  protected async confirmarBorrado(): Promise<void> {
    const usuario = this.borrando();
    if (!usuario) {
      return;
    }
    await this.usuarios.borrar(usuario.id);
    this.borrando.set(null);
  }
}
