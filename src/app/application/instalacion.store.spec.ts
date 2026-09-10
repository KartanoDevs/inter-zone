import { describe, expect, it } from 'vitest';
import { debeAvisar } from './instalacion.store';

const AHORA = new Date('2026-09-10T12:00:00.000Z');

describe('debeAvisar', () => {
  it('nunca avisa si la app ya está instalada', () => {
    expect(debeAvisar(AHORA, null, true)).toBe(false);
  });

  it('avisa la primera vez, sin aviso previo', () => {
    expect(debeAvisar(AHORA, null, false)).toBe(true);
  });

  it('no avisa si el último aviso fue hace menos de 7 días', () => {
    const hace3Dias = new Date(AHORA.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(debeAvisar(AHORA, hace3Dias, false)).toBe(false);
  });

  it('avisa si el último aviso fue hace 7 días o más', () => {
    const hace7Dias = new Date(AHORA.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(debeAvisar(AHORA, hace7Dias, false)).toBe(true);
  });
});
