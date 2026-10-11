# 02 – Instalace a spuštění

Tato kapitola vás provede od prázdného počítače po běžící hru. Postup je stejný na Windows, macOS
i Linuxu; liší se jen drobnosti, které jsou vždy uvedeny.

## 2.1 Co budete potřebovat

| Nástroj | Doporučená verze | K čemu | Jak ověřit |
| :--- | :--- | :--- | :--- |
| **Node.js** | 20 LTS nebo novější (vývoj probíhal na 24) | spouští Vite, Vitest a instalaci knihoven | `node -v` |
| **npm** | je součástí Node.js (vývoj na 11) | stahuje knihovny a spouští příkazy | `npm -v` |
| **Moderní prohlížeč** | Chrome, Edge, Firefox, Safari (aktuální) | spouští hru; potřebuje **WebGL 2** | stránka `https://get.webgl.org` |
| **Editor kódu** | Visual Studio Code | psaní kódu | – |
| **Git** (volitelně) | libovolná | verzování práce | `git --version` |

> **Co je Node.js?** JavaScript původně uměl běžet jen v prohlížeči. Node.js je program, který JavaScript
> spouští i mimo prohlížeč (na vašem počítači). My ho nepoužíváme pro hru samotnou (ta běží v prohlížeči),
> ale pro **nástroje kolem**: vývojový server, build a testy.

### Instalace Node.js

- **Windows / macOS:** stáhněte instalátor „LTS“ z <https://nodejs.org> a nainstalujte s výchozím nastavením.
- **Linux (Debian/Ubuntu):** `sudo apt install nodejs npm` (nebo použijte `nvm`, viz oficiální návod).
- **Správce verzí (volitelně):** `nvm` (Linux/macOS) nebo `nvm-windows` umožní mít více verzí vedle sebe.

Po instalaci **zavřete a znovu otevřete terminál** a zadejte:

```bash
node -v
npm -v
```

Měli byste vidět čísla verzí (např. `v24.14.1` a `11.11.0`).

## 2.2 Získání projektu

Máte-li složku `hot-air-sim` od učitele (např. na flash disku nebo ve sdíleném úložišti), zkopírujte ji
na svůj disk. **Nekopírujte složku `node_modules`** (je velká a vytvoří se znovu).

Je-li projekt v Gitu:

```bash
git clone <adresa-repozitare> hot-air-sim
cd hot-air-sim
```

## 2.3 Instalace závislostí

V terminálu ve složce projektu (tam, kde leží `package.json`) spusťte:

```bash
npm install
```

Co se stane:

1. npm přečte `package.json` a `package-lock.json`,
2. stáhne knihovny **three**, **simplex-noise** (běžné závislosti) a **vite**, **vitest** (vývojové závislosti),
3. uloží je do složky `node_modules/`.

Při prvním spuštění může instalace trvat desítky sekund. Pokud něco selže, viz [2.8 Řešení problémů](#28-řešení-problémů).

## 2.4 Spuštění vývojového serveru

```bash
npm run dev
```

Vite vypíše něco jako:

```
  VITE v8.3.4  ready in 300 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Otevřete adresu `http://localhost:5173/` v prohlížeči. Hra se načte a ukáže obrazovku plánování.

**Vývojový server (dev server)** má dvě důležité vlastnosti:

- **Neděláte build.** Prohlížeč si soubory z `src/` načítá přímo jako ES moduly (Vite je jen „přeloží“
  za běhu), proto je start okamžitý.
- **Hot reload.** Po uložení souboru se stránka sama obnoví (u `.css` bez ztráty stavu). Změníte-li
  konstantu a stisknete `Ctrl+S`, výsledek vidíte do sekundy.

Zastavení serveru: `Ctrl+C` v terminálu.

### Spuštění pro telefon (testování dotykového ovládání)

```bash
npm run dev -- --host
```

Vite vypíše i adresu v místní síti, např. `http://192.168.1.25:5173/`. Otevřete ji v prohlížeči telefonu
**připojeného ke stejné Wi-Fi**. (Firewall může připojení blokovat; na Windows potvrďte výzvu k povolení Node.js.)

### Ladicí parametry v adrese

| Adresa | Efekt |
| :--- | :--- |
| `http://localhost:5173/?skip=1` | tlačítko „Vzlétnout“ přeskočí start a vypustí balon rovnou do letu |
| `http://localhost:5173/?skip=1&alt=200` | totéž, ale balon už je 200 m nad startem |

Parametry čte `PlanPhase.start()` pomocí `URLSearchParams` (`app.params`). Přeskakování startu se hodí,
když ladíte let a nechcete pokaždé plnit balon.

### Ladění z konzole prohlížeče

V `src/main.js` je řádek `window.game = app;`. Stisknutím `F12` otevřete vývojářské nástroje,
záložku **Console** a můžete psát příkazy přímo do běžící hry:

```js
game.sm.name                    // název aktuální fáze: "PLAN", "FLIGHT", ...
game.balloon.physics.tempIn     // teplota vzduchu v plášti (°C)
game.balloon.physics.gas        // zbývající plyn (kg)
game.world.wind.at(100)         // vítr ve výšce 100 m nad startem
game.balloon.physics.tempIn = 90   // "podvádění": změna stavu za běhu
```

> **Zkuste to:** za letu zadejte `game.balloon.physics.gas = 100` a máte dost plynu na hodiny letu.
> Takhle se testuje, aniž byste museli hrát celý let.

## 2.5 Příkazy projektu (npm scripts)

Všechny příkazy jsou definované v `package.json` v sekci `scripts`:

| Příkaz | Co dělá |
| :--- | :--- |
| `npm run dev` | spustí vývojový server s hot reloadem (port 5173) |
| `npm run build` | vytvoří **produkční verzi** do složky `dist/` (sloučené, zmenšené soubory) |
| `npm run preview` | spustí jednoduchý server nad složkou `dist/`, abyste vyzkoušeli build |
| `npm test` | spustí všechny testy z `tests/` (jednou, pak skončí) |

### Build a nasazení na web

```bash
npm run build
```

Výsledek je ve složce `dist/` (`index.html`, `assets/*.js`, `assets/*.css`, `music/…`, `logo-mark.svg`).
Tuto složku lze nahrát na **libovolný statický webhosting** (školní web, GitHub Pages, Netlify…), protože hra
nepotřebuje žádný server. V `vite.config.js` je nastaveno `base: './'`, takže cesty jsou **relativní**
a hra funguje i v podsložce, například `https://skola.example/hot-air-sim/`.

> **Pozor:** Otevření `dist/index.html` dvojklikem (adresa `file://…`) většinou **nefunguje**, protože
> prohlížeče z bezpečnostních důvodů blokují načítání modulů a hudby ze souborového systému. Použijte
> `npm run preview` nebo webový server.

Build vypíše upozornění „Some chunks are larger than 500 kB“. Je to proto, že knihovna Three.js je velká;
pro naši hru je to v pořádku (na místní síti se načte okamžitě).

### Nasazení na IIS (školní web, Windows)

Ostrá verze běží na `https://www.skolavdf.cz/hub/hot-air-sim/` (hosting Foprsi, Windows + IIS).

1. `npm run build`, pak nahrajte **obsah** složky `dist/` (ne složku samotnou) do `/hub/hot-air-sim/`.
2. Ve složce `dist/` je i `web.config` (zdroj `public/web.config`). Nastavuje:
   - **MIME typy** `.webp`, `.mp3`, `.json`, `.svg`, `.woff2`, `.js` (starší IIS je nezná a vrací 404); každý je zapsán jako
     `<remove>` + `<mimeMap>`, aby nevznikla chyba 500.19 kvůli duplicitě;
   - **výchozí dokument** `index.html` a **statickou kompresi** js/json/svg (JS má 750 kB, po gzipu 207 kB);
   - **cache:** `assets/` a `fonts/` na rok (názvy souborů s hashem), `music/` na 30 dní, vše ostatní s `no-cache`
     (`index.html`, `titles.json`, `envelopes/manifest.json`, aby se úpravy projevily hned);
   - **hlavičky:** `X-Content-Type-Options`, `Referrer-Policy` a `Content-Security-Policy` (jen vlastní zdroje; `'unsafe-inline'`
     je nutné pro načítací obrazovku v `index.html`, `blob:` a `data:` pro vlastní obrázek pláště a diplom).
3. Adresa `…/hot-air-sim` bez lomítka na konci se přesměruje na `…/hot-air-sim/` (relativní cesty to potřebují).
4. Změní-li se adresa, upravte v `index.html` `canonical`, `og:url`, `og:image`, `twitter:image` a JSON-LD (musí být
   **absolutní** URL, sociální sítě nespouštějí JavaScript).

Co ověřit u správce webu, pokud něco nefunguje:

- hlavní web (CMS) nemá globální URL rewrite, který by zachytil `/hub/…` (jinak vrací 404 nebo stránku CMS);
- hosting nemá zamčené sekce `staticContent`, `httpCompression` a `httpProtocol` (jinak chyba 500.19: nastavení pak musí provést hosting);
- nadřazený `web.config` nepřidává hlavičky, které se střetávají s CSP (např. `X-Frame-Options`).

`robots.txt` a `sitemap.xml` se čtou jen z kořene domény; o zařazení stránky do sitemapy školy požádejte správce webu.
Náhled pro sociální sítě je `public/og-image.png` (1200 × 630), ikony `public/apple-touch-icon.png` a `public/favicon-32.png`.

## 2.6 Použité knihovny

Projekt má záměrně jen **dvě běžné závislosti**.

### three (Three.js)

- **Co to je:** nejpoužívanější JavaScriptová knihovna pro 3D grafiku ve webovém prohlížeči nad WebGL.
- **K čemu ji používáme:** scéna, kamera, geometrie (`BoxGeometry`, `CylinderGeometry`, `LatheGeometry`,
  `PlaneGeometry`…), materiály (`MeshLambertMaterial`, `ShaderMaterial`), světla, `InstancedMesh`,
  `CanvasTexture`, vykreslování (`WebGLRenderer`).
- **Importy v kódu:** `import * as THREE from 'three';` a jednou pomocná funkce
  `mergeGeometries` z `three/examples/jsm/utils/BufferGeometryUtils.js` (slučování geometrií stromu).
- **Dokumentace:** <https://threejs.org/docs/> a příklady <https://threejs.org/examples/>.

### simplex-noise

- **Co to je:** generátor „hladkého“ šumu (Simplex noise), podobný Perlinovu šumu.
- **K čemu:** výška terénu, rozmístění lesů a polí, skalní masivy, drobná variace barev.
- **Důležitá vlastnost:** funkce `createNoise2D(random)` přijme **generátor náhodných čísel**. Dáme-li jí
  pseudonáhodný generátor se stejným **seedem**, vznikne vždy **stejný** svět. Lokalita „Polabí“ má
  seed `1337`, takže každý hráč dostane totéž Polabí. Více v [kapitole 08](08-svet-a-teren.md).

### vite (vývojová závislost)

Sestavovací nástroj. Při vývoji obsluhuje soubory a obnovuje stránku, při `build` je sloučí a zmenší.
Nastavení je v `vite.config.js` (jediná volba: `base: './'`).

### vitest (vývojová závislost)

Testovací nástroj kompatibilní s Vite. Soubory `tests/*.test.js` spouští příkazem `npm test`.

### Písmo Raleway

Písmo je **hostované lokálně** ve složce `public/fonts/` (`woff2`, řezy 200, 400, 600, 700 v rozsazích `latin` a
`latin-ext`, tedy včetně české diakritiky) a deklarované pomocí `@font-face` v `index.html`. Hra tak nevolá žádné cizí servery
(soukromí, funguje i offline). Licence písma (SIL OFL) je v `public/fonts/LICENSE-Raleway-OFL.txt`.

## 2.7 Doporučené nastavení editoru (VS Code)

1. Otevřete **složku** projektu (`File → Open Folder…`), ne jednotlivé soubory.
2. Užitečná rozšíření: **ESLint** (volitelně), **Live Preview** (nepotřebné, máme Vite), **EditorConfig**.
3. Integrovaný terminál (``Ctrl+` ``) otevřete přímo ve složce projektu a spustíte v něm `npm run dev`.
4. Ladění: v prohlížeči (`F12`) záložka **Sources** zobrazí vaše soubory z `src/`; klikněte vedle čísla řádku
   a vytvoříte **breakpoint**. Program se na řádku zastaví a můžete si prohlédnout hodnoty proměnných.

## 2.8 Řešení problémů

| Příznak | Pravděpodobná příčina | Řešení |
| :--- | :--- | :--- |
| `npm: command not found` | Node.js není nainstalovaný, nebo se po instalaci neotevřel nový terminál | nainstalujte Node.js, otevřete nový terminál |
| `npm install` skončí chybou `EACCES` | nemáte právo zápisu do složky | pracujte ve vlastní složce (ne v systémové), na Linuxu nepoužívejte `sudo npm` |
| `npm install` visí / `ETIMEDOUT` | chybí připojení, nebo je blokované školní sítí | zkuste jinou síť, případně `npm config set proxy …` dle pokynů správce |
| `Error: Cannot find module 'three'` | nespustili jste `npm install` | spusťte `npm install` ve složce s `package.json` |
| Port 5173 je obsazený | běží druhá instance Vite | zastavte ji, nebo `npm run dev -- --port 5180` |
| Stránka je bílá / černá | chyba v JavaScriptu | `F12` → **Console**, přečtěte první červenou chybu |
| „WebGL není podporováno“ / černé plátno | starý prohlížeč nebo vypnutá hardwarová akcelerace | aktualizujte prohlížeč, zapněte hardwarovou akceleraci v nastavení |
| Nic neslyšíte | prohlížeč spouští zvuk až po první interakci | klikněte kamkoli do hry; zkontrolujte nastavení zvuku (ikona vlevo nahoře) |
| Hudba nehraje, ve zvucích je ticho po rozbalení | zvuky/hudba jsou ztlumené | klávesa `M` je přepíná |
| Hra se seká | slabá grafika | zavřete jiné karty; v kódu lze snížit `WORLD.segments` nebo `BIRDS.enabled` (kap. 13) |
| Po `git pull` hra nefunguje | změnily se závislosti | znovu `npm install` |
| Změna kódu se neprojeví | prohlížeč drží starou verzi | `Ctrl+Shift+R` (tvrdé obnovení) |
| Vite hlásí chybu při `build` | syntaktická chyba v kódu | přečtěte jméno souboru a číslo řádku v chybě |

> **Tip:** Chybová hláška je vaše nejlepší pomocník. Vždy si ji **přečtěte celou**, najděte v ní název souboru
> a číslo řádku, a teprve potom hledejte pomoc.

## 2.9 Kontrolní seznam: „funguje mi to?“

- [ ] `node -v` vypíše verzi 20 nebo vyšší
- [ ] `npm install` doběhlo bez chyby a vznikla složka `node_modules`
- [ ] `npm test` ukáže „21 passed“ (počet se může časem změnit)
- [ ] `npm run dev` spustí server a stránka ukáže 3D scénu s panelem plánování
- [ ] po kliknutí na **VZLÉTNOUT** se zobrazí průvodce startem
- [ ] `npm run build` vytvoří složku `dist/`
