# HotAirSim – dokumentace

Vítejte v dokumentaci projektu **HotAirSim**, 3D simulátoru horkovzdušného balonu, který běží přímo
v prohlížeči. Projekt vznikl jako **výukový materiál** pro střední školu. Spojuje dvě témata:

1. **létání** – proč balon stoupá, jak se řídí a co všechno ovlivňuje jeho let (fyzika),
2. **programování** – jak se z fyzikálních rovnic stane běžící 3D hra (JavaScript, Three.js, herní smyčka,
   architektura aplikace).

Dokumentace je psaná tak, abyste **nemuseli nic hádat**: každá kapitola vysvětluje, *co* se děje,
*proč* se to tak dělá a *kde přesně v kódu* to najdete.

---

## Pro koho je dokumentace

| Čtenář | Co by měl číst | Poznámka |
| :--- | :--- | :--- |
| **Žák, který chce hru jen spustit** | kapitoly 01, 02 | 15 minut |
| **Žák se zájmem o fyziku** | 03, 04, 15 | rovnice, odvození, příklady výpočtů |
| **Žák se zájmem o programování** | 05, 06, 07, 08, 10, 11, 12 | architektura a technologie |
| **Žák, který chce projekt upravovat** | 13, 14 | návody krok za krokem a zadání úloh |
| **Učitel** | celé, hlavně 14 a poznámky na konci této stránky | |

---

## Obsah

| # | Kapitola | O čem je |
| :-: | :--- | :--- |
| 01 | [Úvod do projektu](01-uvod.md) | co je HotAirSim, co se dá naučit, jak hra vypadá z pohledu hráče |
| 02 | [Instalace a spuštění](02-instalace-a-spusteni.md) | Node.js, npm, Vite, spuštění, build, testy, nasazení, řešení problémů |
| 03 | [Fyzika balonu](03-fyzika-letu.md) | tlak, hustota, Archimédův zákon, vztlak, ohřev, odpor, vítr; příklady s čísly |
| 04 | [Fyzika v kódu](04-simulace-v-kodu.md) | jak se rovnice přepíšou do `PhysicsEngine`, `WindModel`, přistání a skóre |
| 05 | [Architektura aplikace](05-architektura.md) | adresáře, moduly, závislosti, vzory, tok dat |
| 06 | [Herní smyčka a herní fáze](06-herni-smycka-a-faze.md) | `requestAnimationFrame`, pevný krok, automat stavů, fáze hry |
| 07 | [Vykreslování](07-vykreslovani.md) | Three.js, scéna, kamera, materiály, shadery, deformace pláště, plamen |
| 08 | [Svět a procedurální terén](08-svet-a-teren.md) | šum, seed, biomy, lokality, kolize, mapa |
| 09 | [Design systém a vzhled rozhraní](09-design-system.md) | barvy, písmo, komponenty, logo, CSS |
| 10 | [Uživatelské rozhraní a vstupy](10-uzivatelske-rozhrani.md) | DOM nad canvasem, HUD, ovládání, i18n, `localStorage` |
| 11 | [Zvuk](11-zvuk.md) | WebAudio, syntéza šumu, hudba, pravidla prohlížečů |
| 12 | [Testování](12-testovani.md) | Vitest, co a jak testujeme, jak napsat vlastní test |
| 13 | [Jak projekt upravovat](13-jak-upravovat.md) | návody: změna konstant, nová lokalita, nový vzor pláště, nový jazyk, nová fáze |
| 14 | [Cvičení a projekty](14-cviceni-a-projekty.md) | úlohy z fyziky a z programování podle obtížnosti |
| 15 | [Slovník pojmů](15-slovnik.md) | balonářské, fyzikální a programátorské pojmy |

---

## Doporučené pořadí učení

```
01 Úvod ──► 02 Spuštění ──► zahrajte si hru ──► 03 Fyzika ──► 04 Fyzika v kódu
                                                                   │
        ┌──────────────────────────────────────────────────────────┘
        ▼
05 Architektura ──► 06 Smyčka a fáze ──► 07 Vykreslování ──► 08 Svět
        │
        ▼
09 Design ──► 10 UI ──► 11 Zvuk ──► 12 Testy ──► 13 Úpravy ──► 14 Cvičení
```

Doporučujeme si nejdřív **hru opravdu zahrát** (alespoň jeden celý let), a teprve potom číst o tom,
jak funguje. Řada věcí (zpoždění mezi zážehem a stoupáním, vliv větru, odlišnost rána a večera) se
mnohem lépe chápe, když je člověk zažil.

---

## Jak se v dokumentaci orientovat

- Cesty k souborům jsou psané od kořene projektu, např. `src/core/PhysicsEngine.js`.
- Bloky kódu jsou **zjednodušené výňatky**; vždy je u nich uvedeno, ve kterém souboru je najdete
  celé. Kód se může časem vyvíjet, proto při práci otevřete skutečný soubor.
- Rámečky s označením **Zkuste to** jsou krátké pokusy, které můžete udělat hned.
- Rámečky **Pozor** upozorňují na typické chyby.
- Kapitola 15 vysvětluje všechny odborné pojmy; neznámé slovo hledejte tam.

---

## Poznámky pro učitele

- **Časová dotace** (orientačně): úvod a spuštění 1 hodina, fyzika 2–3 hodiny, architektura a herní
  smyčka 2 hodiny, vykreslování 2 hodiny, samostatný projekt (kapitola 14) 4–10 hodin.
- **Předpoklady žáků:** základy JavaScriptu (proměnné, funkce, pole, objekty, třídy) a základy
  středoškolské fyziky (síla, hustota, tlak, teplota). Vše ostatní je v textu vysvětleno.
- **Mezipředmětové vazby:** fyzika (mechanika, termika, mechanika tekutin), matematika (vektory,
  goniometrie, interpolace, náhodná čísla), informatika (programování, algoritmy, struktury, testování),
  zeměpis (mapa, azimut, vítr), angličtina (rozhraní je česky i anglicky).
- Všechny úlohy v kapitole 14 mají uvedenou obtížnost a očekávaný výsledek, takže je lze zadávat
  samostatně nebo ve skupinách.
- Projekt neobsahuje žádný server ani databázi; vše běží v prohlížeči žáka, nic se neodesílá.

---

## Verze a stav dokumentace

Dokumentace odpovídá stavu projektu **HotAirSim 0.1.0** (Three.js 0.186, Vite 8, Vitest 5).
Při větších změnách kódu (zejména konstant ve `src/config/GameConfig.js`, struktury adresářů
a fyzikálních vzorců) prosím upravte i příslušné kapitoly.
