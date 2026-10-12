# 04 – Fyzika v kódu

V [kapitole 03](03-fyzika-letu.md) jsme odvodili vzorce. Tady ukážeme, **jak se z nich stane program**:
kde je kód uložený, jak funguje jeden krok simulace, proč se počítá právě takto a jak lze simulaci
spustit i bez grafiky.

## 4.1 Zásada: fyzika nezná grafiku

Následující soubory jsou **čistá logika**. Nesmějí importovat Three.js ani sahat na DOM:

| Soubor | Co počítá |
| :-- | :-- |
| `src/core/PhysicsEngine.js` | teplota, vztlak, svislý a vodorovný pohyb, plyn |
| `src/core/WindModel.js` | vítr podle výšky |
| `src/core/FlightPlan.js` | plán letu a odhad (`estimateFlight`) |
| `src/core/Scoring.js` | skóre |
| `src/phases/LandingResolver.js` | vyhodnocení dosednutí |
| `src/world/Biomes.js` | výška a typ terénu (viz kapitola 08) |

**Proč?** Tři důvody:

1. **Testovatelnost** – testy (`tests/`) běží v Node.js bez prohlížeče a bez WebGL.
2. **Čitelnost** – kdo čte fyziku, nemusí rozumět 3D grafice (a naopak).
3. **Výměnnost** – vizuální stránku (např. nahradit krabice za profesionální 3D model) lze změnit, aniž
   by se dotkla fyziky.

Fyzika komunikuje s okolím výhradně **čísly**: dostane vstupy (zážeh, paraventil, otáčení, vítr, výšku
terénu) a vrátí upravený stav (poloha, rychlost, teplota) a případně událost „dotyk“.

## 4.2 Hustota vzduchu: `airDensity`

```js
// src/core/PhysicsEngine.js
const M_AIR = 0.028964;   // kg/mol
const R_GAS = 8.314;      // J/(mol·K)

export function airDensity(tempC, altitudeMsl) {
  const p = 101325 * Math.exp(-altitudeMsl / 8400);
  return (p * M_AIR) / (R_GAS * (tempC + 273.15));
}
```

Jde o přepis dvou vzorců z kapitoly 03 (barometrický vzorec a stavová rovnice). Funkce je **čistá**
(*pure function*): stejný vstup dává stejný výstup a nic nemění. Takové funkce se programují i testují
nejsnáze.

Povšimněte si: teplota přichází ve **°C**, převod na kelviny je uvnitř funkce. Častá chyba začátečníků je
zapomenout přičíst 273,15 a dostat nesmysl (nebo dělení nulou při 0 K).

## 4.3 Třída `PhysicsEngine`

### Stav

```js
reset() {
  const c = this.cfg;
  this.pos = { x: 0, y: 0, z: 0 };        // poloha (m), y = svisle
  this.vel = { x: 0, y: 0, z: 0 };        // rychlost (m/s)
  this.tempIn = c.ambientC;               // teplota vzduchu v plášti (°C)
  this.gas = c.bottles * P.gasPerBottle;  // zbývající plyn (kg)
  this.heading = 0;                       // natočení koše (stupně)
  this.burning = 0;                       // zda právě hoří (0..1) - pro zvuk a plamen
  this.venting = 0;                       // zda je otevřen paraventil (0..1)
  this.onGround = true;
  this.flightTime = 0;                    // s
  this.maxAlt = 0;                        // největší dosažená y
}
```

Konfigurace (`cfg`) se zadává při vytvoření: `{ payloadKg, bottles, ambientC, siteElevation }`.
Vytváří ji `FlightPlan.physicsConfig()` z toho, co hráč vybral v plánování.

| Proměnná | Jednotka | Význam |
| :-- | :-: | :-- |
| `pos.x, pos.z` | m | vodorovná poloha (x = východ, z = jih; −z = sever) |
| `pos.y` | m | svislá poloha |
| `vel.*` | m/s | rychlost |
| `tempIn` | °C | teplota vzduchu v plášti |
| `gas` | kg | zbývající palivo |
| `heading` | ° | natočení koše |
| `onGround` | – | je-li `true`, balon stojí na zemi |

### Hmotnost, vztlak, teplota pro visení

```js
get mass() {
  const c = this.cfg;
  return P.envelopeMass + P.basketMass + c.payloadKg + c.bottles * P.bottleEmpty + this.gas;
}

netLiftKg(y = this.pos.y) {
  const alt  = this.cfg.siteElevation + y;
  const rOut = airDensity(this.ambient, alt);
  const rIn  = airDensity(this.tempIn, alt);
  return P.volume * (rOut - rIn) - this.mass;
}

hoverTemp(y = this.pos.y) {
  const alt = this.cfg.siteElevation + y;
  const rOut = airDensity(this.ambient, alt);
  const rInNeeded = rOut - this.mass / P.volume;
  return (rOut * (this.ambient + 273.15)) / rInNeeded - 273.15;
}
```

- `get mass()` je **getter** – dá se číst jako vlastnost (`p.mass`), ale pokaždé se přepočítá, takže
  zohledňuje ubývající plyn.
- `hoverTemp` je algebraické vyjádření podmínky *L_net = 0* z odst. 3.4 (viz příklad 4).

### Jeden krok: `step(dt, input, wind, groundY)`

Metoda `step` je **srdcem fyziky**. Volá se opakovaně s pevným `dt` = 1/60 s.
Vstupy: `input = {burn, vent, rotate}` (hodnoty 0..1, rotace −1..1), `wind = {x, z}` vítr v aktuální
výšce a `groundY` výška povrchu pod košem.

Projdeme ji po částech.

**1) Čas a hoření**

```js
this.flightTime += dt;

let burn = input.burn || 0;
if (this.gas <= 0) burn = 0;                    // bez plynu nelze hořet
this.burning = burn;
this.gas = Math.max(0, this.gas - P.gasRate * burn * dt);
```

Spotřeba plynu je přímo úměrná zážehu a času: *Δ gas = gasRate · burn · dt*. Čas se nasčítává i na
zemi (`flightTime`).

**2) Teplota** (diferenciální rovnice z odst. 3.6)

```js
const dTamb = this.tempIn - this.ambient;
const dT = burn * P.burnHeating * (input.heatBoost || 1)
         - (P.coolK + this.leak) * dTamb          // leak: trvalé díry po přehřátí
         - vent * P.ventK * this.ventMul * dTamb; // ventMul: klapka se držením rozevírá
this.tempIn += dT * dt;
if (this.tempIn < this.ambient) this.tempIn = this.ambient;
```

Před teplotou i po ní běží `updateVent` (rozevírání klapky a propadání vrchlíku) a `updateOverheat`
(popáleniny, požár); viz 3.6a a 3.6b.

Je to **Eulerova metoda** pro rovnici *dT/dt = f(T)*: nová hodnota = stará + derivace · dt. Poslední
řádek je pojistka: vzduch v plášti nemůže být chladnější než okolí.

**3) Hustoty a síly**

```js
const alt  = this.cfg.siteElevation + this.pos.y;
const rOut = airDensity(this.ambient, alt);
const rIn  = airDensity(this.tempIn, alt);
const m    = this.mass;
const lift = P.volume * (rOut - rIn) * P.g;                        // N
const drag = 0.5 * rOut * this.vel.y * Math.abs(this.vel.y) * P.Cd * P.area;   // N
const inertia = m + rIn * P.volume + P.addedMassFactor * rOut * P.volume;       // kg
const fy = lift - m * P.g - drag;                                  // výslednice (N)
```

Každý řádek odpovídá vzorci z kapitoly 03. Zjistěte si, **proč** je odpor zapsán jako
`v * Math.abs(v)` a ne `v * v` (odpověď v 3.7).

**4) Svislý a vodorovný pohyb**

```js
if (this.onGround && fy <= 0) {
  this.vel.y = 0;
  this.vel.x *= 0.9;
  this.vel.z *= 0.9;
} else {
  this.onGround = false;
  this.vel.y += (fy / inertia) * dt;                // a = F / m_ef
  const k = Math.min(1, dt / P.windTau);
  this.vel.x += (wind.x - this.vel.x) * k;          // zpožděné přibližování k větru
  this.vel.z += (wind.z - this.vel.z) * k;
}
```

- Na zemi (a nepřekročí-li vztlak tíhu) balon stojí a horizontální rychlost se tlumí.
- Ve vzduchu: **druhý Newtonův zákon** *a = F / m_ef*, a rychlost se zvětší o *a · dt*. Vodorovně se rychlost
  přibližuje větru podle odst. 3.8 (*k = dt/τ*).
- `Math.min(1, dt / P.windTau)` hlídá, aby *k* nikdy nepřesáhlo 1: při příliš velkém *dt* by balon
  „přestřelil“ vítr. (Při *dt* = 1/60 a *τ* = 6 je *k* = 0,0028, tedy bezpečně.)

**5) Rotace a poloha**

```js
this.heading = (this.heading + (input.rotate || 0) * P.rotateRate * dt + 360) % 360;
this.pos.x += this.vel.x * dt;
this.pos.z += this.vel.z * dt;
this.pos.y += this.vel.y * dt;
```

Poloha se posune o *v · dt*. Všimněte si, že **nejprve** se aktualizuje rychlost a potom poloha novou
rychlostí. To je tzv. **semi-implicitní (symplektická) Eulerova metoda**, stabilnější než „čistý“ Euler.
Přičtení `+ 360` před zbytkovým dělením zajistí, že úhel nebude záporný.

**6) Kontakt se zemí**

```js
if (this.pos.y <= groundY) {
  if (!this.onGround && this.vel.y < -0.05) {
    out.touchdown = { vy: -this.vel.y, vxz: Math.hypot(this.vel.x, this.vel.z) };
  }
  this.pos.y = groundY;
  this.vel.y = 0;
  this.onGround = true;
}
if (this.pos.y > this.maxAlt) this.maxAlt = this.pos.y;
return out;
```

Pokud balon klesl pod povrch, metoda **vrátí událost** `touchdown` s rychlostmi (kladné `vy` = klesání).
Fyzika sama o přistání nerozhoduje; jen oznámí, že k dotyku došlo. Rozhodnutí je věcí dalšího modulu
(odst. 4.6), čímž se drží oddělení odpovědností.

### Numerická integrace: proč pevný krok

Rovnice by šlo řešit přesně (analyticky), ale jen pro zjednodušené případy. Hra proto používá
**numerickou integraci**: stav se posouvá v malých krocích *dt*. Chyba metody roste s velikostí kroku.
Pro stabilitu a **opakovatelnost** je nutné, aby *dt* byl **vždy stejný** (1/60 s) bez ohledu na to,
jak rychle se kreslí obraz (FPS). Jak je to zajištěno, ukazuje [kapitola 06](06-herni-smycka-a-faze.md).

> **Experiment:** v `GameConfig.js` změňte `coolK` z 0,006 na 0,02. Balon chladne mnohem rychleji; za letu
> budete muset hořet častěji a plyn dojde dřív. Takto se „ladí na pocit“.

## 4.4 Model větru: `WindModel`

```js
export class WindModel {
  constructor(layers, seed = 1) {
    this.layers = layers.map((l) => ({ alt: l.alt, ...bearingToVec(l.bearing, l.speed) }));
    this.seed = seed;
    this.time = 0;
  }
  update(dt) { this.time += dt; }
  base(alt) { /* interpolace mezi vrstvami (smoothstep) */ }
  at(alt)   { /* base(alt) + turbulence */ }
}
```

- Vstup: pole vrstev `{alt, speed, bearing}` z `Sites.js`. V konstruktoru se každá vrstva převede na
  vektor `{x, z}` funkcí `bearingToVec` (viz vzorce v 3.8).
- `base(alt)` najde dvě sousední vrstvy a mezi nimi interpoluje pomocí smoothstep.
  Pod nejnižší a nad nejvyšší vrstvou vrací hodnotu krajní vrstvy (nepředpokládá extrapolaci).
- `at(alt)` přidá turbulenci – součet sinusoid:

```js
const amp = 0.08 + sp * 0.05;
x: w.x + Math.sin(t * 0.37 + s + alt * 0.021) * amp + Math.sin(t * 0.93 + s * 2) * amp * 0.4,
z: w.z + Math.cos(t * 0.41 + s * 1.7 + alt * 0.017) * amp + Math.cos(t * 0.87 + s) * amp * 0.4,
```

  Každá složka má dvě sinusoidy s různými frekvencemi (součet dvou „nesoudělných“ vln vypadá nepravidelně),
  fázi z `seed` (jiná lokalita = jiné kolísání) a z výšky `alt` (jiná výška = jiná fáze).
  `time` se zvětšuje voláním `update(dt)`; hra ho volá ve `FlightPhase.fixedUpdate`.

**Výška pro vítr** se měří **nad místem startu**, ne nad terénem a ne nad hladinou moře:
`w.wind.at(p.pos.y - w.startY)` (`startY` je výška terénu v počátku souřadnic). Proto má žebřík větru v HUD
poznámku „Výšky větru měříme od místa startu“.

## 4.5 Plán letu a odhad: `FlightPlan`

`FlightPlan` je **datový model** toho, co hráč nastavil: jméno, titul (m/f), místo, denní doba,
hmotnosti pasažérů, počet lahví, vzor pláště.

```js
export class FlightPlan {
  constructor({ name = '', honorific = 'm', siteId = 'polabi', timeOfDay = 'morning', passengers = 2, bottles = 2 } = {}) {
    ...
    this.masses = [];                 // hmotnosti pasažérů (kg)
    this.setPassengers(passengers);   // doplní náhodné hmotnosti 65..90 kg
  }
  get payloadKg() { return PHYSICS.pilotMass + this.masses.reduce((a, b) => a + b, 0); }
  physicsConfig() { return { payloadKg: ..., bottles: ..., ambientC: ..., siteElevation: ... }; }
}
```

Tři zajímavosti:

- **Gettery** (`get ambientC()`, `get site()`) dělají z odvozených údajů vlastnosti, které se vždy
  čtou aktuálně.
- `Math.min/Math.max` v `setPassengers`/`setBottles` zajišťují **omezení rozsahu** (`PLAN.minPassengers` …).
- `physicsConfig()` je **adaptér** mezi uživatelským světem (plán) a fyzikálním světem (konfigurace).

Funkce `estimateFlight(plan)` vytvoří „zkušební“ `PhysicsEngine` a spočítá:

| Výstup | Výpočet |
| :-- | :-- |
| `hoverTemp` | `hoverTemp(0)` |
| `reserveKg` | čistý vztlak při teplotě `alarmTemp − 10` (110 °C) = „rezerva vztlaku“ |
| `minutes` | doba, po kterou vystačí plyn při udržování teploty (viz příklad 6) |
| `canFly` | `hover < limit − 5`, kde `limit = alarmTemp − 10` |
| `tight` | balon je „na hraně“: `hover ≥ limit − 20` |

Obrazovka plánování podle `canFly` povolí tlačítko „Vzlétnout“ a podle `tight` zobrazí varování.

## 4.6 Vyhodnocení přistání

Soubor `src/phases/LandingResolver.js` je malý a jeho jediná funkce `classifyTouchdown(touch, biome)`
ukazuje, jak vypadá **pravidlová logika bez vedlejších účinků**:

```js
export function classifyTouchdown(touch, biome) {
  const { vy, vxz } = touch;
  if (biome.type === BIOME.WATER)  return { kind: KIND.WATER,  success: false, field: false };
  if (biome.type === BIOME.FOREST) return { kind: KIND.FOREST, success: false, field: false };
  if (biome.type === BIOME.ROCK)   return { kind: KIND.ROCK,   success: false, field: false };
  if (vy > LANDING.hardVy || vxz > LANDING.hardVxz) return { kind: KIND.CRASH, success: false, field: false };

  let kind = vy >= LANDING.softVy || vxz >= LANDING.softVxz ? KIND.HARD : KIND.SOFT;
  if (biome.type === BIOME.HILL && kind === KIND.SOFT) kind = KIND.HARD;
  return { kind, success: true, field: biome.type === BIOME.FIELD };
}
```

Pořadí kontrol je důležité: nejdřív se vylučují nepřijatelné povrchy (voda, les, skála), pak se
posuzuje rychlost.

| Podmínka při dotyku | Výsledek | `success` |
| :-- | :-- | :-: |
| voda / les / skála | neúspěch (`water`, `forest`, `rock`), bez ohledu na rychlost | ne |
| `v_y > 2,5` nebo `v_xz > 6` | **havárie** (`crash`) | ne |
| `v_y ≥ 1,2` nebo `v_xz ≥ 3` | **tvrdší přistání** (`hard`): koš se převrátí a plášť ho vleče | ano |
| jinak | **měkké přistání** (`soft`) | ano |
| měkké přistání na svahu („HILL“, sklon 12–30°) | změní se na `hard` | ano |
| povrch je pole (`FIELD`) | úspěch, ale `field: true` (penalizace skóre) | ano |

Prahy jsou v `GameConfig.LANDING` (`softVy`, `hardVy`, `softVxz`, `hardVxz`).
**Žádná magická čísla v kódu**: kdo chce změnit obtížnost, upraví konstantu a nikde jinde.

Výsledek (`kind`) pak ve `LandingPhase` určí **animaci**: tabulka `TIMELINE` nastavuje, kdy se plášť
začne klást a jak dlouho se vypouští (`tipStart`, `tipDur`, `deflate`). `LandingPhase` také
posouvá koš po zemi rychlostí `slideV`, kterou zpomaluje `LANDING.dragFriction` (viz 3.10).

## 4.7 Skóre

`scoreFlight(r)` v `src/core/Scoring.js` vrátí `{ score, stars, parts, tier }`.

```
neúspěch / havárie                         → 0 bodů

landing = 600 (soft) nebo 350 (hard)
effort  = min(1, doba / 90 s) · min(1, výška / 60 m)          ← snaha
landing × (0,2 + 0,8 · effort)
fuel    = 200 · gasFrac · effort                               ← úspora plynu
target  = 200 · clamp(1 − (vzdálenost − 60) / (1500 − 60))     ← blízkost k cíli
pole    = −120
score   = max(0, landing + fuel + target + penalty)
```

- **Faktor snahy** (`effort`) brání „podvádění“: kdo vzlétne na pár metrů a hned přistane, nedostane
  skoro plné body.
- `tier` (úroveň titulu) = 3 pro ≥ 850 bodů, 2 pro ≥ 650, 1 pro ≥ 450, jinak 0; **počet hvězd** je
  `tier + 1` (maximálně 4). Titul na diplomu bere `Titles.titleFor` z `public/titles.json` podle lokality, oslovení, jazyka a `tier` (např. „Baron Lužických hor“); když soubor nebo položka chybí, použije se vestavěné `title.<m|f>.<tier>` z překladů.
- Všechny konstanty jsou v objektu `SCORE` na začátku souboru.

## 4.8 Jak fyziku volá herní fáze

Z `FlightPhase.fixedUpdate(dt)`:

```js
w.wind.update(dt);                                   // posun času turbulence
const input = app.controls.read();                   // {burn, vent, rotate}
const surface = app.sample(p.pos.x, p.pos.z).surface;   // výška povrchu (i s korunami stromů)
const wind = w.wind.at(p.pos.y - w.startY);          // vítr ve výšce balonu
const out = b.update(dt, input, wind, surface);      // Balloon.update -> PhysicsEngine.step
if (out.touchdown && p.maxAlt > 3) app.go('LANDING', { touch: out.touchdown });
```

Z toho je vidět **tok dat**:

```
 klávesnice/dotyk ──► TouchControls.read() ──► input ─┐
 WindModel.at(výška) ─────────────────────────► wind ─┤
 Biomes.sample(x,z) ──────────────────────► surface ──┤
                                                      ▼
                                          PhysicsEngine.step()
                                                      │
                          pozice, teplota, plyn ◄─────┴────► touchdown ─► LandingPhase
                                   │
                                   ▼
             FlightPhase.update() ──► HUD, zvuk, kamera, BalloonView (vizuál)
```

Fyzika běží v `fixedUpdate` (pevný krok), vizualizace v `update` (každý snímek). Rozdíl je vysvětlen v kapitole 06.

## 4.9 Spuštění fyziky bez hry

Protože `PhysicsEngine` nepotřebuje prohlížeč, můžete ji spustit v Node.js a „proletět“ balon bez
grafiky. Vytvořte v kořeni projektu soubor `experiment.mjs`:

```js
import { PhysicsEngine } from './src/core/PhysicsEngine.js';
import { FlightPlan } from './src/core/FlightPlan.js';

const plan = new FlightPlan({ passengers: 2, bottles: 2 });
plan.masses = [75, 75];                       // pevné hmotnosti (jinak jsou náhodné)

const p = new PhysicsEngine(plan.physicsConfig());
const calm = { x: 0, z: 0 };                  // bezvětří

console.log('teplota pro visení:', p.hoverTemp(0).toFixed(1), '°C');

for (let i = 0; i <= 60 * 240; i++) {         // 240 s
  // jednoduchý "termostat": hořák zapni, pokud je teplota pod hodnotou visení + 12 K
  const burn = p.tempIn < p.hoverTemp(p.pos.y) + 12 ? 1 : 0;
  p.step(1 / 60, { burn }, calm, 0);
  if (i % (60 * 20) === 0) {
    console.log(
      `${(i / 60).toFixed(0).padStart(3)} s  T=${p.tempIn.toFixed(1)} °C  ` +
      `výška=${p.pos.y.toFixed(1)} m  v=${p.vel.y.toFixed(2)} m/s  plyn=${p.gas.toFixed(2)} kg`);
  }
}
```

Spusťte příkazem `node experiment.mjs`. Výstup (zkráceně):

```
teplota pro visení: 66.4 °C
  0 s  T=12.0 °C  výška=0.0 m   v=0.00 m/s  plyn=40.00 kg
 20 s  T=34.6 °C  výška=0.0 m   v=0.00 m/s  plyn=38.20 kg
 40 s  T=54.7 °C  výška=0.0 m   v=0.00 m/s  plyn=36.40 kg
 60 s  T=72.5 °C  výška=1.1 m   v=0.41 m/s  plyn=34.60 kg
 80 s  T=78.0 °C  výška=37.0 m  v=2.99 m/s  plyn=33.60 kg
100 s  T=78.5 °C  výška=106.4 m v=3.74 m/s  plyn=32.97 kg
120 s  T=79.0 °C  výška=182.7 m v=3.85 m/s  plyn=32.33 kg
```

Co z výstupu poznáme:

- balon vzlétne asi po **52 s** (teplota musí dosáhnout přibližně teploty pro visení a v tu chvíli se
  vztlak vyrovná tíze),
- **rychlost stoupání** se po vzletu během dalších zhruba 50 s ustálí na ≈ 3,8 m/s (mezní rychlost, příklad 7 v kapitole 03),
- teplota pomalu roste, protože plyn ubývá (balon se odlehčuje) a termostat drží teplotu nad hodnotou visení.

> **Zkuste to:** spočítejte si z hodnot výstupu, kolik plynu hořák spotřebuje za 20 s plného zážehu
> (0,09 kg/s · 20 s = 1,8 kg). Souhlasí to s rozdílem v prvních dvou řádcích výpisu?

Tento postup – **spustit modul samostatně a pozorovat čísla** – je užitečná dovednost pro ladění
každé simulace. Úpravou konstant v `GameConfig.js` a opakovaným spuštěním si ověříte, jak parametry
ovlivňují výsledek, bez klikání ve hře.

## 4.10 Návod: přidání nového fyzikálního jevu

Chcete do modelu přidat **pokles okolní teploty s výškou** (≈ 6,5 K/km)? Postup:

1. V `airDensity` už teplotu dostáváme jako parametr; stačí při volání `airDensity(this.ambient, alt)`
   dosadit upravenou teplotu:
   ```js
   const ambientAt = (y) => this.ambient - 0.0065 * y;
   const rOut = airDensity(ambientAt(this.pos.y), alt);
   ```
2. Stejnou funkci použijte v `netLiftKg` a `hoverTemp` (jinak by plán a skutečnost nesouhlasily!).
3. V Newtonově chladnutí je *T_out* také závislé na výšce: `dTamb = this.tempIn - ambientAt(this.pos.y)`.
4. Přidejte **test** do `tests/physics.test.js` (např. že s výškou klesá `hoverTemp`).
5. Aktualizujte tuto dokumentaci a tabulku zjednodušení v kapitole 03.

Takto vypadá disciplinovaná změna: **kód – test – dokumentace**.
