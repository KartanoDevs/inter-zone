import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { EquipoId } from '../../domain/modelos';
import type { RolAcceso, UsuarioListado } from '../../domain/acceso';
import { EQUIPOS, NOMBRE_EQUIPO } from '../../domain/equipos';
import { ListaBlancaStore } from '../../application/lista-blanca.store';
import { UsuariosStore } from '../../application/usuarios.store';
import { DialogoConfirmacion } from '../comun/dialogo-confirmacion';

/**
 * La lista blanca del admin (spec 054): invitar un correo con rol y equipo, ver qué invitaciones
 * siguen pendientes y cuáles ya se usaron, y retirar una. También la lista de cuentas existentes
 * y su borrado definitivo (spec 068) — misma pantalla de administración, otro store. Sin
 * componente de test, como el resto de `ui/` — la lógica ya está probada en `ListaBlancaStore` y
 * `UsuariosStore`.
 */
@Component({
  selector: 'app-lista-blanca-admin',
  imports: [DialogoConfirmacion],
  templateUrl: './lista-blanca-admin.html',
  styleUrl: './lista-blanca-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ListaBlancaAdmin {
  protected readonly store = inject(ListaBlancaStore);
  protected readonly usuarios = inject(UsuariosStore);
  protected readonly equipos = EQUIPOS;
  protected readonly nombreEquipo = NOMBRE_EQUIPO;

  protected readonly invitando = signal(false);
  protected readonly retirando = signal<string | null>(null);
  protected readonly borrando = signal<UsuarioListado | null>(null);

  constructor() {
    void this.store.cargar();
    void this.usuarios.cargar();
  }

  protected async invitar(
    campoEmail: HTMLInputElement,
    rol: string,
    equipoId: string,
  ): Promise<void> {
    this.invitando.set(true);
    const exito = await this.store.invitar(
      campoEmail.value,
      rol as RolAcceso,
      equipoId === '' ? null : (equipoId as EquipoId),
    );
    this.invitando.set(false);
    if (exito) {
      campoEmail.value = '';
    }
  }

  protected pedirRetiro(email: string): void {
    this.retirando.set(email);
  }

  protected cancelarRetiro(): void {
    this.retirando.set(null);
  }

  protected async confirmarRetiro(): Promise<void> {
    const email = this.retirando();
    if (!email) {
      return;
    }
    await this.store.retirar(email);
    this.retirando.set(null);
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
