# Změny

Všechny významné změny HotAirSim. Formát vychází z [Keep a Changelog](https://keepachangelog.com/cs/), čísla verzí
z [SemVer](https://semver.org/lang/cs/) (`MAJOR.MINOR.PATCH`). Číslo verze je v `package.json`, postup vydání je
v `README.md` (kapitola Verzování).

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
