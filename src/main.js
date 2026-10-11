import './ui/styles.css';
import { GameApp } from './core/GameApp.js';

const app = new GameApp(document.getElementById('game'), document.getElementById('ui'));
// Hra startuje až po načtení galerie balonů (public/envelopes) a titulů, aby se výchozí balon nevyměňoval za běhu (neproblikl vestavěný vzor)
Promise.allSettled([app.fleetReady, app.titlesReady]).then(() => {
  app.start();
  const loading = document.getElementById('loading');   // načítací obrazovka z index.html
  if (loading) {
    loading.classList.add('done');
    setTimeout(() => loading.remove(), 400);
  }
});
window.game = app; // ladění z konzole
