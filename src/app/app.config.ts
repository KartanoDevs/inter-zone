import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { SistemaStore } from './application/sistema.store';
import { PLANTILLA_GLOBAL } from './domain/plantilla-global';
import { LocalStorageSistemaRepository } from './infrastructure/local-storage-sistema.repository';
import { LocalStorageAjustesRepository } from './infrastructure/local-storage-ajustes.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    {
      provide: SistemaStore,
      useFactory: () =>
        new SistemaStore(
          new LocalStorageSistemaRepository(localStorage, PLANTILLA_GLOBAL),
          new LocalStorageAjustesRepository(localStorage),
        ),
    },
    // El catálogo se carga antes de que se muestre la pizarra (spec 031): en ningún momento
    // se ve vacío antes de poblarse, igual que cuando la carga era síncrona en el constructor.
    provideAppInitializer(() => inject(SistemaStore).cargar()),
  ],
};
