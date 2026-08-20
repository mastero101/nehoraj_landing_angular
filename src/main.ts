import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Retira la pantalla de carga de marca (definida en index.html) una vez que
// la app arrancó. El setTimeout es una salvaguarda por si 'transitionend' no
// llega a disparar (pestaña en segundo plano durante la carga, por ejemplo).
function hideAppLoader(): void {
  const loader = document.getElementById('app-loader');
  if (!loader) return;
  loader.classList.add('app-loader--hide');
  loader.addEventListener('transitionend', () => loader.remove(), { once: true });
  setTimeout(() => loader.remove(), 600);
}

bootstrapApplication(AppComponent, appConfig)
  .then(hideAppLoader)
  .catch((err) => {
    console.error(err);
    hideAppLoader();
  });
