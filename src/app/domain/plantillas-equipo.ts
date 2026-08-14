import type { ConfiguracionRoles, OrdenSaque, PlantillaEquipo, SustitucionLibero } from './modelos';
import { validarPlantilla } from './plantilla';

export function puedeCrearPlantillaEquipo(
  nombre: string,
  ordenSaque: OrdenSaque,
  configuracion: ConfiguracionRoles,
  existentes: readonly PlantillaEquipo[],
  libero?: SustitucionLibero,
): boolean {
  return (
    nombre.length > 0 &&
    !existentes.some((plantilla) => plantilla.nombre === nombre) &&
    validarPlantilla(ordenSaque, configuracion) &&
    (libero === undefined || ordenSaque.some((jugador) => jugador.id === libero.sustituidoId))
  );
}

export function puedeBorrarPlantillaEquipo(estaEnUso: boolean): boolean {
  return !estaEnUso;
}
