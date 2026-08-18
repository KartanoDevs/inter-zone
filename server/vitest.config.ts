import { defineConfig } from 'vitest/config';

// Tests de integración contra un Postgres real (spec 033): requieren `npm run db:up` y la
// migración aplicada. No entran en el `npm test` de la raíz — la regla 6 de
// docs/flujo-de-trabajo.md exige que la suite de domain/ siga por debajo del segundo, y aquí
// cada test habla con una base de datos de verdad.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    fileParallelism: false,
  },
});
