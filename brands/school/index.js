// Značka „school“: VOŠ, SPŠ a SOŠ Varnsdorf (design systém školy, doc/09-design-system.md).
// Rozhraní značky popisuje doc/16-znacky-brand.md. Jádro tuto složku nikdy nezná jménem, importuje ji jen přes alias @brand.
import { APP_NAME, LOGO_HTML } from './logo.js';
import { FONT_FAMILY, FONT_LOAD } from './font.js';
import './theme.css';
import csTexts from './i18n.cs.js';
import enTexts from './i18n.en.js';
import wikiCs from './wiki.cs.js';
import wikiEn from './wiki.en.js';
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

  /** Texty značky: přepisují jádro (i18n) a přidávají kategorie encyklopedie (wiki). */
  i18n: { cs: csTexts, en: enTexts },
  wiki: { cs: wikiCs, en: wikiEn },

  logoHtml: LOGO_HTML,
  /** Symbol značky do canvasu (diplom, štítky): drawLogo(g, x, y, šířka). */
  drawLogo: drawMark,
  character: { decorate: decorateCharacter },
  vehicle: { decorateCar, decorateTrailer },

  /**
   * Odkazy značky. `places` říká, kde se odkaz zobrazí (plan, diploma, menu, failed, wiki) a klíč i18n jeho popisku.
   * `primary` = hlavní tlačítko (cta). Škola má jediný externí odkaz ve hře: na obor IT.
   */
  links: [{
    id: 'study',
    href: 'https://www.skolavdf.cz/informacni-technologie',
    places: { plan: 'plan.school', diploma: 'result.study', wiki: 'wiki.moreIt' },
  }],
  /** Čísla na obrazovce plánování (např. reference firmy): [{ value, labelKey }]; prázdné = žádný pruh. */
  stats: [],

  /** Diplom: jedna šablona v jádru, značka dodává barvy, záhlaví a výšku (šířka je vždy 1400 px). */
  diploma: {
    height: 1190,
    headerHeight: 400,   // místo nahoře pro záhlaví (logo, název); obsah diplomu začíná pod ním
    colors: {
      bgTop: '#003b4b', bgBottom: '#006783',
      text: '#ffffff', muted: '#ffffffb3', title: '#ffd400',
      statBg: 'rgba(0,27,34,0.45)', badge: '#0083a6', badgeText: '#ffffff',
      star: '#ffd400', starOff: 'rgba(255,255,255,0.15)',
    },
    /** Záhlaví: symbol školy nad názvem HotAirSim (jako koš pod balonem). */
    header(g, { W, FONT }) {
      const markW = 240, markY = 84;
      drawMark(g, (W - markW) / 2, markY, markW);
      g.font = `700 60px ${FONT}`;
      const w1 = g.measureText('HotAir').width, w2 = g.measureText('Sim').width;
      const tx = W / 2 - (w1 + w2) / 2, ty = markY + markW * 0.866 + 74;
      g.textAlign = 'left';
      g.fillStyle = '#ffffff'; g.fillText('HotAir', tx, ty);
      g.fillStyle = '#41d7ff'; g.fillText('Sim', tx + w1, ty);
      g.textAlign = 'center';
    },
  },
};
