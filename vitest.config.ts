import { defineConfig } from 'vitest/config';

// Los tests de domain/ son TypeScript puro: sin Angular, sin DOM, sin plugins.
// Si un test de esta carpeta necesita jsdom o TestBed, es senal de que esa
// logica esta en la capa equivocada (ver docs/arquitectura.md).
export default defineConfig({
  test: {
    include: ['src/app/domain/**/*.spec.ts'],
    environment: 'node',
    globals: true,
  },
});
