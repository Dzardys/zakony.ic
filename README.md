# Skimo Lawbook React

Statická React/Vite aplikace pro GitHub Pages. Data načítá přímo z repozitáře:

`https://github.com/Dzardys/skimo-zakony`

## Co aplikace umí

- načítá zákony z GitHub repozitáře přes GitHub API,
- hledá soubory ve složkách `laws/`, `zakony/`, `data/`, `content/` nebo v rootu,
- podporuje Markdown soubory `.md`, `.markdown` a JSON soubory `.json`,
- parsuje YAML frontmatter metadata,
- zobrazuje seznam zákonů,
- vyhledává napříč názvem, číslem, paragrafy a obsahem,
- zobrazuje data novel/úprav,
- obsahuje detail zákona s kotvami na nadpisy/paragrafy,
- funguje čistě staticky na GitHub Pages.

## Instalace

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Výstup je ve složce `dist/`.

## Deploy na GitHub Pages

1. Vytvoř repozitář pro web, například `skimo-lawbook-web`.
2. Nahraj celý obsah tohoto projektu.
3. V GitHubu otevři **Settings → Pages**.
4. Jako Source nastav **GitHub Actions**.
5. Pushni do větve `main`.
6. Workflow `.github/workflows/deploy.yml` web automaticky sestaví a publikuje.

### Důležité pro projektovou GitHub Pages URL

Pokud web nebude na root adrese `https://uzivatel.github.io/`, ale například na:

`https://uzivatel.github.io/skimo-lawbook-web/`

uprav ve `vite.config.ts`:

```ts
base: '/skimo-lawbook-web/'
```

## Doporučená struktura datového repozitáře

V repozitáři `Dzardys/skimo-zakony` doporučuji vytvořit složku `laws/`:

```text
laws/
  14-2020-trestni-zakonik.md
  15-2020-obcansky-zakonik.md
```

Příklad zákona:

```md
---
id: "14-2020"
number: "14/2020"
title: "Trestní zákoník"
category: "Trestní právo"
effectiveFrom: "2020-12-15"
lastUpdated: "2023-11-15"
amendments:
  - date: "2022-05-20"
    title: "Novela zákona č. 83/2022"
  - date: "2022-07-24"
    title: "Novela zákona č. 91/2022"
status: "active"
---

# Zákon č. 14/2020

## Trestní zákoník

### Článek 1 - Trestné činy proti životu

#### §1 Vražda

Úmyslné usmrcení člověka.
```

## Formát JSON zákona

Alternativně lze použít JSON:

```json
{
  "id": "14-2020",
  "number": "14/2020",
  "title": "Trestní zákoník",
  "category": "Trestní právo",
  "effectiveFrom": "2020-12-15",
  "lastUpdated": "2023-11-15",
  "amendments": [
    { "date": "2022-05-20", "title": "Novela zákona č. 83/2022" }
  ],
  "content": "# Zákon č. 14/2020\n\n## Trestní zákoník\n\nText zákona..."
}
```

## Poznámka k limitům GitHub API

Bez přihlášení má GitHub API rate limit. Pro běžný web s malým provozem to stačí. Pokud by provoz narostl, je lepší v datovém repozitáři generovat `index.json` a načítat jen raw statický JSON soubor.
