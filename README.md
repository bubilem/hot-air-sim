# HotAirSim

**Interaktivní 3D simulátor horkovzdušného balonu v prohlížeči** – výukový projekt pro střední školu.
Žáci si na něm zkoušejí létání (fyzika) i programování (JavaScript, Three.js, architektura aplikace).

Hra běží přímo v prohlížeči, bez instalace a bez serveru, na počítači i na mobilu (na výšku i na šířku).
Rozhraní je česky a anglicky. Vzhled vychází z [design systému **VOŠ, SPŠ a SOŠ Varnsdorf**](https://github.com/skolavdf-dev/design-system).

---

## Co se dá ve hře dělat

```
 PLÁNOVÁNÍ ──► START ──► LET ──► PŘISTÁNÍ ──► OSLAVA
```

1. **Plánování** – místo startu, denní doba (ráno / podvečer), posádka, plyn. Mapa a vítr po vrstvách.
2. **Start** – zkouška hořáku, položení koše, rozložení a nafouknutí pláště, nástup posádky, uvolnění lana.
3. **Let** – hořák (stoupání), paraventil (klesání), rotace koše. Balon **nemá kormidlo**: směr se volí **výškou**,
   protože vítr v různých výškách vane různě.
4. **Přistání** – podle svislé a vodorovné rychlosti měkké, tvrdé nebo havárie; voda, les a skála = neúspěch.
5. **Oslava** – křest sektem, titul a stažitelné osvědčení (PNG).

**Ovládání:** `Mezerník` / `W` hořák · `S` paraventil · `A` `D` rotace · `C` kamera · `+` `−` přiblížení · `M` ztlumit zvuk ·
tažení = rozhlížení · kolečko / štípnutí = přiblížení. Na telefonu dotyková tlačítka.

---

## Rychlý start

Potřebujete [Node.js](https://nodejs.org) 20 LTS nebo novější.

```bash
npm install        # stáhne knihovny (jednou)
npm run dev        # spustí vývojový server -> http://localhost:5173
```

| Příkaz | Co dělá |
| :-- | :-- |
| `npm run dev` | vývojový server s automatickým obnovením |
| `npm run dev -- --host` | totéž, dostupné i z telefonu v místní síti |
| `npm run build` | produkční verze do složky `dist/` |
| `npm run preview` | vyzkouší produkční verzi |
| `npm test` | spustí automatické testy (Vitest) |

Nasazení: obsah `dist/` se nahraje na statický hosting; pro školní IIS je v `dist/` připravený `web.config` (návod v [doc/02](doc/02-instalace-a-spusteni.md), „Nasazení na IIS“).

Ladicí parametry adresy: `?skip=1` přeskočí start, `?skip=1&alt=200` začne rovnou ve výšce 200 m.
V konzoli prohlížeče je hra dostupná jako `window.game`.

---

## Verzování

Verze hry se řídí [SemVer](https://semver.org/lang/cs/) (`MAJOR.MINOR.PATCH`): **MINOR** = nová funkce nebo obsah, **PATCH** =
oprava nebo ladění, **MAJOR** = velký milník (`1.0.0` po dokončení E1 a testu na telefonech). Číslo je v `package.json`;
Vite k němu při buildu přidá hash a datum posledního commitu (`vite.config.js`) a hra je ukazuje vlevo dole na úvodní
obrazovce (`src/config/Version.js`, např. `v0.2.0 · b2fbccf · 2026-10-23`; hash s `+` = necommitnuté změny, při
`npm run dev` je za číslem `-dev`). Změny se zapisují do `CHANGELOG.md`.

Postup vydání:

1. Do `CHANGELOG.md` přidejte sekci `## [x.y.z] – datum` (Přidáno / Změněno / Opraveno).
2. `npm version minor` (nebo `patch`) zvýší číslo a vytvoří commit a tag `vx.y.z`; změnu čísla případně spojte s commitem changelogu.
3. `git push --follow-tags`, `npm test`, `npm run build` a nasazení `dist/` na IIS.

## Dokumentace

Kompletní, velmi podrobná dokumentace pro žáky a učitele je ve složce **[`doc/`](doc/README.md)**:

| Kapitola | Téma |
| :-: | :-- |
| [01](doc/01-uvod.md) | Úvod do projektu |
| [02](doc/02-instalace-a-spusteni.md) | Instalace, spuštění, build, řešení problémů |
| [03](doc/03-fyzika-letu.md) | **Fyzika balonu**: tlak, hustota, vztlak, ohřev, odpor, vítr |
| [04](doc/04-simulace-v-kodu.md) | Fyzika v kódu: `PhysicsEngine`, `WindModel`, přistání, skóre |
| [05](doc/05-architektura.md) | **Architektura**: moduly, vrstvy, vzory |
| [06](doc/06-herni-smycka-a-faze.md) | Herní smyčka (pevný krok) a herní fáze |
| [07](doc/07-vykreslovani.md) | Vykreslování: Three.js, shadery, deformace pláště |
| [08](doc/08-svet-a-teren.md) | Procedurální terén, šum, biomy, lokality |
| [09](doc/09-design-system.md) | Design systém školy a vzhled rozhraní |
| [10](doc/10-uzivatelske-rozhrani.md) | UI, vstupy, jazyky, `localStorage` |
| [11](doc/11-zvuk.md) | Syntéza zvuku (WebAudio) |
| [12](doc/12-testovani.md) | Testování (Vitest) |
| [13](doc/13-jak-upravovat.md) | Návody na úpravy projektu |
| [14](doc/14-cviceni-a-projekty.md) | Cvičení a projekty s řešením |
| [15](doc/15-slovnik.md) | Slovník pojmů |

---

## Struktura projektu

```
hot-air-sim/
├── doc/              dokumentace
├── public/           soubory kopírované beze změny (hudba, logo)
├── src/
│   ├── core/         smyčka, automat stavů, fyzika, vítr, plán letu, skóre
│   ├── phases/       herní fáze (PLAN, LAUNCH, FLIGHT, LANDING, CELEBRATION)
│   ├── entities/     balon, postavy, auto, rekvizity, vzory pláště
│   ├── world/        terén, biomy, lokality, obloha, mlha, ptáci
│   ├── ui/           HUD, plánování, osvědčení, nastavení, encyklopedie, CSS
│   ├── audio/        syntéza zvuku a hudba
│   ├── i18n/         překlady (cs, en)
│   └── config/       konstanty (GameConfig.js) a barvy (Colors.js)
├── tests/            automatické testy
└── tmp/              lokální podklady (mimo Git)
```

---

## Technologie

**JavaScript (ES moduly)** · **[Three.js](https://threejs.org)** (3D, WebGL) ·
**[simplex-noise](https://github.com/jwagner/simplex-noise.js)** (procedurální terén) ·
**[Vite](https://vite.dev)** (vývoj a build) · **[Vitest](https://vitest.dev)** (testy) ·
Canvas 2D · WebAudio · čisté HTML a CSS.

Galerii vlastních pláštů lze rozšířit bez zásahu do kódu (`public/envelopes/`, viz tamní README).

Bez externích 3D modelů a bez zvukových souborů (kromě hudby na pozadí): vše se generuje v kódu.

---

## Principy kódu

- **Logika odděleně od vizuálu:** `PhysicsEngine`, `WindModel`, `Scoring`, `Biomes`, `LandingResolver` neznají Three.js
  a lze je testovat samostatně.
- **Konstanty** jsou v `src/config/GameConfig.js`, **barvy** v `src/config/Colors.js` a CSS, **texty** v `src/i18n/`.
- **Pevný krok fyziky** 1/60 s s akumulátorem času, nezávislý na FPS.
- Technická pravidla pro vývoj jsou v [`AGENTS.md`](AGENTS.md).

---

## Licence a práva

- Zdrojový kód projektu je určen pro výuku. Před veřejným šířením doplňte licenci podle rozhodnutí školy.
- **Loga a grafické podklady školy** (symbol trojúhelníku v rozhraní a na osvědčení, `public/logo-mark.svg`) jsou
  duševním vlastnictvím VOŠ, SPŠ a SOŠ Varnsdorf; mimo školní použití je nutný souhlas školy.
- Hudební skladba `public/music/theme-organic-house.mp3`: před zveřejněním ověřte licenci.
- Použité knihovny mají vlastní licence (Three.js – MIT, simplex-noise – MIT, Vite – MIT, Vitest – MIT).
