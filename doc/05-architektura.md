# 05 – Architektura aplikace

Tato kapitola je **mapa celého projektu**. Až ji přečtete, budete vědět, ve kterém souboru hledat
jakoukoli funkci hry a proč je kód rozdělený právě takhle.

## 5.1 Cíle architektury

Struktura kódu vychází z několika zásad (jsou zapsané i v `AGENTS.md`):

1. **Oddělení logiky od vizuálu.** Fyzika, vítr, skóre a terén nesmí znát Three.js (kapitola 04).
2. **Jedno místo pro konstanty.** Všechna „laditelná“ čísla jsou v `src/config/GameConfig.js`, barvy v
   `src/config/Colors.js`, texty v `src/i18n/`. V kódu nesmí být „magická čísla“.
3. **Jednotné rozhraní entit.** Objekty hry mají podobné metody (`update(dt)`, `getMesh()`, `reset()`).
4. **Malé moduly.** Jeden soubor = jedna odpovědnost; nejdelší soubory mají kolem 400 řádků.
5. **Hra jako automat stavů.** Každá herní fáze je samostatná třída se stejným rozhraním.
6. **Žádné externí modely a obrázky.** Vše (balon, auto, postavy, strom, textury) se **generuje v kódu**.
   Aplikace se proto načte okamžitě a vejde se do jednoho malého balíčku.

## 5.2 Adresářová struktura `src/`

```
src/
├── main.js                  vstupní bod: vytvoří GameApp a spustí smyčku
│
├── core/                    JÁDRO: smyčka, stav, fyzika
│   ├── GameApp.js             renderer, scéna, kamera, svět, balon, smyčka
│   ├── StateMachine.js        automat herních stavů
│   ├── PhysicsEngine.js       aerostatika balonu           (bez Three.js)
│   ├── WindModel.js           vítr podle výšky             (bez Three.js)
│   ├── FlightPlan.js          datový model plánu letu      (bez Three.js)
│   └── Scoring.js             skóre a titul                (bez Three.js)
│
├── phases/                  HERNÍ FÁZE (stavy automatu)
│   ├── PlanPhase.js           1) plánování
│   ├── PlanScene.js           dekorace kolem balonu na plánovací obrazovce
│   ├── LaunchPhase.js         2) start
│   ├── FlightPhase.js         3a) let
│   ├── LandingPhase.js        3b) přistání
│   ├── LandingResolver.js     pravidla přistání            (bez Three.js)
│   └── CelebrationPhase.js    4) oslava a osvědčení
│
├── entities/                OBJEKTY HRY (geometrie a chování)
│   ├── Balloon.js             spojuje fyziku, vizuál a posádku
│   ├── BalloonView.js         procedurální geometrie balonu (plášť, koš, plamen)
│   ├── EnvelopeDesigns.js     vzory pláště kreslené do canvasu
│   ├── Character.js           „voxelové“ postavy
│   ├── ChaseVehicle.js        doprovodné auto a přívěs
│   └── GroundProps.js         ventilátor, lano, vlajka, stolek…
│
├── world/                   SVĚT
│   ├── Biomes.js              výška/biom v bodě                (bez Three.js)
│   ├── Sites.js               startovní lokality a vítr             (bez Three.js)
│   ├── ProceduralTerrain.js   mřížka terénu, voda, stromy
│   ├── Sky.js                 obloha, slunce, mraky
│   ├── HeightFog.js           výšková mlha (úprava shaderu)
│   └── Birds.js               ptáci (instancing + vertex shader)
│
├── ui/                      ROZHRANÍ (HTML/CSS/DOM)
│   ├── links.js               marketingové odkazy značky podle místa (brand.links)
│   ├── HUD.js                 přístrojová deska za letu
│   ├── PlanScreen.js          obrazovka plánování
│   ├── ResultScreen.js        osvědčení (canvas) a tlačítka
│   ├── SettingsMenu.js        nastavení zvuku, nápověda ovládání, tlačítko „domů“
│   ├── Encyclopedia.js        encyklopedie
│   ├── TouchControls.js       klávesnice + dotyková tlačítka
│   └── styles.css             strukturální styl; hodnoty tokenů dodává téma značky
│
├── audio/
│   ├── SynthAudio.js          syntéza zvuků (WebAudio)
│   └── MusicPlayer.js         hudba na pozadí
│
├── i18n/
│   ├── index.js               t(klíč), setLang(), getLang(), getWiki(); sloučí jádro se značkou
│   ├── cs.js / en.js          neutrální překlady rozhraní (značka je přepisuje)
│   └── wiki.cs.js / wiki.en.js  texty encyklopedie
│
└── config/
    ├── GameConfig.js          VŠECHNY konstanty hry
    └── Colors.js              barvy (číselně pro Three.js)
```

## 5.3 Vrstvy a směr závislostí

Moduly se nesmějí importovat libovolně. Závislosti míří **jen jedním směrem** (shora dolů):

```
                     ┌────────────┐
                     │  main.js   │
                     └─────┬──────┘
                           ▼
                     ┌────────────┐
                     │  GameApp   │  ◄── „fasáda“ celé aplikace
                     └─────┬──────┘
          ┌────────────────┼───────────────────┐
          ▼                ▼                   ▼
    ┌───────────┐   ┌─────────────┐     ┌────────────┐
    │  phases/  │   │     ui/     │     │   audio/   │
    └─────┬─────┘   └──────┬──────┘     └────────────┘
          ▼                ▼
    ┌───────────┐   ┌─────────────┐
    │ entities/ │   │    i18n/    │
    └─────┬─────┘   └─────────────┘
          ▼
    ┌───────────┐
    │  world/   │   core/PhysicsEngine, WindModel, FlightPlan, Scoring
    └─────┬─────┘   (čistá logika)
          ▼
    ┌───────────┐
    │  config/  │   ◄── všichni z něj čtou, on nezávisí na ničem
    └───────────┘
```

Pravidla, která z toho plynou:

- `config/` neimportuje nic.
- Čistá logika (`PhysicsEngine`, `WindModel`, `Scoring`, `Biomes`, `LandingResolver`, `FlightPlan`, `Sites`)
  importuje jen `config/` a jiné čisté moduly. **Nikdy `three`, nikdy `document`.**
- `entities/` smějí importovat `three`, ale **neřídí hru**.
- `phases/` řídí průběh hry a **volají** entity, UI a zvuk přes objekt `app`.
- `ui/` nezná fázi; **fáze volá UI** (nebo UI volá zpět přes callbacky, např. `onStart`).

> Dobrá otázka k zamyšlení: proč `ui/PlanScreen.js` nevolá přímo `app.go('LAUNCH')`, ale dostane callback
> `onStart`? (Odpověď: aby UI nemuselo znát zbytek hry a šlo ho změnit samostatně.)

## 5.4 Třída `GameApp` – řídící objekt

`GameApp` (`src/core/GameApp.js`) vytváří a vlastní **všechno ostatní** a poskytuje to fázím:

| Člen | Obsah |
| :-- | :-- |
| `renderer`, `scene`, `camera` | Three.js (kapitola 07) |
| `rig`, `user` | řízení kamery (poloha cíle + uživatelem nastavené natočení) |
| `sm` | automat stavů (`StateMachine`) |
| `plan` | aktuální `FlightPlan` (to, co hráč vybral) |
| `world` | aktuální svět `{ site, tod, biomes, terrain, wind, startY, target, marker, birds }` |
| `balloon` | aktuální `Balloon` |
| `props` | `THREE.Group` s dočasnými objekty fáze (auto, lidé, ventilátor…) |
| `hud`, `controls`, `settings` | UI prvky, které žijí celou dobu |
| `audio`, `music` | zvuk |
| `flightResult` | výsledek letu pro oslavu a osvědčení |
| `params` | parametry z adresy (`?skip=1`) |
| `paused` | zda je hra pozastavená (encyklopedie) |

Důležité metody:

| Metoda | Co dělá |
| :-- | :-- |
| `constructor` | vytvoří renderer, kameru, světla, nebe, ovládání, nastavení, zaregistruje fáze |
| `start()` | přejde do fáze `PLAN` a spustí smyčku `requestAnimationFrame` |
| `frame(dt)` | jeden snímek: pevné kroky fyziky, `update`, kamera, vykreslení |
| `loadWorld(siteId, timeOfDay)` | postaví svět (terén, obloha, vítr, cíl, ptáci); **kešuje** podle klíče |
| `createBalloon(plan)` | vytvoří balon pro daný plán |
| `setRig(...)`, `applyCamera(dt)` | nastavení a pohyb kamery |
| `go(name, data)` | změní fázi (zkratka za `sm.change`) |
| `removeProp`, `clearProps`, `disposeWorld`… | uvolnění zdrojů |

`GameApp` je v návrhových vzorech **fasáda**: jednotný přístup ke složitému podsystému. Fáze tak
nemusí vědět, jak se svět skládá; stačí jim `app.world`, `app.balloon`, `app.go('FLIGHT')`.

### Životní cyklus světa a uvolňování paměti

3D objekty žijí na grafické kartě (geometrie, textury). JavaScript je sám neuvolní, proto je nutné
volat `geometry.dispose()` a `material.dispose()`. Pomocná funkce `disposeTree(obj)` na začátku
`GameApp.js` prochází strom objektu a uvolní vše. Používá se při:

- změně lokality nebo denní doby (`disposeWorld`),
- odstranění dočasných objektů (`removeProp`, `clearProps`),
- odstranění balonu.

Zapomenutí `dispose` je klasická chyba: hra funguje, ale po několika změnách lokality začne zpomalovat.

`loadWorld` si pamatuje klíč `"<lokalita>:<denní doba>"`. Pokud hráč v plánování jen mění počet pasažérů,
svět se **nebuduje znovu** (generování terénu je drahé), vytvoří se jen nový balon.

## 5.5 Automat stavů (`StateMachine`)

Celý soubor (`src/core/StateMachine.js`) má 20 řádků:

```js
export class StateMachine {
  constructor() { this.states = {}; this.current = null; this.name = null; }
  register(name, state) { this.states[name] = state; }
  change(name, data) {
    this.current?.exit?.();
    this.name = name;
    this.current = this.states[name];
    this.current.enter?.(data);
  }
  fixedUpdate(dt) { this.current?.fixedUpdate?.(dt); }
  update(dt)      { this.current?.update?.(dt); }
}
```

Každý **stav** (herní fáze) je objekt s volitelnými metodami:

| Metoda | Kdy se volá |
| :-- | :-- |
| `enter(data)` | při vstupu do fáze; `data` je libovolný objekt z předchozí fáze |
| `exit()` | při opuštění fáze (úklid UI a objektů) |
| `fixedUpdate(dt)` | v pevném kroku 1/60 s (fyzika) |
| `update(dt)` | jednou za snímek (vizuály, UI, kamera) |

Zápis `this.current?.exit?.()` používá **volitelné řetězení** (`?.`): metoda se zavolá, jen pokud existuje.
Fáze tedy nemusí implementovat všechny metody.

Přechody mezi fázemi:

```
        ┌──────────────────────────────────────────────────┐
        │                                                  │ (domů / změnit plán)
        ▼                                                  │
     ┌──────┐  VZLÉTNOUT  ┌────────┐  PUSTIT LANO ┌────────┴┐ dotyk  ┌─────────┐
     │ PLAN │────────────►│ LAUNCH │─────────────►│ FLIGHT  │───────►│ LANDING │
     └──────┘             └────────┘              └─────────┘        └────┬────┘
        ▲  ▲                  ▲                                          │
        │  │                  │ ZKUSIT ZNOVU (neúspěch)                  │ úspěch
        │  │                  └──────────────────────────────────────────┤
        │  │                                                            ▼
        │  └──────────────────── LETĚT ZNOVU ───────────────────  ┌─────────────┐
        │                                                          │ CELEBRATION │
        └──────────────────────────────────────────────────────────┴─────────────┘
```

Podrobně o jednotlivých fázích v [kapitole 06](06-herni-smycka-a-faze.md).

## 5.6 Entita `Balloon`: spojení logiky a vizuálu

`Balloon` (`src/entities/Balloon.js`) je ukázka, jak se dodržuje oddělení logiky a vizuálu:

```js
export class Balloon {
  constructor(cfg, designCanvas) {
    this.physics = new PhysicsEngine(cfg);   // LOGIKA (čistá)
    this.view    = new BalloonView();         // VIZUÁL (Three.js)
    ...
  }
  update(dt, input, wind, groundY) {           // 1) posune fyziku
    return this.physics.step(dt, input, wind, groundY);
  }
  syncView(groundY) {                          // 2) přenese stav fyziky do vizuálu
    const p = this.physics, v = this.view;
    v.setShape(this.inflation, this.upright, this.unroll, ...);
    v.setPose(p.pos.x, p.pos.y, p.pos.z, p.heading);
    v.setBurn(Math.max(p.burning, this.testFlame), this.time);
    v.setShadow(...);
  }
}
```

- `update` (fyzika) a `syncView` (kreslení) jsou **dvě oddělené operace**. Fyzika běží v pevném kroku,
  zatímco `syncView` se volá jednou za snímek.
- Na úrovni plánovací obrazovky a startu se **fyzika nepoužívá** pro pohyb (balon je uvázaný), ale pro
  teplotu (hořák); vizuál řídí proměnné `inflation`, `upright`, `unroll`, které nastavuje fáze.
- `Balloon` nese i **posádku** (`crew`): metody `board()` a `unboard()` přidávají a odebírají postavy
  v koši podle tabulky `crewSlots()`.

### Proměnné tvaru balonu

| Proměnná | Rozsah | Význam |
| :-- | :-: | :-- |
| `inflation` | 0…1 | 0 = prázdný, ležící plášť, 1 = plně naplněný |
| `upright` | 0…1 | 0 = koš a plášť leží, 1 = stojí svisle |
| `unroll` | 0…1 | 0 = sbalený svazek, 1 = rozložený do šířky |
| `envUpright` | 0…1 / null | vlastní poloha pláště (jiná než koše, např. při pokládání koše) |
| `testFlame` | 0…1 | zážeh při zkoušce hořáku |

Fáze startu (kap. 06) **jen mění tato čísla**; geometrii pak přepočítá `BalloonView.setShape`.

## 5.7 Rozhraní entit

Podle zásad projektu (`AGENTS.md`) mají entity společné rozhraní. V praxi ho implementují různou měrou (např. `reset()` má jen `PhysicsEngine`), ale princip je stejný:

| Metoda | Význam |
| :-- | :-- |
| `getMesh()` | vrátí kořenový objekt `THREE.Object3D`, který se vkládá do scény |
| `update(dt)` | posun v čase (animace, pohyb) |
| `reset()` | vrácení do počátečního stavu (třída `PhysicsEngine`) |

Postavy a rekvizity jsou jednoduché **tovární funkce** (`createCharacter(role, variant, female)`,
`createFan()`, `createTable()`, `createTargetMarker()`), které vrátí hotovou `THREE.Group`.

## 5.8 Tok dat při jednom snímku letu

```
requestAnimationFrame
   │
   ▼
GameApp.frame(dt)
   ├─ (pauza?  → jen vykreslit)
   ├─ pevné kroky:  sm.fixedUpdate(1/60)  ×  N
   │       └─ FlightPhase.fixedUpdate
   │             ├─ TouchControls.read()           vstup hráče
   │             ├─ WindModel.at(výška)            vítr
   │             ├─ Biomes.sample(x,z)             terén pod košem
   │             └─ Balloon.update → PhysicsEngine.step   fyzika
   ├─ sm.update(dt)
   │       └─ FlightPhase.update
   │             ├─ Balloon.syncView               vizuál balonu
   │             ├─ HUD.update(...)                přístrojová deska
   │             ├─ SynthAudio.update(...)         zvuk
   │             └─ GameApp.setRig(...)            cíl kamery
   ├─ vítr na vlajce cíle, ptáci
   ├─ SettingsMenu.setMode(...)                   které tlačítko ukázat
   ├─ applyCamera(dt)                             pohyb kamery
   ├─ Sky.update(dt)                              obloha sleduje kameru
   └─ renderer.render(scene, camera)              vykreslení
```

## 5.9 Konfigurace: `GameConfig.js`

Soubor je rozdělen do tematických objektů. Nejdůležitější:

| Objekt | Co obsahuje |
| :-- | :-- |
| `WORLD` | velikost mapy, rozlišení mřížky, hladina vody, sklony pro louku a skálu, okraj mapy |
| `PHYSICS` | všechny fyzikální konstanty balonu (objem, hmotnosti, `Cd`, `burnHeating`, `coolK`…) |
| `LANDING` | prahy pro měkké/tvrdé přistání a tření |
| `PLAN` | meze plánu (pasažéři, lahve, hmotnosti) |
| `TIME_OF_DAY` | ranní a večerní teplota, síla větru, mlha |
| `MASSIFS` | parametry skalních masivů |
| `BIRDS`, `CHASE`, `CELEBRATION`, `LAUNCH_CREW` | detaily jednotlivých částí |
| `ENVELOPE_GLOW`, `GRASS_DETAIL`, `TERRAIN_SOFT` | vizuální nastavení |
| `CAMERA` | zorné pole, vzdálenosti, přiblížení |
| `MUSIC` | cesta k hudbě a výchozí hlasitost |

Konstanty skóre jsou na začátku `src/core/Scoring.js` (objekt `SCORE`).

> **Proč ne přímo v kódu?** Kdybyste po půl roce potřebovali balon lehčí, hledali byste číslo `120` v desítkách
> souborů. Takto stačí změnit `PHYSICS.envelopeMass`.

## 5.10 Použité programátorské vzory

| Vzor | Kde ho najdete | K čemu |
| :-- | :-- | :-- |
| **Stavový automat** | `StateMachine`, `phases/` | herní fáze s jasným vstupem a výstupem |
| **Fasáda** | `GameApp` | jednotné rozhraní k podsystémům |
| **Oddělení Model–Pohled** | `PhysicsEngine` × `BalloonView` | testovatelnost, výměnnost |
| **Továrna** | `createCharacter()`, `createFan()` | vytváření objektů |
| **Adaptér** | `FlightPlan.physicsConfig()` | převod plánu na vstup fyziky |
| **Callbacky** | `PlanScreen` (`onChange`, `onStart`) | UI nezná zbytek hry |
| **Datově řízená konfigurace** | `Sites.js`, `GameConfig.js`, `EnvelopeDesigns.js` | změna obsahu bez změny logiky |
| **Cache** | `loadWorld`, `mapCache` v `PlanScreen`, `cache` v `EnvelopeDesigns` | šetření drahých výpočtů |
| **Procedurální generování** | `Biomes`, `ProceduralTerrain`, `BalloonView` | svět z kódu, ne ze souborů |

## 5.11 Jak číst kód: doporučené pořadí

1. `src/main.js` (4 řádky) – kde všechno začíná.
2. `src/core/StateMachine.js` – nejmenší a nejjasnější modul.
3. `src/core/GameApp.js` – hlavní třída: konstruktor, `frame`, `loadWorld`.
4. `src/core/PhysicsEngine.js` a `WindModel.js` – fyzika (kapitoly 03 a 04).
5. `src/phases/FlightPhase.js` – nejjednodušší herní fáze.
6. `src/entities/Balloon.js` – spojení fyziky a vizuálu.
7. `src/phases/PlanPhase.js` a `ui/PlanScreen.js` – jak vypadá UI kód.
8. Poté vykreslování (`BalloonView.js`, `ProceduralTerrain.js`) – kapitoly 07 a 08.

> **Tip:** Použijte vyhledávání ve VS Code (`Ctrl+Shift+F`) a hledejte názvy funkcí a konstant:
> například `windTau` ukáže, kde se konstanta definuje a kde všude se používá.
