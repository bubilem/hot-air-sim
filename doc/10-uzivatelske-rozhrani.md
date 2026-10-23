# 10 – Uživatelské rozhraní, vstupy a jazyky

3D scéna je na plátně (`<canvas>`), ale **menu, přístrojová deska a tlačítka** jsou běžné HTML prvky
položené nad ním. Tato kapitola vysvětluje, jak to funguje, jak hra čte ovládání z klávesnice, myši a
dotykové obrazovky a jak se řeší dva jazyky.

## 10.1 HTML nad plátnem

`index.html` obsahuje jen tři věci:

```html
<canvas id="game"></canvas>      <!-- sem kreslí Three.js -->
<div id="ui"></div>              <!-- sem se vkládá celé rozhraní -->
<script type="module" src="/src/main.js"></script>
```

CSS přilepí obě vrstvy na celou obrazovku:

```css
#game { position: fixed; inset: 0; width: 100%; height: 100%; }
#ui   { position: fixed; inset: 0; pointer-events: none; }     /* vrstva sama klikání nechytá */
#ui button, #ui .screen, #ui .interactive { pointer-events: auto; }   /* ale prvky v ní ano */
```

**Trik s `pointer-events`:** vrstva `#ui` pokrývá celé plátno. Kdyby klikání chytala, nešlo by tahat myší po
3D scéně (rozhlížení kamerou). Vrstva proto události **propouští** (`none`) a jen konkrétní prvky (tlačítka, panely)
je zachytávají (`auto`).

Výhody HTML rozhraní oproti kreslení menu do plátna:

- text je ostrý při jakémkoli rozlišení a dá se vybrat/přeložit,
- tlačítka umí focus, přístupnost, `aria-label`,
- CSS řeší rozvržení na různých velikostech obrazovky (`@media`), zatímco v plátně bychom museli všechno počítat sami.

Nevýhodou je, že DOM je „těžší“ než plátno; proto se HUD **aktualizuje jen při změně** (odst. 10.4).

## 10.2 Komponenty rozhraní

| Soubor | Třída | Co řídí |
| :-- | :-- | :-- |
| `PlanScreen.js` | `PlanScreen` | obrazovka plánování (4 karty + dolní lišta) |
| `HUD.js` | `HUD` | přístrojová deska za letu |
| `TouchControls.js` | `TouchControls` | klávesnice a dotyková tlačítka |
| `SettingsMenu.js` | `SettingsMenu` | nastavení zvuku, nápověda kláves, tlačítka nastavení/encyklopedie/domů |
| `Encyclopedia.js` | `Encyclopedia` | okno s encyklopedií |
| `ResultScreen.js` | `ResultScreen` | osvědčení (canvas) a tlačítka |
| `brand.js` | – | konstanta s HTML loga |

Společné rysy:

- Každá komponenta si **vytvoří svůj kořenový element** (`document.createElement('div')`), přidá ho do
  `#ui` (`root.appendChild(...)`) a má metodu `destroy()` (odstraní prvek a odregistruje posluchače).
- HTML se skládá pomocí **šablonových řetězců** (`` `...${t('klíč')}...` ``) přiřazených do `innerHTML`.
- Události se řeší **delegováním**: jeden posluchač na kořeni, který pomocí `event.target.closest('button')`
  zjistí, na co se kliklo (viz `PlanScreen.build`). Šetří to desítky posluchačů a funguje i pro prvky
  vytvořené později.
- Prvky se vyhledávají jedenkrát a ukládají (`this.q = { name: $('#plan-name'), … }`), ne při každé aktualizaci.

### Bezpečnost: nevkládejte uživatelský text do `innerHTML` bez ošetření

Jméno pilota napíše hráč. Kdyby napsal `<img src=x onerror=alert(1)>` a my ho vložili přímo do `innerHTML`,
spustil by se jeho kód (**XSS – cross-site scripting**). Proto:

- do atributu se hodnota ošetří (`esc = s => s.replace(/"/g, '&quot;')`),
- text encyklopedie prochází funkcí `esc` (`&`, `<`, `>`),
- jméno se na osvědčení kreslí do `canvasu` pomocí `fillText`, kde HTML nehraje roli.

> **Pravidlo:** když jen vkládáte **text**, použijte `element.textContent = …` – nikdy neinterpretuje HTML.
> `innerHTML` používejte jen pro HTML, které jste sami sestavili.

## 10.3 Obrazovka plánování (`PlanScreen`)

`PlanScreen` **nezná 3D svět**. Dostane objekt `plan` (data) a callbacky:

```js
new PlanScreen(app.uiRoot, app.plan, {
  onChange: (kind) => this.onChange(kind),   // 'world' | 'load' | 'crew' | 'lang'
  onStart:  () => this.start(),
  onSettings, onWiki,
});
```

Postup při kliknutí (např. na jinou lokalitu):

1. delegovaný posluchač zjistí `data-site="raj"`,
2. nastaví `plan.siteId = 'raj'`,
3. zavolá `cb.onChange('world')` – `PlanPhase` znovu načte svět,
4. `refresh()` překreslí vybrané prvky, odhad letu a mapu.

Změny se tedy **posílají jednosměrně**: UI mění data (`plan`) a hlásí událost; ostatní části reagují.

`refresh()` neobnovuje celé HTML, jen přepíná třídy (`.on`), přepisuje texty a překresluje mapu. Pokud by se
HTML při každé změně stavělo znovu, ztratilo by textové pole zaostření a „skákalo“ by posouvání.

`estimateFlight(plan)` (kapitola 04) dodá údaje spodní lišty a zda je balon příliš těžký (`canFly`); tlačítko
„Vzlétnout“ se pak vypne (`disabled`).

## 10.4 HUD (`HUD.js`)

HUD se vytvoří **jednou** a za letu se jen **aktualizuje** metodou `update({...})` jednou za snímek. Aby se DOM
neměnil zbytečně, používá se jednoduchá **cache**:

```js
set(key, text) {
  if (this.cacheText[key] !== text) { this.f[key].textContent = text; this.cacheText[key] = text; }
}
```

Hodnota se zapíše do DOM, jen **pokud se změnila**. Zápis do DOM je řádově dražší než porovnání řetězců, takže
při 60 snímcích za sekundu jde o značnou úsporu.

Údaje HUD:

| Údaj | Zdroj | Poznámka |
| :-- | :-- | :-- |
| Nad terénem | `pos.y − surface` | zaokrouhleno na metry |
| Stoupání | `vel.y` | m/s s jedním desetinným místem a znaménkem |
| Teplota | `tempIn` | °C |
| Plyn | `gas / (bottles · gasPerBottle)` | pruh, červený pod 20 % |
| Vítr | `WindModel.at(výška)` | rychlost km/h a směr (S, SV, V …), šipka |
| Žebříček větru | všechny vrstvy | řádek „Vy“ na aktuální výšce; stav rozbalení v `localStorage` |
| Cíl | vzdálenost a azimut k cíli | šipka relativně k pohledu |
| Zpráva | okraj mapy / přehřátí / bez plynu | červený text uprostřed |

**Šipka relativně k pohledu:** směr (azimut) se otočí o úhel kamery: `rotate(b − cameraYaw − 90°)`. Znak „➤“
míří doprava (0°), proto se odečítá 90°, aby azimut 0 (sever) ukazoval nahoru.

## 10.5 Ovládání (`TouchControls`)

Jedna třída skládá **dva vstupy** do jednoho objektu `{ burn, vent, rotate }`:

```js
read() {
  if (!this.enabled) return { burn: 0, vent: 0, rotate: 0 };
  const burn  = this.burn || k.has('Space') || k.has('KeyW') || k.has('ArrowUp');
  const vent  = this.vent || k.has('KeyS') || k.has('ArrowDown');
  const left  = this.left || k.has('KeyA') || k.has('ArrowLeft');
  const right = this.right || k.has('KeyD') || k.has('ArrowRight');
  return { burn: burn ? 1 : 0, vent: vent ? 1 : 0, rotate: (right ? 1 : 0) - (left ? 1 : 0) };
}
```

Fyzika tedy nezná, jestli hráč drží klávesu nebo tlačítko prstem – dostává jen **čísla**. (Princip oddělení
vstupu od logiky.)

### Klávesnice

- Používá se `event.code` (fyzický klíč, např. `KeyW`), ne `event.key` (znak). `code` funguje stejně i na české
  klávesnici.
- Stisknuté klávesy se ukládají do množiny `keys` (`Set`) při `keydown` a odebírají při `keyup`.
- `e.repeat` (opakování při držení) se ignoruje: opakované události nepotřebujeme, množina už klávesu obsahuje.
- Při ztrátě fokusu okna (`blur`) se množina vyprázdní, jinak by hráč po přepnutí do jiného okna „držel“ hořák.
- Klávesy, které by posouvaly stránku (mezerník, šipky), se zablokují `preventDefault()`.
- Pokud je fokus v textovém poli (jméno), klávesy se ignorují.

### Myš a dotyk: pointer events

Tlačítka používají **`pointerdown` / `pointerup`**, ne `click`:

| Událost | Kdy |
| :-- | :-- |
| `pointerdown` | v okamžiku dotyku nebo stisku (bez zpoždění) |
| `pointerup` | puštění |
| `pointercancel` | systém dotyk přerušil (např. systémové gesto) |
| `lostpointercapture` | prst „sklouzl“ z tlačítka |

`click` se na dotykových zařízeních dříve opožďoval a vyvolá se až **po puštění**; pro „držení hořáku“ je nezbytné
vědět, kdy se stisk **začal** a kdy **skončil**. `pointer events` fungují jednotně pro myš, prst i pero.

```js
const down = (e) => { e.preventDefault(); this[key] = true; this.refresh(); try { btn.setPointerCapture(e.pointerId); } catch {} };
const up   = (e) => { e.preventDefault(); this[key] = false; this.refresh(); };
```

`setPointerCapture` způsobí, že tlačítko dostává události, i když prst vyjede mimo něj – hráč nemůže „ztratit“
hořák, když se mu prst posune.

CSS `touch-action: none` zakazuje prohlížeči vlastní gesta (posouvání, přiblížení stránky), která by s hrou
kolidovala. Obrazovky s textem (`.screen`, `.settings`) mají naopak `touch-action: pan-y`, aby šly posouvat.

### Tažení a přibližování kamery

V `GameApp.setupPointer()` se sleduje několik dotyků najednou (`Map` podle `pointerId`). Jeden prst táhne
kamerou, dva prsty mění vzdálenost (štípnutí, *pinch*). Rozdíl vzdáleností prstů mezi událostmi se
vynásobí konstantou `CAMERA.pinchSpeed` a přičte se ke vzdálenosti kamery.

## 10.6 Nastavení a encyklopedie

- **Nastavení** (`SettingsMenu`): hlasitost zvuků a hudby (posuvníky), ztlumení (`M`), přehled ovládání
  (`HELP` – pole dvojic [klávesy, popis]). Panel se sám zavře při kliknutí mimo něj (`pointerdown` na `document`
  v tzv. fázi zachytávání `capture: true`) a klávesou `Esc`.
- **Tlačítko domů** (`bindHomeButton`): aby hráč omylem neztratil let, první kliknutí jen **vyžádá potvrzení**
  (tlačítko zčervená a ukáže popisek), druhé do 3 s provede návrat.
- **Poloha tlačítek** podle fáze: `GameApp` má tabulku `SETTINGS_MODE` – v plánování jsou tlačítka v hlavičce
  panelu, za letu v HUD, při startu a oslavě samostatně vlevo nahoře.
- **Encyklopedie** (`Encyclopedia`): okno s kategoriemi vlevo a textem vpravo (obsah v `i18n/wiki.*.js`). Při
  otevření zavolá callback `onToggle(true)`, `GameApp` nastaví `paused` a svět se **zastaví**.
  Kategorie s příznakem `link: true` (O projektu a škole) přidá na konec odkazy značky pro místo `wiki` (`brand.links`; u školy obor Informační
  technologie, u kategorie s `cta: true` jako tlačítko). Odkazy značky jsou i na obrazovce plánování, v Oslavě, v promo menu a po neúspěšném
  přistání (kapitola 16); u školy je to jediný externí odkaz ve hře. Otevírají se v nové záložce s `rel="noopener noreferrer"` a bez sledování.

## 10.7 Ukládání nastavení: `localStorage`

Prohlížeč umožňuje uložit malá data natrvalo v zařízení uživatele. Používáme pro:

| Klíč | Hodnota |
| :-- | :-- |
| `hotairsim.volume` | hlasitost zvuků (0…1) |
| `hotairsim.muted` | `'1'` když jsou zvuky ztlumeny |
| `hotairsim.musicVolume` | hlasitost hudby |
| `hotairsim.musicMuted` | hudba ztlumena |
| `hotairsim.windLadder` | `'1'` / `'0'` – rozbalený žebříček větru |

Vždy v `try { … } catch { … }`:

```js
try { localStorage.setItem(STORE_VOLUME, String(this.volume)); } catch { /* úložiště nemusí být dostupné */ }
```

Úložiště může být zakázané (anonymní okno, nastavení prohlížeče) nebo plné; hra tehdy funguje dál, jen si
nastavení nepamatuje.

> **Soukromí:** nic jiného než tato nastavení se neukládá. Jméno pilota existuje jen v paměti stránky a zmizí
> po jejím zavření. Hra nepoužívá cookies ani sledovací nástroje a nikam neodesílá žádná data.

## 10.8 Jazyky (`src/i18n/`)

Všechny texty v rozhraní **musí** jít přes funkci `t(klíč)`:

```js
// src/i18n/index.js
const dicts = { cs, en };
let lang = navigator.language.toLowerCase().startsWith('cs') ? 'cs' : 'en';

export function setLang(l) { if (dicts[l]) lang = l; }
export function getLang() { return lang; }
export function getWiki() { return wikis[lang]; }
export function t(key) { return dicts[lang][key] ?? dicts.cs[key] ?? key; }
```

- Slovníky `cs.js` a `en.js` jsou **plochý objekt** `{ 'klíč': 'text' }`.
- Výchozí jazyk se vybere podle prohlížeče (`navigator.language`).
- `t(key)` vrací text v aktuálním jazyce; když v něm klíč chybí, **spadne na češtinu**, a pokud chybí i tam,
  vrátí **samotný klíč** (v rozhraní pak vidíte nepřeložený klíč a víte, co doplnit).
- Text s proměnnou se skládá v kódu: `` `${t('landing.speed')}: ${vy.toFixed(1)} m/s` ``.
- Jména lokalit a vzorů pláště jsou dvojjazyčné objekty `{ cs: '…', en: '…' }`, vybírají se pomocí `name[lang]`.
- Encyklopedie má vlastní soubory (`wiki.cs.js`, `wiki.en.js`) – pole kategorií `{ id, title, body[] }`, kde řádek
  začínající `• ` je odrážka.

**Přepnutí jazyka** (`PlanScreen`, tlačítka CS/EN):

1. `setLang('en')`,
2. `PlanScreen.build()` – znovu postaví HTML,
3. `onChange('lang')` → `GameApp.rebuildUi()` – zničí a znovu vytvoří HUD, ovládání a nastavení, aby i ony
   měly nové texty, a aktualizuje `document.title`.

> **Proč se UI musí postavit znovu?** HTML se generuje ze šablon v okamžiku vytvoření; neexistuje žádné „živé
> propojení“, které by změnu jazyka samo propsalo (jako mají frameworky). Je to jednoduché a pro tento rozsah stačí.

## 10.9 Responzivní rozvržení

Hra funguje na telefonu (na výšku i na šířku), tabletu a počítači. Používá:

- **Viewport meta** v `index.html` (`width=device-width, viewport-fit=cover`), aby se stránka na telefonu
  nezmenšovala,
- **`env(safe-area-inset-*)`** v CSS – bezpečné okraje kolem výřezu displeje a hran (`notch`),
- **`@media` dotazy** – např. `@media (min-width: 900px)` přesune panel plánování doprava a nechá vlevo volný
  pohled na 3D scénu, `@media (max-height: 480px)` zmenší tlačítka na šířku telefonu, `@media (max-width: 520px)`
  přesune logo nad ikony,
- **`min()`** a relativní jednotky (`width: min(520px, calc(100% - 28px))`),
- **CSS Grid a Flexbox** pro rozvržení karet a tlačítek.

> **Zkuste to:** v prohlížeči stiskněte `F12` → ikona telefonu (*Device toolbar*) a vyzkoušejte rozměry
> 360×800, 800×360 a 1280×720. Všimněte si, jak se mění rozvržení plánování.

## 10.10 Přístupnost

Základy, které hra dodržuje:

- ikonová tlačítka mají `aria-label` (např. „Nastavení“),
- okno encyklopedie má `role="dialog"` a `aria-modal`,
- stav přepínačů je vyznačen nejen barvou, ale i třídou `.on` a atributem `aria-pressed`/`aria-current`,
- kontrast světlého textu na tmavém pozadí splňuje doporučení (bílá na `#003b4b` ≈ 12 : 1),
- ovládání jde klávesnicí.

Nad rámec tohoto projektu by přibyla např. úplná navigace klávesou `Tab` ve hře a vypnutí animací při
`prefers-reduced-motion`. Je to vhodné rozšíření (kap. 14).
