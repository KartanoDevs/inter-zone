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

// Safari en iOS ignora `user-scalable=no` del viewport desde iOS 10: el pellizco para hacer
// zoom sigue funcionando salvo que se cancelen sus propios eventos de gesto. En el resto de
// navegadores estos eventos no existen y el listener no hace nada.
document.addEventListener('gesturestart', (evento) => evento.preventDefault());
document.addEventListener('gesturechange', (evento) => evento.preventDefault());

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
