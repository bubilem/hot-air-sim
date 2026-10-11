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
  maxEnvelopeTemp: 130,
  alarmTemp: 120,
  windTau: 6,          // s, setrvačnost vůči větru
  rotateRate: 8,       // deg/s
  minBalloonRadius: 9,
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
