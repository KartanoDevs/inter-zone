import { computed, signal } from '@angular/core';
import { SistemaStore } from './sistema.store';

const SIETE_DIAS_MS = 7 * 24 * 60 * 60 * 1000;

/** Si toca avisar de instalar la app: nunca si ya está instalada; sí la primera vez
 * (`ultimoAviso === null`); si no, solo cuando han pasado al menos 7 días desde el último
 * aviso. Función pura para poder probarla sin `matchMedia` ni fechas reales. */
export function debeAvisar(ahora: Date, ultimoAviso: string | null, instalado: boolean): boolean {
  if (instalado) {
    return false;
  }
  if (ultimoAviso === null) {
    return true;
  }
  return ahora.getTime() - new Date(ultimoAviso).getTime() >= SIETE_DIAS_MS;
}

/** El navegador ya sirve la app en modo standalone: instalada de verdad, no solo instalable.
 * `navigator.standalone` es la variante de iOS/Safari, que no soporta `display-mode`. */
function appInstalada(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const enStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (navigator as { standalone?: boolean }).standalone === true;
  return enStandalone || iosStandalone;
}

/** iOS/Safari nunca dispara `beforeinstallprompt`: no hay prompt nativo que ofrecer, así que
 * el diálogo enseña los pasos manuales (Compartir → Añadir a pantalla de inicio) en su lugar. */
function esIOS(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !('MSStream' in window);
}

interface EventoInstalacion extends Event {
  prompt(): Promise<void>;
}

/**
 * Aviso de instalación de la PWA (spec posterior a la 067): se muestra tras iniciar sesión si
 * la app no está instalada, la primera vez y luego cada 7 días. Sin decorador de Angular, mismo
 * patrón que `TeoriaStore`/`ExamenStore` — instanciable con `new InstalacionStore(sistemaStore)`
 * y testeable sin `TestBed`. El "cuándo se avisó por última vez" vive en `SistemaStore`
 * (comparte el blob de `Ajustes`/localStorage) para no crear un repositorio nuevo para un solo
 * campo.
 */
export class InstalacionStore {
  private readonly eventoPendiente = signal<EventoInstalacion | null>(null);
  private readonly instalada = signal(appInstalada());
  private readonly cerrado = signal(false);

  readonly esIOS = esIOS();

  constructor(private readonly sistemaStore: SistemaStore) {
    if (typeof window === 'undefined') {
      return;
    }
    window.addEventListener('beforeinstallprompt', (evento) => {
      evento.preventDefault();
      this.eventoPendiente.set(evento as EventoInstalacion);
    });
    window.addEventListener('appinstalled', () => {
      this.instalada.set(true);
      this.eventoPendiente.set(null);
    });
  }

  readonly puedeInstalar = computed(() => this.eventoPendiente() !== null);

  readonly visible = computed(() => {
    if (this.cerrado()) {
      return false;
    }
    if (!this.esIOS && !this.puedeInstalar()) {
      return false;
    }
    return debeAvisar(new Date(), this.sistemaStore.ultimoAvisoInstalacion(), this.instalada());
  });

  async instalar(): Promise<void> {
    const evento = this.eventoPendiente();
    if (!evento) {
      return;
    }
    this.eventoPendiente.set(null);
    await evento.prompt();
    await this.cerrar();
  }

  async cerrar(): Promise<void> {
    this.cerrado.set(true);
    await this.sistemaStore.registrarAvisoInstalacion(new Date().toISOString());
  }
}
