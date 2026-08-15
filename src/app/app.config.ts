import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
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
  ],
};
