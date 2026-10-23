# AGENTS.md – Vývojářská a architektonická pravidla pro HotAirSim

Tento dokument je **závazná technická směrnice** pro vývojové agenty i lidské vývojáře (včetně žáků,
kteří projekt upravují). Při rozporu s `README.md` má **přednost AGENTS.md**.
Podrobný výklad všeho, co zde stojí, najdete v dokumentaci `doc/` (začněte `doc/README.md`).

---

## 1. Vize a cíl projektu

- **Účel:** Výukový projekt pro střední školu **VOŠ, SPŠ a SOŠ Varnsdorf**: interaktivní 3D webový simulátor
  horkovzdušného balonu, na kterém žáci studují **létání (fyziku)** i **programování**.
- **Cíl žáka:** Pochopit, proč balon stoupá, proč nemá kormidlo (směr se volí výškou, tj. vrstvou větru), a
  naučit se, jak je z fyzikálních rovnic postavená 3D aplikace (herní smyčka, architektura, vykreslování, testy).
- **Nasazení:** statický build (`dist/`) na školním IIS, `https://www.skolavdf.cz/hub/hot-air-sim/`; `public/web.config` (MIME, cache, CSP), SEO/Open Graph v `index.html`, náhled `public/og-image.png` (viz `doc/02`, „Nasazení na IIS“).
- **Platforma:** Webový prohlížeč, mobil (na výšku i na šířku), tablet, PC (myš/klávesnice). Bez instalace, bez serveru.
- **Jazyk UI:** čeština (výchozí) + angličtina. Všechny texty jdou přes `src/i18n/` (`cs.js`, `en.js`, funkce
  `t(key)`), žádné texty natvrdo v kódu.
- **Dokumentace** (`doc/`) je součástí projektu: při změně pravidel, fyziky nebo struktury ji aktualizujte.

---

## 2. Terminologie

- **Herní fáze** = kroky hry z pohledu hráče (sekce 3). Stavy `StateMachine`.
- **Etapy vývoje (E1–E4)** = plán realizace (sekce 4).

---

## 3. Herní fáze

```
[1 PLÁNOVÁNÍ] ► [2 START] ► [3a LET] ► [3b PŘISTÁNÍ] ► [4 OSLAVA]
 stav: PLAN      LAUNCH      FLIGHT      LANDING          CELEBRATION
```

### 1) Plánování (`PLAN`)
- Hráč zadá jméno (pro osvědčení).
- **Místo startu** na mapě (2D náhled terénu shora) s větrem po vrstvách; ikony nebezpečných oblastí (les, voda, skála).
- **Denní doba:** ráno (chladno, silný vztlak, klidný vítr) / podvečer (teplejší vzduch, vyšší spotřeba plynu).
- **Počet osob v koši:** 1–5 pasažérů + pilot, každý 65–90 kg (náhodně), zobrazí se součet.
- **Počet lahví LPG:** 1–4 (30 kg láhev + 20 kg plyn). Více plynu = delší let, ale těžší koš. Hráč vidí odhad
  doby letu a teplotu pro visení (`estimateFlight`).
- Výstup: objekt `FlightPlan` (`siteId`, `timeOfDay`, `masses[]`, `bottles`, vzor pláště), který dostane fyzika i další fáze.

### 2) Start (`LAUNCH`) – podkroky
Postup řídí proměnné `inflation` 0…1, `upright` 0…1, `unroll` 0…1 a teplota v plášti:
1. **Zkouška hořáku** u stojícího koše.
2. **Položení koše** na bok (`upright` 1 → 0) a **rozložení pláště** (`unroll` 0 → 1).
3. **Studené plnění** – ventilátor: `inflation` 0 → ~0,7. Člen posádky drží špičku pláště lanem (`LAUNCH_CREW`).
4. **Horké plnění** – hořák: `inflation` → 1; od ~50 % teploty se koš staví (`upright` 0 → 1).
5. **Nástup posádky**, zahřátí na bod vztlaku, **odpojení lana od auta** → přechod do `FLIGHT`.

### 3a) Let (`FLIGHT`)
- Hořák, paraventil, rotace koše, unášení větrem ve vrstvách, spotřeba plynu.
- **Kamery:** třetí osoba (výchozí, orbit tažením) a pohled z koše (`C`).
- HUD: výška nad terénem, stoupání, teplota, plyn, vítr (+ rozbalovací žebříček po vrstvách), šipka k cíli, povrch pod košem (od 150 m nad terénem).

### 3b) Přistání (`LANDING`)
- Vyhodnocení podle vertikální a horizontální rychlosti (sekce 6.3, `LandingResolver`).
- Tvrdší přistání: koš se převrátí a balon ho chvíli vleče. Voda/les/skála/havárie = neúspěch s možností opakovat.
- Po úspěšném přistání přijede auto a pokračuje se do oslavy.

### 4) Oslava (`CELEBRATION`)
- Křest sektem (korek, částice), titul podle lokality, oslovení a skóre (`public/titles.json`, viz `public/TITLES-README.md`; bez souboru platí vestavěné `title.*` v `i18n/`).
- **Osvědčení** (Canvas → PNG): jméno, doba letu, max. výška, vzdálenost od cíle, měkkost přistání, titul (nese i místo, např. „Baron Lužických hor“), skóre, datum. Nahoře velký symbol školy (trojúhelník hrotem dolů připomíná balon) a pod ním „HotAirSim“ jako koš; bez vzoru pláště a bez popisků „Místo“ / „Balon“. Diplom je záměrně střídmý a vzdušný, s okrajem kolem obsahu: nadpis, titul, jméno (když ho hráč nezadá, řádek se vynechá), pět údajů a dole řada „Virtuální let“ (vlevo), hvězdy a datum.
  Označeno jako **virtuální let**.
- Tlačítka „Stáhnout diplom“ a „Letět znovu“. Pod nimi jeden nenápadný řádek o projektu školy s odkazem na obor Informační technologie (`SCHOOL_IT_URL` v `GameConfig.js`). **Žádné jiné externí odkazy, reklamy ani sledování.**

---

## 4. Etapy vývoje

```
[E1 Geometrické MVP]        ► [E2 Rozšíření] ► [E3 GLB modely + audio samply] ► [E4 Reálné mapy]
 všech 5 herních fází         chase-car AI       nahrazení buildMesh()           výšková data ČR
 procedurální primitiva       balení pláště      Howler.js                       dominanty
 syntetizovaný zvuk           víc lokalit        morph targets                   WebGL dlaždice
```

### E1 – Geometrické MVP (aktuální stav: hotové, probíhá ladění)
1. **Žádné externí `.glb`.** Vše z primitiv Three.js.
2. **Všech 5 herních fází** v zjednodušené podobě; nafukování parametrickou deformací pláště (ne shape keys);
   auto s vlekem je statický rekvizitní objekt; zvuk synteticky přes WebAudio (+ hudba na pozadí).
3. **Mimo rozsah E1:** minihra balení pláště, silniční síť a pathfinding, streaming chunků, GIS data.
4. **Výkon:** ≥ 30 FPS na průměrném telefonu, balíček < 1 MB (mimo Three.js).

### E2–E4
Nepracujte na nich, dokud není E1 odladěné (viz původní plán výše).

---

## 4a. Stav implementace (E1)

Hotovo: všech 5 herních fází, fyzika, vítr, terén (4 lokality, řeky, skalní masivy), balon s deformovatelným pláštěm,
auto, postavy, sekt/konfety, osvědčení, CS/EN, syntetický zvuk a hudba, encyklopedie, testy (`npm test`),
rozhraní podle design systému školy, dokumentace v `doc/`.

Zbývá ladit: obtížnost a konstanty v `GameConfig.js`, test na skutečných telefonech (výkon, ovladatelnost palcem),
vzhled terénu, vyvážení skóre, ladicí panel `?debug` (zatím neexistuje, viz `doc/13-jak-upravovat.md`).

Známé drobnosti: `PhysicsEngine.maxAlt` je světová souřadnice, ne výška nad startem (viz `doc/03-fyzika-letu.md`, odst. 3.9).

Ladicí parametry URL: `?skip=1` (vynechá start; „Vzlétnout“ jde rovnou do letu) a `?alt=<m>` (výška nad startem při `skip`).
Instance hry je dostupná jako `window.game`.

---

## 5. Architektura a struktura kódu

### 5.1 Struktura `src/` (závazná)

```
src/
├── main.js                  # Vstup, bootstrap
├── core/
│   ├── GameApp.js           # Renderer, scéna, kamera (rig), relace (svět + balon), smyčka
│   ├── StateMachine.js      # PLAN → LAUNCH → FLIGHT → LANDING → CELEBRATION
│   ├── PhysicsEngine.js     # Aerostatika (teplota, vztlak, odpor) – bez Three.js
│   ├── WindModel.js         # Vrstvy větru podle výšky – bez Three.js
│   ├── FlightPlan.js        # Datový model plánu letu + odhad (estimateFlight)
│   ├── Collisions.js        # Kolize pláště s terénem a překážkami za letu – bez Three.js
│   ├── Scoring.js           # Skóre a titul
│   └── Titles.js            # Tituly podle lokality (načítá public/titles.json)
├── entities/
│   ├── Balloon.js           # Logika balonu (fyzika + vizuál + posádka)
│   ├── BalloonView.js       # Plášť (deformovatelný), koš, hořák, plamen, stín
│   ├── EnvelopeDesigns.js   # Vzory pláště (canvas) + import vlastního obrázku
│   ├── ChaseVehicle.js      # Auto + vlek (polep školy)
│   ├── SchoolMark.js        # Značka školy jako textura
│   ├── Character.js         # Voxel postavičky
│   └── GroundProps.js       # Ventilátor, lano, cílová značka, stolek
├── world/
│   ├── ProceduralTerrain.js # Mřížka s vertexovými barvami, voda, instancované stromy
│   ├── Biomes.js            # sample(x,z): JEDINÝ zdroj pravdy pro vizuál i logiku
│   ├── Sites.js             # Startovní lokality (seed, vítr po vrstvách, cíl)
│   ├── Sky.js, HeightFog.js, Birds.js
├── phases/                  # Herní fáze (stavy automatu)
│   ├── PlanPhase.js, PlanScene.js, LaunchPhase.js, FlightPhase.js,
│   ├── LandingPhase.js, LandingResolver.js, CelebrationPhase.js
├── ui/
│   ├── brand.js             # Logo (symbol školy) a název aplikace
│   ├── HUD.js, Alerts.js, PlanScreen.js, ResultScreen.js, SettingsMenu.js, Encyclopedia.js, TouchControls.js
│   └── styles.css           # Design systém školy (sekce 7)
├── audio/                   # SynthAudio.js (WebAudio), MusicPlayer.js
├── i18n/                    # index.js (t, setLang), cs.js, en.js, wiki.cs.js, wiki.en.js
└── config/                  # Colors.js (barvy), GameConfig.js (VŠECHNY konstanty)
tests/                       # Vitest: fyzika, vítr, pravidla přistání, skóre, plán, biomy
doc/                         # Dokumentace pro žáky a učitele
```

### 5.2 Oddělení logiky od vizuálu
- `PhysicsEngine`, `WindModel`, `Scoring`, `Biomes`, `LandingResolver`, `FlightPlan`, `Sites`, `Collisions` **nesmí importovat Three.js
  ani sahat na DOM**. Jsou testovatelné samostatně.
- Entity mají (podle možností) `update(dt)`, `getMesh()`, `reset()`; vizuál vzniká v `*View.js` / `buildMesh()`.
- **Těžiště je u koše:** `BalloonView.setShape` otáčí celou sestavu kolem spodní hrany koše; poddajný plášť se při
  ležení opírá o zem. Platí pro start i přistání.
  Při přistání dostane pohled funkci výšky terénu (`BalloonView.setTerrain`): ležící plášť se vrchol po vrcholu přilepí
  na svah (`drape`), ať neleží vodorovně ve vzduchu nebo v kopci.
- **Plášť** je jedna `BufferGeometry` z profilu; vrcholy se interpolují podle `inflation`, `upright`, `unroll`.
  Žádné shape keys, žádné nové assety.

---

## 6. Fyzika a pravidla

### 6.1 Vertikální osa
- `dT_in/dt = burn·k_burn − k_cool·(T_in − T_out) − vent·k_vent·(T_in − T_out)`.
- Vztlak úměrný rozdílu hustot vzduchu `V·(ρ_out − ρ_in)` mínus hmotnost (včetně ubývajícího paliva).
- Odpor `F_drag = ½ρ·v|v|·Cd·S`; efektivní hmotnost zahrnuje vzduch v plášti a přidruženou hmotnost.
- **Paraventil** se držením rozevírá (`ventHold` → `ventMul`); při extrémně dlouhém držení se vrchlík propadá (`collapse`,
  menší objem). **Přehřátí** nad `scorchTemp` trvale pálí plášť (`holes` zvyšují únik tepla), nad `fireTemp` plášť vzplane
  (`fire`). Hořák nemá pojistku. Viz `doc/03`, odst. 3.6a–b.
- **Kolize pláště** (`core/Collisions.js`): plášť o překážku (stromy, budovy, skály) za letu zachytí, vytlačí se po normále
  obrysu, rychlý náraz ho protrhne (`holes`, `kind: 'tear'`) nebo zničí (`KIND.COLLISION`). Viz `doc/03`, odst. 3.10a. Koš má vlastní sondu (`probeBasket`): les je tolerantní (zbrzdí, zachycení až od `forestSnagSpeed`), stavby a skály odrážejí.
- **Výška:** okolní teplota klesá o `lapseRate` (6,5 K/km), nad `oxygenAlt` (3 000 m n. m.) roste hypoxie a pilot omdlí (`unconscious`:
  ovládání se ignoruje). Viz `doc/03`, odst. 3.9a.
- Cíl odezvy: viditelné zpoždění několika sekund mezi zážehem a změnou stoupání; hráč nesmí být frustrován.
- **Pevný krok fyziky 1/60 s** s akumulátorem, nezávislý na FPS.

### 6.2 Horizontální osa
- Vítr po vrstvách (`WindModel.at(y)`), interpolace smoothstep + lehká turbulence.
- `dv/dt = (v_wind(y) − v)/τ`, `τ` = `PHYSICS.windTau`.
- Rotace koše neovlivňuje směr letu.

### 6.3 Pravidla přistání (jediný zdroj pravdy: `GameConfig.LANDING`)

| Podmínka při dotyku koše | Výsledek |
|---|---|
| `v_y < 1,2 m/s` a `v_xz < 3 m/s` | **Měkké přistání**, plné skóre |
| `1,2 ≤ v_y ≤ 2,5` nebo `3 ≤ v_xz ≤ 6` | **Tvrdší přistání**: koš se převrátí, balon ho vleče, srážka bodů |
| `v_y > 2,5` nebo `v_xz > 6` | **Havárie** (konec letu, možnost opakovat) |
| Dotyk voda / les / skála / střechy města | **Neúspěch**, možnost opakovat |
| Pole | Povoleno, penalizace skóre |

Výška dotyku se určuje podle terénu pod **košem**, ne pod středem pláště.

### 6.4 Bioma a terén
Jedna funkce `Biomes.sample(x, z)` pro terén, stromy, domky i kolize. Pravidla (voda, louka < 12° sklonu, les podle šumu,
skála > 30°, město) jsou v `GameConfig`/`Biomes`. Lokalita může mít řeku (`site.river`), skalní masivy (`site.massifs`),
tvar terénu s kopečky (`site.terrain`, výchozí `GameConfig.TERRAIN`) a města (`site.towns`, biom `TOWN`: tmavě šedá země,
náhodně rozmístěné domky různé výšky, stromy a kostel; Varnsdorf má navíc tři komíny; rovný terén, střechy a věže jsou překážka). Lokality: Lužické hory (domov školy, kopečky, Varnsdorf v údolí nedaleko startu, Hrádek (dominanta města) na kopci severně od něj (`site.dominants`, model v `GameConfig.HRADEK`), rybníky `site.ponds`, start na kraji louky po větru), Polabí – Děčínsko (na severu horský val `terrain.ridge` – Krušné hory, start na louce v jeho úpatí, pod horami velké město na obou březích Labe (řeka se vyřezává až po vyrovnání terénu pod městem, domy stojí mimo koryto), Labe napříč mapou ze západu na východ, severák na jih; za řekou louky, pole, lesy, rybníky),
Český ráj (nižší masivy, 1 městečko, nejvyšší hora s hradem Trosky jako dominantou: dvě skalní věže z modelu `GameConfig.TROSKY`), Máchův kraj (velké Máchovo jezero `site.ponds` s ostrůvkem, městečko Doksy, kopec `terrain.peaks` s hradem Bezděz jako dominantou `site.dominants`, model v `GameConfig.BEZDEZ`).
Start neleží uprostřed mapy: střed mapy je posunutý o `WORLD.startShift` ve směru letu (`Sites.mapCenter`).
V E1 jedna pevná oblast cca 5 × 5 km kolem lokality s mlhou na okraji; streamování chunků až v E2.

---

## 7. Design podle design systému školy

Rozhraní se řídí **design systémem VOŠ, SPŠ a SOŠ Varnsdorf** ([repozitář školy](https://github.com/skolavdf-dev/design-system): `docs/DESIGN.md`, `docs/LOGO.md`;
výklad v `doc/09-design-system.md`). Závazná pravidla:

- **Paleta:** žlutá `#ffd400`/`#ffea80`, modrá `#41d7ff`/`#00c0f3`, zelená `#c2dd78`/`#a6ce39`; pozadí gradient
  `#003b4b → #006783`; panely `#001b2273` (blur 12 px), plovoucí prvky `rgba(0,20,26,.95)` (blur 20 px);
  primární tlačítko `#0083a6`, hover `#b29400`; nebezpečí `#ef4444`.
- **Písmo:** výhradně **Raleway** (200/400/600/700), hostované lokálně v `public/fonts/` (žádné Google Fonts, soukromí).
- **Tvary:** panely, karty, tabulky = `border-radius: 0`; **jen tlačítka a formulářová pole 4 px**.
- **Bezrámový vzhled:** žádné šedé ani průsvitné rámečky; oddělujte plochou (`--tint`) a odsazením.
- **Plochý styl:** žádné záře ani barevné stíny tlačítek.
- **Odkazy** žluté, bez podtržení (podtržení na hover); `strong` zůstává bílý. **Odrážky** jsou polygon z loga.
- **Barvy v kódu:** CSS proměnné v `src/ui/styles.css`, číselné hodnoty pro Three.js v `src/config/Colors.js` (`BRAND`).
  Obě místa musí zůstat konzistentní.
- **Logo:** symbol školy se nesmí natahovat, otáčet ani měnit barvy; poměr 1000 : 866, hrot dolů, min. šířka 24 px.
  Loga jsou majetkem školy.
- Název aplikace je **HotAirSim**. Hra propaguje školu: logo školy je na autě, přívěsu a trikách posádky (`entities/SchoolMark.js`). Ve hře nejsou značky třetích stran, reklamy ani odkazy na komerční služby. Jediný externí odkaz je na obor Informační technologie na webu školy (`SCHOOL_IT_URL`): položka „O projektu a škole“ v Encyklopedii a řádek na obrazovce Oslava; otevírá se v nové záložce (`rel="noopener noreferrer"`), bez sledování.
- **Galerie balonů:** obrázky pláště 2 : 1 v `public/envelopes/` + `manifest.json` (návod v `public/envelopes/README.md`); hra je načte při startu (`loadFleet`).
- **Vzor pláště:** `entities/EnvelopeDesigns.js` kreslí vestavěné vzory do canvasu 1024 × 512 (osa x = obvod ve
  32 výsečích, osa y = od ústí k vrchlíku) a umí načíst vlastní PNG/WebP/JPEG (do 8 MB, ořez na 2:1, jen v prohlížeči).

---

## 8. Soukromí a bezpečnost

- Žádné osobní údaje se neodesílají; jméno pilota se zpracovává jen lokálně (osvědčení).
- Bez cookies a trackerů. `localStorage` jen pro nastavení zvuku a rozbalení žebříčku větru (`hotairsim.*`).
- Uživatelský text nevkládejte do `innerHTML` bez ošetření (použijte `textContent` nebo `esc`).

---

## 9. Technický stack a pravidla

- **Build:** Vite (Vanilla JavaScript, ES moduly). **3D:** Three.js. **Šum:** `simplex-noise` (deterministický, seed).
  **Testy:** Vitest. **CSS:** vanilla.
- **Mobilní optimalizace:**
  - `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))`;
  - `MeshLambertMaterial`, sdílené materiály, minimum draw calls (`InstancedMesh`);
  - žádné real-time stíny; balon vrhá kruhový falešný stín;
  - `pointerdown`/`pointerup` místo `click` u ovládacích prvků, `touch-action: none`.
- Dotyková tlačítka pro ovládání palcem min. 56 px; podpora na výšku i na šířku; klávesnice: `Mezerník`/`W` hořák,
  `S` paraventil, `A`/`D` rotace, `C` kamera, `+`/`−` přiblížení, `M` ztlumení. Nápověda klávesy je na každém ovládacím tlačítku v pravém dolním rohu.
- Zvuk spouštět až po první interakci (autoplay politika).

---

## 10. Pokyny pro agenty a vývojáře

1. **Modularita:** generování geometrie nesmí být smíchané s fyzikou.
2. **Rozhraní:** entity mají (podle možností) `update(dt)`, `getMesh()`, `reset()`.
3. **Konstanty** patří do `GameConfig.js`, **barvy** do `Colors.js` a CSS, **texty** do `i18n/`. Žádná magická čísla.
4. **Rozsah:** neimplementujte nic z E2–E4, dokud není E1 hotové a odladěné.
5. **Testování:** logiku (`PhysicsEngine`, `WindModel`, `Scoring`, `LandingResolver`, `Biomes`, `FlightPlan`) pokrývat testy
   (`npm test`); vzhled a ovládání ověřovat v prohlížeči a na skutečném telefonu (`npm run dev -- --host`).
6. **Ladění fyziky:** konstanty jsou v `PHYSICS`; za běhu lze zkoušet přes `window.game` v konzoli.
7. **Dokumentace:** při změně pravidel, fyziky nebo struktury aktualizujte `AGENTS.md`, `README.md` **i kapitoly v `doc/`**.
8. **Design:** nové UI prvky musí dodržet sekci 7 (kontrolní seznam v `doc/09-design-system.md`, odst. 9.8).
