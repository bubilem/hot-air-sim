// Všechny konstanty fyziky a hry. Žádná magická čísla v kódu.

export const WORLD = {
  size: 5000,          // m, hrana vykreslené oblasti terénu
  segments: 160,       // dělení mřížky terénu
  waterLevel: 12,      // m
  riverBed: 7,         // m, dno koryta řeky (pod hladinou)
  riverBank: 60,       // m, šířka pozvolných břehů vedle hladiny
  riverInner: 0.6,     // podíl poloviny šířky, kde je koryto na plné hloubce
  forestCanopy: 9,     // m, výška koruny stromů nad terénem (kolize)
  treeSpacing: 30,     // m
  fogNear: 600,
  fogFar: 2600,
  edgeFadeStart: 1900,  // m od středu: terén se začne vyrovnávat do roviny (aby okraj mapy nebyl vidět)
  edgeFadeEnd: 2450,
  edgeHeight: 26,
  startShift: 850,     // m, o kolik je střed mapy před startem ve směru letu (start leží zhruba v první třetině mapy)
  startFlatRadius: 50,
  startFlatFade: 140,
  startFlatHeight: 22,
  meadowSlopeDeg: 12,
  rockSlopeDeg: 30,
  townRoof: 9,         // m, výška střech zástavby nad terénem (kolize; nejvyšší dům i strom ve městě)
};

// Výchozí tvar terénu (lokalita ho může přepsat v `site.terrain`)
export const TERRAIN = {
  base: 32,            // m, střední výška terénu
  bigAmp: 34,          // m, amplituda velkých vln terénu
  midAmp: 8,           // m, amplituda středních vln
  hillAmp: 0,          // m, výška kopečků (0 = bez kopečků)
  hillScale: 520,      // m, rozteč kopečků (šum)
  hillFrom: 0.55,      // hodnota šumu 0..1, od které kopeček vzniká
  hillTo: 0.9,         // hodnota šumu, kde je kopeček v plné výšce
  hillClear: 0,        // m od startu bez kopečků (pak plynulý nárůst na hillFade)
  hillFade: 1,         // m, délka nárůstu kopečků za hillClear
  startShift: 0,           // m, o kolik je střed rovné louky posunutý po větru od místa startu (start je pak spíš na kraji louky)
  startCenter: null,       // { x, z } střed rovné louky (dopočítá Sites.createBiomes z startShift a směru větru)
  startFlatRadius: null,   // m, rovná plocha kolem startu (null = WORLD.startFlatRadius)
  startFlatFade: null,     // m, kde se terén plynule vrací k původnímu (null = WORLD.startFlatFade)
  startHeight: null,   // m, výška rovného startu; null = WORLD.startFlatHeight, 'natural' = přirozená výška terénu na startu
  peaks: [],           // osamělé kopce [{ x, z, r, height }]: kopec vysoký `height` m s poloměrem úpatí `r` m (střed v m od startu)
  ridge: null,         // horský val napříč mapou (viz Biomes.ridgeHeight): { from, to, height, scale, rough } nebo null
  forestBias: 0,       // přičte se k šumu lesa (kladné = víc lesa)
  treeLine: 90,        // m, nad touto výškou už les neroste
  rockLine: 100,       // m, nad touto výškou je holá skála
};

// Samostatné dominanty mimo města (lokalita s `dominants: [{ type, x, z, a }]`), obvykle na kopci; type = 'church' | 'hradek' | 'bezdez'
export const DOMINANTS = {
  church: { padRadius: 24, clearing: 34 },   // rovná plošina pod stavbou (m) a mýtina v lese kolem (m)
  hradek: { padRadius: 28, clearing: 48 },
  bezdez: { padRadius: 58, clearing: 90 },
  padFade: 2.4,       // násobek poloměru plošiny, kde je terén zase původní
};

// Hrádek ve Varnsdorfu: zděný sokl, hlavní kvádr s červenou sedlovou střechou a tři věže (velká s přístavkem-vížkou,
// menší před ní a malá vlevo). Rozměry v m, souřadnice lokální (x doprava při pohledu na průčelí, z k divákovi), y od vrchu soklu.
export const HRADEK = {
  plinth: { w: 30, d: 20, h: 3 },
  main: { x: -1, z: 0, w: 22, d: 12, wall: 9, roof: 6 },
  towers: [
    { name: 'big', x: 9, z: -1.5, s: 6, h: 24, roof: 9 },
    { name: 'medium', x: 5, z: 6, s: 5, h: 15, roof: 8 },
    { name: 'tiny', x: -12, z: 3.5, s: 3, h: 8, roof: 4.5 },
  ],
  turret: { x: 12.2, z: 2.2, s: 2.6, y: 14, h: 6, roof: 3.5 },   // vížka přistavěná ke koutu velké věže
  trim: 0.7,          // výška červeného pásu pod střechou
  window: { w: 1.5, h: 2.4 },
};

// Hrad Bezděz: dlouhý kvádr paláce s tmavou sedlovou střechou, vysoká kruhová věž (bez střechy, s cimbuřím), nízká hradba a malá kruhová věž na jejím konci.
// Lokální souřadnice: x podél paláce (hradba vlevo, -x), z k divákovi; y od terénu (vrchol kopce je srovnaný).
export const BEZDEZ = {
  palace: { x: 0, z: 0, w: 40, d: 11, wall: 11, roof: 5 },
  tower: { x: 7, z: -3.5, r: 5.5, h: 36 },                  // velká kruhová věž za palácem (bez střechy, s cimbuřím)
  wall: { x: -34, z: 0, len: 28, thick: 2.6, h: 7 },        // hradba k malé věži
  smallTower: { x: -50, z: 0, r: 3.4, h: 13 },
  windows: { w: 1.1, h: 2.2, count: 6, step: 5.6 },
  merlon: { h: 1.5, size: 1.3 },   // cimbuří na věžích: zuby kolem okraje plochého zakončení
};


// Cíl: značka má poloměr 60 m; kolem ní musí být louka. Les v kruhu se vyčistí mýtinou
export const TARGET_CLEARING = {
  check: 75,          // m, do jaké vzdálenosti od středu cíle se kontroluje okolí
  radius: 90,         // m, poloměr mýtiny (uvnitř žádný les)
  fade: 1.5,          // násobek poloměru, kde se les vrací do původní hustoty
  forestCost: 1.0,    // cena podílu lesa v okolí při výběru místa (větší = víc se hledá čistá louka)
};

// Rybníky a jezera (lokalita s `ponds: [{ x, z, r }]`): nepravidelná vodní plocha; terén kolem se pozvolna sníží k hladině.
// Volitelně u každé: aspect + angle (elipsa: r = kratší poloosa, delší je r·aspect, angle = natočení v rad), flatTo (přepis
// násobku poloměru pro břeh), edgeNoise a noiseScale (m) pro tvar břehu, island: { x, z, r } (ostrov uprostřed)
export const PONDS = {
  bed: 6,             // m, dno (pod hladinou WORLD.waterLevel)
  shore: 15,          // m, výška břehu těsně nad hladinou
  bedFrom: 0.5,       // podíl poloměru, kde je plné dno
  flatTo: 5,        // násobek poloměru, kde je terén zase původní
  edgeNoise: 0.28,    // nepravidelnost břehu (podíl poloměru)
  islandTop: 17,      // m, výška ostrova uprostřed vodní plochy (hladina je WORLD.waterLevel)
};

// Město / vesnice (lokalita s `towns`): náhodně rozmístěné domky, stromy, kostel; terén se pod zástavbou vyrovná
export const TOWNS = {
  flatFrom: 0.9,       // násobek poloměru, kde začíná vyrovnávání terénu
  flatTo: 1.5,         // násobek poloměru, kde je terén zase původní
  edgeNoise: 0.15,     // nepravidelnost okraje zástavby (podíl poloměru)
  clearMassif: 1.6,    // násobek poloměru bez skalních masivů
  margin: 0.78,        // zástavba leží jen do této vzdálenosti od středu (násobek poloměru)
  density: 1 / 520,    // nejvýše tolik domků na m² (skutečný počet je menší, stavby se nesmí překrývat)
  treeDensity: 1 / 1400,   // stromů na m² (zahrady, parčíky)
  lot: 4,              // m, nejmenší mezera mezi stavbami
  houseSize: [8, 14],  // m, rozměry půdorysu domu
  wallHeight: [3, 7],  // m, výška zdí (většinou nízké, občas vyšší dům)
  roofHeight: 2,       // m, výška sedlové střechy (nejvyšší dům: 7 + 2 = townRoof)
  treeScale: [0.55, 0.85],   // měřítko stromů ve městě (nejvyšší strom <= townRoof)
  church: { nave: [9, 18], naveWall: 7, naveRoof: 3.5, tower: 6, towerHeight: 20, spireHeight: 8, offset: 0.22 },   // kostel: loď + věž s jehlanem; offset = vzdálenost od středu (násobek poloměru)
  chimney: { radius: [1.6, 2.4], height: 45 },   // továrenský komín (lokalita: town.chimneyCount = počet)
};

export const PHYSICS = {
  g: 9.81,
  volume: 3000,        // m3
  envelopeMass: 120,   // kg
  basketMass: 130,     // kg (koš + hořáky)
  pilotMass: 80,
  bottleEmpty: 30,
  gasPerBottle: 20,
  Cd: 0.45,
  area: 250,           // m2, průmět obalu
  addedMassFactor: 0.5,

  burnHeating: 1.2,    // K/s při plném zážehu (laděno na pocit)
  coolK: 0.006,        // 1/s
  ventK: 0.025,        // 1/s
  gasRate: 0.09,       // kg/s při plném zážehu
  alarmTemp: 120,      // °C, varování v HUD

  // Výška: okolní teplota klesá, pilot potřebuje nad určitou výškou kyslík
  lapseRate: 0.0065,   // K/m, pokles okolní teploty s výškou (standardní atmosféra)
  oxygenAlt: 3000,     // m n. m., odtud hrozí nedostatek kyslíku (pravidla pro balony: 10 000 ft)
  hypoxiaTime: 40,     // s při 1 000 m nad oxygenAlt do ztráty vědomí
  hypoxiaRecover: 1 / 20,   // 1/s zotavení v dostatečně nízké výšce
  hypoxiaWake: 0.5,    // úroveň, pod kterou se pilot probere
  ceilingMargin: 5,    // °C pod alarmTemp: když balon ve výšce visí při této teplotě, je na stropu

  // Paraventil: čím déle je otevřený, tím víc se svršek pláště rozevírá a tím rychleji vzduch uniká.
  ventRampTime: 12,    // s držení, než je klapka otevřená naplno
  ventMaxMul: 3.5,     // násobek ventK při plně otevřené klapce
  ventCloseRate: 8,    // s držení, které klapka "zapomene" za 1 s po uvolnění (zavírá se rychle)
  // Extrémně dlouhé držení: vrchlík ztrácí tvar a část objemu pláště se propadne (viz PhysicsEngine.collapse)
  ventCollapseAfter: 18,   // s souvislého držení, odkdy se vrchlík začíná propadat
  ventCollapseTime: 30,    // s dalšího držení do úplného propadnutí
  collapseVolumeLoss: 0.45,   // o jaký podíl se zmenší objem při plném propadnutí
  collapseRecover: 1 / 90,    // 1/s, vrchlík se vzpřimuje, když je plášť zase plný horkého vzduchu
  collapseRecoverBurn: 1 / 25, // 1/s totéž při zážehu

  // Přehřátí: nad scorchTemp se plášť nevratně pálí (díry), nad fireTemp vzplane
  scorchTemp: 120,     // °C (shodné s alarmTemp: varování i počátek škod)
  scorchStep: 60,      // K·s nad scorchTemp na jednu popálenou díru
  holeLeakK: 0.0025,   // 1/s, dodatečné ochlazování na jednotku velikosti díry (trvalé)
  holeMax: 8,          // nejvíce děr (dál se zvětšují ty stávající)
  fireTemp: 140,       // °C
  fireDelay: 3,        // s nad fireTemp do vzplanutí
  fireSpread: 20,      // s, za jak dlouho se oheň rozšíří po celém plášti
  fireLeakK: 0.05,     // 1/s, ztráta tepla při plně hořícím plášti
  windTau: 6,          // s, setrvačnost vůči větru
  rotateRate: 8,       // deg/s
  minBalloonRadius: 9,
};

// Profil pláště [poloměr, výška nad ústím] ve svislé poloze, v metrech (kreslí ho BalloonView, kolize ho berou jako obrys)
export const ENVELOPE_PROFILE = [
  [2.0, 0], [2.6, 1.4], [4.2, 3.6], [6.4, 6.6], [8.2, 9.6],
  [9.3, 12.6], [9.7, 14.8], [9.3, 16.8], [8.0, 18.4], [5.6, 19.5], [2.9, 20.1], [0, 20.3],
];

// Půdorys koše: poloviny rozměrů v osách x (šířka) a z (délka) rigu, v metrech
export const BASKET_SIZE = { hx: 0.7, hz: 1.1 };

// Kolize pláště a koše s terénem a překážkami za letu (viz core/Collisions.js)
export const COLLISION = {
  mouthAbove: 3.4,       // m, ústí pláště nad spodkem koše
  radii: [2.5, 5, 7.5, 9.5],   // m, vzorkované kružnice kolem osy
  angles: 8,             // vzorků na kružnici
  skipAgl: 60,           // m nad povrchem, odkud se kolize nehledají (nejvyšší skalní stěna je ~55 m)
  interval: 3,           // kolize se řeší každý n-tý krok fyziky
  restitution: 0.2,      // odraz od překážky
  // „tvrdost“ povrchu: násobí rychlost nárazu při vyhodnocení škod
  hardness: { rock: 1.2, building: 1.0, forest: 0.5, hill: 0.3, soft: 0.25 },
  tearEnergy: 1.5,       // m/s · tvrdost: odtud nárazy trhají plášť
  tearCooldown: 1.5,     // s mezi dvěma trhlinami
  scrapeDist: 8,         // m po povrchu (× tvrdost) na jednu trhlinu při tření
  scrapeMinSpeed: 2,     // m/s tangenciální rychlosti, od které se plášť tře
  crashEnergy: 5,        // m/s · tvrdost: nad touto hodnotou plášť praskne a let končí
  buildingRise: 3,       // m: povrch nad terénem o tolik (a ne les) je budova / dominanta
  // Koš: vzorky kolem půdorysu (rohy a středy stran) hledají překážku vedle koše
  basketMargin: 0.25,    // m, jak daleko za okrajem koše se překážka hledá
  basketRise: 0.5,       // m: povrch výš než spodek koše o tolik je překážka (nižší vyrovnává model země)
  basketRestitution: 0.15,   // odraz koše od tvrdé překážky
  forestSnagSpeed: 5,    // m/s: rychlejší boční náraz do lesa = zachycení v korunách (neúspěch); pomalejší koš jen zbrzdí
  forestDrag: 2,         // 1/s, brzdění koše o větve, dokud se dotýká lesa
};

// Skalní masivy (lokalita s `massifs: true`): zvýšené skalnaté plošiny se strmými svahy (parametry lze přepsat v `site.massifs`)
export const MASSIFS = {
  scale: 800,          // m, velikost masivů (šum)
  threshold: 0.76,     // hodnota šumu 0..1, nad kterou masiv vzniká (větší = méně masivů)
  edge: 0.07,          // šířka přechodu v hodnotě šumu (menší = strmější svahy)
  detail: 0.12,        // podíl jemného šumu, který rozbíjí okraje masivu
  height: 55,          // m, převýšení plošiny nad okolím
  topNoise: 3,         // m, nerovnosti povrchu plošiny
  rockMin: 0.3,        // od jaké "výšky" masivu (0..1) je povrch skála
  startClear: 170,     // m od startu bez masivů
  startFade: 100,      // m, plynulý nárůst masivů za touto hranicí
  riverClear: 150,     // m od osy řeky bez masivů
};

export const TIME_OF_DAY = {
  // fog: výšková mlha (above = výška horní hladiny nad startem v m, density = 1/m, color)
  morning: { ambient: 12, label: 'morning', windScale: 0.7, sky: 'sky', fogNear: 300, fogFar: 3200,
    fog: { above: 22, density: 0.0055, color: 0xdfe4e8 } },   // stejná barva jako horizont oblohy (bez ostrého přechodu)
  evening: { ambient: 22, label: 'evening', windScale: 1.0, sky: 'skyEvening', fogNear: 500, fogFar: 2800,
    fog: { above: 10, density: 0.0015, color: 0xffd2a8 } },
};

// Ptactvo (nenápadné): vzdálená hejna + občas větší pták, který přeletí kolem balonu
export const BIRDS = {
  enabled: true,
  flocks: 5,
  minSize: 5, maxSize: 9,      // ptáků v hejnu
  birdSize: 1.6,               // m, půlrozpětí křídel (stylizovaně větší, aby byli ze vzdálenosti vidět)
  minAlt: 25, maxAlt: 140,     // m nad terénem
  minDist: 250, maxDist: 1300, // m od kamery
  speed: [6, 9],               // m/s
  visitorEvery: [45, 100],     // s mezi přelety velkého ptáka
  visitorSize: 2.6,            // m, půlrozpětí
  visitorSpeed: 9,
  visitorStartDist: 320,       // m, odkud se vynoří
  visitorPass: [40, 140],      // m, boční odstup při míjení balonu
};

// Doprovodné vozidlo (auto + vlek) při přistání
export const CHASE = {
  trailerOffset: -5.8,   // m: poloha vleku za autem (oj vleku navazuje na tažné zařízení)
  arriveSpeed: 18,       // m/s: rychlost příjezdu k přistání
  arriveMin: 3,          // s: nejkratší doba příjezdu
  clearTime: 0.8,        // s: za jak dlouho startovní vybavení (auto, vlek, ventilátor, lidé) při přistání zmizí
};

// Start: člen posádky drží špičku pláště lanem (aby se balon netočil a rovně se zvedl)
export const LAUNCH_CREW = {
  tipRopeLength: 30,   // m: vzdálenost držitele lana od špičky pláště
  tipMinBehind: 12,    // m: nejméně tolik za špičkou (podél osy pláště)
};

// Oslava: vzdálenost stolu (středu skupiny) od koše, na straně odvrácené od pláště
export const CELEBRATION = {
  distance: 6.5,   // m
};

// Změkčení terénu: hladké stínování a rozmazání barev biomů (méně ostrých přechodů a hran trojúhelníků)
export const TERRAIN_SOFT = {
  smoothShading: true,
  passes: 2,           // kolikrát se barvy zprůměrují se sousedy (víc = měkčí)
};

// Detail trávy na terénu (textura ve světových souřadnicích, jen v blízkosti kamery)
export const GRASS_DETAIL = {
  fineScale: 4.5,     // m, opakování jemné vrstvy
  coarseScale: 27,    // m, opakování hrubé vrstvy (proti viditelnému opakování)
  fadeNear: 90,       // m od kamery: od této vzdálenosti detail slábne
  fadeFar: 380,       // m od kamery: detail zcela zmizí
  strength: 1.0,
};

// Prosvícení pláště plamenem zvenku (emisivní záře, nejsilnější u ústí, k vrchlíku slábne)
/** Odkaz na obor Informační technologie na webu školy (Encyklopedie, obrazovka Oslava). Jediný externí odkaz ve hře. */
export const SCHOOL_IT_URL = 'https://www.skolavdf.cz/informacni-technologie';

export const ENVELOPE_GLOW = {
  intensity: 1.0,   // síla záře při plném zážehu
  topFalloff: 0.7,  // o kolik záře ubude až u vrchlíku (0 = stejně všude)
  rise: 9,          // rychlost náběhu záře (1/s)
  decay: 2.2,       // rychlost doznívání záře (1/s)
  color: [1.0, 0.55, 0.16],
};

export const LANDING = {
  softVy: 1.2,
  hardVy: 2.5,
  softVxz: 3,
  hardVxz: 6,
  dragFriction: 1.6,   // m/s2, zpomalení tažení koše po trávě
  treeFallSpeed: 5,    // m/s, pád balonu z korun stromů na zem po zachycení
  collisionFallSpeed: 8,   // m/s, pád zničeného balonu po nárazu pláště do překážky
};

// Hudba na pozadí (soubor v public/music)
export const MUSIC = {
  src: 'music/theme-organic-house.mp3',
  defaultVolume: 0.3,
};

export const PLAN = {
  minPassengers: 1,
  maxPassengers: 5,
  minBottles: 1,
  maxBottles: 4,
  passengerMassMin: 65,
  passengerMassMax: 90,
};

export const CAMERA = {
  fov: 60,
  near: 0.5,           // m, blízká rovina při zemi / z koše
  nearMax: 8,          // m, nejvyšší blízká rovina ve výšce (přesnější hloubkový buffer)
  nearPerMeter: 0.06,  // m blízké roviny na metr výšky nad terénem
  distance: 55,
  minDistance: 20,
  maxDistance: 120,
  pinchSpeed: 0.15,   // m kamery na 1 px změny vzdálenosti prstů
  zoomStep: 1.2,      // m kamery na tick při držení tlačítka + / −
  height: 8,
  cockpitHeight: 1.6,
  cockpitNear: 0.15,   // m, blízká rovina v pohledu z koše (jinak by se ořezávaly nosné tyče kolem pilota)
  cockpitEye: 1.7,     // výška očí pilota nad dnem koše
};
