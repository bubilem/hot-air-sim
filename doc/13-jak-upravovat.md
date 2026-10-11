# 13 – Jak projekt upravovat

Tato kapitola je sbírka **návodů krok za krokem**. U každého je uvedeno, které soubory se mění, co přesně
přidat a jak ověřit, že úprava funguje. Doporučený pracovní postup při jakékoli úpravě:

1. Spusťte `npm run dev` a nechte ho běžet.
2. Udělejte **jednu malou změnu** a uložte (stránka se obnoví sama).
3. Zkontrolujte výsledek **a konzoli** (`F12`).
4. Spusťte `npm test`.
5. Pokračujte další malou změnou.

> **Zlatá pravidla:** Měňte jednu věc najednou. Když něco přestane fungovat, vraťte poslední změnu.
> Používejte Git (nebo aspoň kopii složky), abyste se mohli vrátit.

---

## 13.1 Kde co najdu

| Chci změnit… | Podívej se do… |
| :-- | :-- |
| hmotnost balonu, objem, odpor, chladnutí, spotřebu plynu | `src/config/GameConfig.js` → `PHYSICS` |
| obtížnost přistání | `GameConfig.js` → `LANDING` |
| skóre, tituly | `src/core/Scoring.js` (konstanty `SCORE`), `public/titles.json` (tituly podle lokality, návod `public/TITLES-README.md`), vestavěné `src/i18n/*.js` (`title.*`) |
| počet osob a lahví | `GameConfig.js` → `PLAN` (a rozměr košíku v `Balloon.js` – `PAX_SLOTS`) |
| vítr, lokality | `src/world/Sites.js` |
| velikost mapy a vzhled krajiny | `GameConfig.js` → `WORLD`, `TERRAIN_SOFT`, `GRASS_DETAIL` |
| ranní/večerní teplotu a mlhu | `GameConfig.js` → `TIME_OF_DAY` |
| barvy rozhraní | `src/ui/styles.css` (proměnné `:root`), `src/config/Colors.js` |
| barvy krajiny a balonu | `src/config/Colors.js` → `COLORS` |
| texty | `src/i18n/cs.js`, `en.js`, `wiki.*.js` |
| klávesy | `src/ui/TouchControls.js`, `SettingsMenu.js` (`HELP`) |
| kamera | `GameConfig.js` → `CAMERA`, `GameApp.applyCamera` |
| zvuk | `src/audio/SynthAudio.js`, `GameConfig.MUSIC` |
| vzory pláště | `src/entities/EnvelopeDesigns.js` |
| vzhled postav, auta | `src/entities/Character.js`, `ChaseVehicle.js` |
| průběh startu | `src/phases/LaunchPhase.js` |
| přistání (animace) | `src/phases/LandingPhase.js` (`TIMELINE`) |
| osvědčení | `src/ui/ResultScreen.js` |

---

## 13.2 Změna konstant (nejjednodušší úprava)

1. Otevřete `src/config/GameConfig.js`.
2. V objektu `PHYSICS` změňte např. `volume: 3000` na `volume: 2200` (menší balon).
3. Uložte. Stránka se obnoví.
4. V plánování se změnila **Teplota pro visení**; zkuste, zda lze vzlétnout s plnou posádkou.

| Chcete… | Změňte | Efekt |
| :-- | :-- | :-- |
| lehčí hru | `LANDING.softVy` na 1.6, `softVxz` na 4 | tolerantnější přistání |
| těžší hru | `coolK` na 0.012 | balon chladne dvakrát rychleji → víc hoření |
| delší let | `gasPerBottle` na 40 | víc plynu |
| výraznější zpoždění | `addedMassFactor` na 1.5 | větší setrvačnost |
| silnější ráno vítr | `TIME_OF_DAY.morning.windScale` na 1.2 | |
| menší, rychlejší svět | `WORLD.segments` na 100 | méně vrcholů terénu, rychlejší start |

> **Pozor na kombinace:** konstanty se ovlivňují. Např. `burnHeating` menší než `coolK · Δ T` znamená, že
> balon se nikdy nezahřeje na teplotu pro visení.

---

## 13.3 Nová lokalita

Lokalita je jen **objekt v poli** `SITES` v `src/world/Sites.js`. Přidejte na konec pole:

```js
{
  id: 'vrchovina',                                        // unikátní, bez mezer
  name: { cs: 'Vrchovina – Zelené kopce', en: 'Highlands – Green Hills' },
  desc: {
    cs: 'Kopcovitá krajina s lesy. Vítr s výškou silně sílí.',
    en: 'Hilly landscape with forests. The wind strengthens strongly with height.',
  },
  seed: 31415,                                            // jiný seed = jiná krajina
  elevation: 450,                                         // nadmořská výška startu (m)
  wind: [                                                 // vrstvy seřazené podle výšky!
    { alt: 0,   speed: 1.0, bearing: 90  },
    { alt: 150, speed: 3.0, bearing: 120 },
    { alt: 350, speed: 6.5, bearing: 180 },
    { alt: 600, speed: 9.0, bearing: 240 },
  ],
  target: { bearing: 140, dist: 1500 },                   // směr (°) a vzdálenost cíle (m)
  // massifs: true,                                       // volitelně: skalní masivy
  // river: { width: 50, points: [[x, z], …] },           // volitelně: řeka
}
```

**Co zkontrolovat:**

- `id` je jedinečné a `seed` zatím nepoužitý (stejný seed dá stejnou krajinu),
- vítr: `bearing` je směr, **kam** vane (0 = sever, 90 = východ), `alt` je od startu a vrstvy jsou **vzestupně**,
- **cíl má být dosažitelný:** aspoň v jedné vrstvě má vítr vanout zhruba směrem k cíli (rozdíl `bearing` ≤ ~45°),
- zkuste krajinu v plánování: nová karta se objeví **automaticky** (`PlanScreen` vytváří seznam z `SITES`).

**Vyzkoušejte:** vyberte lokalitu, podívejte se na mapu, odstartujte s `?skip=1&alt=150` a zjistěte, zda lze
v některé výšce dolétnout k cíli.

**Test** (volitelně) do `tests/game-rules.test.js`:

```js
it('nová lokalita má cíl na louce', () => {
  const site = getSite('vrchovina');
  const b = createBiomes(site);
  const m = b.findMeadow(site.target.bearing, site.target.dist);
  expect(b.sample(m.x, m.z).type).toBe(BIOME.MEADOW);
});
```

Nezapomeňte importovat `getSite` a `createBiomes` ze `src/world/Sites.js`.

---

## 13.4 Nový vzor pláště

Vzory se kreslí do canvasu 1024 × 512 (osa x = obvod, 32 výsečí; osa y = od ústí k vrchlíku).

1. V `src/entities/EnvelopeDesigns.js` přidejte položku do pole `DESIGNS`:

   ```js
   { id: 'stripes', name: { cs: 'Pruhy', en: 'Stripes' } },
   ```

2. Do objektu `painters` přidejte kreslicí funkci se stejným jménem:

   ```js
   stripes(g) {
     const rows = 8, rh = TEX_H / rows;
     for (let r = 0; r < rows; r++) {
       g.fillStyle = r % 2 ? '#ffd400' : '#00c0f3';       // dvě barvy školy
       g.fillRect(0, r * rh, TEX_W, rh + 1);
     }
     drawLogoPatches(g);                                    // nápis HotAirSim
   },
   ```

3. Uložte. Nový vzor se objeví v kartě „Balon“ a použije se na 3D balon i na osvědčení.

**Tipy:**

- kreslete pomocí Canvas 2D API: `fillRect`, `createLinearGradient`, `arc`, `fillText`,
- levý a pravý okraj na sebe navazují (plášť je válec) – nekreslete tam „šev“,
- funkce `drawSeams` dokreslí jemné švy mezi výsečemi automaticky,
- stáhnout šablonu s mřížkou lze tlačítkem „Stáhnout šablonu pláště“ v plánování.

**Hotové obrázky balonů (galerie)** se přidávají bez zásahu do kódu: obrázek 2 : 1 (WebP/PNG) uložte do `public/envelopes/` a doplňte položku do `public/envelopes/manifest.json` (návod je v `public/envelopes/README.md`). Hra je při startu načte (`loadFleet`), nabídne v kartě „Balon“ (jiné pláště než ty ze složky ve hře nejsou; bez nich se použije nouzový výchozí vzor), první v seznamu je výchozí a jeho název se uvede na osvědčení. Chybějící soubor se tiše přeskočí.

**Vlastní obrázek hráče** podporuje PNG/WebP/JPEG do 8 MB; kód v `loadCustomImage` ho ořízne do poměru 2:1.

---

## 13.5 Nový text a překlad

1. Do `src/i18n/cs.js` přidejte řádek, např. `'hud.altitude.max': 'Max. výška',`.
2. Totéž do `en.js`: `'hud.altitude.max': 'Max. altitude',`.
3. V kódu použijte `t('hud.altitude.max')` (import `import { t } from '../i18n/index.js';`).

Konvence klíčů: `oblast.část.podčást` malými písmeny (`plan.sec.pilot`, `landing.soft`, `result.date`).
Nikdy nevkládejte text natvrdo do kódu.

Texty **encyklopedie** upravíte v `wiki.cs.js`/`wiki.en.js`: každá kategorie je objekt
`{ id, title, body: [odstavce] }`; řádek začínající `• ` je odrážka.

---

## 13.6 Nový jazyk (např. němčina)

1. Vytvořte `src/i18n/de.js` jako kopii `en.js` a přeložte hodnoty (klíče nechte).
2. Vytvořte `src/i18n/wiki.de.js` jako kopii `wiki.en.js` a přeložte.
3. V `src/i18n/index.js` zaregistrujte:

   ```js
   import de from './de.js';
   import wikiDe from './wiki.de.js';
   const dicts = { cs, en, de };
   const wikis = { cs: wikiCs, en: wikiEn, de: wikiDe };
   ```

4. Doplňte klíč `de` do všech **dvojjazyčných objektů**: `name`/`desc` v `Sites.js` a `name` v `DESIGNS`
   (`EnvelopeDesigns.js`). Bez něj by `site.name[lang]` vrátilo `undefined`.
5. V `PlanScreen.build()` přidejte tlačítko: `<button data-lang="de" …>DE</button>`.
6. (Volitelně) rozšiřte automatickou volbu jazyka v `index.js` o `de`.

Seznam míst, kde jazyk záleží, najdete příkazem pro hledání v projektu: `\[lang\]` a `getLang`.

---

## 13.7 Nová klávesa nebo akce

Příklad: klávesa `P` zobrazí/schová HUD.

1. V `src/ui/TouchControls.js` do posluchače `keydown` přidejte:

   ```js
   if (e.code === 'KeyP') this.onToggleHud?.();
   ```

2. V `GameApp.js` (nebo ve fázi) callback nastavte:

   ```js
   this.controls.onToggleHud = () => this.hud.setVisible(this.hud.el.style.display === 'none');
   ```

3. Do tabulky `HELP` v `SettingsMenu.js` přidejte řádek `[['P'], 'help.hud']` a klíč `help.hud` do `cs.js`/`en.js`.

Pro **novou ovládací veličinu** (např. „přední hořák“) musíte upravit i vrácený objekt z `read()` a fyziku
(`PhysicsEngine.step` si vezme nový vstup).

---

## 13.8 Nová herní fáze

Příklad: úvodní **briefing** před plánováním.

1. Vytvořte `src/phases/BriefingPhase.js`:

   ```js
   export class BriefingPhase {
     constructor(app) { this.app = app; this.ui = null; }
     enter() {
       this.app.hud.setVisible(false);                  // HUD a ovládání patří jen do letu
       this.app.controls.setVisible(false);
       this.app.loadWorld(this.app.plan.siteId, this.app.plan.timeOfDay);   // jinak by pozadí bylo prázdné
       this.ui = document.createElement('div');
       this.ui.className = 'panel interactive launchui';
       this.ui.innerHTML = '<h2>Briefing</h2><button class="btn act" data-go>POKRAČOVAT</button>';
       this.app.uiRoot.appendChild(this.ui);
       this.ui.querySelector('[data-go]').addEventListener('click', () => this.app.go('PLAN'));
     }
     exit() { this.ui?.remove(); this.ui = null; }
   }
   ```

2. V `GameApp.js` ji importujte a zaregistrujte vedle ostatních:

   ```js
   import { BriefingPhase } from '../phases/BriefingPhase.js';
   this.sm.register('BRIEFING', new BriefingPhase(this));
   ```

3. Přidejte ji do tabulky `SETTINGS_MODE` (např. `BRIEFING: 'standalone'`).
4. V `start()` změňte `this.sm.change('PLAN')` na `this.sm.change('BRIEFING')`.

Fáze nemusí mít všechny metody; chybějící se přeskočí (volitelné řetězení v `StateMachine`).
Pamatujte na **úklid v `exit()`** (odebrat HTML, uvolnit objekty).

---

## 13.9 Nová denní doba (např. poledne)

Denní doba je potřeba přidat na čtyřech místech:

1. `GameConfig.TIME_OF_DAY.noon = { ambient: 26, label: 'noon', windScale: 0.9, sky: 'sky', fogNear: 700, fogFar: 3500, fog: { above: 0, density: 0, color: 0xdfe4e8 } };`
2. `src/world/Sky.js` – nová položka v `PRESETS.noon` (barvy horizontu, zenitu, slunce, směr slunce).
3. `src/ui/PlanScreen.js` – tlačítko v přepínači `data-tod="noon"` a popisek; v `refresh()` upravte řádek s `plan.morning.hint` / `plan.evening.hint`, který rozlišuje jen dvě hodnoty.
4. `src/i18n/*.js` – klíče `plan.noon`, `plan.noon.hint`.

V `GameApp.loadWorld` je zvláštní větvení jen pro `'evening'` (barvy světel); `noon` použije výchozí.
Vyzkoušejte, jak vyšší teplota ovlivní teplotu pro visení.

---

## 13.10 Ladicí panel (`?debug`)

`AGENTS.md` počítá s ladicím panelem pro živou úpravu konstant. Zatím není hotový, takže je to **výborný
samostatný projekt**. Nástin:

1. V `main.js` zjistěte `new URLSearchParams(location.search).has('debug')`.
2. Vytvořte `src/ui/DebugPanel.js`, který vytvoří `<div>` s posuvníky.
3. Posuvníky přímo mění hodnoty v objektu `PHYSICS` (importujete ho a zapisujete do něj: `PHYSICS.coolK = …`).
   Protože fyzika čte konstanty při **každém kroku**, změna se projeví okamžitě.
4. Přidejte výpis `tempIn`, `netLiftKg()`, `vel.y` aktualizovaný každý snímek.
5. Přidejte tlačítko „Reset“, které vrátí výchozí hodnoty (uložte si kopii při startu: `structuredClone(PHYSICS)`).

---

## 13.11 Nejčastější chyby a jak je poznat

| Příznak | Příčina | Řešení |
| :-- | :-- | :-- |
| `Uncaught SyntaxError` v konzoli | chybí závorka nebo čárka | podívejte se na řádek z chyby, hledejte nespárované `{ } ( )` |
| `Cannot read properties of undefined` | objekt ještě neexistuje (např. `app.world` v plánování před načtením) | zkontrolujte pořadí volání, použijte `?.` |
| `x is not a function` | překlep v názvu nebo chybí `import` | zkontrolujte importy |
| vidíte text `plan.něco` místo textu | chybí klíč v překladu | doplňte do `cs.js` a `en.js` |
| balon nevzlétne | příliš těžký nebo málo horký | v konzoli: `game.balloon.physics.hoverTemp(0)` |
| nový objekt není vidět | neexistuje v `scene` | `app.scene.add(mesh)`; zkontrolujte polohu a měřítko |
| hra se po čase zpomaluje | chybí `dispose` | uvolňujte geometrie a materiály (`disposeTree`) |
| po změně konstanty se nic nezměnilo | prohlížeč drží starou verzi | `Ctrl+Shift+R` |
| změna lokality „nic nedělá“ | `loadWorld` kešuje podle klíče | změňte `siteId` nebo `timeOfDay` |
| chyba `NaN` v HUD | dělení nulou nebo `undefined` ve výpočtu | vypište hodnoty `console.log` |

### Ladění pomocí `console.log`

```js
console.log('tempIn', p.tempIn, 'netLift', p.netLiftKg());
```

Chcete-li výpis jen jednou za sekundu (a nezaplavit konzoli 60× za sekundu): `if (Math.floor(p.flightTime) !== this._last) { this._last = Math.floor(p.flightTime); console.log(…); }`.
Zkušení programátoři používají spíš **breakpointy** v nástroji `Sources` (kap. 02, odst. 2.7).

---

## 13.12 Dobré návyky při úpravách

- **Čtěte před psaním.** Podívejte se, jak je řešena podobná věc jinde, a držte stejný styl.
- **Žádná magická čísla.** Konstanty patří do `GameConfig.js`, barvy do `Colors.js`/CSS, texty do `i18n/`.
- **Malé funkce.** Funkce, která dělá jednu věc, se snadno testuje a opravuje.
- **Komentáře vysvětlují „proč“,** ne „co“. (`i++ // zvětší i` nepomáhá; `// 6 = pojistka proti zamrznutí` ano.)
- **Logika bez Three.js.** Nové výpočty, které se dají testovat, udržte mimo vykreslování.
- **Test pro každou pravidlovou změnu.**
- **Zapište změnu do dokumentace.** Dokumentace, která neodpovídá kódu, je horší než žádná.
