import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { SistemaStore } from './application/sistema.store';
import { HttpSistemaRepository } from './infrastructure/http-sistema.repository';
import { LocalStorageAjustesRepository } from './infrastructure/local-storage-ajustes.repository';

// Constante fija, igual que `PLANTILLA_GLOBAL` (spec 034): no existe `environments/` en este
// proyecto todavía.
const URL_API = 'http://localhost:3000/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: SistemaStore,
      useFactory: () => new SistemaStore(new HttpSistemaRepository(URL_API), new LocalStorageAjustesRepository(localStorage)),
    },
    // El catálogo se carga antes de que se muestre la pizarra (spec 031): en ningún momento
    // se ve vacío antes de poblarse, igual que cuando la carga era síncrona en el constructor.
    provideAppInitializer(() => inject(SistemaStore).cargar()),
  ],
};
