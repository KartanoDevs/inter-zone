// Instala los hooks versionados de `.githooks/` en `.git/hooks/`, sin pisar los que ya
// hubiera de otras herramientas (graphify instala post-commit/post-checkout ahí). Se ejecuta
// solo en `npm install` (script `prepare`) y con `npm run hooks:install`.
//
// No usa `core.hooksPath` a propósito: eso desactivaría los hooks de graphify, que viven
// directamente en `.git/hooks/`.

import { existsSync, mkdirSync, readdirSync, copyFileSync, chmodSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = join(RAIZ, '.githooks');
const DESTINO = join(RAIZ, '.git', 'hooks');

if (!existsSync(join(RAIZ, '.git'))) {
  // Checkout sin `.git` (tarball, worktree raro): no hay nada que instalar.
  process.exit(0);
}

mkdirSync(DESTINO, { recursive: true });

for (const nombre of readdirSync(ORIGEN)) {
  const destino = join(DESTINO, nombre);
  copyFileSync(join(ORIGEN, nombre), destino);
  chmodSync(destino, 0o755);
  console.log(`hook instalado: ${nombre}`);
}
