import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// El service worker solo existe para que el navegador ofrezca instalar la aplicación
// (ADR 0041). Se registra únicamente bajo https para no dejar uno vivo en `ng serve`, donde
// no aporta nada y complica depurar.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('sw.js');
  });
}

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
