// Startovní louky. Svět je deterministický podle seedu; vítr závisí na lokalitě a denní době.
// alt = výška nad startem (m), speed v m/s, bearing = kam vítr vane (° od severu).
// target = orientační směr a vzdálenost cílové louky od startu.
// Volitelně: river (řeka), massifs (skalní masivy), terrain (přepis GameConfig.TERRAIN: kopečky, les…),
// towns (města: { x, z, r } = střed v m od startu a poloměr zástavby).
import { WORLD } from '../config/GameConfig.js';
import { Biomes } from './Biomes.js';

export const SITES = [
  {
    id: 'luzicke',
    name: { cs: 'Lužické hory – nad Varnsdorfem', en: 'Lusatian Mountains – above Varnsdorf' },
    desc: {
      cs: 'Domov naší školy. Startujete z louky nad Varnsdorfem, kolem se vlní zalesněné kopce s rybníky a v dálce se tyčí skalnaté vrcholky. Vítr se s výškou stáčí z jihovýchodu přes jih až na jihozápad; cíl za návrším najdete jen ve správné vrstvě.',
      en: 'Our school’s home. You launch from a meadow above Varnsdorf, with forested hills and ponds rolling around you and rocky summits in the distance. The wind turns from southeast through south to southwest with height; the target beyond the ridge is reachable only in the right layer.',
    },
    seed: 8123,
    elevation: 360,
    terrain: { base: 48, bigAmp: 28, midAmp: 7, hillAmp: 60, hillScale: 650, hillFrom: 0.42, hillTo: 0.95, forestBias: 0.12, treeLine: 115, rockLine: 128, hillClear: 450, hillFade: 450, startShift: 55, startFlatRadius: 75, startFlatFade: 150, startHeight: 'natural' },   // široká zalesněná návrší, jen nejvyšší vrcholky jsou skála
    towns: [
      { x: 700, z: 450, r: 220, chimneyCount: 3 },   // Varnsdorf v údolí, ~600 m od startu; tři továrenské komíny
      { x: -900, z: 1500, r: 180 },
    ],
    // Hrádek, dominanta Varnsdorfu, na kopci severně od města (x, z = poloha v m od startu, a = natočení v rad; průčelí míří k městu)
    dominants: [{ type: 'hradek', x: 810, z: 90, a: 0.15 }],
    // Rybníky v nejnižších místech krajiny (x, z = střed v m od startu, r = poloměr hladiny)
    ponds: [
      { x: 700, z: -300, r: 65 },
      { x: 600, z: 1400, r: 105 },
      { x: -450, z: -800, r: 95 },
      { x: -650, z: 2150, r: 120 },
      { x: -1550, z: -650, r: 85 },
    ],
    wind: [
      { alt: 0, speed: 1.2, bearing: 120 },
      { alt: 150, speed: 3.5, bearing: 160 },
      { alt: 300, speed: 5.5, bearing: 185 },   // tahle vrstva nese přímo k cíli (na jih)
      { alt: 600, speed: 8.0, bearing: 225 },
    ],
    target: { bearing: 185, dist: 1250 },   // louka jižně od startu, za návrším (k němu je třeba vystoupat nad ~150 m)
  },
  {
    id: 'polabi',
    name: { cs: 'Polabí – Děčínsko', en: 'Elbe Valley – Děčín Region' },
    desc: {
      cs: 'Startujete z louky v podhůří Krušných hor nad Děčínem, který leží na obou březích Labe. Severák nese balon na jih přes řeku k loukám, polím, lesům a rybníkům. Pozor na město pod vámi a na střih větru kolem 450 m, který vás umí vrátit zpátky.',
      en: 'You launch from a meadow in the foothills of the Ore Mountains above Děčín, a town on both banks of the Elbe. A north wind carries the balloon south across the river to meadows, fields, forests and ponds. Watch the town below you and the wind shear around 450 m, which can bring you back.',
    },
    seed: 1337,
    elevation: 220,
    startShift: 500,   // start je blíž k severnímu okraji mapy (hory), většina mapy leží po větru na jih
    // Na severu horský val (Krušné hory), start na jeho úpatí; jinak údolní niva Labe
    terrain: { base: 34, bigAmp: 12, midAmp: 5, ridge: { from: 250, to: -900, height: 190, scale: 700, rough: 6 }, forestBias: 0.08, treeLine: 195, rockLine: 232, startShift: 45, startFlatRadius: 75, startFlatFade: 150, startHeight: 'natural' },
    // Severák: spodní vrstvy (do 300 m) vanou na jih a jen mírně se stáčejí k západu; kolem 450 m je střih větru –
    // slabý vítr na východoseverovýchod, kterým se dá vrátit zpátky (vyhnout se městu); nad ním opět jihozápad
    wind: [
      { alt: 0, speed: 1.0, bearing: 175 },
      { alt: 150, speed: 3.5, bearing: 185 },
      { alt: 300, speed: 5.5, bearing: 195 },
      { alt: 450, speed: 3.5, bearing: 70 },    // střih větru
      { alt: 650, speed: 8.0, bearing: 215 },
    ],
    target: { bearing: 180, dist: 1900 },   // louka za Labem
    cloudLayer: { morning: { base: 360, top: 480 } },   // ranní inverze: vrstva oblačnosti nad údolím (střih větru ve 450 m je uvnitř)
    towns: [{ x: -700, z: 450, r: 380, chimneyCount: 2 }],   // Děčín pod horami, jihozápadně od startu; Labe jím protéká (město leží na obou březích)
    // Labe teče napříč celou mapou ze západu na východ a protéká městem (asi 450 m jižně od startu); width = šířka hladiny v m
    river: {
      width: 90,
      points: [[-3300, 540], [-2600, 430], [-1900, 500], [-1200, 400], [-700, 450], [-200, 520], [500, 430], [1200, 510], [1900, 430], [2600, 500], [3300, 440]],
    },
    ponds: [
      { x: -950, z: 1750, r: 80 },
      { x: 750, z: 1550, r: 70 },
      { x: 1350, z: 2100, r: 90 },
      { x: -1500, z: 2200, r: 75 },
    ],
  },
  {
    id: 'raj',
    name: { cs: 'Český ráj – Skalní města', en: 'Bohemian Paradise – Rock Cities' },
    desc: {
      cs: 'Pískovcové věže a plošiny vyrůstají z lesů a luk, mezi nimi se krčí jediné městečko a na nejvyšší hoře se tyčí dvě skalní věže hradu Trosky. Vítr se s výškou stáčí z jihovýchodu na jihozápad. Pozor, náraz do skály končí pádem.',
      en: 'Sandstone towers and plateaus rise out of forests and meadows, with a single small town tucked between them and the two rock towers of Trosky castle on the highest hill. The wind turns from southeast to southwest with height. Careful: hitting a rock ends in a crash.',
    },
    seed: 4711,
    elevation: 290,
    massifs: { height: 34 },   // nižší skalní plošiny než dřív (55 m), ať se krajina liší od Lužických hor
    // Nejvyšší hora ráje (Trosky): osamělý kopec; les roste vysoko po svazích, skála je až na vrcholu
    terrain: { treeLine: 160, rockLine: 175, peaks: [{ x: 1600, z: 580, r: 420, height: 105, level: true }] },
    dominants: [{ type: 'trosky', x: 1600, z: 580, a: 1.55 }],   // hrad Trosky: dvě skalní věže s kamennými věžemi (natočeno ~60° po směru hodin, ať je panorama vidět z letu)
    towns: [{ x: 1000, z: 900, r: 170 }],   // jediné městečko
    wind: [
      { alt: 0, speed: 1.2, bearing: 120 },
      { alt: 150, speed: 3.6, bearing: 160 },
      { alt: 300, speed: 6.0, bearing: 200 },
      { alt: 600, speed: 8.0, bearing: 240 },
    ],
    target: { bearing: 150, dist: 1500 },
  },
  {
    id: 'mach',
    name: { cs: 'Máchův kraj – Máchovo jezero', en: 'Mácha’s Land – Lake Mácha' },
    desc: {
      cs: 'Borovicové lesy kolem velkého Máchova jezera s ostrůvkem uprostřed. Na jižním břehu leží městečko Doksy, na kopci za jezerem hrad Bezděz. Vítr se s výškou stáčí z východu přes jihovýchod na jih; přistání ve vodě je neúspěch, tak si vyberte vrstvu s rozmyslem.',
      en: 'Pine forests around the large Lake Mácha with a small island in its middle. The town of Doksy lies on the southern shore, Bezděz castle on a hill beyond the lake. The wind turns from east through southeast to south with height; landing in the water is a failure, so choose your layer wisely.',
    },
    seed: 77,
    elevation: 270,
    terrain: { base: 36, bigAmp: 10, midAmp: 4, forestBias: 0.06, treeLine: 130, rockLine: 160, startHeight: 'natural', startShift: 40, startFlatRadius: 70, startFlatFade: 150,
      peaks: [{ x: 2200, z: -900, r: 330, height: 85 }] },   // kopec s Bezdězem
    massifs: { height: 24, threshold: 0.86 },   // pískovcové skalky v lesích
    wind: [
      { alt: 0, speed: 1.2, bearing: 85 },
      { alt: 150, speed: 3.5, bearing: 105 },
      { alt: 300, speed: 5.5, bearing: 135 },
      { alt: 600, speed: 8.0, bearing: 175 },
    ],
    target: { bearing: 100, dist: 2300 },   // louka za jezerem
    // Máchovo jezero: protáhlá vodní plocha před startem, uprostřed ostrůvek; kolem několik rybníků
    ponds: [
      { x: 1150, z: -80, r: 560, aspect: 1.55, angle: 0.3, flatTo: 1.3, edgeNoise: 0.1, noiseScale: 420, island: { x: 1180, z: -60, r: 55 } },
      { x: 300, z: 900, r: 60 },
      { x: 2300, z: 700, r: 70 },
      { x: -700, z: -900, r: 80 },
    ],
    towns: [
      { x: 1480, z: 640, r: 170, height: 20 },   // Doksy přímo na jižním břehu jezera (níž než okolní planina)
    ],
    // Hrad Bezděz na vrcholu kopce (průčelí k jezeru)
    dominants: [{ type: 'bezdez', x: 2200, z: -900, a: 0.9 }],
  },
];

export function getSite(id) {
  return SITES.find((s) => s.id === id) || SITES[0];
}

/**
 * Střed mapy v souřadnicích se startem v počátku: leží před startem ve směru letu (směr k cílové louce),
 * takže start je v první třetině mapy a letec má před sebou co nejvíc přírody. `site.startShift` přepíše výchozí posun.
 */
export function mapCenter(site) {
  const d = site.startShift ?? WORLD.startShift;
  const b = site.target.bearing * Math.PI / 180;
  return { x: Math.sin(b) * d, z: -Math.cos(b) * d };
}

/** Terén lokality (jediné místo, které z dat lokality skládá `Biomes`). */
export function createBiomes(site) {
  let terrain = site.terrain;
  if (terrain?.startShift) {   // louka se startem: střed rovné plochy leží po větru od startu, takže se startuje spíš z jejího kraje
    const b = site.wind[0].bearing * Math.PI / 180;
    terrain = { ...terrain, startCenter: { x: Math.sin(b) * terrain.startShift, z: -Math.cos(b) * terrain.startShift } };
  }
  const biomes = new Biomes(site.seed, site.river, site.massifs, mapCenter(site), { terrain, towns: site.towns, ponds: site.ponds, dominants: site.dominants });
  biomes.findMeadow(site.target.bearing, site.target.dist);   // vytvoří mýtinu kolem cíle dřív, než se postaví terén
  return biomes;
}
