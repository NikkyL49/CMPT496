# CMPT496

## First CSV analysis sample

The command-line JavaScript script profiles the drug-monograph CSV and can search its brand names and ingredient fields. It reports the CSV dimensions, missing/distinct values for key fields, rows with inconsistent field counts, exact duplicate rows, repeated product identifiers/brand names, and adverse-event MedDRA mapping information. Search results include the company and both raw and MedDRA adverse-event fields.

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

The script reads the CSV beside the script, so keep the CSV filename unchanged or update the path in `analyze-data.mjs`. It is an analysis/search prototype only; it does not start a website or provide medical advice.

