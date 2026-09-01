import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { RolId } from '../../domain/modelos';
import { NOMBRE_EQUIPO } from '../../domain/equipos';
import { CONFIGURACION_ROLES_POR_DEFECTO } from '../../domain/roles';
import { AccesoStore } from '../../application/acceso.store';
import { InsigniasStore } from '../../application/insignias.store';
import { Modal } from '../comun/modal';
import { VitrinaMedallas } from './vitrina-medallas';

type VistaCuenta = 'datos' | 'logros';

interface OpcionRol {
  readonly id: RolId;
  readonly nombre: string;
}

const OPCIONES_ROL: readonly OpcionRol[] = (
  Object.keys(CONFIGURACION_ROLES_POR_DEFECTO) as RolId[]
).map((id) => ({
  id,
  nombre: CONFIGURACION_ROLES_POR_DEFECTO[id].nombre,
}));

/**
 * La ventana "Cuenta" real (spec 053, ampliada por la 061): un conmutador de dos vistas —"Datos
 * usuario" (correo y rol de solo lectura, los tres campos de perfil, cambiar contraseña) y
 * "Logros" (la vitrina de medallas)—. Sin componente de test — como el resto de `ui/` — la
 * lógica de guardado ya está probada en `AccesoStore` y la de las medallas en `domain/insignias`.
 */
@Component({
  selector: 'app-perfil-cuenta',
  imports: [Modal, VitrinaMedallas],
  templateUrl: './perfil-cuenta.html',
  styleUrl: './perfil-cuenta.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PerfilCuenta {
  protected readonly acceso = inject(AccesoStore);
  private readonly insignias = inject(InsigniasStore);
  protected readonly opcionesRol = OPCIONES_ROL;

  /** Qué vista se ve. Empieza en "datos" (E8). Cambiar de vista no toca los campos del
   * formulario, que están sin ligar a signals, así que un cambio sin guardar sobrevive (E9). */
  protected readonly vista = signal<VistaCuenta>('datos');

  protected readonly guardando = signal(false);
  protected readonly guardado = signal(false);
  protected readonly cambiandoContrasena = signal(false);
  protected readonly errorContrasena = signal<string | null>(null);

  /** Cambia de vista y, la primera vez que se abre "Logros", pide las medallas al servidor —
   * nunca al abrir la ventana Cuenta, que casi siempre se abre para "Datos usuario". */
  protected verVista(vista: VistaCuenta): void {
    this.vista.set(vista);
    if (vista === 'logros' && !this.insignias.cargadas() && !this.insignias.cargando()) {
      void this.insignias.cargar();
    }
  }

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

  /** A qué equipo(s) pertenece la cuenta (spec 064): junto a la etiqueta de rol. Un admin
   * enseña los dos; una cuenta con una sola membresía, ese equipo. Se apoya en
   * `AccesoStore.equiposVisibles`, que ya resuelve "admin = los dos". */
  protected readonly etiquetasEquipo = computed(() =>
    this.acceso.equiposVisibles().map((equipo) => NOMBRE_EQUIPO[equipo]),
  );

  protected async guardarPerfil(
    nombre: string,
    posicionFavorita: string,
    dorsal: string,
  ): Promise<void> {
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
