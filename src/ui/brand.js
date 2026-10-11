// Značka aplikace: trojúhelníkový symbol školy (design system, doc/09-design-system.md) + název „HotAirSim“.
// Používá se v HUD a na obrazovce plánování. Symbol se nesmí natahovat ani otáčet (poměr 1000 : 866).
export const APP_NAME = 'HotAirSim';

const MARK_SVG = `<svg class="brand-mark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 866" aria-hidden="true">
  <polygon points="0 0 500 0 500 188 326 188 0 0" fill="#ffd400"/>
  <polygon points="0 0 326 188 413 339 250 433 0 0" fill="#ffea80"/>
  <polygon points="500 0 1000 0 674 188 500 188 500 0" fill="#41d7ff"/>
  <polygon points="674 188 1000 0 750 433 587 339 674 188" fill="#00c0f3"/>
  <polygon points="250 433 413 339 500 490 500 866 250 433" fill="#c2dd78"/>
  <polygon points="500 490 587 339 750 433 500 866 500 490" fill="#a6ce39"/>
</svg>`;

/** HTML značky: symbol + jednoslovný nápis HotAirSim (PascalCase, nezalamuje se). */
export const LOGO_HTML = `${MARK_SVG}<span class="brand-text">HotAir<span>Sim</span></span>`;
