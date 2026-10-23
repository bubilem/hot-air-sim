// Nejmenší možná značka: testovací fixture, že všechna volitelná pole jsou opravdu volitelná (viz tests/brand.test.js).
// Také nejkratší návod, co značka musí dodat. Nepoužívá se ve hře.
import './theme.css';

const noop = () => {};

export default {
  contract: 1,
  id: 'minimal',
  name: 'Minimal',
  storagePrefix: 'minimal',
  font: { family: 'Arial, sans-serif', loadSpec: '700 40px Arial' },
  colors: {
    primary: 0x222222, accent: 0x00aaff, bag: 0x222222, trailerTarp: 0x222222,
    pilot: { shirt: 0x222222, vest: null, sleeve: 0x00aaff },
    crew: { shirt: 0x222222, vest: null, sleeve: 0x00aaff },
    flags: [0x00aaff, 0xffffff], confetti: [0x00aaff, 0xffffff],
    envelopeRed: 0xcc0000, envelopeWhite: 0xffffff, envelopeBand: 0x00aaff,
  },
  canvas: { primary: '#222222', accent: '#00aaff', light: '#66ccff', warn: '#cc0000' },
  logoHtml: '<span class="brand-text">Minimal</span>',
  drawLogo: noop,
  diploma: {
    height: 1190,
    headerHeight: 400,
    colors: {
      bgTop: '#222222', bgBottom: '#444444', text: '#ffffff', muted: '#ffffffb3', title: '#ffcc00',
      statBg: 'rgba(0,0,0,0.3)', badge: '#00aaff', badgeText: '#ffffff', star: '#ffcc00', starOff: 'rgba(255,255,255,0.15)',
    },
    header: noop,
  },
};
