import type { ConfiguracionRoles, OrdenSaque, PlantillaEquipo } from './modelos';
import { validarPlantilla } from './plantilla';

export function puedeCrearPlantillaEquipo(
  nombre: string,
  ordenSaque: OrdenSaque,
  configuracion: ConfiguracionRoles,
  existentes: readonly PlantillaEquipo[],
): boolean {
  return (
    nombre.length > 0 &&
    !existentes.some((plantilla) => plantilla.nombre === nombre) &&
    validarPlantilla(ordenSaque, configuracion)
  );
}

export function puedeBorrarPlantillaEquipo(estaEnUso: boolean): boolean {
  return !estaEnUso;
}
