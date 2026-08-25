import { describe, expect, it } from 'vitest';
import { normalizarEmail, puedeEditarAlgo, puedeGestionarEquipo, resolverAltaDesdeInvitacion } from './acceso';

const EQUIPOS = ['masculino', 'femenino'] as const;

describe('acceso', () => {
  it('E1: dos formas de escribir el mismo correo cuentan como el mismo correo', () => {
    expect(normalizarEmail('  Entrenador@Club.com ')).toBe('entrenador@club.com');
  });

  it('E3: un correo invitado como admin nace admin, sin quedar ligado a ningún equipo', () => {
    const alta = resolverAltaDesdeInvitacion({ rol: 'admin', equipoId: null }, EQUIPOS);
    expect(alta).toEqual({ esAdmin: true, membresias: [] });
  });

  it('E4: un correo invitado como entrenador de un equipo nace entrenador solo de ese equipo', () => {
    const alta = resolverAltaDesdeInvitacion({ rol: 'entrenador', equipoId: 'femenino' }, EQUIPOS);
    expect(alta).toEqual({ esAdmin: false, membresias: [{ equipoId: 'femenino', rol: 'entrenador' }] });
  });

  it('E5: un correo invitado sin equipo asignado nace con el rol invitado en los dos equipos', () => {
    const alta = resolverAltaDesdeInvitacion({ rol: 'usuario', equipoId: null }, EQUIPOS);
    expect(alta).toEqual({
      esAdmin: false,
      membresias: [
        { equipoId: 'masculino', rol: 'usuario' },
        { equipoId: 'femenino', rol: 'usuario' },
      ],
    });
  });

  it('051-E3: el admin puede validar un sistema de cualquier equipo', () => {
    expect(puedeGestionarEquipo({ esAdmin: true, membresias: [] }, 'femenino')).toBe(true);
  });

  it('051-E2: un entrenador del equipo dueño puede validar el sistema', () => {
    const entrenador = { esAdmin: false, membresias: [{ equipoId: 'femenino', rol: 'entrenador' }] } as const;
    expect(puedeGestionarEquipo(entrenador, 'femenino')).toBe(true);
  });

  it('051-E4: un entrenador de otro equipo no puede validar ese sistema', () => {
    const entrenador = { esAdmin: false, membresias: [{ equipoId: 'masculino', rol: 'entrenador' }] } as const;
    expect(puedeGestionarEquipo(entrenador, 'femenino')).toBe(false);
  });

  it('051-E4: un usuario (no entrenador) de ese mismo equipo no puede validar', () => {
    const usuario = { esAdmin: false, membresias: [{ equipoId: 'femenino', rol: 'usuario' }] } as const;
    expect(puedeGestionarEquipo(usuario, 'femenino')).toBe(false);
  });

  it('037-E7: el admin puede editar algo, sin necesitar ninguna membresía', () => {
    expect(puedeEditarAlgo({ esAdmin: true, membresias: [] })).toBe(true);
  });

  it('037-E7: un entrenador de al menos un equipo puede editar algo', () => {
    const entrenador = { esAdmin: false, membresias: [{ equipoId: 'masculino', rol: 'entrenador' }] } as const;
    expect(puedeEditarAlgo(entrenador)).toBe(true);
  });

  it('037-E6: un usuario sin ninguna membresía de entrenador no puede editar nada', () => {
    const usuario = {
      esAdmin: false,
      membresias: [
        { equipoId: 'masculino', rol: 'usuario' },
        { equipoId: 'femenino', rol: 'usuario' },
      ],
    } as const;
    expect(puedeEditarAlgo(usuario)).toBe(false);
  });
});
