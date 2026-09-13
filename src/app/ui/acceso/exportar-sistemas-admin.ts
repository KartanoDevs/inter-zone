import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { EquipoId, TipoSistema } from '../../domain/modelos';
import { EQUIPOS, NOMBRE_EQUIPO } from '../../domain/equipos';
import { SistemaStore } from '../../application/sistema.store';

const NOMBRE_TIPO: Readonly<Record<TipoSistema, string>> = {
  recepcion: 'Recepción',
  defensa: 'Defensa',
};

type ResultadoImportacion = 'ok' | 'conflicto' | 'invalido';

/**
 * Exportar/importar sistemas en JSON (spec 071): dos bloques independientes en la ventana de
 * admin. Exportar nunca depende del sistema o el equipo activo del editor (E11): lee el
 * catálogo entero del store, no `catalogo()`, que solo enseña el equipo activo. Sin componente
 * de test propio, como el resto de `ui/acceso/` — la lógica de negocio está probada en
 * `SistemaStore`/`catalogo-sistemas`.
 */
@Component({
  selector: 'app-exportar-sistemas-admin',
  templateUrl: './exportar-sistemas-admin.html',
  styleUrl: './exportar-sistemas-admin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExportarSistemasAdmin {
  protected readonly store = inject(SistemaStore);
  protected readonly equipos = EQUIPOS;
  protected readonly nombreEquipo = NOMBRE_EQUIPO;
  protected readonly nombreTipo = NOMBRE_TIPO;

  protected readonly equipoExportar = signal<EquipoId>(EQUIPOS[0]);
  protected readonly sistemaExportarId = signal<string | null>(null);

  protected readonly sistemasDelEquipoExportar = computed(() =>
    this.store.sistemas().filter((s) => s.equipoId === this.equipoExportar()),
  );

  protected readonly equipoImportar = signal<EquipoId>(EQUIPOS[0]);
  protected readonly textoImportar = signal('');
  protected readonly errorImportar = signal<string | null>(null);
  protected readonly conflictoImportar = signal<{ readonly nombreSugerido: string } | null>(null);
  protected readonly importando = signal(false);

  protected readonly sistemaDetectado = computed(() => {
    try {
      const datos = JSON.parse(this.textoImportar()) as { nombre?: unknown; tipo?: unknown };
      if (typeof datos.nombre === 'string' && typeof datos.tipo === 'string') {
        return { nombre: datos.nombre, tipo: datos.tipo as TipoSistema };
      }
    } catch {
      // texto todavía no es JSON válido: no hay nada que detectar todavía.
    }
    return null;
  });

  protected seleccionarEquipoExportar(equipoId: string): void {
    this.equipoExportar.set(equipoId as EquipoId);
    this.sistemaExportarId.set(this.sistemasDelEquipoExportar()[0]?.id ?? null);
  }

  protected seleccionarEquipoImportar(equipoId: string): void {
    this.equipoImportar.set(equipoId as EquipoId);
  }

  protected seleccionarSistemaExportar(id: string): void {
    this.sistemaExportarId.set(id);
  }

  protected exportar(): void {
    const id = this.sistemaExportarId();
    if (!id) {
      return;
    }
    const json = this.store.exportar(id);
    if (!json) {
      return;
    }
    const sistema = this.store.sistemas().find((s) => s.id === id);
    const nombreFichero = `${sistema?.nombre ?? 'sistema'}.json`;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombreFichero;
    enlace.click();
    URL.revokeObjectURL(url);
  }

  protected async cargarFichero(input: HTMLInputElement): Promise<void> {
    const fichero = input.files?.[0];
    if (!fichero) {
      return;
    }
    this.textoImportar.set(await fichero.text());
    this.errorImportar.set(null);
    this.conflictoImportar.set(null);
    input.value = '';
  }

  protected actualizarTexto(texto: string): void {
    this.textoImportar.set(texto);
    this.errorImportar.set(null);
    this.conflictoImportar.set(null);
  }

  protected async importar(nombreNuevo?: string): Promise<void> {
    const json = this.textoImportar();
    if (!json.trim()) {
      return;
    }
    this.importando.set(true);
    const resultado: ResultadoImportacion = await this.store.importar(
      json,
      this.equipoImportar(),
      nombreNuevo,
    );
    this.importando.set(false);
    if (resultado === 'invalido') {
      this.errorImportar.set('El fichero no es un sistema válido.');
      this.conflictoImportar.set(null);
      return;
    }
    if (resultado === 'conflicto') {
      const nombre = nombreNuevo ?? this.sistemaDetectado()?.nombre ?? '';
      this.conflictoImportar.set({ nombreSugerido: `${nombre} (importado)` });
      this.errorImportar.set(null);
      return;
    }
    this.errorImportar.set(null);
    this.conflictoImportar.set(null);
    this.textoImportar.set('');
  }

  protected cancelarConflicto(): void {
    this.conflictoImportar.set(null);
  }
}
