# Pláště balonů (galerie)

Sem patří obrázky pláště balonů (např. školní balon, balony od partnerů). Hra je při startu načte a nabídne
v plánování letu v kartě **Balon** jako jediná nabídka. Pokud je `manifest.json` prázdný, použije se jeden nouzový výchozí vzor.

## Jak přidat balon

1. Připravte obrázek pláště (viz požadavky níže) a uložte ho do této složky, např. `barevnak.webp`.
2. Přidejte položku do `manifest.json`:

```json
{
  "balloons": [
    {
      "id": "barevnak",
      "name": { "cs": "Barevňák", "en": "Barevňák" },
      "file": "barevnak.webp"
    },
    {
      "id": "kostky",
      "name": { "cs": "Červené kostky", "en": "Red Checks" },
      "file": "kostky.png"
    }
  ]
}
```

- `id` – krátký unikátní identifikátor (malá písmena, čísla, pomlčka).
- `name` – název balonu česky a anglicky (zobrazí se v nabídce a na diplomu). Stačí i prostý text: `"name": "Barevňák"`.
- `file` – název souboru v této složce.
- **První balon v seznamu je výchozí.**

`manifest.json` ukládejte v kódování **UTF-8** (kvůli diakritice v názvech).

Po uložení stačí obnovit stránku (v produkci nahrát soubory na hosting spolu s `dist/`).

## Požadavky na obrázek

- Formát **WebP** nebo **PNG** (JPEG také funguje). Doporučená velikost **1024 × 512 px**, poměr **2 : 1**
  (jiný poměr se ořízne na střed). Pro rychlé načítání na mobilu ideálně do ~500 kB.
- Obrázek se obtáčí kolem pláště:
  - **vodorovně** = celý obvod, **levý a pravý okraj na sebe navazují**;
  - **nahoře** = vrchlík balonu, **dole** = ústí (u hořáku);
  - logo doporučujeme na **25 %** a **75 %** šířky (zepředu i zezadu), ve výšce uprostřed.
- Okraje (vrchlík a ústí) se při mapování stahují do bodu, důležité prvky dejte spíš doprostřed.
- **Šablonu** si stáhnete přímo ve hře: plánování letu → Plášť balonu → „Stáhnout šablonu“. Je na ní mřížka 32 výsečí a vyznačená místa pro logo.

Tip: nejjednodušší je vyfotit/vykreslit balon v plochém „rozvinutém“ pohledu (jako obtisk), případně vytvořit 32 výsečí vedle sebe.
