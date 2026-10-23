# Změny

Všechny významné změny HotAirSim. Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/), čísla verzí
z [SemVer](https://semver.org/lang/cs/) (`MAJOR.MINOR.PATCH`). Číslo verze je v `package.json`, postup vydání je
v `README.md` (kapitola Verzování).

## [Nepublikováno]

## [0.3.0] – 2026-10-23

Vyměnitelná vrstva značky (brand): jádro hry je oddělené od vzhledu a marketingu, takže z jednoho kódu lze stavět školní i firemní verze. Hra pro školu vypadá a chová se beze změny.

### Přidáno
- **Vrstva značky** `brands/<id>/` (rozhraní `contract: 1`, kapitola `doc/16-znacky-brand.md`): název, `localStorage` prefix, písmo, barvy 3D scény, logo, polepy vozu, trika, vzory pláště, texty cs/en, kategorie encyklopedie, diplom, marketingové odkazy (`links`, `utm`, `promo`, `stats`), `theme.css`, `public/`.
- Značky `school` (referenční, výchozí) a `_minimal` (nejmenší platná, testovací fixture).
- Vite preset `vite/brand.js` (`brandConfig`): alias `@brand`, spojení společného a značkového `public/`, skládání `index.html` z `brand.head.html` a `brand.noscript.html`, verze z git jádra. Skripty `dev:school` a `build:school`; `vite --mode <id>` pro značku v jádru. Značka může mít vlastní repo s jádrem jako git submodulem `core/`.
- `tools/brand-contract.js`: kontrola značky (`validateBrand`) a CSS tokenů, které téma musí nastavit.
- Testy `tests/brand.test.js` (smlouva, tokeny, texty odkazů, **čistota jádra**), `tests/i18n.test.js` (úplnost klíčů, shoda cs a en), `tests/links.test.js` (umístění odkazů, UTM).
- Marketingové odkazy značky podle místa (`plan`, `diploma`, `menu`, `failed`, `wiki`), promo tlačítko a panel v HUD, pruh statistik na plánování, blok po neúspěšném přistání a tlačítko hlavního odkazu v encyklopedii; vše jen když to značka má.
- Vesta týmu (`colors.<role>.vest`) na postavách pilota a posádky.
- Stálý odkaz „Studuj IT u nás →“ na úvodní obrazovce a tlačítko „Chci studovat IT →“ na obrazovce Oslava (odkaz na obor IT na webu školy).
- Tlačítko „Sdílet můj let“: nativní sdílení (s diplomem jako obrázkem), jinak zkopírování textu a odkazu na hru do schránky.

### Změněno
- **Diplom** je jedna šablona v jádru; značka dodává barvy, výšku a záhlaví (logo, rámeček, balon). Školní diplom je pixel po pixelu shodný s předchozí verzí.
- `src/ui/styles.css` je strukturální a používá jen CSS tokeny (nově `--highlight`, `--accent-2`, `--radius-panel`, `--link`, `--shadow-float`, …); hodnoty jsou v `brands/school/theme.css`.
- `src/i18n/cs.js` a `en.js` jsou neutrální; školní texty a kategorie „O projektu a škole“ jsou v `brands/school/`. Odstraněn nepoužitý klíč `result.moreIt`; `result.school` je volitelné `result.note`.
- Soubory značky (favicon, fonty, `og-image`, `envelopes/`, `web.config`) jsou v `brands/school/public/`; společné `public/` obsahuje hudbu a `titles.json`.
- Popis lokality Lužické hory je univerzální (bez zmínky o škole).
- `SchoolMark.js` a `ui/brand.js` přesunuty do `brands/school/`; `BRAND` z `Colors.js` a `SCHOOL_IT_URL` z `GameConfig.js` odstraněny (**brand-breaking** pro vlastní forky: nahrazuje je `brand.colors`, `brand.links`).
- Testy se spouštějí jen ze složky `tests/` aktuálního repa.

## [0.2.0] – 2026-10-23

### Přidáno
- Verze hry vlevo dole na úvodní obrazovce (číslo, hash a datum posledního commitu), `CHANGELOG.md`.
- Oblačná vrstva (inverze) v ranním Polabí: balon jí proletí, uvnitř je vidět jen desítky metrů, shora je moře mraků, zespodu zatažená obloha.
- Povrch pod košem v HUD (louka, pole, les, voda, skála, zástavba) od 150 m nad terénem.
- Vzdálenost od cíle na diplomu.

### Změněno
- Díry v plášti: mají plochu v m², únik tepla podle výtoku Torricelli a od ~2 m² celkové plochy plášť sesedá (ztráta objemu); požár prožírá další díry.
- Pole a les jsou lépe rozeznatelné od louky: parcely, rýhy a mezníky v shaderu terénu, tlumené barvy bez zelené; tmavší les, listnáče, keře na okraji lesa a stíny stromů na zemi.
- Bodování: nejvíc bodů dává postup k cíli, přistání a palivo se počítají podle postupu; bonus za přistání v cíli; hvězdy podle hranic 300 / 600 / 850.
- Český ráj: dominanta Trosky natočená tak, aby byla vidět z letu.

### Opraveno
- Přepnutí pohledu (kamera z koše / zvenku) už nenuluje směr pohledu; sklon a přiblížení si každý pohled pamatuje zvlášť.
- Krátký „hop“ hned po vzletu už nedostane skoro plné body.

## [0.1.0] – 2026-10-13

První použitelná verze (E1, geometrické MVP): všech pět herních fází, fyzika, vítr, čtyři lokality, balon, CS/EN, diplom, dokumentace.

### Přidáno
- První verze HotAirSim: plánování, start, let, přistání a oslava (11. 10.).
- Dominanty: Hrádek ve Varnsdorfu a hrad Bezděz, samostatný kostel a třetí komín v Lužických horách; později Trosky v Českém ráji (12. 10.).
- Paraventil a přehřátí: rozevírání klapky, sesedání pláště, popáleniny a požár (12. 10.).
- Kolize za letu: plášť a koš s lesem, stavbami a skalami (12. 10.).
- Výška a teplota: pokles teploty s výškou, hypoxie pilota, strop (12. 10.).
- Ovládání: klávesy `+` a `−` pro přiblížení, popisky kláves na tlačítkách; na mobilu ovládání kamery jako matice 3×2.
- Hlášení pilotovi jako ploché karty.
- Příprava distribuce: IIS `web.config`, SEO / Open Graph, lokální písmo Raleway, ikony.
- Marketing školy: odkaz na obor Informační technologie (Encyklopedie, obrazovka Oslava).

### Změněno
- Ležící plášť na zemi bez vznášející se špičky, vrchlík se při stavění táhne lanem vzhůru.
- Přistání na svahu: koš se nezabořuje a vyfouklý plášť kopíruje terén.
- Dokumentace odkazuje na design systém školy na GitHubu místo složky `tmp/`.

### Opraveno
- Postavy: pilot měl záporný variant, kůže a vlasy byly `undefined`.
- Plánování: po přepnutí jazyka znovu funguje tlačítko Nastavení (duplicitní posluchač kliknutí).
