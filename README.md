# CMPT496 — MonoByte

MonoByte puts every Canadian drug monograph in one place. You can search by drug, ingredient or condition, and the serious warnings, contraindications and adverse events show up first. It uses Health Canada monograph data coded with MedDRA terms.

This repo holds the capstone project. Right now that's the React frontend. All data is placeholder data until the backend API exists.

## Getting started

You need Node.js 20.19+ or 22.12+ (Vite 8 requires one of these).

```bash
cd frontend
npm install
npm run dev       # start the dev server (http://localhost:5173)
```

Demo login (mock auth): **demo@monobyte.ca** / **Monobyte1!**. Accounts you create on the sign-up page also work until you reload the page. Reloading also logs you out.

Other scripts:

| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run build`   | Production build into `frontend/dist` |
| `npm run preview` | Serve the production build locally    |
| `npm run lint`    | Run ESLint                            |

## Pages

The app uses a small hash router in `App.jsx`, so there are no routing dependencies. Pages are linked with `#/...` URLs.

| URL                  | Page             | Status |
| -------------------- | ---------------- | ------ |
| `#/`                 | Overview (home)  | Done, placeholder data |
| `#/search?q=...&by=...` | Search results | Done: all 565 products from the MedDRA CSV. Searches brand, ingredient, company, condition, contraindication, drug class and DIN. `by` = `ingredient`, `condition`, `contraindication` or `class` limits it to one category. Filters for drug class, active ingredient, company and pregnancy advice; 20 results per page |
| `#/login`            | Log in           | Done: validation and wrong-credential errors, using mock auth |
| `#/signup`           | Create account   | Done: password strength meter, role picker and duplicate-email error, using mock auth |
| `#/forgot-password`  | Forgot password  | Done: request a reset link (mock shows the link on screen instead of emailing it) |
| `#/reset-password?token=...` | Reset password | Done: new password + confirm; links expire after 30 min and work once |
| `#/saved`            | Saved drugs      | Done: remove with undo, Export CSV, Share link (`#/saved?shared=...`), list kept in the browser |
| `#/settings`         | Settings         | Done (log in first): change info, default role, landing page, email notification switches, change password, export my data (JSON), delete account |
| `#/compare?ids=...`  | Compare          | Done: pick up to 6 products (bubbles, Add More search, same-family suggestions), Show differences only, Tables tab (with an adverse-event term grid), Graphs tab (term-overlap chart and monograph timeline). Uses the real datasets |
| `#/drug/<id>?s=...&tab=...` | Drug overview | Done: warnings, contraindications and same-ingredient banners; tabs for Overview, Adverse events, Conflicts, Graphs, Alternatives and Research papers (DIN, Health Canada link, PDF). Uses the MedDRA CSV. `s` = strength, `tab` = open tab |
| `#/discovery`        | Discovery        | Explore by category |
| `#/analysis`         | Analysis         | Researchers only. Charts across the whole dataset |
| `#/inconsistency`    | Inconsistency report | Researchers only. Coming soon |
| other `#/...`        | Coming soon      | Placeholder for pages not built yet: Interaction check |

### Who can see what

| Role | Pages |
| ---- | ----- |
| General Public (or logged out) | Home, Search, Drug overview, Saved, Discovery, Settings |
| Pharmacist, Physician | Everything except Analysis and the Inconsistency report |
| Researcher | Everything |

The rules live in `frontend/src/data/access.js` (`RESTRICTED`). The role comes from the logged-in account (`defaultRole`); logged out counts as General Public. The header's Role dropdown only offers the account's own role and the roles below it, so a researcher can preview the public view but a pharmacist can't switch to Researcher. Opening a page your role can't use shows a "Restricted" page (log in, or switch back to your role). Nav links and buttons that lead to those pages (Compare, Add to interaction check, Check interactions, Compare with this, the Inconsistency Report card) are hidden or locked.

This only hides pages in the browser. Data that must stay private (e.g. the analysis data) also has to be protected by the backend, and right now users pick their own role at sign-up and in Settings.

## Project structure

```
CMPT496-housekeeping-filestructure/
├── README.md
└── frontend/                 React 19 + Vite
    ├── scripts/
    │   ├── build-adverse-events.mjs  Makes adverse_event_terms.json from the MedDRA CSV
    │   ├── build-drug-details.mjs    Makes drug_details.json from the CSV + pdf_links_cache.json
    │   ├── build-safety-sections.mjs Makes safety_sections.json from the MedDRA CSV
    │   └── lib/csv.mjs               CSV reader shared by the build scripts
    ├── index.html
    ├── package.json
    └── src/
        ├── main.jsx          Entry point; imports global.css
        ├── App.jsx           Hash router and page switch
        ├── global.css        Design tokens and shared components
        ├── components/
        │   ├── Header.jsx    Top nav, role selector, log-in / account links
        │   ├── Header.css
        │   ├── PasswordStrength.jsx  Strength meter (sign-up, reset, settings)
        │   ├── Switch.jsx    On/off toggle
        │   ├── SearchBox.jsx / .css  Search box with suggestions + "By …" buttons (home + Search)
        │   ├── ProductPicker.jsx     "+ Add More" search on Compare
        │   ├── CompareTimeline.jsx / .css  Timeline graph on Compare
        │   ├── AdverseEventGrid.jsx / .css Which MedDRA terms each product lists (Tables tab)
        │   ├── TermOverlapChart.jsx / .css Stacked bars of shared/missing terms (Graphs tab)
        │   └── SafetySunburst.jsx / .css   Zoomable d3 sunburst of safety sections (Graphs tab)
        ├── pages/
        │   ├── Overview.jsx / .css
        │   ├── Search.jsx   / .css
        │   ├── Login.jsx
        │   ├── Signup.jsx
        │   ├── ForgotPassword.jsx
        │   ├── ResetPassword.jsx
        │   ├── Auth.css      Shared by all auth pages
        │   ├── Saved.jsx    / .css
        │   ├── Settings.jsx / .css
        │   ├── Compare.jsx  / .css
        │   ├── Drug.jsx     / .css  Drug overview page (header, banners, tabs)
        │   ├── drug/        One file per tab + parts.jsx (shared badges/chips)
        │   ├── Restricted.jsx  Shown when your role can't open a page
        │   └── ComingSoon.jsx  Placeholder for unbuilt pages
        ├── data/             Data files (mostly placeholders until the API exists)
        │   ├── drug_monographs_dates.json  Real monograph dates (1,434 entries)
        │   ├── monographs.js Cleans that file and groups it into products
        │   ├── adverse_event_terms.json    MedDRA adverse-event terms per monograph (generated)
        │   ├── adverseEvents.js  Loads that file on demand
        │   ├── safety_sections.json        Organ categories per safety section, per monograph (generated)
        │   ├── safetySections.js Loads that file on demand; section colours
        │   ├── drug_details.json     Monograph content + DIN/links per monograph (generated)
        │   ├── drugDetails.js    Loads that file on demand; recommendation helpers
        │   ├── catalog.js    Search records, matching and suggestions for every product
        │   ├── drugClasses.js  Drug class for each of the 60 ingredients (not in the CSV)
        │   ├── overview.js
        │   ├── search.js
        │   ├── roles.js      The four user roles (header + sign-up)
        │   ├── access.js     Which roles can open which pages; useRole(), useCan()
        │   ├── auth.js       Mock auth + account settings — swap for real API calls
        │   ├── session.js    Logged-in user, header role, search history
        │   └── saved.js      Saved drugs list (shared by Search + Saved)
        ├── utils/
        │   ├── validation.js Email check + password strength scoring
        │   ├── store.js      Tiny shared-state store (useStore hook)
        │   ├── dates.js      Date maths for the timeline
        │   ├── termOverlap.js  Splits terms into shared / only-this / missing
        │   ├── chartColors.js Colours for drug families in charts
        │   ├── ingredientGroup.js  Other brands of the same ingredient; same-ingredient flag
        │   ├── links.js      drugHref() and drugHrefForBrand() for linking to drug pages
        │   └── download.js   File download + CSV helpers
        └── assets/           logo-mark.png (header), logo-full.png
```

## Styling conventions

- **Use `global.css` first.** It holds the MonoByte "Broadsheet" design tokens as CSS variables:
  - colours: `--color-*`, `--accent-100…900`, `--cream-100…400`, `--severity-hi|md|lo` and their `-ground` and `-ink` versions
  - the Source Serif 4 type ramp: `--text-hero`, `--text-h1…h3`, `--text-body`, `--text-kicker`

  Use these variables instead of hardcoded colours or fonts.
- **Shared component classes live in `global.css` too:**
  - `.btn-primary`, `.btn-secondary`, `.btn-block`, `.btn-danger`, `.btn-danger-outline`
  - `.pill` with `.pill-flag`, `.pill-severity-md|lo`, `.pill-action`, `.pill-quiet`
  - `.switch` (use the `Switch` component)
  - `.form-alert`, `.form-success`, `.link-button`
  - `.search-box`
  - `.badge` and `.badge-solid-hi|md|lo`
  - `.field`, `.input`, `.field-error`
  - `.kicker`

  Reuse them before writing new ones.
- **Each page gets its own CSS file** (`pages/Name.css`) for layout specific to that page. Vite bundles all CSS globally, so prefix page classes (e.g. `.search-page`, `.auth-form`) to avoid clashes.
- **Severity colours mean something.** Use `hi` (red) for severe or major, `md` (orange) for moderate, and `lo` (yellow) for mild or minor.

## Notes and TODOs

- `TODO` comments mark the places that still need a real API: search, and the reset email.
- **Auth is mocked** in `data/auth.js`. Accounts are held in memory, and passwords are compared as plain text. That's fine for a demo, but the real backend has to hash passwords and handle sessions. To connect it, replace the bodies of `login()`, `signup()`, `requestPasswordReset()` and `resetPassword()`. The real `requestPasswordReset()` must email the link and **not** return the token. Only the mock returns it, so the page can show a "Demo only" link. The pages already handle loading states and show any error thrown as an `AuthError`.
- **Shared state** uses the small store in `utils/store.js`. Any component that calls `useStore(sessionStore)` or `useStore(savedStore)` updates when that data changes. That's how the Save button on Search, the Saved page and the header count stay in sync.
- **Saved drugs are kept in the browser** (localStorage), so they survive a reload but aren't tied to an account yet. A first visit starts with the three drugs from the mockup. Once the backend exists, load and save the list per user through the API instead (see `data/saved.js`).
- **Settings needs a login.** Changes are saved straight away, like the mockup, except name/email (Change Info) and password, which have their own Save buttons. Deleting an account asks for the password, and then clears the saved list.
- The mockup's danger-zone text also mentions *deactivating* an account. Only delete is built; deactivate needs a decision on how it should work.
- **Compare uses `drug_monographs_dates.json`.** `data/monographs.js` cleans it when the app loads:
  - **Dates:** spreadsheet date numbers like `45180` and dates such as "November 28, 2019" are converted. "No date available", "NO INFORMATION" and "EXTRACTION_FAILED" count as missing.
  - **Products:** strengths of the same brand and company are merged into one product (e.g. ACH-AMLODIPINE 2.5/5/10 mg), which turns 1,434 entries into 565 products. One exact duplicate (PMS-QUINAPRIL 10mg) is dropped.
  - **Drug family:** worked out from the name. Manufacturer prefixes like APO-, TEVA- and ACH- are removed, and brand names are looked up in `BRAND_INGREDIENT` (e.g. NORVASC → Amlodipine). Add new brands to that list.
  - **Data issues to fix at the source:**
    - 4 products have a revision date earlier than their authorization date. The timeline greys these out and warns about them.
    - Some entries are named only by company, with no drug name (e.g. "Apotex 500mg", "Teva 250mg5ml suspension"), so they can't be grouped properly.
- **Adverse-event views on Compare.**
  - **Graphs tab:** a stacked bar per product. Every bar has the same length (all terms listed by any selected product). It's split into *shared by all*, *shared with some*, *only this product* and a hatched *missing* part. Hovering a segment shows its terms, and clicking it opens the term grid on the Tables tab, filtered to those terms. The bar colours are one blue ramp, checked with the dataviz validator.
  - **Tables tab:** the term grid, one row per term, where a filled dot means listed.

  Both use `src/data/adverse_event_terms.json`. That file is generated from the full MedDRA CSV (16.8 MB, 55 columns), keeping only what these views need: each monograph's ID and its MedDRA preferred terms. To rebuild it after the CSV changes:

  ```bash
  cd frontend
  node scripts/build-adverse-events.mjs path/to/canadian_drug_monographs_all_applicable_meddra_v27.csv
  ```

  - **Format:** each term string is stored once, and each monograph points to its terms by number. The file is 0.5 MB (48 KB compressed), and it only downloads when someone opens Compare.
  - **Merging:** a product's strengths are combined. The CSV lists PMS-QUINAPRIL 10mg twice with different terms, so the two lists are merged.
  - **Banner:** "X of Y MedDRA terms not reported consistently" only appears when every product is the same drug. Different drugs are supposed to list different terms.
- **Safety sunburst on Compare (Graphs tab).** A zoomable [d3](https://d3js.org) sunburst: products → safety sections (adverse events, contraindications, warnings, pregnancy, breastfeeding) → the MedDRA organ categories each section mentions. Click a slice to zoom in, and the centre or the breadcrumb to zoom out. Arcs work with the keyboard (Tab, then Enter), and "Show as a table" lists the same data.
  - Each organ category counts as 1, so a section's size is how many categories it covers, not how many terms.
  - The CSV doesn't say which category each term belongs to (see below), so terms can't be the outer ring yet. Once the source data pairs each term with its category, add them as a fourth level in `buildTree()`.
  - Section colours are in `data/safetySections.js`, checked with the dataviz validator.
  - The data comes from `src/data/safety_sections.json`. To rebuild it: `node scripts/build-safety-sections.mjs path/to/the.csv`. The script skips rows with broken quoting. The Google Sheets export of the CSV has 18 of them, so 8 strengths currently have no sunburst data.
  - **Not in the CSV:** a severity rating for each adverse event. The CSV's term list and organ-category list also aren't matched up term by term, so the design's organ-category pie chart can't be built from it yet.
- **The drug overview page** (`#/drug/...`) reads `src/data/drug_details.json`. That file is generated from the MedDRA CSV plus `pdf_links_cache.json`, keeping only the columns the page shows. Pharmacokinetics, Pharmacodynamics and the raw adverse-event text are left out, because they're most of the CSV's size and aren't on the page yet. To rebuild it:

  ```bash
  cd frontend
  node scripts/build-drug-details.mjs path/to/canadian_drug_monographs_all_applicable_meddra_v27.csv path/to/pdf_links_cache.json
  ```

  - **Size:** 2.7 MB (≈250 KB compressed). It only downloads when someone opens a drug page.
  - **Research papers tab:** one card per strength, each showing its DIN. The link is the Health Canada Drug Product Database page (`dpd_info_url`), and Open/Download PDF use `pdf_url`. "Download" opens the PDF in a new tab, because browsers block downloading files straight from other websites.
  - **DIN warnings:** the links were matched automatically. 213 monographs have a match score below 0.8, and 138 DINs are attached to more than one monograph, often at a 1.0 score. For example, AG-AMLODIPINE and Angita's plain AMLODIPINE share DINs, and PRO-ENALAPRIL 2.5/10/20 mg all got the 5 mg DIN. The tab shows a warning in both cases. The matching should be fixed in the pipeline that makes `pdf_links_cache.json`.
  - **Same-ingredient flag:** compares this monograph's adverse-event terms with the other brands that have the same "Normalized Active Ingredient". It counts the terms that 75% or more of them list but this one doesn't, and the terms this one lists that 25% or fewer of them do.
  - **Graphs tab:** adverse-event term counts per brand of the same ingredient, and whether those brands agree on pregnancy, breastfeeding, kidney and liver advice.
  - **Severity:** the CSV has no severity rating for adverse events, so their tags aren't colour-coded like in the mockup. Recommendations (pregnancy, kidney, …) do use the severity colours.
  - **Data issue:** NRA-AMLODIPINE lists only 9 adverse-event terms, while the other amlodipine brands list 82–100. That's probably an extraction problem.
- **Search box with suggestions** (`components/SearchBox.jsx`, on the home page and Search).
  - **Suggestions:** as you type, a dropdown lists the ingredients, conditions, contraindications and drug classes that have a word starting with what you typed. "ac" gives *Acute* myocardial infarction, Lactic *ac*idosis, *AC*E inhibitor, and so on. Each suggestion shows how many products it appears in.
  - **"By …" buttons:** with none selected, all four categories are suggested and searched. Click one to suggest and search only that category, and click it again to go back to all four. On the Search page, switching button re-runs the search.
  - **Picking a suggestion** searches for that exact term. For example, "Dihydropyridine calcium channel blocker" doesn't also bring back the *Non-*dihydropyridine ones. Pressing Enter on partial text searches more broadly, including drug names and DINs.
  - **Data loading:** on the home page, the data loads when you first click into the search box, not when the page opens.
- **Drug classes** aren't in the CSV, so `data/drugClasses.js` maps each of the 60 "Normalized Active Ingredient" values to its class or classes (combination products have more than one). That gives 26 classes. They're used for the "By drug class" search, the Drug class filter, and the drug page's class line (e.g. "Amlodipine · Dihydropyridine calcium channel blocker"). Add new ingredients there when the data grows; anything missing shows as "Unclassified".
- **Search uses the real data now** (`data/catalog.js`). It doesn't wait for MongoDB: it builds one record per product from `drug_details.json` and `adverse_event_terms.json`, the same files the drug page loads.
  - **Searches:** brand name, active ingredient, company, indication, and a DIN (type the 8 digits).
  - **Filters:** Drug class, Active ingredient, Company, and Pregnancy advice (instead of adverse-effect severity, which isn't in the CSV).
  - **"Inconsistency flagged"** appears when a product leaves out at least `FLAG_THRESHOLD` (10) adverse-event terms that most other brands of the same ingredient list. That's 141 of 565 products. 448 miss at least one term, so a lower number would flag almost everything. It uses the same comparison as the drug page's same-ingredient banner, so the numbers match.
  - **TODO:** swap `useCatalog()` for a search API call when the backend is connected.
- **Saved** starts with three real products on a first visit. It still shows older saved sample drugs (`data/search.js`), linked to their real drug pages. `data/search.js` is now only used for that.
- **Compare's table only shows rows the dataset has** (company, strengths, dates). The hi-fi design's adverse-event, contraindication and pregnancy rows need monograph content from the backend. The cell colours are already set up for them (`safety: true` rows tint pink when they differ).
- **Timeline colours** come from `utils/chartColors.js`: blue, aqua and violet, checked to be colour-blind safe. Red, orange and yellow are kept for severity only. A fourth drug family and beyond share grey ("Other families").
- On the Search page, the severity filter shows only tags at the chosen levels and hides products with none. This behaviour is an assumption and needs team confirmation.
- **Logo files** are in `frontend/src/assets`: `logo-mark.png` (the capsule icon, used in the header) and `logo-full.png` (icon plus the MonoByte wordmark). Both have transparent backgrounds. The browser-tab icon is `frontend/public/favicon.png`.

> Information only, not medical advice. Always confirm against the official Health Canada monograph.
