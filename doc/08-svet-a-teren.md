# 08 – Svět a procedurální terén

Krajina ve hře **není nahraná z žádného souboru**. Každý kopec, les i řeka se **vypočítá** z několika
vzorců a jednoho čísla (seedu). Tomu se říká **procedurální generování**. V této kapitole se dozvíte, jak
funguje a proč jsou si všichni hráči jistí, že „Polabí“ vypadá pro každého stejně.

## 8.1 Zásada „jediný zdroj pravdy“

Všechny informace o terénu pocházejí z **jedné třídy**: `Biomes` (`src/world/Biomes.js`).
Ptáte-li se jí na bod (x, z), vrátí výšku, sklon a typ povrchu. Stejnou odpověď pak využívá:

| Kdo se ptá | Proč |
| :-- | :-- |
| `ProceduralTerrain` | výška a barva každého vrcholu mřížky, rozmístění stromů |
| `FlightPhase` | výška povrchu pod košem (kolize) |
| `LandingResolver` | typ povrchu při dotyku (voda, les, skála, pole, louka) |
| `PlanScreen` | barevná mapa v plánování |
| `findMeadow` | výběr rovné louky pro cíl |
| `Birds` | výška létání ptáků nad terénem |

Díky tomu se vykreslená krajina **nikdy nerozchází s herní logikou**: co vypadá jako voda, je voda, i když
na ni narazíte při přistání. Kdyby si grafika a logika počítaly terén každá zvlášť, dříve nebo později by se
rozešly (hráč by „přistál na louce“, která na obrazovce vypadá jako les).

`Biomes` nesmí importovat Three.js: pracuje jen s čísly.

## 8.2 Pseudonáhodná čísla a seed

Počítač nemá skutečnou náhodu; používá **pseudonáhodné generátory (PRNG)** – algoritmy, které z
počátečního čísla (**seedu**) odvodí dlouhou, zdánlivě náhodnou posloupnost. Stejný seed → stejná posloupnost.

V `Biomes.js` je malý generátor **mulberry32**:

```js
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;     // číslo v intervalu <0; 1)
  };
}
```

Funkce **vrací funkci** (uzávěr, *closure*): proměnná `a` je „schovaná“ uvnitř a mezi voláními se mění. Každé
volání vrátí další číslo. (Vnitřek používá bitové operace – nemusíte mu rozumět do detailu, stačí vědět, že
promíchává bity tak, aby výsledek vypadal náhodně.)

> **Proč nepoužít `Math.random()`?** Protože nemá seed. Každé spuštění hry by mělo jiný svět a testy by
> nešly opakovat. (`Math.random()` používáme jen tam, kde na opakovatelnosti nezáleží: hmotnosti pasažérů,
> mraky, ptáci.)

## 8.3 Šum (simplex noise)

Chceme-li vygenerovat kopce, **čistě náhodná výška** v každém bodě by dala „sněžení na televizi“: sousední body by
nesouvisely. Potřebujeme **hladkou náhodu**, kde se sousední hodnoty mění plynule. K tomu slouží **gradientní
šum** (Perlinův, Simplex): funkce `noise(x, z)` vrací hodnotu −1…1, která se po ploše mění pozvolna.

Knihovna `simplex-noise` nabízí `createNoise2D(random)`; jako `random` jí předáme mulberry32 se seedem:

```js
const rnd = mulberry32(seed);
this.nBig    = createNoise2D(rnd);   // tři vrstvy šumu pro výšku
this.nMid    = createNoise2D(rnd);
this.nSmall  = createNoise2D(rnd);
this.nForest = createNoise2D(rnd);   // šum pro lesy …
```

Každé volání `createNoise2D(rnd)` si „vezme“ čísla z generátoru, takže každá funkce `n*` je jiná
„krajina“, ale vždy stejná pro stejný seed.

### Oktávy: součet šumů v různých měřítcích

Skutečné hory mají velké tvary i drobné nerovnosti. Proto se sečte několik šumů s různým
**měřítkem** (jak rychle se mění) a **amplitudou** (jak velké jsou):

```js
rawHeight(x, z) {
  const h = 32
    + this.nBig  (x / 1200, z / 1200) * 34     // velké kopce: perioda ~1,2 km, ±34 m
    + this.nMid  (x /  350, z /  350) * 8      // středně velké: ~350 m, ±8 m
    + this.nSmall(x /  120, z /  120) * 2;     // drobné nerovnosti: ~120 m, ±2 m
  ...
}
```

Dělení souřadnic konstantou „natahuje“ šum: `x / 1200` znamená, že se hodnota šumu změní přibližně na
vzdálenosti 1,2 km. Součet tří měřítek se nazývá **fraktální šum** (fBm). Základní hladina je 32 m,
celková výška se pohybuje zhruba od −10 do +75 m.

> **Zkuste to:** v `Biomes.rawHeight` změňte amplitudu `* 34` na `* 80` a znovu načtěte hru. Kopce budou
> mnohem vyšší. Hodnoty 34, 8, 2 jsou „zkušeně naladěné“; nic jiného než pocit je nevolí.

### Úpravy výšky

Čistý šum by nebyl hratelný, proto se výška dál upravuje:

1. **Rovný start.** V okruhu 50 m od místa startu je výška pevně 22 m (`startFlatHeight`); do vzdálenosti
   140 m se plynule „přimíchává“ šum pomocí smoothstep (odst. 8.5). Balon tak nikdy nestojí na svahu.
2. **Okraj mapy.** U hranice mapy (1 900 až 2 450 m od středu) se výška vyrovná na 26 m (`edgeHeight`),
   aby okraj nebyl vidět jako zlom, a za okrajem se plynule napojí rovinou.
3. **Skalní masivy** (jen některé lokality): zvýšené plošiny, viz 8.6.
4. **Řeka** (jen některé lokality): koryto pod hladinou, viz 8.7.
5. **Rovný start v přirozené výšce:** `site.terrain.startHeight: 'natural'` (výška šumu na startu místo pevných 22 m, aby start nebyl
   v „jámě“ pod kopcem), `startFlatRadius`/`startFlatFade` nastaví velikost louky a `hillClear` vyloučí kopečky v okolí startu.
   `startShift` posune střed louky **po větru** od startu (`Sites.createBiomes` ho spočítá ze směru větru u země,
   `Biomes.fcx/fcz`): start je pak na kraji louky a balon se rozkládá do volného prostoru, jako ve skutečnosti.
6. **Kopečky** (jen Lužické hory): k šumu se přičte `hillAmp` krát `smooth(hillFrom, hillTo, šum)` – široká
   kulovitá návrší. Tvar terénu lze pro lokalitu přepsat v `site.terrain` (`base`, `bigAmp`, `midAmp`, `hillAmp`,
   `hillScale`, `forestBias`, `treeLine`, `rockLine`; výchozí hodnoty jsou `GameConfig.TERRAIN`).
7. **Města** (jen některé lokality): terén se pod zástavbou vyrovná na výšku středu města, viz 8.6a.

## 8.4 Sklon a typ povrchu (biom)

### Sklon

Sklon je úhel mezi terénem a vodorovnou rovinou. Spočítá se z **numerické derivace** výšky:

```js
slopeDeg(x, z) {
  const e = 8;                                   // krok 8 m
  const dx = (this.rawHeight(x + e, z) - this.rawHeight(x - e, z)) / (2 * e);   // d(výška)/dx
  const dz = (this.rawHeight(x, z + e) - this.rawHeight(x, z - e)) / (2 * e);   // d(výška)/dz
  return Math.atan(Math.hypot(dx, dz)) * 180 / Math.PI;
}
```

Jde o **centrální diferenci**: směrnice terénu v bodě je rozdíl výšek o kousek vlevo a vpravo děleno
vzdáleností. Velikost gradientu je √(dx² + dz²) a úhel je jeho arkus tangens (`Math.atan`).

### Biomy

Typ povrchu určuje `terrainType(x, z, height, slope)` jako **rozhodovací strom** (pořadí je důležité,
první splněná podmínka vyhrává):

```
výška < 12 m (hladina)                                  → VODA
uvnitř města (`site.towns`)                             → MĚSTO (TOWN)
sklon > 30° nebo výška > rockLine (100 m)  nebo masiv   → SKÁLA
výška < treeLine (90 m)  a  lesní šum ≥ 0,52  a  sklon < 26°   → LES
sklon ≥ 12°                                             → PAHORKATINA (HILL)
u okraje mapy                                           → LOUKA
šum polí > 0,2 a vzdálenost od startu > 140 m           → POLE
jinak                                                   → LOUKA
```

Prahy (12° pro louku, 30° pro skálu, hladina 12 m) jsou v `GameConfig.WORLD`. Lesní šum je kombinace dvou
šumů (velký 500 m a malý 140 m), z něhož se odečítá oblast kolem startu a okraj mapy, aby kolem startu nerostl
les.

Funkce `sample(x, z)` pak vrátí všechno najednou:

```js
sample(x, z) {
  const height  = this.rawHeight(x, z);
  const slope   = this.slopeDeg(x, z);
  const type    = this.terrainType(x, z, height, slope);
  const ground  = Math.max(height, WORLD.waterLevel);              // voda = hladina
  const surface = type === BIOME.FOREST ? ground + WORLD.forestCanopy      // + koruny stromů 9 m
                : type === BIOME.TOWN ? ground + WORLD.townRoof : ground;   // + střechy domů 8 m
  return { type, height, ground, surface, slope };
}
```

**Důležité rozlišení**: `ground` je výška země (u vody hladina), `surface` je výška povrchu, na který balon
narazí (u lesa včetně koruny stromu o výšce 9 m). Fyzika používá `surface`; stín a vykreslení `ground`.

## 8.5 Interpolace: `smooth` (smoothstep)

Funkce `smooth(a, b, x)` je v souboru použita všude, kde se má něco plynule „zapnout“:

```js
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));   // 0..1 mezi a, b (oříznuto)
  return t * t * (3 - 2 * t);                               // hladká křivka S
};
```

Vstup `x` ≤ `a` dává 0, `x` ≥ `b` dává 1, mezi nimi plynulý přechod bez zlomu. Používá se pro rovný start,
okraj mapy, masivy i v modelu větru. Čistě lineární interpolace by měla „hranu“ v obou krajních bodech;
smoothstep má v nich nulovou směrnici, proto přechod vypadá přirozeně.

## 8.6 Skalní masivy

Lokalita „Český ráj“ má `massifs` (plošiny jsou nižší, 34 m, ať se liší od Lužických hor). Masiv je **vysoká plošina se strmými svahy**:

```js
massifAt(x, z) {
  ...
  const v = this.nRock(x / M.scale + 40, z / M.scale - 25) * 0.5 + 0.5       // šum 0..1
          + this.nRock(x / 170 - 8, z / 170 + 13) * M.detail;                 // jemný šum rozbíjí hrany
  return smooth(M.threshold, M.threshold + M.edge, v) * f;                    // 0 mimo, 1 uvnitř
}
```

- Masiv vznikne tam, kde šum překročí práh (`threshold` 0,76; ve vyšším prahu je masivů méně).
- Šířka přechodu (`edge` 0,07) určuje strmost: **úzký přechod = strmý svah**.
- Masiv se zvyšuje o `height` (55 m) a jeho povrch je skála (nad `rockMin`).
- Masivy se nevytvoří v okolí startu (`startClear` 170 m, pak plynulý nárůst) ani u řeky (`riverClear`).

## 8.6a Města

Lokalita může mít pole `towns: [{ x, z, r }]` (střed v metrech od startu, `r` = poloměr zástavby). V Lužických
horách jsou dvě vesnice, v Českém ráji jedno městečko, jinde žádné.

- **Biom `TOWN`** vzniká uvnitř nepravidelného kruhu (okraj se vlní šumem, `TOWNS.edgeNoise`). Země je **tmavě šedá**
  (`COLORS.town`), tmavší než skála, aby se obojí nezaměnilo; navíc je v ní vidět domky.
- **Rovný terén:** `rawHeight` pod městem plynule přechází na výšku středu města (`townFlat`, pásmo
  `TOWNS.flatFrom`–`flatTo` násobků poloměru). Domky tak nelevitují ani se nezabořují. Kolem města nejsou masivy.
- **Rozmístění** počítá `Biomes.layoutTown` (čistá logika, deterministicky podle seedu): kostel poblíž středu,
  případně komíny (`town.chimneyCount`; Varnsdorf v Lužických horách má tři, 45 m vysoké), pak **náhodně rozmístěné
  a natočené domky** různé výšky (zdi 3–7 m + střecha 2 m) a stromy v mezerách. Nic se nesmí překrývat
  (rejection sampling: náhodný bod se zahodí, když koliduje s už umístěnou stavbou).
- **Vykreslení** (`ProceduralTerrain.buildTowns`): domky jsou dva `InstancedMesh` (stěny, střechy), kostel
  (loď + věž s jehlanem, 28 m) a komíny jsou samostatné meshe, stromy se přidají do společného instancování stromů.
- **Přistání:** překážka je `surface = ground + Biomes.townObstacle(x, z)`: střechy a stromy `WORLD.townRoof` (9 m),
  věž kostela a komíny výš (landmarks). Dotyk ve městě je neúspěch (`KIND.TOWN`, „Přistání na střechách“).

## 8.6c Samostatný kostel

Lokalita může mít `churches: [{ x, z, a }]` (poloha v metrech od startu, `a` = natočení lodi). V Lužických horách stojí kostel
na kopci severně od Varnsdorfu (`Biomes.setChurches`): pod ním je malá rovná plošina na výšce místa (`LONE_CHURCH.padRadius`),
okolní les je vyčištěný mýtinou a věž i loď jsou překážka při přistání (`churchObstacle`, stejné rozměry jako kostel ve městě,
`TOWNS.church`). Vykresluje ho `ProceduralTerrain.buildLoneChurches`.

## 8.6b Rybníky

Lokalita může mít `ponds: [{ x, z, r }]` (střed v metrech od startu, `r` = poloměr hladiny). Lužické hory jich mají pět,
vždy v nejnižších místech krajiny (nalezeno prohledáním šumu výšky). V `Biomes.heightBeforeTowns` se pro každý rybník:

1. okolí plynule sníží na výšku břehu (`PONDS.shore` 15 m, těsně nad hladinou 12 m) v pásmu až `PONDS.flatTo` × poloměr,
2. uvnitř nepravidelného okraje (`PONDS.edgeNoise`) vyhloubí dno (`PONDS.bed` 6 m).

Voda tedy opět není zvláštní objekt: je to jen místo, kde je terén pod hladinou 12 m (stejně jako řeka). Přistání ve vodě je neúspěch.

## 8.7 Řeka

Řeku lokalita zadá **několika body** `[x, z]` a šířkou. Uvnitř `Biomes`:

1. Body se proloží **křivkou Catmull–Rom** (`splinePath`) – plynulou křivkou procházející všemi body,
   a převedou na hustou **lomenou čáru** (krok ~40 m).
2. `riverDistance(x, z)` vrací vzdálenost bodu od nejbližšího **úseku** lomené čáry: pro každý úsek se
   spočítá průmět bodu na přímku (parametr *t* oříznutý na 0…1) a vzdálenost k němu. (Takové „vzdálenost bodu od
   úsečky“ je úloha z analytické geometrie.)
3. V `rawHeight` se v okolí řeky výška **smíchá** s dnem koryta (7 m, pod hladinou 12 m) pomocí smoothstep:
   `out = out * (1 - c) + WORLD.riverBed * c`. Vzniká koryto s pozvolnými břehy (`riverBank` 60 m).
4. Protože hladina vody je plocha ve výšce 12 m, všude, kde je terén pod 12 m, je **voda**. Řeka tedy není
   zvláštní objekt, jen **hluboký žlábek** v terénu.

Pro zrychlení se kontroluje nejdříve **ohraničující obdélník** (`box`) řeky: mimo něj funkce vrací
`Infinity` bez smyčky přes úseky.

## 8.8 Lokality (`Sites.js`)

Lokalita je **datový objekt**, ne kód:

```js
{
  id: 'polabi',
  name: { cs: 'Polabí – Děčínsko', en: 'Elbe Valley – Děčín Region' },
  desc: { cs: '…', en: '…' },
  seed: 1337,                  // určuje celý svět
  elevation: 220,              // nadmořská výška startu (m) – pro hustotu vzduchu
  wind: [                      // vrstvy větru
    { alt: 0,   speed: 1.0, bearing: 175 },
    { alt: 150, speed: 3.5, bearing: 185 },
    { alt: 300, speed: 5.5, bearing: 195 },
    { alt: 450, speed: 3.5, bearing: 70  },   // střih větru: slabý návrat k východu
    { alt: 650, speed: 8.0, bearing: 215 },
  ],
  target: { bearing: 180, dist: 1900 },       // kde přibližně leží cíl
  river: { width: 90, points: [[-3300, 540], …] },   // volitelně
  towns: [{ x: -700, z: 450, r: 380 }],               // volitelně
  terrain: { ridge: { from: 250, to: -900, height: 190, scale: 700, rough: 6 }, … },   // volitelně: horský val
  massifs: true,                                       // volitelně (nebo objekt s přepsáním)
}
```

Takovéto **datově řízené** řešení je velmi flexibilní: nová lokalita je jen nový objekt v poli `SITES`
(návod v [kapitole 13](13-jak-upravovat.md)). Hra obsahuje čtyři lokality (první je domov školy):

| Lokalita | Seed | Nadm. výška | Zvláštnost |
| :-- | :-: | :-: | :-- |
| Lužické hory – nad Varnsdorfem | 8123 | 360 m | zalesněné kopečky, louky, 2 města (Varnsdorf s komíny v údolí ~600 m od startu), 5 rybníků, skalnaté vrcholky |
| Polabí – Děčínsko | 1337 | 220 m | na severu horský val (Krušné hory), start na louce v jeho úpatí, pod horami velké město (Děčín) na obou březích Labe, které protéká mapou ze západu na východ (~450 m jižně od startu), severní vítr; za městem a řekou louky, pole, lesy a 4 rybníky |
| Český ráj | 4711 | 290 m | nižší skalní masivy, 1 městečko |
| Máchův kraj – Máchovo jezero | 77 | 270 m | borovicové lesy, velké jezero s ostrůvkem (elipsa v `ponds`), městečko Doksy na břehu, kopec s hradem Bezděz (kostel a jeden domek), pískovcové skalky, vítr z východu přes jihovýchod na jih |

### Jezera, ostrov a osamělé kopce

- **Jezero:** záznam v `ponds` může být elipsa (`aspect` = poměr poloos, `angle` = natočení), mít vlastní šířku
  břehu (`flatTo`), hladší břeh (`edgeNoise`, `noiseScale`) a ostrov uprostřed (`island: { x, z, r }`).
  Bez těchto voleb je to malý kulatý rybník jako dřív.
- **Kopec:** `terrain.peaks: [{ x, z, r, height }]` přidá osamělý kopec s plochým vrcholem. Na vrcholu stojí
  hrad Bezděz: malé „město“ (`towns`) s pevným počtem domků (`houses`) a bez stromů (`treeCount: 0`),
  takže vznikne kostel a jeden domek; terén se pod ním vyrovná.
- **Výška města:** město má výchozí výšku terénu ve středu. Volba `height` ji nastaví pevně (Doksy tak leží
  u hladiny jezera, ne na planině nad ním).

### Horský val (`terrain.ridge`)

Lokalita může mít na jedné straně mapy **horský val**: `ridge: { from, to, height, scale, rough }`. Výška roste
od souřadnice `from` (úpatí) do `to` (hřeben) hladkou křivkou (smoothstep, stejně jako jinde v `Biomes`).
Navíc se v ose x mění výška hřebene (`scale` je délka vln v m) a svahy mají nerovnosti `rough` (m). Val se přičítá
k výšce šumu (`Biomes.ridgeHeight`), takže ho zahrnuje i „přirozená“ výška startu a u okraje mapy se spolu
s terénem vyrovná. Souřadnice: sever je záporné *z*, takže `from > to` znamená hory na severu.

Řeka se do terénu vyřezává **až po vyrovnání terénu pod městy** (`Biomes.carveRiver` v `rawHeight`), proto může
městem protékat; domy, kostel a stromy v `layoutTown` se vyhýbají korytu.

### Střed mapy

Mapa je čtverec 5 × 5 km, ale **start není uprostřed**. Je posunut o 850 m proti směru letu
(`WORLD.startShift`, lokalita ho může přepsat vlastním `startShift`, funkce `mapCenter(site)`), takže hráč má před sebou co nejvíc krajiny. Souřadnice ve hře
mají **start vždy v počátku (0, 0)**; mapa se vystředí kolem `center`. (`Biomes` dostává `center` v konstruktoru.)

### Cíl

`findMeadow(bearing, dist)` hledá **rovnou louku** poblíž požadované vzdálenosti a směru:

1. zkouší vzdálenosti 85–130 % požadované a směry ±40° v krocích po 4°,
2. louka je vhodná, když všech pět bodů (střed a čtyři body vzdálené 70 m) je `MEADOW` se sklonem < 7°,
3. vybere kandidáta s nejmenší „cenou“ (odchylka ve vzdálenosti a ve směru),
4. když nic nenajde, hledá po spirále kolem ideálního bodu.

Cíl je tedy pro stejnou lokalitu **vždy na stejném místě** (deterministický terén + deterministický algoritmus).

## 8.9 Mapa v plánování

`ui/PlanScreen.js` vykreslí mapu pomocí **2D canvasu** o rozlišení 110 × 110 pixelů:

```js
for (let j = 0; j < MAP_RES; j++) {
  for (let i = 0; i < MAP_RES; i++) {
    const x = ((i + 0.5) / MAP_RES - 0.5) * WORLD.size + center.x;     // pixel → světová souřadnice
    const z = ((j + 0.5) / MAP_RES - 0.5) * WORLD.size + center.z;
    const s = biomes.sample(x, z);                                       // biom v bodě
    const col = MAP_COLORS[s.type];                                       // barva biomu
    ...  img.data[k] = col[0] * shade; ...                                // zapsání pixelu
  }
}
g.putImageData(img, 0, 0);
```

Pro každý pixel se zjistí biom a zapíše barva přímo do `ImageData` (pole bajtů RGBA). Výsledek se
**kešuje** podle lokality (`mapCache`), takže se mapa počítá jen jednou. Na mapu se pak dokreslí šipky větru
pro každou vrstvu a značky startu a cíle.

Mapa a 3D svět tedy **vznikají ze stejných dat** (`Biomes.sample`) – to je praktický důsledek zásady
„jediného zdroje pravdy“.

## 8.10 Determinismus a testy

Protože je terén deterministický, lze testovat jeho vlastnosti (`tests/game-rules.test.js`):

```js
it('je deterministický a start je louka', () => {
  const a = new Biomes(1337), b = new Biomes(1337);
  expect(a.sample(300, -200)).toEqual(b.sample(300, -200));
  expect(a.sample(0, 0).type).toBe(BIOME.MEADOW);
});
```

Další testy ověřují, že `findMeadow` vrací opravdu louku, že řeka protéká mapou a je to voda,
a že masivy neobsadí start. Protože `Biomes` nepotřebuje WebGL, běží testy v Node.js za zlomek sekundy.

## 8.11 Shrnutí

| Co | Jak | Kde |
| :-- | :-- | :-- |
| Výška | součet tří šumů + úpravy | `Biomes.rawHeight` |
| Sklon | centrální diference | `Biomes.slopeDeg` |
| Biom | rozhodovací strom | `Biomes.terrainType` |
| Řeka | spline + vzdálenost k lomené čáře | `Biomes.setRiver`, `riverDistance` |
| Masiv | práh šumu + smoothstep | `Biomes.massifAt` |
| Lokality a vítr | datové objekty | `Sites.js` |
| Cíl | prohledávání mřížky směrů a vzdáleností | `Biomes.findMeadow` |
| Vykreslení | mřížka + vertexové barvy + instancované stromy | `ProceduralTerrain` |
