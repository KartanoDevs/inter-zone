import { computed, signal } from '@angular/core';
import type { Formacion, OrdenSaque, Punto, Sistema } from '../domain/modelos';
import type { SistemaRepository } from '../domain/puertos';
import { ordenarCatalogo } from '../domain/catalogo-sistemas';
import { guardarFormacion } from '../domain/sistema-recepcion';
import { validarFormacion } from '../domain/validacion';

export type RotacionValida = 1 | 2 | 3 | 4 | 5 | 6;

type CambioPendiente = { readonly tipo: 'rotacion'; readonly valor: RotacionValida } | { readonly tipo: 'sistema'; readonly valor: string };

function formacionesIguales(a: Formacion, b: Formacion): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const puntoPorId = new Map(b.map((c) => [c.jugador.id, c.punto]));
  return a.every((c) => {
    const punto = puntoPorId.get(c.jugador.id);
    return punto !== undefined && punto.x === c.punto.x && punto.y === c.punto.y;
  });
}

/**
 * Estado de la pizarra. Toda la lógica vive aquí, en TypeScript con signals, sin DOM
 * (docs/arquitectura.md). `borrador` es la formación en edición de la rotación activa: se
 * carga desde lo guardado del sistema al activar un sistema o cambiar de rotación, y solo se
 * confirma en `sistema.formaciones` (y se persiste) al llamar a `guardar()`.
 */
export class SistemaStore {
  readonly sistemas = signal<readonly Sistema[]>([]);
  readonly sistemaActivoId = signal<string | null>(null);
  readonly rotacionActiva = signal<RotacionValida>(1);
  readonly borrador = signal<Formacion>([]);
  readonly cambioPendiente = signal<CambioPendiente | null>(null);

  readonly sistemaActivo = computed(() => this.sistemas().find((s) => s.id === this.sistemaActivoId()) ?? null);

  readonly ordenActivo = computed<OrdenSaque | null>(() => this.sistemaActivo()?.plantilla.ordenSaque ?? null);

  readonly formacionGuardadaActiva = computed<Formacion>(
    () => this.sistemaActivo()?.formaciones[this.rotacionActiva()] ?? [],
  );

  readonly hayCambiosSinGuardar = computed(() => !formacionesIguales(this.borrador(), this.formacionGuardadaActiva()));

  readonly resultadoValidacion = computed(() => {
    const orden = this.ordenActivo();
    const borrador = this.borrador();
    return orden && borrador.length === 6 ? validarFormacion(borrador, orden, this.rotacionActiva()) : null;
  });

  readonly puedeGuardar = computed(() => this.resultadoValidacion()?.infracciones.length === 0);

  constructor(private readonly repositorio: SistemaRepository) {
    const catalogo = ordenarCatalogo(repositorio.listar());
    this.sistemas.set(catalogo);
    this.sistemaActivoId.set(catalogo[0]?.id ?? null);
    this.cargarBorrador();
  }

  activarSistema(id: string): void {
    if (id === this.sistemaActivoId()) {
      return;
    }
    if (this.hayCambiosSinGuardar()) {
      this.cambioPendiente.set({ tipo: 'sistema', valor: id });
      return;
    }
    this.sistemaActivoId.set(id);
    this.rotacionActiva.set(1);
    this.cargarBorrador();
  }

  seleccionarRotacion(rotacion: RotacionValida): void {
    if (rotacion === this.rotacionActiva()) {
      return;
    }
    if (this.hayCambiosSinGuardar()) {
      this.cambioPendiente.set({ tipo: 'rotacion', valor: rotacion });
      return;
    }
    this.rotacionActiva.set(rotacion);
    this.cargarBorrador();
  }

  confirmarCambio(): void {
    const pendiente = this.cambioPendiente();
    if (!pendiente) {
      return;
    }
    this.cambioPendiente.set(null);
    if (pendiente.tipo === 'rotacion') {
      this.rotacionActiva.set(pendiente.valor);
    } else {
      this.sistemaActivoId.set(pendiente.valor);
      this.rotacionActiva.set(1);
    }
    this.cargarBorrador();
  }

  cancelarCambio(): void {
    this.cambioPendiente.set(null);
  }

  colocarOMover(jugadorId: string, punto: Punto): void {
    const jugador = this.ordenActivo()?.find((j) => j.id === jugadorId);
    if (!jugador) {
      return;
    }
    this.borrador.update((formacion) => [...formacion.filter((c) => c.jugador.id !== jugadorId), { jugador, punto }]);
  }

  quitar(jugadorId: string): void {
    this.borrador.update((formacion) => formacion.filter((c) => c.jugador.id !== jugadorId));
  }

  vaciar(): void {
    this.borrador.set([]);
  }

  guardar(): void {
    const sistema = this.sistemaActivo();
    if (!sistema || !this.puedeGuardar()) {
      return;
    }
    const guardado = guardarFormacion(sistema, this.rotacionActiva(), this.borrador());
    if (!guardado) {
      return;
    }
    this.sistemas.update((lista) => lista.map((s) => (s.id === guardado.id ? guardado : s)));
    this.repositorio.guardar(this.sistemas());
    this.cargarBorrador();
  }

  private cargarBorrador(): void {
    this.borrador.set(this.formacionGuardadaActiva());
  }
}
