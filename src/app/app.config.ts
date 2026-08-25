import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { AccesoStore } from './application/acceso.store';
import { SistemaStore } from './application/sistema.store';
import { TeoriaStore } from './application/teoria.store';
import { HttpAccesoRepository } from './infrastructure/http-acceso.repository';
import { HttpSistemaRepository } from './infrastructure/http-sistema.repository';
import { LocalStorageAjustesRepository } from './infrastructure/local-storage-ajustes.repository';

// Constante fija, igual que `PLANTILLA_GLOBAL` (spec 034): no existe `environments/` en este
// proyecto todavía.
const URL_API = 'http://localhost:3000/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: AccesoStore,
      useFactory: () => new AccesoStore(new HttpAccesoRepository(URL_API)),
    },
    {
      provide: SistemaStore,
      useFactory: () => new SistemaStore(new HttpSistemaRepository(URL_API), new LocalStorageAjustesRepository(localStorage)),
    },
    // Teoría (spec 052) lee el mismo catálogo que el editor, pero con su propia navegación —
    // nunca comparte borrador ni rotación activa con SistemaStore (E9).
    {
      provide: TeoriaStore,
      useFactory: () => new TeoriaStore(inject(SistemaStore)),
    },
    // Al arrancar solo se comprueba la sesión (spec 050) — nunca el catálogo de sistemas, que
    // ahora depende de haber entrado (E1). `App` dispara `SistemaStore.cargar()` en cuanto
    // `AccesoStore.usuario()` deja de ser null, sea porque ya había sesión o porque se acaba
    // de entrar desde la pantalla de acceso.
    provideAppInitializer(() => inject(AccesoStore).comprobarSesion()),
  ],
};
