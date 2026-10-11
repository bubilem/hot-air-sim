# 09 – Design systém a vzhled rozhraní

Rozhraní HotAirSim (menu, panely, tlačítka, osvědčení) je navrženo podle **grafického manuálu a design
systému VOŠ, SPŠ a SOŠ Varnsdorf**. Tato kapitola vysvětluje, **co je design systém**, jaká pravidla
přebíráme, jak jsou zapsána v CSS a jak do rozhraní správně přidat nový prvek.

Zdroj pravidel je repozitář školy **https://github.com/skolavdf-dev/design-system** (soubory níže jsou cesty v něm):

| Soubor | Obsah |
| :-- | :-- |
| `docs/DESIGN.md` | barvy, písmo, tvary, komponenty, „Do’s and Don’ts“ |
| `docs/LOGO.md` | geometrie a pravidla používání loga |
| `index.html` | živá ukázka všech komponent (otevřete v prohlížeči) |
| `assets/logo/` | logo v PDF, PNG a SVG |

## 9.1 Co je design systém a proč ho používat

**Design systém** je soubor pravidel a hotových komponent, díky kterým vypadají všechny aplikace organizace
jednotně: stejné barvy, písmo, tvary tlačítek, odsazení. Přináší:

- **Konzistenci** – uživatel pozná, že aplikace patří škole.
- **Rychlost vývoje** – nemusíte pokaždé vymýšlet, jaké bude tlačítko.
- **Dostupnost** – kontrasty a velikosti jsou promyšlené.
- **Snazší spolupráci** – víc lidí tvoří, a výsledek vypadá jako od jednoho autora.

Technicky se systém zapisuje jako **design tokeny** (pojmenované hodnoty: barva, velikost písma, zaoblení)
a **komponenty** (sestavy tokenů: „primární tlačítko“). V CSS jsou tokeny **proměnné** (`--název`).

## 9.2 Charakteristika vizuální identity

Podle `DESIGN.md`:

1. **Tmavý motiv** s lineárním gradientem pozadí `#003b4b → #006783`.
2. **Skleněné panely** (*glassmorphism*): poloprůhledné pozadí `#001b2273` a rozostření `blur(12px)`.
3. **Ostré hrany**: všechny panely, karty, tabulky a popisky mají `border-radius: 0`. Výjimka: **tlačítka a
   formulářová pole mají 4 px**. Kruhové (`9999px`) jsou jen přepínače „radio“ a barevné body.
4. **Bez rámečků**: žádná šedá ani průsvitná ohraničení sekcí. Oddělení se dělá **plochami a odsazením**.
5. **Plochý styl**: žádné záře ani stíny na tlačítkách. (Stín smí mít jen plovoucí okno, úroveň 2.)
6. **Žluté odkazy** (`#ffd400`), bez podtržení; podtržení a světlejší žlutá (`#ffe14d`) jen při najetí myší.
   Tučný text (`strong`) zůstává bílý, aby se nepletl s odkazem.
7. **Písmo Raleway** v řezech 200, 400, 600, 700.
8. **Vlastní odrážky**: místo tečky polygon trojúhelníku z loga (jako inline SVG v CSS).
9. **Barevné kódování oborů**: žlutá = umění a řemesla, modrá = technika a IT, zelená = služby a ekologie.

## 9.3 Barvy

### Barvy školy

| Token | Hodnota | Použití v aplikaci |
| :-- | :-: | :-- |
| `--yellow-1` | `#ffd400` | odkazy, hořák, zvýraznění titulu, žluté hvězdy, akcentní tlačítko |
| `--yellow-2` | `#ffea80` | hover žlutých prvků |
| `--blue-1` | `#41d7ff` | šipky větru, ukazatele, cílová značka, aktivní kroky |
| `--blue-2` | `#00c0f3` | číslo karty, jmenovka pilota, nápis na pláštích |
| `--green-1` | `#c2dd78` | doplňkový akcent |
| `--green-2` | `#a6ce39` | úspěch (zpráva o přistání, „dobrý stav“) |

### Barvy motivu

| Token | Hodnota | Význam |
| :-- | :-: | :-- |
| `--bg-top` / `--bg-bottom` | `#003b4b` / `#006783` | gradient pozadí |
| `--panel-bg` | `rgba(0,27,34,.45)` (`#001b2273`) | skleněný panel (úroveň 1) |
| `--float-bg` | `rgba(0,20,26,.95)` | plovoucí okno, menu, modální dialogy (úroveň 2) |
| `--text` | `#ffffff` | text |
| `--muted` | `rgba(255,255,255,.55)` (`#ffffff8c`) | vedlejší text |
| `--btn-primary` / `--btn-primary-hover` | `#0083a6` / `#b29400` | primární tlačítko / jeho hover |
| `--btn-secondary` | `rgba(255,255,255,.08)` (`#ffffff14`) | sekundární tlačítko |
| `--input-glass` | `rgba(0,15,20,.5)` (`#000f1480`) | skleněné pole formuláře |
| `--danger` | `#ef4444` | chyba, varování, havárie |

### Rozšíření specifické pro aplikaci

Design systém nezná pojem „vnitřní tmavší výplň“, kterou potřebujeme na oddělení prvků uvnitř karty **bez
rámečků**. Zavedli jsme proto jeden vlastní token:

```css
--tint: rgba(0, 15, 20, 0.35);   /* tmavší plocha uvnitř panelu místo rámečku */
```

Používá se pro seznam míst, žebříček větru, segmentové přepínače. Vždy, když byste chtěli kolem prvku
nakreslit čáru, použijte místo toho `--tint` (nebo jiné pozadí).

### Dvě „palety“ ve hře

Barvy rozhraní (DOM, CSS) a barvy **scény** (3D objekty) jsou dvě oddělené věci:

- **CSS** – proměnné v `src/ui/styles.css` (`#rrggbb`),
- **3D scéna** – `src/config/Colors.js`: objekt `BRAND` (školní barvy jako čísla `0xrrggbb` pro Three.js, např. konfety,
  oblečení pozemního týmu, cílová značka) a `COLORS` (louky, voda, stromy, balon…).

Barvy přírody (zelená louka, modrá obloha) **nepatří do design systému**. Design systém určuje vzhled
rozhraní, ne obsah krajiny.

Hodnoty v `Colors.js` jsou **stejné** jako v CSS; při změně školní barvy je třeba upravit obě místa
(proto komentář v souboru odkazuje na tuto kapitolu).

## 9.4 Typografie

Celá aplikace používá výhradně **Raleway**; je hostované lokálně (`public/fonts/*.woff2`, licence OFL) a deklarované
v `index.html` pomocí `@font-face` (nic se nenačítá z Google Fonts):

```css
@font-face { font-family: Raleway; font-weight: 700; font-display: swap;
  src: url('./fonts/raleway-latin-700-normal.woff2') format('woff2'); unicode-range: U+0000-00FF, /* … */; }
```

```css
--font: 'Raleway', system-ui, sans-serif;
html, body { font-family: var(--font); font-weight: 400; }
```

| Prvek | Velikost | Řez |
| :-- | :-: | :-: |
| hlavní nadpis plánování (`h1`) | 2,25 rem | 700 |
| nadpisy karet (`h3`) | 1,125 rem | 600 |
| nadpisy panelů (`h2`) | 1,35 rem | 600 |
| běžný text | 1 rem | 400 |
| malé popisky (`small`) | 11 px, verzálky, rozestup 0,1 em | 600 |
| velká čísla v HUD | 20 px | 700 |

Pro canvas (osvědčení, textury pláště) se používá stejný font: `FONT = 'Raleway, Arial, sans-serif'`.
Před kreslením se čeká na načtení fontu (`document.fonts.load('700 40px Raleway')`), jinak by se první
osvědčení nakreslilo záložním písmem.

> **Pozor:** Nadpisy `h1`–`h4` se **nesmí** obarvovat do modré nebo jiné akcentní barvy; zůstávají bílé.

## 9.5 Tvary, odsazení a hloubka

### Zaoblení

| Prvek | Zaoblení | V CSS |
| :-- | :-: | :-- |
| panely, karty, mapy, seznamy, okna | 0 | `border-radius: 0` |
| tlačítka (`.btn`, `.chip`, `.seg button`, `.stepper button`) | 4 px | `var(--radius-btn)` |
| vstupní pole | 4 px | |
| kolečka s čísly karet, barevné body | plný kruh | `border-radius: 9999px` |

### Odsazení

Tokeny `--sp-xs … --sp-xl` jsou 4, 8, 16, 24, 32 px. V CSS se používají hodnoty z této řady (8, 12, 16 px).

### Úrovně hloubky

| Úroveň | Prvek | Styl |
| :-: | :-- | :-- |
| 0 | pozadí | gradient (a 3D scéna) |
| 1 | karty, HUD panely | `--panel-bg` + `blur(12px)` |
| 2 | nastavení, encyklopedie, dolní lišta plánování | `--float-bg` + `blur(20px)` + `0 8px 32px rgba(0,0,0,.25)` |

## 9.6 Komponenty v aplikaci

Komponenty jsou CSS třídy. Níže je přehled s tím, co dělají a jak je používat.

### Tlačítka

| Třída | Vzhled | Použití |
| :-- | :-- | :-- |
| `.btn` | primární (`#0083a6`), hover žlutá `#b29400`, verzálky, 600 | základ všech tlačítek |
| `.btn.cta` | primární, větší | hlavní akce („VZLÉTNOUT“, „STÁHNOUT DIPLOM“) |
| `.btn.ghost` | sekundární, `#ffffff14` | vedlejší akce („LETĚT ZNOVU“) |
| `.btn.act` | **akcentní**: průhledné, žlutý obrys, na hover žlutá výplň | akce při startu a oslavě |
| `.btn.burn` | žlutá výplň, tmavý text | hořák za letu (nejdůležitější ovládací prvek) |
| `.btn.vent` | primární | paraventil |
| `.btn.small`, `.btn.gear` | sekundární, čtverec 40–48 px | ikonová tlačítka (nastavení, encyklopedie, domů) |
| `.btn.zoom`, `.btn.cam` | sekundární | kamera a zoom |

Žlutý obrys akcentního tlačítka je v CSS vytvořen pomocí `box-shadow: inset 0 0 0 2px`, ne `border`: zachovává
rozměry a nepřidává „rámeček“ (viz zásada bezrámovosti).

**Velikost dotykových ploch.** Ovládací tlačítka mají min. 56 px (palec); doplňková ikonová tlačítka 40–48 px.
To je kompromis mezi požadavkem „ovládání palcem“ a množstvím ovládacích prvků na malé obrazovce.

### Panely a karty

```css
.panel { background: var(--panel-bg); backdrop-filter: blur(12px); border: 0; border-radius: 0; padding: 8px 12px; }
.card  { /* totéž, vnitřek obrazovky plánování */ }
```

### Formulářová pole

Textové pole (jméno pilota) používá **tmavou skleněnou variantu** (`--input-glass`, bílý text, bez rámečku,
4 px). Při zaostření (`:focus`) se zvýrazní **vnitřním** modrým stínem (`box-shadow: inset 0 0 0 2px`) – opět bez
rámečku. Posuvníky hlasitosti používají `accent-color: var(--blue-1)`.

### Přepínače a výběr

- `.seg` – segmentový přepínač (oslovení, denní doba, jazyk): tmavá plocha, aktivní segment primární modrý.
- `.sitecard`, `.dtile` – karty výběru místa a pláště: výchozí `--tint`, vybraná karta primární modrá.
- `.stepper` – počitadlo s tlačítky + a − (pasažéři, láhve).

### Seznamy a odrážky

```css
.wiki-text li {
  padding-left: 22px;
  background: no-repeat left 0.45em / 12px 10px url("data:image/svg+xml,…polygon points='0 0 10 0 5 8.66' fill='%23fbbb2c'…");
}
```

Odrážkou je **trojúhelník s hrotem dolů** ve stylu loga. Obecné seznamy mají žlutou (`#fbbb2c`), navigační modrou
(`#00c0f3`). Vložení jako **data URI** znamená, že odrážka nepotřebuje žádný soubor.

### Klávesy a štítky

`kbd` a `.kh` (nápověda kláves na tlačítkách) mají poloprůhledné pozadí a spodní stín vytvářející „tlačítko
klávesy“ bez rámečku. Nápověda se zobrazuje **jen tam, kde je myš** (`@media (hover: hover) and (pointer: fine)`).

### Stavové barvy

| Stav | Barva | Příklad |
| :-- | :-- | :-- |
| úspěch | `--green-2` | „Měkké přistání!“ |
| varování | `--yellow-1` | penalizace za přistání na poli, těžký koš |
| chyba / havárie | `--danger` | „Havárie“, „PŘEHŘÁTÍ!“, přetížený balon |
| informace | `--blue-1` | cíl, vítr |

## 9.7 Logo a značka aplikace

Aplikace používá **symbol školy** (barevný trojúhelník s hrotem dolů) spolu s názvem **HotAirSim**.

| Kde | Soubor | Poznámka |
| :-- | :-- | :-- |
| HUD a plánování | `src/ui/brand.js` (`LOGO_HTML`) | symbol jako inline SVG + jednoslovný nápis „HotAirSim“ |
| Osvědčení | `src/ui/ResultScreen.js` (`drawMark`) | symbol nakreslený do canvasu ze stejných bodů |
| Ikona karty prohlížeče | `public/logo-mark.svg` | `<link rel="icon">` v `index.html` |
| Auto, přívěs | `src/entities/ChaseVehicle.js`, `SchoolMark.js` | polep: symbol + „VOŠ \| SPŠ \| SOŠ Varnsdorf“ na bocích |
| Trika posádky a pilota | `Character.js`, `SchoolMark.js` | průhledný symbol na hrudi a na zádech |
| Plášť balonu | `EnvelopeDesigns.js` | nápis „HotAirSim“, vzor „Školní barvy“ ve třech barvách |

Pravidla z `LOGO.md`, která je nutné dodržet:

- **poměr stran 1000 : 866** – logo se nesmí natahovat ani stlačovat (v CSS `width`/`height` mají poměr 30 : 26),
- **hrot vždy dolů** – logo se nesmí otáčet,
- **bez záře a stínů**, **bez změny barev** (jen oficiální hodnoty),
- **ochranná zóna** 25 % šířky logem, **minimální šířka 24 px** na obrazovce,
- na tmavém pozadí se používají plné barvy (náš případ).

Šest polygonů symbolu má body (viewBox `1000 × 866`):

```
žlutá 1   0 0 500 0 500 188 326 188          #ffd400
žlutá 2   0 0 326 188 413 339 250 433        #ffea80
modrá 1   500 0 1000 0 674 188 500 188       #41d7ff
modrá 2   674 188 1000 0 750 433 587 339     #00c0f3
zelená 1  250 433 413 339 500 490 500 866    #c2dd78
zelená 2  500 490 587 339 750 433 500 866    #a6ce39
```

> **Autorská práva.** Zdrojový kód design systému je pod licencí MIT, ale **loga a grafické podklady jsou
> duševním vlastnictvím školy**. Pro školní výuku je používáme; mimo školu (např. veřejné publikování hry)
> vyžaduje použití loga souhlas školy.

## 9.8 Jak vytvořit nový prvek správně

Kontrolní seznam před přidáním nového prvku:

1. **Existuje už komponenta?** Zkuste použít `.btn`, `.panel`, `.card`, `.seg` a podobně.
2. **Barva z tokenu.** Nepište `#0083a6`, napište `var(--btn-primary)`. Novou barvu nezavádějte bez důvodu.
3. **Tvar.** Panel/karta = `border-radius: 0`; tlačítko/pole = `var(--radius-btn)`.
4. **Žádný rámeček.** Oddělujte plochou (`--tint`), odsazením, nebo vnitřním stínem.
5. **Žádná záře a barevný stín.** Hloubku řeší jen úroveň 2.
6. **Texty z `i18n/`.** Nepište český text natvrdo (viz kap. 10).
7. **Dotyková plocha.** Ovládací prvky pro hru min. 48–56 px.
8. **Přístupnost.** Tlačítko bez textu (ikona) potřebuje `aria-label`.
9. **Mobil.** Vyzkoušejte šířku 360 px a na výšku i na šířku (`@media (max-height: 480px)`).

### Příklad: nové akcentní tlačítko

```html
<button class="btn act">NAPSAT ZPRÁVU</button>
```

žádné nové CSS není potřeba. Chcete-li jen **jiné číslo pozadí karty**, použijte `style="background: var(--tint)"`.

## 9.9 Co se oproti původní verzi změnilo

Projekt vznikl původně jako komerční ukázka s tmavě modrým rozhraním a tyrkysovými zaoblenými prvky.
Při předělání na výukový projekt se změnilo:

| Původně | Nově |
| :-- | :-- |
| písmo Nunito | Raleway |
| pozadí `#111827` | gradient `#003b4b → #006783` |
| zaoblené panely 14–18 px, rámečky 1 px | ostré hrany, bez rámečků |
| kulatá tlačítka | čtvercová, zaoblení 4 px |
| tyrkysová akcentní barva | modrá `#41d7ff` a primární tlačítko `#0083a6` |
| oranžový hořák | žlutý `#ffd400` |
| záře a stíny tlačítek | ploché |
| odrážky tečky | trojúhelník z loga |
| marketingová tlačítka, statistiky firmy, polepy | odstraněno |

Původní materiály jsou archivovány lokálně v `tmp/archiv-puvodni-verze/` (mimo Git; jen pro referenci; jejich obsah nemá být dále
používán).
