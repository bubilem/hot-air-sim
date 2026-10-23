// Značka „school“: VOŠ, SPŠ a SOŠ Varnsdorf (design systém školy, doc/09-design-system.md).
// Rozhraní značky popisuje doc/16-znacky-brand.md. Jádro tuto složku nikdy nezná jménem, importuje ji jen přes alias @brand.
import { APP_NAME, LOGO_HTML } from './logo.js';
import { FONT_FAMILY, FONT_LOAD } from './font.js';
import { drawMark, decorateCharacter, decorateCar, decorateTrailer } from './mark.js';

export default {
  contract: 1,
  id: 'school',
  name: APP_NAME,
  storagePrefix: 'hotairsim',   // localStorage klíče: `${storagePrefix}.volume` …
  font: { family: FONT_FAMILY, loadSpec: FONT_LOAD },

  /** Barvy 3D scény a canvasů jako čísla pro Three.js (stejné hodnoty jako CSS tokeny v theme). */
  colors: {
    primary: 0x003b4b,         // tmavá z pozadí rozhraní: vak, plachta přívěsu
    accent: 0x41d7ff,
    pilot: { shirt: 0x003b4b, vest: null, sleeve: 0x00c0f3 },
    crew: { shirt: 0x003b4b, vest: null, sleeve: 0x00c0f3 },
    trailerTarp: 0x003b4b,
    bag: 0x003b4b,
    flags: [0x41d7ff, 0xffffff],
    confetti: [0x41d7ff, 0xffd400, 0xa6ce39, 0xffffff, 0x00c0f3],
    envelopeRed: 0xb3202e,     // červená do šachovnice pláště (není součástí školní palety)
    envelopeWhite: 0xf5efe6,
    envelopeBand: 0x41d7ff,
  },
  /** Barvy pro canvas (#rrggbb): šablona pláště, štítky. */
  canvas: { primary: '#003b4b', accent: '#00c0f3', light: '#41d7ff', warn: '#b3202e' },

  /** Vestavěné vzory pláště značky: paint(g, kit) kreslí do canvasu 1024 × 512 (kit = rozměry a štítek s názvem). */
  envelope: {
    designs: [{
      id: 'school',
      name: { cs: 'Školní barvy', en: 'School colours' },
      paint(g, { TEX_W, TEX_H, GORES, drawLogoPatches }) {
        // výseče ve třech oborových barvách školy (žlutá, modrá, zelená)
        const cols = ['#ffd400', '#00c0f3', '#a6ce39'];
        const cw = TEX_W / GORES;
        for (let c = 0; c < GORES; c++) {
          g.fillStyle = cols[c % cols.length];
          g.fillRect(c * cw, 0, cw + 1, TEX_H);
        }
        g.fillStyle = '#003b4b';
        g.fillRect(0, TEX_H - 56, TEX_W, 56);
        g.fillRect(0, 0, TEX_W, 40);
        drawLogoPatches(g);
      },
    }],
  },

  logoHtml: LOGO_HTML,
  /** Symbol značky do canvasu (diplom, štítky): drawLogo(g, x, y, šířka). */
  drawLogo: drawMark,
  character: { decorate: decorateCharacter },
  vehicle: { decorateCar, decorateTrailer },

  /** Externí odkaz značky (jediný ve hře); null = žádný. */
  links: { study: 'https://www.skolavdf.cz/informacni-technologie' },
  features: { externalLink: true },
};
