# 01 – Úvod do projektu

## 1.1 Co je HotAirSim

**HotAirSim** je webová 3D hra, v níž hráč projde celý balonářský zážitek:

```
 PLÁNOVÁNÍ ──► START ──► LET ──► PŘISTÁNÍ ──► OSLAVA
  (PLAN)      (LAUNCH)  (FLIGHT)  (LANDING)  (CELEBRATION)
```

1. **Plánování** – hráč zadá jméno, vybere místo startu na mapě, denní dobu (ráno / podvečer), počet
   osob v koši a počet plynových lahví.
2. **Start** – posádka zkouší hořák, pokládá koš, rozkládá plášť, plní ho studeným a potom horkým vzduchem,
   nastoupí cestující a balon se uvolní z lana.
3. **Let** – hráč ovládá **hořák** (stoupání), **paraventil** (klesání) a **otáčení koše**. Balon nemá
   kormidlo ani motor, směr letu se volí **výškou**, protože vítr v různých výškách vane různými směry.
4. **Přistání** – podle svislé a vodorovné rychlosti dotyku je přistání měkké, tvrdé nebo havárie;
   voda, les a skála znamenají neúspěch.
5. **Oslava** – balonářský křest, titul a stažitelné osvědčení (obrázek PNG se jménem, dobou letu,
   maximální výškou a skóre).

Hra se ovládá myší a klávesnicí nebo dotykem (telefon, tablet) a dá se hrát česky i anglicky.

## 1.2 Proč je to dobrý studijní projekt

Balon je pro výuku výjimečný tím, že **vše podstatné se dá spočítat jednoduchými vzorci**:

| Jev | Fyzika | Kde to v projektu uvidíte |
| :--- | :--- | :--- |
| Proč balon stoupá | hustota plynů, Archimédův zákon | `PhysicsEngine.netLiftKg()` |
| Proč je potřeba hořák | ohřev a ochlazování (Newtonův zákon) | `PhysicsEngine.step()` – teplota uvnitř |
| Proč reaguje se zpožděním | setrvačnost, přidružená hmotnost | `inertia` v `step()` |
| Proč nemá kormidlo | vítr se mění s výškou | `WindModel` |
| Proč je ráno lepší vztlak | studenější vzduch je hustší | `TIME_OF_DAY` v `GameConfig.js` |
| Proč tvrdé přistání převrátí koš | kinetická energie a rychlost dotyku | `LandingResolver` |

A současně je to **skutečná aplikace** s architekturou, kterou najdete i v profesionálních hrách:

- herní smyčka s **pevným fyzikálním krokem**,
- **automat stavů** (state machine) pro herní fáze,
- **oddělení logiky od vykreslování** (fyziku lze testovat bez grafiky),
- **procedurální generování** terénu ze šumu a seedu,
- vlastní **shadery** (mlha, plamen, tráva),
- **WebAudio** syntéza zvuku bez jediného zvukového souboru (kromě hudby),
- **internacionalizace** (CS/EN),
- automatické **testy**.

## 1.3 Co se z projektu naučíte

**Z fyziky a matematiky**

- spočítat hustotu vzduchu a vztlak balonu,
- sestavit pohybovou rovnici (druhý Newtonův zákon) s více silami,
- pochopit numerickou integraci (Eulerova metoda) a proč je potřeba malý a pevný krok,
- pracovat s vektory, azimuty a interpolací (lineární, hladká „smoothstep“),
- chápat šum (simplex noise) a pseudonáhodná čísla se seedem.

**Z programování**

- moderní JavaScript (ES moduly, třídy, destrukturování, šablonové řetězce),
- práce s **npm** a sestavovacím nástrojem **Vite**,
- základy **Three.js** (scéna, kamera, geometrie, materiály, světla, instancování),
- psaní **GLSL shaderů** pomocí `onBeforeCompile`,
- návrh programu do modulů, rozhraní entit (`update`, `getMesh`, `reset`),
- DOM, události ukazatele (`pointer events`), `localStorage`,
- testování knihovnou **Vitest**.

## 1.4 Technologie v kostce

| Technologie | K čemu slouží | Poznámka |
| :--- | :--- | :--- |
| **JavaScript (ES moduly)** | celý kód hry | žádný TypeScript, žádný framework |
| **Three.js** | 3D vykreslování přes WebGL | jediná velká knihovna |
| **simplex-noise** | šum pro terén a biomy | deterministický díky seedu |
| **Vite** | vývojový server a build | rychlé spuštění, `import` modulů |
| **Vitest** | testy | stejné prostředí jako Vite |
| **Canvas 2D** | textury pláště, mapa, osvědčení | kreslení „po pixelech“ |
| **WebAudio API** | syntetický zvuk | šum filtrovaný biquad filtry |
| **HTML + CSS** | rozhraní (menu, HUD) | bez frameworku, design podle školního manuálu |

Podrobněji o jednotlivých knihovnách a jejich verzích v kapitole [02](02-instalace-a-spusteni.md#26-použité-knihovny).

## 1.5 Rychlá prohlídka hry (pohled hráče)

### Plánování
Vpravo je panel se čtyřmi kartami (Pilot, Místo a čas, Balon, Posádka a palivo), vlevo se v 3D otáčí
pohled na balon u startu. Dole je pevná lišta s odhadem letu: **hmotnost**, **doba, kterou plyn vydrží**
a **teplota pro visení** (teplota vzduchu v plášti, při které balon právě visí).
Pokud je koš příliš těžký, tlačítko „Vzlétnout“ se zablokuje.

> **Zkuste to:** přidejte pasažéry, přepněte na „Podvečer“ a sledujte, jak se zvyšuje „Teplota pro visení“.
> Teplejší okolní vzduch je řidší, takže rozdíl hustot (a tedy vztlak) je menší.

### Start
Průvodce krok za krokem: zkouška hořáku → položení koše → rozložení pláště → studené plnění → horké plnění
→ nástup → zahřátí a uvolnění lana. Každý krok se provádí **držením tlačítka** (nebo mezerníku).
Za celý start odpovídají dvě proměnné: `inflation` (naplnění pláště 0…1) a teplota uvnitř.

### Let
- `Mezerník` / `W` / `↑` – hořák,
- `S` / `↓` – paraventil,
- `A` / `D` / `←` / `→` – otáčení koše,
- `C` – přepnutí kamery (zvenku / z koše),
- `+` / `−` – přiblížení a oddálení kamery (drží se),
- tažení myší nebo prstem – rozhlížení, kolečko nebo štípnutí – přiblížení,
- `M` – ztlumení zvuku.

Vlevo nahoře je přístrojová deska (výška, stoupání, teplota, plyn). Vpravo nahoře je **vítr** a
rozbalovací **žebříček větru po vrstvách** s řádkem „Vy“. Pod ním je šipka k cílové louce.

> **Klíč ke hře:** zjistěte ve kterých výškách vane vítr směrem k cíli a vystoupejte nebo sestupte do
> té vrstvy. Šipka větru v HUD ukazuje směr relativně k pohledu kamery.

### Přistání a oslava
Hra při dotyku zjistí rychlosti a vyhodnotí přistání (tabulka v kapitole [04](04-simulace-v-kodu.md#46-vyhodnocení-přistání)).
Po úspěšném přistání přijede doprovodné auto a následuje oslava se sektem, titulem a osvědčením.

## 1.6 Rozsah projektu

Projekt má přibližně **6 500 řádků** kódu v souborech `.js` a `.css`, rozdělených do několika desítek
malých souborů. To je dost na to, aby šlo o skutečnou aplikaci, a dost málo na to, aby ji žák dokázal
pochopit celou. Doporučený postup čtení je v [kapitole 05](05-architektura.md).

| Oblast | Zhruba řádků | Soubory |
| :--- | :-: | :--- |
| Jádro (smyčka, fyzika, vítr, plán) | 900 | `src/core/` |
| Herní fáze | 1 100 | `src/phases/` |
| Entity (balon, auto, postavy) | 1 200 | `src/entities/` |
| Svět (terén, biomy, nebe, mlha, ptáci) | 1 000 | `src/world/` |
| Rozhraní | 1 400 | `src/ui/`, `src/ui/styles.css` |
| Zvuk | 250 | `src/audio/` |
| Texty (CS, EN, encyklopedie) | 650 | `src/i18n/` |
| Konstanty a barvy | 230 | `src/config/` |
| Testy | 150 | `tests/` |

## 1.7 Co projekt záměrně není

- **Není to přesný letecký simulátor.** Konstanty jsou „laděné na pocit“ (viz poznámky
  v [kapitole 03](03-fyzika-letu.md#39-co-simulace-zjednodušuje)). Vzorce jsou ale fyzikálně správné
  a řády veličin odpovídají skutečnému balonu s objemem 3 000 m³.
- **Není to učebnice létání.** Pro skutečné létání je nutné absolvovat výcvik a získat licenci.
- **Nemá server.** Vše běží v prohlížeči, nic se neukládá mimo `localStorage` (hlasitost, rozbalení
  žebříčku větru) a nic se neodesílá.

## 1.8 Struktura repozitáře (úplný přehled)

```
hot-air-sim/
├── doc/                  ← tato dokumentace
├── index.html            ← jediná HTML stránka (canvas + kontejner pro UI + načtení fontu)
├── package.json          ← seznam závislostí a příkazů (npm scripts)
├── vite.config.js        ← nastavení Vite (relativní základní cesta)
├── public/               ← soubory kopírované beze změny (hudba, logo)
│   ├── music/theme-organic-house.mp3
│   └── logo-mark.svg
├── src/                  ← celý zdrojový kód aplikace (kapitola 05)
├── tests/                ← automatické testy (kapitola 12)
├── AGENTS.md             ← technická pravidla projektu (pro vývojáře a nástroje AI)
├── README.md             ← krátký úvod a odkaz na tuto dokumentaci
└── tmp/                  ← lokální podklady mimo Git (kopie design systému školy, archiv původního zadání)
```

Složky `node_modules/` (stažené knihovny) a `dist/` (výsledek buildu) vznikají automaticky
a nejsou součástí zdrojového kódu.
