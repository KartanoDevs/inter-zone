// `ENTORNO_APP` la sustituye esbuild en compilación (angular.json, opción `define`; ADR 0044).
// Fuera del builder de Angular (Vitest, `tsc`) la constante no existe: el `typeof` evita un
// `ReferenceError` y el valor cae a `false`, que es lo correcto para tests y typecheck.
declare const ENTORNO_APP: string | undefined;

export const ES_DESARROLLO = typeof ENTORNO_APP !== 'undefined' && ENTORNO_APP === 'desarrollo';
