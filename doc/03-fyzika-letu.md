# 03 – Fyzika horkovzdušného balonu

Tato kapitola vysvětluje **fyziku létání** v rozsahu, v jakém ji používá simulace. Je psaná pro
středoškoláka: vše je odvozeno z toho, co znáte (hustota, tlak, síla, teplota), a všechny vzorce jsou
ověřeny **konkrétními čísly z naší hry**. Jak se tyto vzorce převedou do kódu, ukazuje
[kapitola 04](04-simulace-v-kodu.md).

> **Značení.** Veličiny značíme obvyklými písmeny: *ρ* hustota (kg/m³), *V* objem (m³), *m* hmotnost (kg),
> *g* tíhové zrychlení (9,81 m/s²), *T* teplota (v kelvinech, pokud není uvedeno °C), *p* tlak (Pa),
> *v* rychlost (m/s), *F* síla (N).
> Vztah mezi stupni Celsia a kelviny: **T[K] = T[°C] + 273,15**.

---

## 3.1 Základní myšlenka

Balon **není lehčí než vzduch**. Obyčejný balon s horkým vzduchem je vlastně obří **obrácený kelímek
s otevřeným dnem**, naplněný vzduchem, který je **teplejší, a tedy řidší** než okolní vzduch.

Všechno ostatní z toho vyplývá:

1. Okolní vzduch působí na ponořené těleso **vztlakovou silou** (Archimédův zákon). Plášť balonu je ponořený
   v atmosféře, stejně jako ponorka ve vodě.
2. Vztlaková síla se rovná **tíze vzduchu, který těleso vytlačilo**.
3. Vzduch uvnitř pláště je řidší, váží méně než vytlačený okolní vzduch, a **rozdíl** je ta síla, která
   balon zvedá.
4. Od tohoto rozdílu odečteme tíhu všeho ostatního (plášť, koš, lidé, plyn) a zbude **čistý vztlak**.
   Je-li kladný, balon stoupá; je-li záporný, klesá; je-li nulový, **visí**.

Pilot proto balon řídí jen jedinou věcí: **teplotou vzduchu v plášti** (hořákem ji zvyšuje,
paraventilem a přirozeným chladnutím snižuje). Teplota je v naší hře tím nejdůležitějším stavem balonu.

---

## 3.2 Atmosféra: jak se mění tlak s výškou

Tlak vzduchu klesá s výškou, protože nad vámi je méně vzduchu. Pro naše výšky (stovky metrů až jednotky
kilometrů) stačí zjednodušený **barometrický vzorec**:

$$ p(h) = p_0 \cdot e^{-h / H} $$

- *p₀* = 101 325 Pa (normální tlak na hladině moře),
- *H* = 8 400 m (tzv. výšková stupnice atmosféry; v kódu `8400`),
- *h* = nadmořská výška (m).

V kódu je to řádek `101325 * Math.exp(-altitudeMsl / 8400)` ve funkci `airDensity()`
(`src/core/PhysicsEngine.js`).

| Nadmořská výška | Tlak |
| :-: | :-: |
| 0 m | 101 325 Pa |
| 220 m (Polabí) | 98 700 Pa |
| 840 m | 91 700 Pa |
| 2 000 m | 79 900 Pa |

Pro balon je důležité, že se s výškou o desítky a stovky metrů tlak mění **jen o jednotky procent**.
Proto má pro hru malý vliv; přesto ho simulace počítá, protože „stojí“ jediný řádek kódu.

> **Nadmořská výška** v simulaci = výška místa startu (`site.elevation`, např. 220 m) + výška balonu nad
> startem. Každá lokalita má vlastní výšku, viz `src/world/Sites.js`.

---

## 3.3 Hustota vzduchu a stavová rovnice

Pro vzduch za běžných podmínek platí **stavová rovnice ideálního plynu**:

$$ p \cdot V = n R T \quad\Longrightarrow\quad \rho = \frac{m}{V} = \frac{p \cdot M}{R \cdot T} $$

- *M* = 0,028 964 kg/mol (molární hmotnost vzduchu, v kódu `M_AIR`),
- *R* = 8,314 J/(mol·K) (molární plynová konstanta, v kódu `R_GAS`),
- *T* = **absolutní** teplota v kelvinech.

Z rovnice plyne klíčový vztah: **při stejném tlaku je hustota nepřímo úměrná absolutní teplotě**.
Vzduch o dvakrát vyšší absolutní teplotě má poloviční hustotu.

### Příklad 1 – hustota vzduchu v Polabí ráno

Místo startu leží ve výšce 220 m a ráno je 12 °C (285,15 K).

1. tlak: p = 101 325 · e^(−220/8400) = 101 325 · 0,9742 ≈ 98 710 Pa,
2. hustota: ρ = 98 710 · 0,028 964 / (8,314 · 285,15) = **1,206 kg/m³**.

### Příklad 2 – hustota horkého vzduchu v plášti

Stejný tlak, ale uvnitř je 90 °C (363,15 K):

ρ = 98 710 · 0,028 964 / (8,314 · 363,15) = **0,947 kg/m³**.

Horký vzduch je o **21 %** řidší. Právě tento rozdíl (0,259 kg na každý m³) je zdrojem vztlaku.

| Teplota vzduchu | Hustota (220 m n. m.) |
| :-: | :-: |
| 12 °C (ráno) | 1,206 kg/m³ |
| 22 °C (podvečer) | 1,165 kg/m³ |
| 66 °C | 1,013 kg/m³ |
| 90 °C | 0,947 kg/m³ |
| 100 °C | 0,922 kg/m³ |

> **Zkuste to:** v konzole prohlížeče po spuštění hry nelze importovat funkci přímo, ale můžete si hodnoty
> spočítat v jakémkoli JavaScriptu: `101325*Math.exp(-220/8400)*0.028964/(8.314*(12+273.15))`.

---

## 3.4 Archimédův zákon a vztlak balonu

Na těleso ponořené do tekutiny (kapaliny nebo plynu) působí svislá vztlaková síla rovná tíze vytlačené tekutiny:

$$ F_{vz} = \rho_{okolí} \cdot V \cdot g $$

Plášť balonu je dole **otevřený** (ústí), takže tlak uvnitř se vyrovná tlaku okolí. Objem *V* pláště je
naplněný horkým vzduchem o hustotě *ρ_in*, jehož tíha je *ρ_in · V · g*. **Čistá zdvihová síla pláště:**

$$ F_{zdvih} = (\rho_{out} - \rho_{in}) \cdot V \cdot g $$

Tuto sílu je pohodlné vyjadřovat **v kilogramech** (dělíme *g*) – říkáme, kolik kilogramů „pláštěm utáhneme“:

$$ L = V \cdot (\rho_{out} - \rho_{in}) \quad [\text{kg}] $$

A **čistý vztlak** (net lift) po odečtení hmotnosti *m* všeho, co balon nese:

$$ L_{net} = V \cdot (\rho_{out} - \rho_{in}) - m $$

V kódu je to metoda `netLiftKg()` v `PhysicsEngine.js`:

```js
netLiftKg(y = this.pos.y) {
  const alt = this.cfg.siteElevation + y;
  const rOut = airDensity(this.ambient, alt);
  const rIn  = airDensity(this.tempIn, alt);
  return P.volume * (rOut - rIn) - this.mass;
}
```

### Příklad 3 – kolik utáhne plášť při 100 °C

Objem *V* = 3 000 m³ (`PHYSICS.volume`), ρ_out = 1,206, ρ_in(100 °C) = 0,922 kg/m³:

L = 3 000 · (1,206 − 0,922) ≈ **853 kg**.

Naše standardní posádka (viz tabulka v 3.5) váží 580 kg, takže čistý vztlak je 853 − 580 ≈ **273 kg**
(přesný výpočet programem dává 273,2 kg). Balon se silou odpovídající tíze 273 kg zvedá.

### Při jaké teplotě balon visí?

Chceme *L_net* = 0, tedy *V (ρ_out − ρ_in) = m*, odkud:

$$ \rho_{in} = \rho_{out} - \frac{m}{V} \qquad\text{a z toho}\qquad T_{in} = \frac{\rho_{out} T_{out}}{\rho_{in}} $$

(poslední vztah vyplývá z toho, že ρ·T je při stejném tlaku konstantní). Tato teplota se nazývá
**teplota pro visení** (v kódu `hoverTemp()`, na obrazovce plánování „Teplota pro visení“).

### Příklad 4 – teplota pro visení

*m* = 580 kg, *V* = 3 000 m³, ρ_out = 1,206 kg/m³, T_out = 285,15 K:

- ρ_in = 1,206 − 580/3 000 = 1,206 − 0,1933 = 1,0126 kg/m³,
- T_in = 1,206 · 285,15 / 1,0126 = 339,6 K = **66,4 °C**.

To odpovídá číslu, které hra zobrazí při dvou pasažérech po 75 kg a dvou lahvích (67 °C).

### Příklad 5 – kolik vztlaku přibude s jedním stupněm?

Derivací hustoty podle teploty (*dρ/dT = −ρ/T*) dostaneme:

$$ \frac{dL}{dT} = \frac{V \rho_{in}}{T_{in}} \approx \frac{3000 \cdot 1{,}013}{339{,}6} \approx 9\ \text{kg/K} $$

Každý stupeň, o který vzduch v plášti ohřejeme, zvedne čistý vztlak přibližně o **9 kg**. Proto pilot
při visení „jemně přidává“ a stačí mu pár stupňů.

### Proč je ráno lepší vztlak než večer

Večer je okolní vzduch teplejší (22 °C místo 12 °C), proto je řidší, rozdíl hustot *ρ_out − ρ_in* při
stejné teplotě v plášti menší a balon musí vzduch uvnitř ohřát **ještě víc**, aby visel. V naší hře:

| Podmínky (2 × 75 kg, 2 lahve) | Teplota pro visení |
| :-- | :-: |
| ráno, 12 °C | ≈ 66 °C |
| večer, 22 °C | ≈ 81 °C (plyn vydrží ≈ 25 min místo 27) |

> **Zkuste to:** v plánování přepínejte „Ráno / Podvečer“ a sledujte údaj „Teplota pro visení“ a „Plyn vydrží“.

---

## 3.5 Hmotnost balonu

Celková hmotnost *m* je součtem několika složek (konstanty jsou v `PHYSICS` v `GameConfig.js`):

| Složka | Konstanta | Hodnota | Poznámka |
| :-- | :-- | :-: | :-- |
| plášť | `envelopeMass` | 120 kg | tkanina, lana |
| koš s hořáky | `basketMass` | 130 kg | |
| pilot | `pilotMass` | 80 kg | vždy jeden |
| pasažéři | `PLAN.passengerMassMin…Max` | 65 – 90 kg každý | náhodně při zadání |
| prázdné láhve | `bottleEmpty` | 30 kg × počet | |
| plyn (LPG) | `gasPerBottle` | 20 kg × počet | **ubývá hořením** |

Příklad: pilot 80 + 2 × 75 pasažérů + plášť 120 + koš 130 + 2 prázdné láhve 60 + plyn 40 = **580 kg**.

**Důležité:** hmotnost **není konstantní**. Hořák spaluje propan-butan a za každou sekundu plného zážehu
ubude `gasRate` = 0,09 kg plynu. Balon se tedy za letu **lehčí**, což se projevuje tím, že ke konci
letu stačí k visení nižší teplota. V kódu: `get mass()` počítá vždy aktuální `this.gas`.

> **Pasažéři a plyn:** Víc lidí = těžší koš = vyšší teplota pro visení = pomalejší stoupání a více plynu.
> Víc plynu = delší let, ale také těžší koš. To je kompromis, který hráč řeší už při plánování.

---

## 3.6 Teplota vzduchu v plášti

Teplota *T_in* je jediný stav, který pilot přímo ovládá. Model, který hra používá, má tři členy:

$$ \frac{dT_{in}}{dt} = \underbrace{b \cdot k_{burn}}_{\text{hořák}} - \underbrace{k_{cool}\,(T_{in} - T_{out})}_{\text{přirozené chladnutí}} - \underbrace{v \cdot k_{vent}\,(T_{in} - T_{out})}_{\text{paraventil}} $$

| Symbol | Význam | Kód | Hodnota |
| :-: | :-- | :-- | :-: |
| *b* | zážeh (0 nebo 1) | `burn` | podle vstupu |
| *k_burn* | ohřev při plném zážehu | `PHYSICS.burnHeating` | 1,2 K/s |
| *k_cool* | chladnutí | `PHYSICS.coolK` | 0,006 1/s |
| *v* | otevření paraventilu (0 nebo 1) | `vent` | podle vstupu |
| *k_vent* | ochlazení paraventilem | `PHYSICS.ventK` | 0,025 1/s |

### Newtonův zákon ochlazování

Druhý a třetí člen jsou **Newtonův zákon ochlazování**: těleso (zde vzduch v plášti) se ochlazuje tím
rychleji, **čím větší je rozdíl teplot** oproti okolí. Řešení pro *b* = 0 a *v* = 0 je exponenciála:

$$ T_{in}(t) - T_{out} = (T_{in}(0) - T_{out}) \cdot e^{-k_{cool}\, t} $$

Časová konstanta je *τ* = 1/*k_cool* ≈ **167 s**: za necelé tři minuty klesne přebytek teploty na 37 %.
S právě otevřeným paraventilem je *k* = 0,006 + 0,025 = 0,031 1/s, tedy *τ* ≈ **32 s**: paraventil ochlazuje
zhruba **pětkrát** rychleji než samotné chladnutí.

### Paraventil se rozevírá a plášť se může propadnout (3.6a)

Paraventil není vypínač: čím **déle** držíte klávesu, tím víc se vrchlík rozevírá a tím rychleji horký vzduch
uniká. Stav `ventHold` (s držení) roste při držení a po uvolnění rychle klesá (klapka se zavře). Koeficient
se násobí `ventMul` = 1 + (`ventMaxMul` − 1) · *o*², kde *o* = `ventHold` / `ventRampTime` (0…1):
po 12 s je klapka otevřená naplno a ochlazování je až 3,5krát silnější. Krátké „cuknutí“ se chová jako dřív.

Při **extrémně dlouhém držení** (od `ventCollapseAfter` = 18 s) se plášť sesedá: `collapse` roste k 1
a objem pláště klesne až o `collapseVolumeLoss` (45 %), takže ubývá
vztlak. Vizuálně se plášť **zužuje a zplošťuje odspodu**: přetlak je největší nahoře (tam se hromadí horký
vzduch), u ústí je nulový, takže vrchlík drží tvar nejdéle. Po uvolnění se plášť zase vzpřímí (pomaleji, rychleji při zážehu).

### Přehřátí: popáleniny a požár (3.6b)

Hořák už nemá pojistku: hlídá se pilot. Při `alarmTemp` = `scorchTemp` = 120 °C hra varuje a plášť se začne
**nevratně pálit**. Za každých `scorchStep` K·s nad touto mezí vznikne **popálené místo** (díra, nejčastěji
u vrchlíku, dle seedu deterministicky). Každá díra trvale zvyšuje ochlazování o `holeLeakK` · velikost
(`leak`), takže hořák musí pracovat víc a plyn dojde dřív; několik děr znamená, že balon už neudrží visení.
Když teplota drží nad `fireTemp` = 140 °C déle než `fireDelay` = 3 s, plášť **vzplane**: `fire` roste
za `fireSpread` = 20 s k 1, uniká tepla `fireLeakK` a plášť se propadá. Konec letu je pád (havárie).

**Vizuál (`BalloonView.js`).** Popáleniny nejsou obarvené čtverce, ale **maska** 256 × 128 ve stejných UV jako vzor
pláště (kanál R = spálení, G = žhnutí). Fyzika dodá jen seznam děr (`u`, `v`, `size`) a míru požáru; pohled je
vykreslí s rozedranými okraji (šum). Fragment shader podle masky rozlišuje zhnědnutí, zuhelnatění a **skutečnou
díru** (`discard`, přes ni je vidět dovnitř a na oblohu); čerstvá díra navíc krátce žhne. Požár je čelo, které se
šíří od vrchlíku dolů; za ním látka zuhelnatí a rozpadá se na díry. Z děr stoupá světlý oblak uniklého horkého
vzduchu, z čerstvých a hořících míst černý kouř, na čele požáru občas plamen (jeden pool 160 částic `Points`,
bez dalších draw callů).

> Ve skutečnosti paraventil nechladí „sám“, ale **vypouští horký vzduch z vrcholu pláště** a do ústí
> se nasává studený. Model to zjednodušuje na efektivní koeficient.

### Rovnovážná teplota a „střída“ hořáku

Při trvalém zážehu by teplota rostla, dokud nebude ohřev roven chladnutí:
*Δ T* = 1,2 / 0,006 = **200 K** (to je mimo realitu; hra proto při 120 °C `alarmTemp` varuje „PŘEHŘÁTÍ!“
a dál už pálí plášť, viz 3.6b).

Chceme-li balon **držet** v teplotě *T_hold*, musí hořák pracovat s poměrem zapnutí (**střída** *d*), při
kterém se ohřev rovná chladnutí:

$$ d = \frac{k_{cool} (T_{hold} - T_{out})}{k_{burn}} $$

### Příklad 6 – jak dlouho vydrží plyn

Ráno držíme balon u visení: *T_hold* − *T_out* = 66,4 − 12 = 54,4 K.

- střída *d* = 0,006 · 54,4 / 1,2 = **0,27** (hořák je zapnutý 27 % času),
- spotřeba plynu = *d* · `gasRate` = 0,27 · 0,09 = 0,0245 kg/s,
- 40 kg plynu (2 láhve) vydrží 40 / 0,0245 ≈ 1 630 s ≈ **27 minut**.

Přesně to ukazuje odhad `estimateFlight()` v plánování („Plyn vydrží 27 min“). Jde o idealizovaný
odhad při udržování výšky; skutečné stoupání a klesání spotřebuje plyn jinak.

### Ohřev při plnění

Při horkém plnění na zemi hra použije `heatBoost` = 2,5: hořák ohřívá 2,5krát rychleji
(`LaunchPhase` posílá `heatBoost: 2.5`), aby start netrval minuty. V reálném životě se start také
výrazně zkracuje větším výkonem hořáku.

---

## 3.7 Pohyb ve svislém směru

Na balon působí svisle tři síly:

$$ m_{ef} \cdot a_y = \underbrace{(\rho_{out} - \rho_{in}) V g}_{\text{zdvih}} - \underbrace{m g}_{\text{tíha}} - \underbrace{F_{odp}}_{\text{odpor vzduchu}} $$

### Odpor vzduchu

Odpor při pohybu těla vzduchem je při větší rychlosti úměrný **druhé mocnině rychlosti**:

$$ F_{odp} = \tfrac12 \rho_{out}\, v_y\,|v_y|\, C_d\, S $$

- *C_d* = 0,45 (součinitel odporu, `PHYSICS.Cd`),
- *S* = 250 m² (průmět pláště do roviny kolmé na pohyb, `PHYSICS.area`),
- zápis *v·|v|* zajišťuje, že odpor míří **vždy proti pohybu** (při stoupání dolů, při klesání nahoru).

### Mezní rychlost

Při stálém čistém vztlaku *F* se rychlost ustálí, když odpor vyrovná sílu: *F = ½ ρ C_d S v²*, tedy

$$ v_{lim} = \sqrt{\frac{2F}{\rho\, C_d\, S}} $$

#### Příklad 7 – jakou rychlostí balon stoupá

Při teplotě 79 °C v plášti je čistý vztlak přibližně 108 kg (≈ 1 060 N). Pak
*v_lim* = √(2 · 1 060 / (1,2 · 0,45 · 250)) ≈ **3,9 m/s**. Právě tuto hodnotu ustáleného stoupání dá
simulace po zážehu (viz kapitola 04). Pro čistý vztlak 20 kg vychází mezní rychlost jen 1,7 m/s:
**rychlost stoupání je „tvrdě“ omezena odporem**, proto balon nikdy „neletí jako raketa“.

### Setrvačnost a přidružená hmotnost

Do rovnice pohybu nevstupuje jen hmotnost *m*, ale **efektivní hmotnost** *m_ef*:

$$ m_{ef} = m + \rho_{in} V + k_a \rho_{out} V $$

- *m* – vlastní hmotnost balonu s posádkou (580 kg),
- *ρ_in V* – hmotnost horkého vzduchu v plášti (≈ 2 800 kg! plášť unáší i jeho „náplň“),
- *k_a ρ_out V* – tzv. **přidružená hmotnost** (*added mass*): když se těleso pohybuje vzduchem, musí
  uvést do pohybu i část okolního vzduchu; pro kouli je *k_a* = 0,5 (v kódu `addedMassFactor`).

Součet je zhruba **5 000 kg**, tedy ≈ **devětkrát víc**, než kolik váží samotný balon s posádkou.

Právě to je důvod, proč balon reaguje na hořák **se zpožděním**:

1. po zážehu teplota stoupá o ~1 K/s (vztlak přibývá ~9 kg za sekundu),
2. přírůstek síly je malý ve srovnání s obrovskou setrvačností (zrychlení je desetiny m/s²),
3. rychlost nabíhá pomalu, plynule, v řádu několika sekund.

Přesně o tomto efektu mluví zadání hry: „viditelné zpoždění 3–6 s mezi zážehem a změnou stoupání“.

> **Zjednodušení:** Skutečná přidružená hmotnost se mění s tvarem a směrem pohybu, my používáme
> jedinou konstantu. Hodnoty v `GameConfig.js` jsou navíc **laděné na pocit hry**, ne podle měření.

### Na zemi

Dokud je čistá síla směrem nahoru záporná (balon je těžší než vztlak), **zůstává na zemi**: zem působí
reakční silou, balon se nepropadá. Simulace to ošetřuje podmínkou `onGround && fy <= 0`.

---

## 3.8 Pohyb ve vodorovném směru: vítr a řízení výškou

### Balon letí s větrem

Balon nemá vrtuli ani kormidlo. Pohybuje se **spolu se vzduchem**, který ho obklopuje. Proto
pasažér v koši **žádný vítr necítí** (i když letí 20 km/h): pohybuje se stejně jako vzduch.
Přesněji: vodorovná rychlost balonu se přibližuje k rychlosti větru (tzv. unášení).

Model používá **zpožděné přibližování** (setrvačnost první řádu):

$$ \frac{dv_{xz}}{dt} = \frac{v_{vítr}(y) - v_{xz}}{\tau} $$

s časovou konstantou *τ* = 6 s (`PHYSICS.windTau`). Řešením pro stálý vítr je exponenciála
*v(t) = v_vítr − (v_vítr − v₀) e^(−t/τ)*. Za 6 s se rozdíl rychlostí sníží na 37 %, za 18 s na 5 %.
Vodorovná rychlost se tak nikdy nemění skokem a balon při změně výšky (a tedy větru) „plynule dobíhá“.

### Vítr se mění s výškou

Základ řízení: **vítr nefouká ve všech výškách stejně**. Každá lokalita (`src/world/Sites.js`) definuje
vrstvy větru. Příklad pro Polabí:

| Výška nad startem | Rychlost | Směr, **kam** vane (azimut) |
| :-: | :-: | :-: |
| 0 m | 1,0 m/s ≈ 4 km/h | 175° (jih) |
| 150 m | 3,5 m/s ≈ 13 km/h | 185° (jih) |
| 300 m | 5,5 m/s ≈ 20 km/h | 195° (jih-jihozápad) |
| 450 m | 3,5 m/s ≈ 13 km/h | 70° (východoseverovýchod) – **střih větru** |
| 650 m | 8,0 m/s ≈ 29 km/h | 215° (jihozápad) |

(Lokalita „Polabí – Děčínsko“: severák, který se s výškou mírně stáčí k západu.) Cíl leží v azimutu 180°
(přímo na jih, za Labem). Nejlepší je kombinace nízkých vrstev (do ~150 m); výš vás vítr zanese k jihozápadu, kde leží město. Kolem 450 m je **střih větru**: vítr se tam téměř obrátí
a vane slabě na východoseverovýchod. Kdo vystoupá a míří špatně, může se tak vrátit zpět; přechod mezi vrstvami
je plynulý, takže se při stoupání nejdřív vítr zeslabí a pak obrátí.
To je celá „hra“ v jedné větě: **výškou volíte směr**.

Pro výpočet vektoru větru z azimutu používáme (osy: +x východ, −z sever):

$$ v_x = v\,\sin\beta, \qquad v_z = -v\,\cos\beta $$

kde *β* je azimut (kompasový úhel měřený od severu po směru hodinových ručiček). Funkce `bearingToVec`
a inverzní `vecToBearing` jsou v `WindModel.js`. **Pozor:** směr větru se v meteorologii udává **odkud**
vane, v naší hře **kam** vane (šipka míří tam, kam vás zanese).

### Mezi vrstvami se přechází hladce

Mezi dvěma sousedními vrstvami se vítr **interpoluje** (nepřeskočí ze 4 na 7 m/s). Hra nepoužívá jednoduchou
lineární interpolaci, ale **smoothstep**:

$$ s = f^2 (3 - 2f), \qquad f = \frac{y - y_a}{y_b - y_a} \in \langle 0; 1 \rangle $$

Smoothstep má na koncích nulovou derivaci, takže se vítr na hranicích vrstev mění „měkce“ bez zlomu.

### Turbulence

K základnímu větru se přičítá drobná proměnlivost ze součtu sinusoid s různými frekvencemi, amplituda
*A* = 0,08 + 0,05 · *v* (silnější vítr = víc kolísání). Je deterministická podle času a seedu lokality,
takže se chová „přirozeně“, ale přitom opakovatelně.

### Rotace koše

Klávesy `A`/`D` otáčejí koš rychlostí 8 °/s (`rotateRate`). **Rotace nemění směr letu** (stejně jako
ve skutečnosti: balon se otáčí kolem svislé osy, ale unáší ho vítr). Slouží k výhledu a k natočení při přistání.

### Denní doba a vítr

Ráno je vítr slabší: `windScale: 0.7`, večer `1.0` (konstanta násobí rychlosti všech vrstev v
`TIME_OF_DAY`). Ráno je také teplota nižší (12 °C) a objevuje se **ranní mlha v údolích**.

---

## 3.9 Co simulace zjednodušuje

Žádný model není dokonalý. Dobrý fyzik (a programátor) **ví, co zanedbal**. U nás:

| Zjednodušení | Skutečnost | Důsledek |
| :-- | :-- | :-- |
| Konstantní objem 3 000 m³ | plášť se při zahřátí mírně rozpíná | zanedbatelné |
| Okolní teplota **nezávisí na výšce** (12 °C / 22 °C) | teplota klesá o ≈ 6,5 K na km | vztlak by s výškou slabě rostl |
| Hořák je jen zapnutý/vypnutý | skutečný hořák má regulaci výkonu | jednodušší ovládání |
| Jeden součinitel odporu *C_d* | závisí na rychlosti a tvaru | stačí pro pocit |
| Přidružená hmotnost konstantní | mění se s pohybem | stačí pro pocit |
| Teplota v plášti je **jedno číslo** | uvnitř je výrazný teplotní gradient (nahoře teplejší) | zjednodušený model chladnutí |
| Chladnutí s časovou konstantou ≈ 167 s | skutečný plášť chladne řádově pomaleji (desítky minut) | hra úmyslně „zrychluje“, aby hráč musel hořák používat |
| Vítr je pole bez prostorových změn | skutečný vítr má víry, nárazy, závětří | jen drobná turbulence |
| Přilnutí na zemi: rychlost se násobí 0,9 **v každém kroku** | tření závisí na terénu | funguje, jen díky pevnému kroku (viz kap. 06) |
| Maximální výška se měří od nuly světových souřadnic | správně by byla nad startem | viz poznámka níže |

> **Úkol k zamyšlení:** v `PhysicsEngine.step()` se po dotyku země udělá `vel.x *= 0.9`. Co by se stalo, kdyby
> fyzika běžela s krokem 1/30 s místo 1/60 s? Proč je pevný krok důležitý? (Odpověď v [kapitole 06](06-herni-smycka-a-faze.md).)

> **Známá drobnost:** `PhysicsEngine.maxAlt` ukládá největší **světovou** souřadnici *y* balonu, ne výšku
> nad místem startu. Start na louce leží kolem 22 m (`WORLD.startFlatHeight`), takže údaj „Max. výška“ na
> osvědčení je o tuto hodnotu větší. Na hře to nic nemění, ale je to dobrá zadání pro cvičení (kap. 14).

---

## 3.10 Přistání a energie

Při dosednutí hra zjistí svislou rychlost *v_y* a vodorovnou rychlost *v_xz* (kapitola 04, odst. 4.6).
Fyzikální smysl prahů:

- **Kinetická energie** koše při svislém dopadu je *E = ½ m v²*. Při dvojnásobné rychlosti je energie
  **čtyřnásobná**. Proto je prah měkkého přistání (1,2 m/s) tak nízký: odpovídá seskoku z výšky ≈ 7 cm
  (*v = √(2gh)*, tedy *h = v²/2g*), tvrdší přistání (2,5 m/s) skoku z ≈ 32 cm a havárie už je ≥ 32 cm.
- **Vodorovná rychlost** vede k **tažení koše po zemi**. Zpomalení způsobuje tření, v kódu konstanta
  `LANDING.dragFriction` = 1,6 m/s². Délka tažení při rovnoměrně zpomaleném pohybu je

$$ s = \frac{v_{xz}^2}{2a} $$

Při 3 m/s je to 2,8 m, při 6 m/s už 11,3 m. Funkce `dragDistance()` v `LandingResolver.js` přesně tento
vzorec počítá.

---

## 3.11 Souhrn vzorců

| Veličina | Vzorec | Kde v kódu |
| :-- | :-- | :-- |
| Tlak vzduchu | p = 101 325 · e^(−h/8400) | `airDensity()` |
| Hustota vzduchu | ρ = pM / (RT) | `airDensity()` |
| Čistý vztlak (kg) | L = V(ρ_out − ρ_in) − m | `netLiftKg()` |
| Teplota pro visení | T = ρ_out T_out / (ρ_out − m/V) | `hoverTemp()` |
| Vývoj teploty | dT/dt = b k_burn − (k_cool + v k_vent)(T − T_out) | `step()` |
| Střída hořáku pro udržení | d = k_cool (T_hold − T_out) / k_burn | `estimateFlight()` |
| Odpor | F = ½ ρ v\|v\| C_d S | `step()` |
| Efektivní hmotnost | m + ρ_in V + 0,5 ρ_out V | `step()` |
| Zrychlení | a_y = (F_zdvih − m g − F_odp) / m_ef | `step()` |
| Unášení větrem | dv/dt = (v_vítr − v)/τ | `step()` |
| Interpolace větru | s = f²(3 − 2f) | `WindModel.base()` |
| Délka tažení | s = v² / (2a) | `dragDistance()` |

---

## 3.12 Příklady k procvičení (s výsledky)

**Příklad A.** Jaká je hustota vzduchu ve výšce 1 000 m n. m. při teplotě 5 °C?
*Řešení:* p = 101 325 · e^(−1000/8400) = 89 960 Pa; ρ = 89 960 · 0,028 964 / (8,314 · 278,15) = **1,127 kg/m³**.

**Příklad B.** Plášť o objemu 3 000 m³ je naplněn vzduchem o hustotě 0,95 kg/m³. Hustota okolí je 1,20 kg/m³.
Kolik kilogramů zvedne?
*Řešení:* 3 000 · (1,20 − 0,95) = **750 kg** (čistá zdvihová síla pláště, před odečtením hmotnosti balonu).

**Příklad C.** Balon váží 600 kg. O kolik K se musí zvýšit teplota z teploty pro visení, aby čistý vztlak byl 90 kg?
*Řešení:* ≈ 9 kg/K → 90 / 9 ≈ **10 K**.

**Příklad D.** Hořák musí držet teplotu o 60 K nad okolím. Jaká je střída zážehu a kolik gramů plynu spotřebuje za minutu?
*Řešení:* d = 0,006 · 60 / 1,2 = **0,30**; spotřeba = 0,30 · 0,09 · 60 = **1,62 kg/min**.

**Příklad E.** Z jaké výšky by museli cestující seskočit, aby dopadli rychlostí 1,2 m/s?
*Řešení:* h = v² / (2g) = 1,44 / 19,62 = **7,3 cm**.

Další zadání jsou v [kapitole 14](14-cviceni-a-projekty.md).

---

## 3.13 Jak fyziku využít při hraní

1. **Šetřete plynem.** Hořák zapínejte krátce; teplota po vypnutí zážehu klesá jen pozvolna (τ ≈ 167 s) a pohyb balonu má navíc velkou setrvačnost.
2. **Počítejte se zpožděním.** Odezva stoupání je setrvačná, proto zážeh přerušte **dřív**, než dosáhnete
   cílové výšky.
3. **Hledejte vrstvu větru.** Podívejte se do žebříčku větru (vpravo nahoře), kde vane vítr k cíli,
   a stoupejte nebo klesejte do této vrstvy.
4. **Plánujte klesání.** Paraventil ochlazuje ~5krát rychleji než samotné chladnutí. Před přistáním
   **zpomalte klesání** krátkým zážehem, aby byla svislá rychlost pod 1,2 m/s.
5. **Přistávejte proti větru stejně rychle, jako vítr unáší.** Vodorovná rychlost přistání je rychlost větru
   u země (ráno 3–5 km/h). Právě proto je ráno přistání snazší.
6. **Zvolte rozumnou zátěž.** Plný koš s večerním teplem balon sotva zvedne.
