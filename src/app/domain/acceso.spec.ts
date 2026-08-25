import { describe, expect, it } from 'vitest';
import { normalizarEmail, resolverAltaDesdeInvitacion } from './acceso';

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
});
