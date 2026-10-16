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
| `#/search?q=...`     | Search results   | Done: filters, sorting, save toggle, placeholder data |
| `#/login`            | Log in           | Done: validation and wrong-credential errors, using mock auth |
| `#/signup`           | Create account   | Done: password strength meter, role picker and duplicate-email error, using mock auth |
| `#/forgot-password`  | Forgot password  | Done: request a reset link (mock shows the link on screen instead of emailing it) |
| `#/reset-password?token=...` | Reset password | Done: new password + confirm; links expire after 30 min and work once |
| `#/saved`            | Saved drugs      | Done: remove with undo, Export CSV, Share link (`#/saved?shared=...`), list kept in the browser |
| `#/settings`         | Settings         | Done (log in first): change info, default role, landing page, email notification switches, change password, export my data (JSON), delete account |
| `#/compare?ids=...`  | Compare          | Done: pick up to 6 products (bubbles, Add More search, same-family suggestions), Show differences only, Tables tab, Tables tab (with an adverse-event term grid), Graphs tab (term-overlap chart and monograph timeline). Uses the real datasets |
| other `#/...`        | Coming soon      | Placeholder for pages not built yet: monograph detail, Discovery, Interaction check, Inconsistency report |

## Project structure

```
CMPT496-housekeeping-filestructure/
├── README.md
└── frontend/                 React 19 + Vite
    ├── scripts/
    │   ├── csv.mjs                   CSV parser shared by the build scripts
    │   ├── build-adverse-events.mjs  Makes adverse_event_terms.json from the MedDRA CSV
    │   └── build-safety-sections.mjs Makes safety_sections.json from the MedDRA CSV
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
        │   └── ComingSoon.jsx  Placeholder for unbuilt pages
        ├── data/             Data files (mostly placeholders until the API exists)
        │   ├── drug_monographs_dates.json  Real monograph dates (1,434 entries)
        │   ├── monographs.js Cleans that file and groups it into products
        │   ├── adverse_event_terms.json    MedDRA adverse-event terms per monograph (generated)
        │   ├── adverseEvents.js  Loads that file on demand
        │   ├── safety_sections.json        Organ categories per safety section, per monograph (generated)
        │   ├── safetySections.js Loads that file on demand; section colours
        │   ├── overview.js
        │   ├── search.js
        │   ├── roles.js      The four user roles (header + sign-up)
        │   ├── auth.js       Mock auth + account settings — swap for real API calls
        │   ├── session.js    Logged-in user, header role, search history
        │   └── saved.js      Saved drugs list (shared by Search + Saved)
        ├── utils/
        │   ├── validation.js Email check + password strength scoring
        │   ├── store.js      Tiny shared-state store (useStore hook)
        │   ├── dates.js      Date maths for the timeline
        │   ├── termOverlap.js  Splits terms into shared / only-this / missing
        │   ├── chartColors.js Colours for drug families in charts
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
- **Search and Saved still use the 7 sample drugs** in `data/search.js`, not the dates dataset. Once there's an API, all three pages should read from the same product list.
- **Compare's table only shows rows the dataset has** (company, strengths, dates). The hi-fi design's adverse-event, contraindication and pregnancy rows need monograph content from the backend. The cell colours are already set up for them (`safety: true` rows tint pink when they differ).
- **Timeline colours** come from `utils/chartColors.js`: blue, aqua and violet, checked to be colour-blind safe. Red, orange and yellow are kept for severity only. A fourth drug family and beyond share grey ("Other families").
- On the Search page, the severity filter shows only tags at the chosen levels and hides products with none. This behaviour is an assumption and needs team confirmation.
- **Logo files** are in `frontend/src/assets`: `logo-mark.png` (the capsule icon, used in the header) and `logo-full.png` (icon plus the MonoByte wordmark). Both have transparent backgrounds. The browser-tab icon is `frontend/public/favicon.png`.

> Information only, not medical advice. Always confirm against the official Health Canada monograph.
