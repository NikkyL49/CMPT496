# CMPT496

## CSV analysis sample

The existing command-line JavaScript script profiles the drug-monograph CSV and can search its brand names and ingredient fields. It reports the CSV dimensions, missing/distinct values for key fields, rows with inconsistent field counts, exact duplicate rows, repeated product identifiers/brand names, and adverse-event MedDRA mapping information. Search results include the company and both raw and MedDRA adverse-event fields.

### Requirements

- Node.js 18 or newer
- npm

### Run it

Open a terminal in this project folder and run:

```sh
npm install
npm run analyze
```

To also search for a drug or ingredient, pass a search term after `--`:

```sh
npm run analyze -- amlodipine
```

## Compare Drugs prototype

A small TypeScript/Express backend and plain HTML page demonstrate comparing adverse-event terms from two selected products. The comparison trims whitespace and matches terms case-insensitively; it does not use MedDRA mapping or NLP.

Build and start the server:

```sh
npm install
npm run build
npm start
```

Then open <http://localhost:3000>. The page lets you choose a product from the suggestions or type a product ID, brand, or ingredient. The API is available at `GET /api/drugs` and `POST /api/compare` (JSON body: `{ "drugA": "...", "drugB": "..." }`).

The server reads the same CSV beside `analyze-data.mjs`; keep the CSV filename unchanged or update the path in the relevant script. The analysis tool remains available with `npm run analyze`. Both tools are prototypes using source-monograph information, not medical advice.

