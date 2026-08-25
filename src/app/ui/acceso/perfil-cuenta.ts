import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { RolId } from '../../domain/modelos';
import { CONFIGURACION_ROLES_POR_DEFECTO } from '../../domain/roles';
import { AccesoStore } from '../../application/acceso.store';
import { Modal } from '../comun/modal';

interface OpcionRol {
  readonly id: RolId;
  readonly nombre: string;
}

const OPCIONES_ROL: readonly OpcionRol[] = (Object.keys(CONFIGURACION_ROLES_POR_DEFECTO) as RolId[]).map((id) => ({
  id,
  nombre: CONFIGURACION_ROLES_POR_DEFECTO[id].nombre,
}));

/**
 * La ventana "Cuenta" real (spec 053): correo y rol de solo lectura, los tres campos de perfil
 * opcionales, y cambiar la contraseña en un modal aparte. Sin componente de test — como el
 * resto de `ui/` — la lógica de guardado ya está probada en `AccesoStore`.
 */
@Component({
  selector: 'app-perfil-cuenta',
  imports: [Modal],
  templateUrl: './perfil-cuenta.html',
  styleUrl: './perfil-cuenta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilCuenta {
  protected readonly acceso = inject(AccesoStore);
  protected readonly opcionesRol = OPCIONES_ROL;

  protected readonly guardando = signal(false);
  protected readonly guardado = signal(false);
  protected readonly cambiandoContrasena = signal(false);
  protected readonly errorContrasena = signal<string | null>(null);

  /** Global (`admin`) o el más alto de sus membresías — una cuenta con `entrenador` en un
   * equipo y `usuario` en otro se enseña como "Entrenador": ese es el rol que de verdad importa
   * para saber qué puede hacer. */
  protected readonly etiquetaRol = computed(() => {
    const usuario = this.acceso.usuario();
    if (!usuario) {
      return '';
    }
    if (usuario.esAdmin) {
      return 'Admin';
    }
    return usuario.membresias.some((m) => m.rol === 'entrenador') ? 'Entrenador' : 'Usuario';
  });

  protected async guardarPerfil(nombre: string, posicionFavorita: string, dorsal: string): Promise<void> {
    this.guardando.set(true);
    this.guardado.set(false);
    const exito = await this.acceso.actualizarPerfil({
      nombre: nombre.trim() === '' ? null : nombre,
      posicionFavorita: posicionFavorita === '' ? null : (posicionFavorita as RolId),
      dorsal: dorsal.trim() === '' ? null : Number(dorsal),
    });
    this.guardando.set(false);
    this.guardado.set(exito);
  }

  protected abrirCambioContrasena(): void {
    this.errorContrasena.set(null);
    this.cambiandoContrasena.set(true);
  }

  protected cerrarCambioContrasena(): void {
    this.cambiandoContrasena.set(false);
  }

  protected async guardarContrasena(actual: string, nueva: string, repetir: string): Promise<void> {
    if (nueva !== repetir) {
      this.errorContrasena.set('Las dos contraseñas no coinciden');
      return;
    }
    const exito = await this.acceso.cambiarContrasena(actual, nueva);
    if (exito) {
      this.cambiandoContrasena.set(false);
    } else {
      this.errorContrasena.set(this.acceso.error());
    }
  }
}
