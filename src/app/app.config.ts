import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { AccesoStore } from './application/acceso.store';
import { ExamenStore } from './application/examen.store';
import { ListaBlancaStore } from './application/lista-blanca.store';
import { SistemaStore } from './application/sistema.store';
import { TeoriaStore } from './application/teoria.store';
import { HttpAccesoRepository } from './infrastructure/http-acceso.repository';
import { HttpInsigniasRepository } from './infrastructure/http-insignias.repository';
import { HttpListaBlancaRepository } from './infrastructure/http-lista-blanca.repository';
import { HttpSistemaRepository } from './infrastructure/http-sistema.repository';
import { LocalStorageAjustesRepository } from './infrastructure/local-storage-ajustes.repository';

// Constante fija, igual que `PLANTILLA_GLOBAL` (spec 034): no existe `environments/` en este
// proyecto todavía, y ya no hace falta: en producción nginx sirve la aplicación y la API bajo
// el mismo origen, y en desarrollo `ng serve --proxy-config proxy.conf.json` reproduce ese
// mismo reparto (ADR 0041). Una ruta relativa vale para los dos.
const URL_API = '/api';

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
    {
      provide: ListaBlancaStore,
      useFactory: () => new ListaBlancaStore(new HttpListaBlancaRepository(URL_API)),
    },
    // Examen (spec 057, sustituye a la 055) lee el mismo catálogo que el editor, con su propia
    // navegación — mismo criterio que Teoría (ADR 0039: store propio, sin decorador, cableado
    // con `useFactory`).
    {
      provide: ExamenStore,
      useFactory: () => new ExamenStore(inject(SistemaStore), new HttpInsigniasRepository(URL_API)),
    },
    // Al arrancar solo se comprueba la sesión (spec 050) — nunca el catálogo de sistemas, que
    // ahora depende de haber entrado (E1). `App` dispara `SistemaStore.cargar()` en cuanto
    // `AccesoStore.usuario()` deja de ser null, sea porque ya había sesión o porque se acaba
    // de entrar desde la pantalla de acceso.
    provideAppInitializer(() => inject(AccesoStore).comprobarSesion()),
  ],
};
