# Bug report

Bugs found while setting up `aanu_v2`, adding the safety sunburst to Compare, and merging with `main` (Oct 16–20, 2026). For each bug: what went wrong, why, and what was done about it.

## Summary

| # | Bug | Area | Status |
| - | --- | ---- | ------ |
| 1 | `export.js` failed lint (8 errors) | Tooling | Fixed |
| 2 | `export.js` crashed on line 1 when run | MongoDB export | Fixed |
| 3 | `.env` (MongoDB password) wasn't gitignored | Security | Fixed |
| 4 | `export.js` missing its packages and `.env.example` | MongoDB export | Fixed |
| 5 | 18 broken rows in the Google Sheets export of the CSV | Data | Worked around; the source still needs fixing |
| 6 | Long section names cut off on sunburst slices | Sunburst UI | Fixed |
| 7 | Two copies of the CSV parser after the merge | Scripts | Fixed |
| 8 | Merge conflicts with `main` | Git | Fixed |
| 9 | 948 junk files showing in Source Control | Repo | Fixed |
| 10 | Couldn't delete or switch off `aanu_v1` | Git | Fixed |
| 11 | Main bundle over Vite's 500 KB warning | Build | Open (warning only) |
| 12 | Terms aren't linked to organ categories in the CSV | Data | Open (needs new data) |

## Fixed

### 1. `export.js` failed lint

- **Symptom:** `npm run lint` reported 8 errors in `frontend/export.js`, all saying `'require' is not defined` or `'process' is not defined`.
- **Cause:** `eslint.config.js` checked every `.js` file as browser code. `export.js` is a Node script, and browsers don't have `require` or `process`.
- **Fix:** added a block to `eslint.config.js` that lints `export.js` and `scripts/` as Node code.

### 2. `export.js` crashed when run

- **Symptom:** `node export.js` stopped on line 1 with `require is not defined in ES module scope`.
- **Cause:** `frontend/package.json` has `"type": "module"`, so Node runs every `.js` file as an ES module, and ES modules don't have `require()`.
- **Fix:** switched the script to `import`, matching the other scripts.

### 3. `.env` wasn't gitignored

- **Symptom:** none yet. This was a risk, not something that had gone wrong.
- **Cause:** `export.js` reads the MongoDB connection string, password included, from `frontend/.env`. `.gitignore` didn't list `.env`, so `git add -A` would have committed it and pushed it to GitHub.
- **Fix:** added `.env` to `frontend/.gitignore`. Also added `monographs.json`, the file the script writes.

### 4. `export.js` missing its packages and example file

- **Symptom:** the script needs the `mongodb` and `dotenv` packages, but neither was in `package.json`. Its error message says to copy `.env.example`, but that file didn't exist.
- **Cause:** both were left out when the script was added.
- **Fix:** added `mongodb` and `dotenv` as devDependencies, so they never end up in the website bundle. Added `frontend/.env.example` with placeholder values.
- **To run it:** copy `.env.example` to `.env`, fill in the real login, then run `node export.js` from `frontend/`. The database connection itself hasn't been tested, because no login was available.

### 5. Broken rows in the CSV

- **Symptom:** rebuilding the data from `canadian_drug_monographs_all_applicable_meddra_v27 - canadian_drug_monographs_all_applicable_meddra_v27.csv` (the Google Sheets export) gave bad output:
  - fake drug IDs such as `ons`, `ease` and `ointest"`;
  - the numbers `0` to `5` listed as organ categories;
  - adverse-event terms spilling into the MedDRA version field;
  - 8 real drug strengths losing all their adverse-event terms.
- **Cause:** 18 rows have broken quote marks. Each one cuts a row short and spills its remaining text into new fake rows, so their columns no longer line up. Some of the fake rows happen to have the right number of columns, so a column count can't catch them.
- **Fix:**
  - `scripts/build-safety-sections.mjs` skips any row whose `Record Key` isn't like `HCX-000001`, or whose organ-category columns contain anything other than the 27 official MedDRA categories. It prints the rows it skipped.
  - `adverse_event_terms.json` was not rebuilt from this CSV. It was built earlier from a cleaner copy.
- **Still open:** 8 strengths have no sunburst data, and the chart says so when one is selected:
  - Mantra 400mg 5ml
  - Apotex-250mg
  - JAMP CEPHALEXIN SUSPENSION 250mg 5ml
  - TEVA-CEPHALEXIN 250mg
  - PMS-QUINAPRIL 10mg
  - PMS-QUINAPRIL 40mg
  - PRO-LORAZEPAM 2mg
  - SANDOZ MOXIFLOXACIN 0.5%

  The quoting needs fixing where the CSV is produced. Then re-run `node scripts/build-safety-sections.mjs path/to/the.csv`.

### 6. Section names cut off on the sunburst

- **Symptom:** "Warnings & precautions" showed as "Warnings & precauti…" on its slice.
- **Cause:** slice labels are capped at 20 characters to fit the ring.
- **Fix:** each section in `data/safetySections.js` now has a short name for its slice ("Warnings"). The legend, tooltips and table still use the full name.

### 7. Two copies of the CSV parser

- **Symptom:** after merging with `main` there were two shared CSV parsers: `scripts/csv.mjs` (from `aanu_v2`) and `scripts/lib/csv.mjs` (from `main`).
- **Cause:** both branches moved the parser out of `build-adverse-events.mjs` at the same time.
- **Fix:** kept `main`'s `scripts/lib/csv.mjs`, added the `readCsv` and `splitList` helpers that `build-safety-sections.mjs` needs, and deleted `scripts/csv.mjs`. Rebuilding `safety_sections.json` afterwards gave a byte-identical file.

### 8. Merge conflicts with `main`

- **Symptom:** merging `aanu_v2` into `test_v1` (made from `main`) conflicted in three files:
  - `README.md`
  - `Compare.jsx`
  - `build-adverse-events.mjs`
- **Cause:** both branches edited the same lines. `main` added the drug page and search, and `aanu_v2` added the sunburst.
- **Fix:**
  - `README.md` and `Compare.jsx`: kept both sides.
  - `build-adverse-events.mjs`: kept `main`'s version (see bug 7).
- **Checked:** lint and the build pass. In a browser, the home page, search, drug page and sunburst all load with no errors.

### 9. 948 junk files in Source Control

- **Symptom:** VS Code listed 948 new files to commit.
- **Cause:** leftover `dist/` and `node_modules/` folders in the repo root, probably from an earlier backend setup. The root has no `.gitignore`, so Git showed every file in them.
- **Fix:** deleted both folders. They weren't tracked on any branch, and the root has no `package.json` that uses them.
- **Prevention:** if a backend is added at the root, give it a `.gitignore` covering `node_modules` and `dist`.

### 10. Couldn't delete or switch off `aanu_v1`

- **Symptom:** Git wouldn't delete `aanu_v1` or create a new branch.
- **Cause:** a merge of `main` into `aanu_v1` had been started and never finished. `README.md` was left with a conflict, and Git blocks switching branches until that's settled.
- **Fix:** aborted the merge with `git merge --abort`. Then made `aanu_v2` from an up-to-date `main` and deleted `aanu_v1`, both locally and on GitHub.

## Open

### 11. Main bundle over 500 KB

- **Symptom:** `npm run build` warns that `index-*.js` is over 500 KB.
- **Cause:** adding d3 for the sunburst added about 57 KB, which pushed the main bundle past Vite's warning size.
- **Impact:** none on correctness. It's a warning, and the build succeeds.
- **Possible fix:** load `SafetySunburst` with `React.lazy()` so d3 only downloads when someone opens Compare → Graphs.

### 12. Terms aren't linked to organ categories in the CSV

- **Symptom:** the sunburst's outer ring stops at organ categories. It can't go one level further to the individual adverse-event terms.
- **Cause:** for each section, the CSV has a list of terms and a separate list of organ categories, with nothing pairing a term with its category. Working the pairs out from the data only matched 230 of 1,355 terms.
- **Fix needed:** whoever generates the CSV, from the MedDRA dictionary, can add a column pairing each term with its category. Then add the terms as a fourth level in `buildTree()` in `SafetySunburst.jsx`.
