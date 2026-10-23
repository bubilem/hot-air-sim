# 14 – Cvičení a projekty

Úlohy jsou rozdělené podle obtížnosti a zaměření. U každé je uvedena **obtížnost**:

| Značka | Obtížnost | Typicky |
| :-: | :-- | :-- |
| ★ | snadná | 10–20 minut, stačí číst a měnit konstanty |
| ★★ | střední | 30–60 minut, úprava několika řádků |
| ★★★ | těžší | 1–3 hodiny, nový modul nebo nový jev |
| ★★★★ | projekt | více hodin, samostatná práce |

Úlohy označené **[F]** jsou z fyziky, **[P]** z programování, **[H]** jsou hravé experimenty ve hře.
Řešení vybraných úloh jsou na konci kapitoly (odst. 14.7).

---

## 14.1 Úlohy z fyziky [F]

**F1 ★** Vypočtěte hustotu vzduchu ve výšce 2 000 m n. m. při teplotě 0 °C. Postup viz kapitola 03, odst. 3.3.

**F2 ★** Balon váží (s posádkou a palivem) 700 kg, na místě startu ve výšce 300 m n. m. je 15 °C. Při jaké teplotě
vzduchu v plášti balon visí? Objem je 3 000 m³.

**F3 ★★** Jaká je největší celková hmotnost, kterou může balon (3 000 m³) unést, jestliže teplota v plášti nesmí
překročit 105 °C? Spočtěte pro ráno (12 °C) a večer (22 °C) na místě ve výšce 220 m n. m. Porovnejte a vysvětlete rozdíl.

**F4 ★★** Plášť se z 12 °C zahřívá plným zážehem (*k_burn* = 1,2 K/s, chladnutí zanedbejte). Za jak dlouho dosáhne
66 °C? A za jak dlouho, když započítáte chladnutí (*k_cool* = 0,006 1/s)? Porovnejte s tím, co ukazuje experiment
v kapitole 04, odst. 4.9.

**F5 ★★** Odvoďte teplotu v plášti jako funkci času při chladnutí: *T(t) = T_out + (T₀ − T_out)·e^(−k t)*. Kolik
stupňů bude mít plášť po 5 minutách, začíná-li na 80 °C při okolních 12 °C? Kolik po otevření paraventilu?

**F6 ★★** Spočítejte, jakou rychlostí balon stoupá při čistém vztlaku 50 kg (ρ = 1,206 kg/m³, *C_d* = 0,45,
*S* = 250 m²). Jak by se rychlost změnila, kdyby byl plášť dvakrát větší (plocha 4× větší)?

**F7 ★★** Hořák při udržování výšky pracuje se střídou *d*. Vyjádřete *d* pomocí *T_hold*, *T_out*, *k_cool* a
*k_burn* a vypočtěte, kolik minut vydrží 3 láhve (60 kg plynu) při *T_hold − T_out* = 54 K.

**F8 ★★** Balon letí s větrem 6 m/s a najednou se dostane do vrstvy s větrem 2 m/s (stejný směr). Jak se bude měnit jeho
rychlost, je-li τ = 6 s? Za jak dlouho se rozdíl rychlostí zmenší na 10 %? (Nápověda: *e^(−t/τ) = 0,1*.)

**F9 ★★★** Z grafu: nakreslete graf závislosti čistého vztlaku na teplotě v plášti pro teploty 12–120 °C
(pro posádku 580 kg). Kde protíná osu *x*? Je závislost lineární? Vysvětlete, proč je „skoro“ lineární.
(Nápověda: *ρ ~ 1/T*.)

**F10 ★★★** Navigace po vrstvách větru: v lokalitě **Polabí** (vrstvy v odst. 3.8) se potřebujete dostat na cíl
v azimutu 180° a vzdálenosti 1 900 m, ale tak, abyste se vyhnuli městu na jihozápadě (střed ≈ 700 m na západ a 450 m na jih od startu, protéká jím Labe). Zvolte posloupnost výšek a časy v nich tak, aby vás vítr zanesl k cíli.
Vypočtěte posun jako součet *v · t* pro každou vrstvu (vektorově!) a porovnejte s tím, co vyjde ve hře.

**F11 ★★★★** Do modelu přidejte **pokles teploty s výškou** (6,5 K/km) a zjistěte, jak se změní „teplota pro visení“ ve
výšce 1 000 m. Návod: kapitola 04, odst. 4.10. Odhadněte předem, zda se teplota pro visení zvýší nebo sníží, a pak
si to ověřte.

---

## 14.2 Experimenty ve hře [H]

**H1 ★** Zahrajte si jeden let ráno a jeden večer se stejným plánem. Zapište: teplotu pro visení, dobu plynu, dobu
od zapálení k odpoutání (start), a kolik jste potřebovali zážehů. Co z toho vyplývá?

**H2 ★** Přistaňte „na tři“: pokuste se přistát v jednom letu **měkce** (pod 1,2 m/s), **tvrdě** a **havárií**. Zapište
rychlosti z panelu přistání. Dá se predikovat dopředu?

**H3 ★★** Najděte pro každou lokalitu vrstvu větru, která vás zanese nejblíže k cíli. Vytvořte tabulku:
lokalita – výška – směr – dosažená vzdálenost od cíle.

**H4 ★★** Zjistěte (experimentem v konzoli: `game.balloon.physics.tempIn = …`), při jaké teplotě balon na místě začne
stoupat. Souhlasí to s hodnotou „Teplota pro visení“ v plánování?

**H5 ★★** Změřte **zpoždění** mezi zážehem a změnou stoupání. Stiskněte hořák na 3 s a zapisujte hodnotu
`game.balloon.physics.vel.y` každou sekundu (nebo použijte `console.log` s intervalem). Vykreslete graf.

**H6 ★★★** Pokuste se dosáhnout **co nejvyššího skóre** na každé z lokalit. Které z faktorů (plyn, vzdálenost od cíle,
měkkost přistání) se nejvíc vyplatí?

---

## 14.3 Programování – začátečníci [P]

**P1 ★** V `brands/school/index.js` změňte hodnotu `colors.confetti[0]` nebo `colors.flags[0]` (např. na `0xff0000`). Co všechno ve scéně změní barvu?
Proč se nezměnilo rozhraní kolem (HUD, tlačítka)? (Nápověda: kapitola 09, odst. 9.3.)

**P2 ★** Přidejte do `cs.js` a `en.js` nový text a zobrazte ho kdekoliv v rozhraní (kapitola 13, odst. 13.5).

**P3 ★** Změňte název aplikace (`brands/school/logo.js` a `name` v `brands/school/index.js`). Co se změní na osvědčení a na štítku pláště? (Název je ve značce na dvou místech; zkuste to sjednotit a ověřte `npm test`.)

**P4 ★** Změňte počet pasažérů (maximum) z 5 na 4 (`GameConfig.PLAN.maxPassengers`). Projeví se to v UI? Co na to
rozvržení v koši (`PAX_SLOTS`)?

**P5 ★★** Přidejte nový **vzor pláště** (kapitola 13, odst. 13.4), např. barvy vaší třídy.

**P6 ★★** Přidejte novou **lokalitu** (kapitola 13, odst. 13.3) s vlastním seedem a větrem. Vyberte seed tak, aby
byl terén zajímavý – zkoušejte, dokud se vám nelíbí.

**P7 ★★** Změňte klávesy pro hořák a paraventil (např. `E`, `Q`). Nezapomeňte upravit i nápovědu v nastavení.

**P8 ★★** Vypište do konzole každou sekundu letu teplotu, výšku a plyn. Naučíte se tím `console.log` s intervalem.

---

## 14.4 Programování – pokročilejší [P]

**P9 ★★★** **Ladicí panel (`?debug`).** Vytvořte panel s posuvníky pro konstanty `PHYSICS` (kapitola 13, odst. 13.10).
Rozšíření: tlačítko, které uloží nastavení do `localStorage`.

**P10 ★★★** **Nové skóre.** Přidejte bonus za „čistý let“ (málo zážehů) a vypište ho v osvědčení. Napište pro něj
test v `tests/game-rules.test.js`. Které soubory budete muset změnit?

**P11 ★★★** **Víc počasí.** Přidejte do lokalit parametr „nárazový vítr“ (`gust`), který zvýší amplitudu turbulence
v `WindModel.at`. Vyzkoušejte, jak se mění hratelnost.

**P12 ★★★** **Interpolace vykreslování.** Z kapitoly 06: mezi dvěma kroky fyziky interpolujte polohu balonu
(`alpha = acc / FIXED_DT`) a vykreslujte plynulejší pohyb. Měřitelný je rozdíl hlavně při jiném `FIXED_DT`
(např. 1/20).

**P13 ★★★** **Zápis letové stopy.** Každou sekundu ukládejte polohu balonu do pole a po přistání ji nakreslete do
osvědčení jako čáru na mapě (použijte funkci `renderMapImage` z `PlanScreen`; možná ji bude nutné přesunout do
vlastního modulu – proč?).

**P14 ★★★** **Další zvuk.** Přidejte zvuk plamene, jehož tón závisí na teplotě (kapitola 11, odst. 11.7).

**P15 ★★★** **Přístupnost.** Přidejte `prefers-reduced-motion` (vypnutí kývání a pulzování) a nastavení velikosti písma.

**P16 ★★★** **Nový jazyk** (kapitola 13, odst. 13.6).

**P17 ★★★** **Oprava drobnosti:** `PhysicsEngine.maxAlt` počítá z nuly světové souřadnice, ne od startu
(viz poznámka v kapitole 03, odst. 3.9). Opravte tak, aby údaj „Max. výška“ na osvědčení odpovídal výšce nad startem.
Která místa kódu `maxAlt` používají (`LandingPhase`, `Scoring`)? Napište test, který chybu odhalí.

**P18 ★★★** **Tření nezávislé na kroku.** Na zemi se rychlost násobí `0.9` v každém kroku. Přepište to tak, aby
tlumení nezáviselo na `dt` (nápověda: `Math.pow(0.9, dt * 60)` nebo exponenciální tlumení z kapitoly 06).

---

## 14.5 Projekty [★★★★]

**Projekt A – Mise.** Přidejte **herní režim s úkoly** („přistaňte do 200 m od cíle, spotřebujte nejvýš 20 kg plynu“).
Vyžaduje: datový popis misí, kontrolu splnění po přistání, obrazovku s výběrem mise, překlady.

**Projekt B – Meteorologická stanice.** Vytvořte nové okno (jako encyklopedie), které zobrazí graf **rychlosti a směru
větru podle výšky** pro vybranou lokalitu (Canvas 2D nebo SVG). Žák se naučí zacházet s daty a grafy.

**Projekt C – Editor lokality.** Stránka (nebo režim hry), kde se pomocí posuvníků nastavuje seed, vítr a výška; náhled
mapy se překresluje a výsledek lze **exportovat jako JSON** pro `Sites.js`.

**Projekt D – Učitelský režim.** Přidejte „laboratorní mód“, který za letu zapisuje data (`čas, výška, vy, tempIn,
gas`) a po přistání je nabídne jako **CSV** ke stažení. Žáci pak data zpracují v tabulkovém procesoru a porovnají
s teoretickým modelem.

**Projekt E – Vlastní balon.** Umožněte hráči volit **tvar a velikost pláště** (profil `PROFILE`) a objem; fyzika
(`PHYSICS.volume`, `area`) se dopočítá z tvaru. Porovnejte výkon balonů různých velikostí.

**Projekt F – Měřicí protokol.** Navrhněte a proveďte sérii experimentů (nejméně 3 vlastní hypotézy, např. „Střída hořáku
při udržování výšky je u těžšího balonu vyšší“) a **zpracujte protokol**: hypotéza, postup, naměřená data, graf, závěr,
vysvětlení pomocí rovnic z kapitoly 03.

---

## 14.6 Hodnocení projektů (návrh kritérií)

| Kritérium | Váha | Co se hodnotí |
| :-- | :-: | :-- |
| Funkčnost | 30 % | úprava funguje a nic nerozbila, testy procházejí |
| Pochopení | 25 % | žák umí vysvětlit, co dělá jeho kód a jak souvisí s fyzikou |
| Kvalita kódu | 20 % | čitelnost, pojmenování, konstanty v `GameConfig`, žádné duplicity |
| Testy a ověření | 10 % | vlastní test(y), ruční scénáře |
| Dokumentace | 10 % | popis změny (co, proč, kde), případně úprava kapitol |
| Design | 5 % | dodržení design systému (kapitola 09) |

Při obhajobě doporučujeme otázky typu: „Proč je tato funkce v tomto souboru?“, „Co by se stalo, kdybys tu konstantu
zdvojnásobil?“, „Jak bys to otestoval?“.

---

## 14.7 Řešení vybraných úloh

**F1.** p = 101 325 · e^(−2000/8400) = 79 850 Pa; ρ = 79 850 · 0,028 964 / (8,314 · 273,15) ≈ **1,018 kg/m³**.

**F2.** p(300 m) = 101 325 · e^(−300/8400) = 97 770 Pa; ρ_out(15 °C) = 97 770 · 0,028 964 / (8,314 · 288,15) = 1,182 kg/m³.
ρ_in = ρ_out − m/V = 1,182 − 700/3 000 = 0,9487 kg/m³; T_in = ρ_out · T_out / ρ_in = 1,182 · 288,15 / 0,9487 = 359,0 K ≈ **86 °C**.

**F3.** *m_max = V (ρ_out − ρ_in(105 °C))*.
Ráno ρ_out = 1,206, ρ_in(105 °C) = 0,909 → *m_max* ≈ **890 kg**.
Večer ρ_out = 1,165, ρ_in(105 °C) ≈ 0,909 → *m_max* ≈ **767 kg**.
Rozdíl ≈ 120 kg: teplejší vzduch je řidší, takže při stejné teplotě v plášti je rozdíl hustot menší.

**F4.** Bez chladnutí: 54,4 K / 1,2 K/s ≈ **45 s**. S chladnutím: *T = T_out + 200 (1 − e^(−0,006 t))* → 54,4 = 200 (1 − e^(−0,006 t))
→ *t* = −ln(1 − 0,272) / 0,006 ≈ **53 s**. Souhlasí to s experimentem v kapitole 04, kde balon vzlétne po ≈ 52 s.

**F5.** ΔT(300 s) = 68 · e^(−0,006 · 300) = 68 · 0,165 ≈ 11,2 K → **23 °C**. S paraventilem (k = 0,031): 68 · e^(−0,031 · 300) ≈ 0,006 K → prakticky okolní teplota.

**F6.** *v = √(2 · 50 · 9,81 / (1,206 · 0,45 · 250))* ≈ **2,7 m/s**. S plochou 4× větší klesne rychlost na polovinu (*v ~ 1/√S*): ≈ 1,3 m/s.

**F7.** *d = k_cool · ΔT / k_burn* = 0,006 · 54 / 1,2 = 0,27. Spotřeba = 0,27 · 0,09 = 0,0243 kg/s → 60 kg / 0,0243 ≈ 2 470 s ≈ **41 min**.

**F8.** Rychlost se řídí rovnicí *dv/dt = (v_vítr − v) / τ*: *v(t) = 2 + 4 · e^(−t/6)* m/s. Rozdíl klesne na 10 % po *t* = 6 · ln 10 ≈ **14 s**.

**F9.** Funkce *L(T) = V (ρ_out − pM/(R T)) − m* je v *T* konkávní, ale na intervalu 12–120 °C (285–393 K) se *1/T* mění pozvolna,
takže je průběh téměř lineární se směrnicí 8–9 kg/K. (Nulu protíná při 66,4 °C pro 580 kg.)

**H4.** Nastavte `game.balloon.physics.tempIn = game.balloon.physics.hoverTemp(0) + 3` v letu na zemi (po startu přes `?skip=1`): balon pomalu začne stoupat. Při přesné teplotě visení netlačí nahoru ani dolů.

**P17.** Řešení: při vytvoření balonu uložte `startY` a počítejte `maxAlt = max(maxAlt, pos.y − startY)`. Nebo ponechte `maxAlt` jako světovou
souřadnici a při tvorbě výsledku odečtěte `world.startY`. Pozor: `FlightPhase` používá `p.maxAlt > 3` jako podmínku pro přistání (dotek těsně po startu se nepočítá);
po změně musí platit i tato logika.
