# 16 – Značky (brand)

HotAirSim má **jedno jádro** a **vyměnitelnou vrstvu značky**. Školní verze je značka `school`; firemní marketingová
verze (např. HaBalon.cz) je jiná značka nad stejným jádrem. Jádro (fyzika, mapy, fáze, logika rozhraní) se udržuje
jednou, značka dodává jen vzhled a obsah. Tato kapitola popisuje rozhraní mezi nimi a postup, jak přidat další značku.

> **Pravidlo:** do jádra nepatří žádný název, logo, barva, URL ani text konkrétní značky. Nová zakázka = nová značka
> (složka nebo vlastní repo), ne úprava jádra.

---

## 16.1 Vrstvy

| Vrstva | Obsah | Kdo ji vlastní |
| :-- | :-- | :-- |
| **Jádro** | fyzika, vítr, terén, fáze, HUD a ovládání (struktura), kolize, skóre, i18n mechanismus, šablona diplomu | HotAirSim |
| **Obsah** | balony (`envelopes/`), tituly (`titles.json`), hudba, lokality | jádro dodá výchozí, značka přidá nebo nahradí |
| **Vzhled** | CSS tokeny, písmo, loga, polepy, trika, paleta 3D scény, favicon, Open Graph | značka |
| **Marketing** | odkazy a CTA, texty hodností a diplomu, statistiky, promo menu, kategorie encyklopedie | značka |

Jádro importuje značku **jen přes alias `@brand`** (ukazuje na `index.js` aktuální značky). Žádný jiný kód značky v jádru není.

---

## 16.2 Složka značky

```
brands/school/              (nebo kořen repa značky)
├── index.js                výchozí export: objekt značky (viz 16.3)
├── theme.css               hodnoty CSS tokenů a pravidla specifická pro značku
├── brand.head.html         obsah <head>: title, SEO, Open Graph, favicon, písmo, styl načítací obrazovky
├── brand.noscript.html     <noscript> blok
├── i18n.cs.js, i18n.en.js  texty značky (přepisují jádro)
├── wiki.cs.js, wiki.en.js  kategorie encyklopedie
└── public/                 favicon, ikony, og-image, fonty, web.config, envelopes/ (flotila), případně titles.json
```

Soubory `brand.head.html` a `brand.noscript.html` se dosazují do šablony `index.html` jádra při buildu (plugin ve
`vite/brand.js`), takže se barvy načítací obrazovky nezmění po načtení JavaScriptu. `public/` značky se spojí
se společným `public/` jádra (hudba, `titles.json`); **značka má přednost**.

---

## 16.3 Rozhraní značky (`contract: 1`)

Objekt, který `index.js` exportuje. Povinné klíče kontroluje `tools/brand-contract.js` (`validateBrand`).

| Klíč | Povinné | Význam |
| :-- | :-: | :-- |
| `contract` | ano | číslo smlouvy; musí odpovídat jádru (nyní `1`) |
| `id`, `name` | ano | identifikátor a název značky (název je i v sdílecím textu a štítku na plášti) |
| `storagePrefix` | ano | prefix klíčů `localStorage` (`<prefix>.volume`…); **každá značka si drží svůj**, jinak hráčům zmizí nastavení |
| `font` | ano | `{ family, loadSpec }`: rodina písma a specifikace pro `document.fonts.load` (překreslení canvasů po načtení písma) |
| `colors` | ano | barvy 3D scény jako čísla `0xRRGGBB`: `primary`, `accent`, `bag`, `trailerTarp`, `pilot`/`crew` (`shirt`, `vest` nebo `null`, `sleeve` nebo `null`), `flags[2]`, `confetti[]`, `envelopeRed`, `envelopeWhite`, `envelopeBand` |
| `canvas` | ano | barvy pro canvas jako CSS řetězce: `primary`, `accent`, `light`, `warn` |
| `logoHtml` | ano | HTML loga pro HUD a plánování |
| `drawLogo(g, x, y, w)` | ano | logo do canvasu |
| `diploma` | ano | `height`, `headerHeight`, `colors`, `header(g, ctx)` (viz 16.6) |
| `character.decorate(THREE, group, role)` | ne | znak na triku (škola: trojúhelník; HaBalon: vesta je v `colors`) |
| `vehicle.decorateCar`, `.decorateTrailer` | ne | polepy vozu a přívěsu; **zrcadlení pravého boku řeší značka** |
| `envelope.designs[]` | ne | vestavěné vzory pláště `{ id, name:{cs,en}, paint(g, kit) }` |
| `links[]`, `utm`, `promo` | ne | marketingové odkazy (viz 16.5) |
| `stats[]` | ne | čísla na plánovací obrazovce `{ value, labelKey }` |
| `i18n`, `wiki` | ne | `{ cs, en }` texty a kategorie encyklopedie |

THREE se do funkcí značky **předává jako argument**, aby značka nemusela importovat knihovnu a jádro zůstalo čisté.

---

## 16.4 Vzhled: CSS tokeny a `theme.css`

`src/ui/styles.css` je **strukturální**: rozložení, velikosti, animace. Barvy, písmo, zaoblení a stíny jsou jen CSS
proměnné (tokeny). Hodnoty tokenů nastavuje `theme.css` značky v `:root`. Seznam tokenů, které téma musí nastavit,
se vypočítá ze `styles.css` (test `missingCssTokens`): `--text`, `--muted`, `--accent`, `--accent-2`, `--highlight`,
`--success`, `--danger`, `--btn-primary`, `--panel-bg`, `--tint`, `--radius-btn`, `--radius-panel`, `--font`,
`--link`, `--shadow-float`, `--screen-plan-bg` a další. Tokeny nastavované za běhu v JavaScriptu (např. `--ttl`) téma dodávat nemusí.

`theme.css` smí přidat i **pravidla specifická pro značku**, pokud se vzhled liší tvarem, a ne jen barvou. Školní vzhled je
hranatý bez rámečků, HaBalon má zaoblení 14 px, jemné rámečky a kulatá tlačítka; ta se řeší pravidly v tématu
(`.panel { border: … }`, `.btn.round { border-radius: 50% }`). Do `styles.css` nepatří natvrdo `#hex`.

---

## 16.5 Texty a marketing

**i18n.** `src/i18n/cs.js` a `en.js` obsahují **neutrální** texty jádra. Značka je přepíše nebo doplní v `i18n.cs.js`/`i18n.en.js`;
`i18n/index.js` je při startu sloučí (značka přepíše jádro). Kategorie encyklopedie značky (`wiki.*.js`) se přidají za
kategorie jádra; **stejné `id` kategorii jádra nahradí** (HaBalon takto upravuje text o křtu).
Volitelný text zjistí `hasKey('klíč')`.

**Odkazy.** Marketing jsou **data, ne kód**:

```js
utm: 'utm_source=game&utm_campaign=balloon-sim',
links: [
  { id: 'order', href: 'https://example.cz/#lety', primary: true,
    places: { diploma: 'result.cta', menu: 'result.cta', failed: 'result.cta', wiki: 'wiki.cta' } },
],
promo: { titleKey: 'promo.title', textKey: 'promo.text', failedTextKey: 'promo.failed' },
```

`places` říká, kde se odkaz zobrazí: `plan` (úvodní obrazovka), `diploma`, `menu` (promo tlačítko v HUD a panel),
`failed` (po neúspěšném přistání místo výchozí rady), `wiki` (kategorie s `cta: true` nese hlavní odkaz jako tlačítko,
s `link: true` jako text). Hodnota je klíč i18n popisku. `utm` se přidá ke všem odkazům a `utm_medium` se nastaví podle místa.
**Do URL nikdy nejde jméno hráče.** Ceny ani slevy se ve hře neuvádějí. Značka bez odkazů pro `menu` nemá promo tlačítko vůbec.

---

## 16.6 Diplom

Diplom má **jednu šablonu v jádru** (`ui/ResultScreen.js`): pozadí, nadpis, titul, jméno (bez jména se řádek vynechá), pět údajů,
dole „virtuální let“, hvězdy a datum. Značka dodává přes `diploma`:

- `height` a `headerHeight` (šířka je vždy 1400 px; pod záhlavím musí zbýt aspoň 640 px),
- `colors` (pozadí, text, titul, boxy, odznak, hvězdy),
- `header(g, { W, H, FONT, plan, app, envelopeCanvas })`, které nakreslí logo, případně rámeček nebo balon se vzorem hráče.

Tlačítka (stáhnout, sdílet, letět znovu) a odkazy značky z `links` (místo `diploma`) vykresluje jádro.

---

## 16.7 Build a nasazení

Značku vybírá Vite preset `vite/brand.js` (`brandConfig({ brandDir })`):

| Příkaz | Co dělá |
| :-- | :-- |
| `npm run dev`, `npm run build` | značka `school` (výchozí) |
| `npm run dev:school`, `npm run build:school` | totéž výslovně |
| `vite --mode <id>` | značka `brands/<id>` v jádru (neexistuje-li, použije se `school`) |

Preset nastaví alias `@brand`, kořen na jádro, `base: './'`, verzi a hash jádra, dosadí `brand.head.html`/`brand.noscript.html`
do `index.html` a sloučí `public/` (společné + značky). Výstup `dist/` značky obsahuje jen její soubory.
Nasazení se řídí `web.config` značky (např. HaBalon povoluje Google Fonts v CSP, škola ne; `frame-ancestors` je vždy
vlastní doména).

**Samostatné repo značky.** Značka může žít mimo jádro. Repo značky obsahuje soubory z 16.2, `package.json`, `tests/brand.test.js`
a jádro jako **git submodul** `core/`:

```js
// vite.config.js repa značky
import { fileURLToPath } from 'node:url';
import { brandConfig } from './core/vite/brand.js';
export default brandConfig({ brandDir: fileURLToPath(new URL('.', import.meta.url)) });
```

```bash
git submodule add <URL repa HotAirSim> core    # jednou; pak npm run setup
npm run dev
npm test        # smlouva, CSS tokeny, texty odkazů
npm run build   # dist/ značky
```

Aktualizace jádra: v `core/` přepnout na nový tag, `npm test`, `npm run build`, commitnout nový odkaz na submodul.
Změna smlouvy (`contract`) je v `CHANGELOG.md` jádra označená **brand-breaking**; jádro při nesouladu hlásí chybu, ne tiché selhání.

---

## 16.8 Kontrolní seznam: přidání nové značky

1. Zkopírujte `brands/_minimal` (nejmenší platná značka) nebo `brands/school` do `brands/<id>/` (nebo do nového repa).
2. `index.js`: `contract: 1`, `id`, `name`, `storagePrefix`, `font`, `colors`, `canvas`, `logoHtml`, `drawLogo`, `diploma`.
3. `theme.css`: všechny tokeny (viz 16.4), případně pravidla pro tvary.
4. `brand.head.html` (title, `<meta>`, canonical, Open Graph, favicon, písmo, styl `#loading` s barvami značky) a `brand.noscript.html`.
5. `public/`: favicon, apple-touch-icon, og-image, `web.config` (CSP pro vaše písmo a doménu), `envelopes/manifest.json` (i prázdný).
6. Texty: `i18n.*.js`, `wiki.*.js`; odkazy: `links`, `utm`, `promo`, případně `stats`.
7. `npm test` a `vite build --mode <id>`; v prohlížeči projděte plán, let, neúspěšné a úspěšné přistání, diplom, nastavení, encyklopedii, CS i EN, mobil na výšku i na šířku.
8. V `dist/` nesmí být řetězce jiné značky; v jádru (`src/`) nesmí přibýt název, logo, barva, URL ani text vaší značky (hlídá `tests/brand.test.js`).

---

## 16.9 Co značka nesmí měnit

Fyziku, mapy, bodování, herní konstanty a herní fáze. Značka mění vzhled, obsah (balony, tituly, v budoucnu mapy) a marketing.
Mapy značky zatím nejsou součástí rozhraní; plánovaný způsob je registr lokalit, který značka doplní (`content.sites`).
Zeměpisné názvy lokalit (např. Lužické hory, Varnsdorf) zůstávají v jádru, ne ve značce.

---

## Shrnutí

- Jádro zná značku jen přes alias `@brand`, vzhled přes CSS tokeny, texty přes i18n.
- Značka = `index.js` + `theme.css` + HTML hlavička + `public/` + texty; marketing jsou data (`links`).
- Diplom je jedna šablona; značka dodává barvy a záhlaví.
- Smlouva `contract` a testy hlídají, aby se jádro a značky nerozešly.
