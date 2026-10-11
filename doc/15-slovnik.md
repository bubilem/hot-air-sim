# 15 – Slovník pojmů

Abecední přehled odborných pojmů z fyziky, balonového létání a programování, které se v dokumentaci vyskytují.

## Balonové létání a fyzika

| Pojem | Vysvětlení |
| :-- | :-- |
| **Aerostat** | letadlo lehčí než vzduch, které létá díky vztlaku (balon, vzducholoď) |
| **Archimédův zákon** | na těleso ponořené do tekutiny působí vztlaková síla rovná tíze vytlačené tekutiny |
| **Azimut** | úhel měřený od severu po směru hodinových ručiček: 0° sever, 90° východ, 180° jih, 270° západ |
| **Čistý vztlak** (*net lift*) | zdvihová síla pláště minus tíha celého balonu; kladný = stoupá, záporný = klesá, nulový = visí |
| **Hořák** | plynový hořák, který ohřívá vzduch v plášti; ve hře ho ovládá mezerník |
| **Hustota** | hmotnost na jednotku objemu (kg/m³); vzduch ≈ 1,2 kg/m³ při 12 °C |
| **Koš** | gondola s posádkou, palivem a hořáky |
| **LPG** | zkapalněný ropný plyn (propan-butan), palivo hořáků; ve hře láhve s 20 kg plynu |
| **Newtonův zákon ochlazování** | rychlost chladnutí je úměrná rozdílu teplot tělesa a okolí |
| **Nadmořská výška** | výška nad hladinou moře (m n. m.); ve hře `site.elevation` + výška nad startem |
| **Odpor vzduchu** | síla brzdící pohyb tělesa vzduchem; při větších rychlostech úměrná druhé mocnině rychlosti |
| **Paraventil** | otvor na vrcholu pláště, kterým se vypouští horký vzduch; ve hře klesání (klávesa `S`) |
| **Plášť** (*envelope*) | tkaninový obal naplněný horkým vzduchem |
| **Přidružená hmotnost** | zdánlivé zvýšení hmotnosti tělesa, které při pohybu uvádí do pohybu i okolní tekutinu |
| **Rovnice ideálního plynu** | *p V = n R T*; z ní plyne ρ = pM/(RT) |
| **Setrvačnost** | snaha tělesa setrvat v pohybu; příčina zpoždění odezvy balonu na hořák |
| **Střída** (*duty cycle*) | poměr doby zapnutí k celkové době (0,27 = 27 % času zapnuto) |
| **Teplota pro visení** | teplota vzduchu v plášti, při které je čistý vztlak nulový |
| **Úsek / výseč** (*gore*) | svislý pás látky, ze kterých je plášť sešit; ve hře 32 |
| **Ústí** | spodní otvor pláště, pod nímž hoří hořák |
| **Vítr po vrstvách** | změna směru a rychlosti větru s výškou; základ „řízení“ balonu |
| **Variometr** | přístroj měřící rychlost stoupání/klesání (ve hře „Stoupání“) |
| **Vztlak** | síla vzhůru způsobená rozdílem hustot vzduchu uvnitř a vně pláště |

## Programování a software

| Pojem | Vysvětlení |
| :-- | :-- |
| **Akumulátor času** | proměnná, do které se sčítá uplynulý čas a ze které se odebírají pevné kroky fyziky |
| **Algoritmus** | postup krok za krokem, jak vyřešit úlohu |
| **API** | rozhraní, přes které s knihovnou nebo systémem komunikujeme (např. WebAudio API) |
| **Assertion (tvrzení)** | kontrola v testu (`expect(...)`) |
| **Asynchronní** | operace, na jejíž výsledek se nečeká „na místě“ (např. načtení souboru), vrací `Promise` |
| **Atribut (vertex attribute)** | data uložená u vrcholu geometrie (poloha, barva, UV) |
| **Biom** | typ povrchu (voda, louka, les, skála, město…) |
| **Blur** | rozostření |
| **Build** | sestavení produkční verze aplikace (`npm run build`) |
| **Buffer** | blok paměti s daty (zvuk, vrcholy) |
| **Cache** | uložení již spočítaného výsledku pro opakované použití |
| **Callback** | funkce předaná jinému kódu, aby ji zavolal později |
| **Canvas** | HTML prvek pro kreslení pixelů (2D) nebo 3D pomocí WebGL |
| **Class (třída)** | šablona objektů (`class PhysicsEngine { … }`) |
| **Closure (uzávěr)** | funkce, která si pamatuje proměnné z místa, kde vznikla (např. generátor `mulberry32`) |
| **Delegování událostí** | jeden posluchač na rodiči místo posluchačů na každém potomku |
| **Design systém** | soubor pravidel a komponent pro jednotný vzhled aplikací |
| **Design token** | pojmenovaná hodnota vzhledu (barva, zaoblení) |
| **DOM** | stromová reprezentace HTML stránky, se kterou pracuje JavaScript |
| **Draw call** | jedno volání kreslení na grafickou kartu; čím méně, tím rychlejší vykreslení |
| **Dispose** | uvolnění prostředků (paměť grafické karty) po zrušení objektu |
| **ES moduly** | způsob dělení JavaScriptu na soubory (`import`, `export`) |
| **Euler (Eulerova metoda)** | nejjednodušší numerická integrace: nová hodnota = stará + derivace · dt |
| **Fasáda** | návrhový vzor: jednotné rozhraní ke složitému systému (`GameApp`) |
| **Fragment shader** | program na GPU, který určuje barvu každého pixelu |
| **FPS** | snímků za sekundu |
| **Geometrie** | tvar tělesa (vrcholy a trojúhelníky) |
| **GLSL** | jazyk shaderů |
| **GPU** | grafická karta/procesor |
| **Herní smyčka** | cyklus: vstup → aktualizace → vykreslení |
| **HUD** | průhledná přístrojová deska nad obrazem hry |
| **i18n** | internacionalizace: podpora více jazyků |
| **Instancování** | vykreslení mnoha kopií jedné geometrie jedním voláním (`InstancedMesh`) |
| **Interpolace** | výpočet mezihodnot (lineární, hladká) |
| **Invariant** | tvrzení, které musí platit vždy (např. „plyn neroste“) |
| **Lerp** | lineární interpolace: `a + (b − a) · f` |
| **Magické číslo** | číslo v kódu bez vysvětlení; nahrazuje se pojmenovanou konstantou |
| **Materiál** | popis, jak povrch reaguje na světlo (barva, textura) |
| **Mesh** | těleso = geometrie + materiál |
| **Modul** | samostatný soubor s exporty a importy |
| **Node.js** | běhové prostředí JavaScriptu mimo prohlížeč |
| **npm** | správce balíčků pro JavaScript |
| **Oktáva (šum)** | jedna vrstva šumu v jednom měřítku; součet oktáv = fraktální šum |
| **Pevný krok** | simulace počítaná vždy se stejným `dt` (1/60 s) |
| **Pointer events** | jednotné události myši, dotyku a pera (`pointerdown`…) |
| **Procedurální generování** | vytváření obsahu algoritmem místo nahrávání ze souborů |
| **Promise** | objekt reprezentující budoucí výsledek asynchronní operace |
| **PRNG** | pseudonáhodný generátor čísel |
| **Raster / vektor** | obrázek z pixelů / z geometrických útvarů (SVG) |
| **Refaktoring** | úprava vnitřní struktury kódu bez změny chování |
| **Renderer** | objekt, který vykresluje scénu |
| **Scéna** | strom objektů, které se vykreslují |
| **Seed** | počáteční číslo generátoru náhodných čísel |
| **Shader** | malý program běžící na GPU |
| **Smoothstep** | hladká interpolace `t²(3 − 2t)` |
| **Stavový automat** | model s konečným počtem stavů a přechody mezi nimi (`StateMachine`) |
| **Šum (noise)** | hladká pseudonáhodná funkce používaná pro terén a textury |
| **Test (jednotkový)** | malý program, který automaticky ověřuje funkci kódu |
| **Textura** | obrázek aplikovaný na povrch |
| **UV souřadnice** | souřadnice v obrázku textury (0…1) přiřazené vrcholům |
| **Uniform** | hodnota předaná z JavaScriptu do shaderu |
| **Varying** | hodnota předaná z vertex shaderu do fragment shaderu |
| **Vertex** | vrchol geometrie |
| **Vertex shader** | program na GPU, který zpracovává každý vrchol |
| **Vite** | sestavovací nástroj a vývojový server |
| **Vitest** | testovací nástroj |
| **WebAudio** | prohlížečové API pro zpracování a syntézu zvuku |
| **WebGL** | prohlížečové API pro 3D grafiku na GPU |
| **XSS** | útok vložením cizího kódu do stránky (proto neukládáme neošetřený text do `innerHTML`) |
| **Z-fighting** | blikání dvou ploch ležících ve stejné výšce |

## Zkratky a jednotky

| Značka | Význam |
| :-- | :-- |
| m, m², m³ | metr, čtvereční metr, krychlový metr |
| kg | kilogram |
| s | sekunda |
| N | newton (síla) |
| Pa | pascal (tlak) |
| K, °C | kelvin, stupeň Celsia (T[K] = T[°C] + 273,15) |
| km/h, m/s | kilometry za hodinu, metry za sekundu (1 m/s = 3,6 km/h) |
| m n. m. | metrů nad mořem |
| AGL | výška nad terénem (*above ground level*) |
| FPS | snímků za sekundu |
| ρ (rho) | hustota |
| τ (tau) | časová konstanta |
| Δ (delta) | rozdíl, změna |
