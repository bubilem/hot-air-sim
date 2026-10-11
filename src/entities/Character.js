// Voxel postavičky (styl Minecraft) složené z kvádrů. Výška cca 1.8 m.
import * as THREE from 'three';
import { BRAND } from '../config/Colors.js';
import { markPlane } from './SchoolMark.js';

const SKIN = [0xf0c9a0, 0xe0ad84, 0xc58c63, 0x8d5a3b];
const CAP_COLOR = 0x15171a;   // černé kšiltovky pilota a pozemního týmu
const HAIR = [0x2b2118, 0x5a3a22, 0xb98a4e, 0x8a8f96, 0x7a3b1e];
// střídmé, k sobě ladící barvy triček (bílá, červená, zelená, fialová, azurová, písková)
const SHIRTS = [0xe9e6df, 0xb5483f, 0x5f9a6e, 0x7d6aa8, 0x4a9bb5, 0xd2b172];
const matCache = new Map();
const mat = (hex) => {
  if (!matCache.has(hex)) matCache.set(hex, new THREE.MeshLambertMaterial({ color: hex }));
  return matCache.get(hex);
};

function part(w, h, d, hex, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(hex));
  m.position.set(x, y, z);
  return m;
}

/**
 * Která pasažérka je žena: hráč-žena je první pasažér (lichá pořadí 1., 3., 5.), hráč-muž je první
 * pasažér a ženy jsou sudí (2., 4.). Pár tak bývá muž + žena, a když letí sám, odpovídá výběru.
 * @param {'m'|'f'} honorific
 * @param {number} index  pořadí pasažéra od 0
 */
export const isFemalePassenger = (honorific, index) => (index % 2 === 0) === (honorific === 'f');

/**
 * @param {'pilot'|'crew'|'passenger'} role
 * @param {number} variant  číslo pro výběr barev u pasažérů
 * @param {boolean} female  žena: malá prsa a delší vlasy
 */
export function createCharacter(role = 'passenger', variant = 0, female = false) {
  const g = new THREE.Group();
  const skin = SKIN[variant % SKIN.length];
  let shirt = SHIRTS[Math.floor(variant / 3) % SHIRTS.length];
  let pants = 0x35404f;
  let vest = null;
  let sleeve = null;   // barva rukávů, pokud se liší od trika
  let hat = null;
  if (role === 'pilot') { shirt = BRAND.bgTop; vest = null; sleeve = BRAND.blue2; hat = CAP_COLOR; pants = 0x20242f; }
  if (role === 'crew') { shirt = BRAND.bgTop; vest = null; sleeve = BRAND.blue2; hat = CAP_COLOR; pants = 0x20242f; }  // pozemní tým v modré školní barvě

  g.add(part(0.2, 0.75, 0.26, pants, -0.12, 0.375, 0));      // nohy
  g.add(part(0.2, 0.75, 0.26, pants, 0.12, 0.375, 0));
  g.add(part(0.5, 0.65, 0.28, shirt, 0, 1.075, 0));           // trup
  if (role === 'pilot' || role === 'crew') {
    // jen průhledný trojúhelník školy přímo na triku, zepředu i zezadu
    for (const s of [1, -1]) {
      const m = markPlane(0.22);
      m.position.set(0, 1.18, s * 0.142);
      if (s < 0) m.rotation.y = Math.PI;
      g.add(m);
    }
  }
  g.add(part(0.26, 0.26, 0.26, skin, 0, 1.55, 0));            // hlava
  if (hat) {
    // kšiltovka v barvě týmu: čepice + kšilt dopředu (+z); vlasy pod ní nejsou vidět
    g.add(part(0.3, 0.12, 0.3, hat, 0, 1.7, 0));
    g.add(part(0.28, 0.03, 0.14, hat, 0, 1.65, 0.2));
  } else {
    const hair = HAIR[(variant * 2 + 1) % HAIR.length];
    g.add(part(0.28, 0.05, 0.28, hair, 0, 1.68, 0));   // vlasy
    if (female) {
      g.add(part(0.3, 0.46, 0.07, hair, 0, 1.47, -0.15));        // dlouhé vlasy vzadu po lopatky
      g.add(part(0.04, 0.3, 0.26, hair, -0.15, 1.52, 0));        // a po stranách hlavy
      g.add(part(0.04, 0.3, 0.26, hair, 0.15, 1.52, 0));
    }
  }
  if (female) {
    g.add(part(0.15, 0.12, 0.08, shirt, -0.1, 1.2, 0.16));       // malá prsa
    g.add(part(0.15, 0.12, 0.08, shirt, 0.1, 1.2, 0.16));
  }

  // Paže se otáčejí kolem ramene (pivot nahoře)
  const mkArm = (sx) => {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 0.33, 1.38, 0);
    const arm = part(0.15, 0.6, 0.16, sleeve ?? shirt, 0, -0.27, 0);
    pivot.add(arm);
    g.add(pivot);
    return pivot;
  };
  g.userData.armL = mkArm(-1);
  g.userData.armR = mkArm(1);
  return g;
}

/** Mávání / zdravení paží (t = čas, amount 0..1). */
export function waveArms(ch, t, amount = 1) {
  const { armL, armR } = ch.userData;
  if (!armL) return;
  armL.rotation.x = armR.rotation.x = 0;
  armR.rotation.z = -Math.PI * 0.85 * amount + Math.sin(t * 8) * 0.3 * amount;
  armL.rotation.z = Math.PI * 0.85 * amount - Math.sin(t * 8 + 1) * 0.3 * amount;
}

/** Paže natažené dopředu (držení, tlačení, tažení): amount 0 = svěšené, 1 = vodorovně dopředu. */
export function armsForward(ch, t, amount = 1) {
  const { armL, armR } = ch.userData;
  if (!armL) return;
  armL.rotation.z = armR.rotation.z = 0;
  armL.rotation.x = -Math.PI * 0.5 * amount + Math.sin(t * 5) * 0.08 * amount;
  armR.rotation.x = -Math.PI * 0.5 * amount + Math.sin(t * 5 + 1) * 0.08 * amount;
}

/** Paže zvednuté nad hlavu (např. k hořáku): amount 0 = svěšené, 1 = nahoru. */
export function armsUp(ch, amount = 1) {
  const { armL, armR } = ch.userData;
  if (!armL) return;
  armL.rotation.x = armR.rotation.x = 0;
  armR.rotation.z = Math.PI * 0.88 * amount;
  armL.rotation.z = -Math.PI * 0.88 * amount;
}
