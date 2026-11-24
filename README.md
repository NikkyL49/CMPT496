# CMPT496 — MonoByte

MonoByte puts Canadian drug monographs (Health Canada product labels, coded with MedDRA v27) in one place. You can search drugs, read each monograph in plain sections, compare brands, check drugs against each other, and see where labels disagree.

> Information only, not medical advice. Always confirm against the official Health Canada monograph.

## Run it locally

You need **Node.js 20.19+ or 22.12+**.

**1. Backend** (Express + MongoDB, port 5001)

```bash
cd backend
cp .env.example .env    # then fill in MONGO_URI and JWT_SECRET (see the comments in the file)
npm install
npm run dev
```

**2. Frontend** (React 19 + Vite, port 5173), in a second terminal

```bash
cd frontend
npm install
npm run dev             # open http://localhost:5173
```

The frontend sends `/api/...` requests to the backend through the Vite proxy (`frontend/vite.config.js`).

| Command (in `frontend/`) | What it does |
| --- | --- |
| `npm run build` | Production build into `frontend/dist` |
| `npm run preview` | Serve that build locally |
| `npm run lint` | Run ESLint |

### Environment variables (`backend/.env`)

| Variable | Needed | What it's for |
| --- | --- | --- |
| `MONGO_URI`, `DB_NAME` | Yes | MongoDB Atlas connection, and the database for users and saved drugs |
| `JWT_SECRET` | Yes | Signs the login cookie (any long random string) |
| `DRUG_DB_NAME`, `DRUG_COLLECTION` | Optional | Where the monograph data lives in MongoDB (defaults: `ByteRX`, `Drug Monograph Data`) |
| `APP_URL`, `SMTP_*`, `EMAIL_FROM` | Production | Password-reset emails. Locally, leave `SMTP_HOST` empty and the Forgot password page shows a "Demo only" link instead |
| `PORT`, `NODE_ENV` | Optional | Defaults: `5001`, `development` |

Never commit `.env`.

## Roles and pages

People pick a role when they sign up, and **it can't be changed afterwards**. The header and Settings only show it, and the backend refuses a change. To change someone's role, edit `defaultRole` on their user in MongoDB. Logged out counts as General Public.

| Page | URL | General Public | Pharmacist / Physician | Researcher |
| --- | --- | --- | --- | --- |
| Home, Search, Drug page, Saved, Discovery, Settings | `#/`, `#/search`, `#/drug/<id>`, … | ✓ | ✓ | ✓ |
| Compare | `#/compare?ids=…` | | ✓ | ✓ |
| Interaction check | `#/interactions?drugs=…` | | ✓ | ✓ |
| Analysis | `#/analysis` | | | ✓ |
| Inconsistency report | `#/inconsistency`, `#/inconsistency/<ingredient>` | | | ✓ |

The page rules live in `frontend/src/data/access.js`. Hiding a page in the browser isn't security on its own, so private data must also be checked by the backend. `/api/analysis` (analysis data) and `/api/reviews` (Inconsistency report status) are for researchers only (`requireRole("Researcher")`).

## Project structure

```
CMPT496/
├── backend/                Express API
│   ├── src/
│   │   ├── server.js       Routes are mounted here
│   │   ├── routes/         auth, users, saved, monographs, analysis, reviews
│   │   ├── controllers/    Route logic
│   │   ├── middleware/     requireAuth, requireRole, rate limits
│   │   ├── models/         User accounts, Inconsistency report reviews (MongoDB)
│   │   └── utils/          Auth cookie, email, CSV fallback
│   ├── data/
│   │   ├── canadian_drug_monographs_all_applicable_meddra_v27.csv
│   │   └── analysis/       Analysis results served to researchers
│   └── scripts/build-layer1.mjs
├── frontend/               React + Vite website
│   ├── scripts/            Build the data files from the CSV (see Data)
│   └── src/
│       ├── App.jsx         Hash router: #/path → page
│       ├── global.css      Design tokens and shared classes
│       ├── pages/          One file (+ .css) per page; pages/drug/ = drug page tabs
│       ├── components/     Header, SearchBox, charts, …
│       ├── data/           Data files and the code that reads them
│       └── utils/          Shared helpers (store, comparisons, downloads)
└── analysis/               Google Sheets exports (csv/) → JSON (convert.js)
```

## Data

Everything comes from `canadian_drug_monographs_all_applicable_meddra_v27.csv`. Rebuild these files whenever the CSV changes:

| Output | Used by | Rebuild with |
| --- | --- | --- |
| `frontend/src/data/drug_details.json` | Search, drug page, interaction check | `node scripts/build-drug-details.mjs <csv> <pdf_links_cache.json>` (in `frontend/`) |
| `frontend/src/data/adverse_event_terms.json` | Search, drug page, Compare, Inconsistency report | `node scripts/build-adverse-events.mjs <csv>` (in `frontend/`) |
| `frontend/src/data/safety_sections.json` | Safety sunburst on Compare | `node scripts/build-safety-sections.mjs <csv>` (in `frontend/`) |
| `backend/data/analysis/layer1_concordance.json` | Inconsistency report (Manufacturer agreement) | `npm run build:layer1` (in `backend/`) |
| `backend/data/analysis/analysis*.json` | Analysis page | Export the Google Sheets tabs to `analysis/csv/`, then `node convert.js` (in `analysis/`) |

`node scripts/list-link-review.mjs` (in `frontend/`) writes `link_review.csv`, a checklist of monograph links that may point to the wrong PDF.

## How the analyses work

- **Comparing brands** (`frontend/src/utils/ingredientGroup.js`): the drug page, Search, the Inconsistency report and the Manufacturer agreement card all use the same rules.
  - A side effect is *common* when **more than half** of an ingredient's brands list it.
  - A brand whose list is under **20%** of the other brands' typical length is a **possible data gap** and is left out.
  - Fewer than **3** brands to compare is **low confidence**.
- **"Inconsistency flagged" in Search:** a product leaves out 20 or more common side effects (`FLAG_THRESHOLD` in `data/catalog.js`).
- **Brand divergence** (0–10, Inconsistency report) measures how differently an ingredient's brands list side effects; higher = more disagreement. High is 6.0 and up, medium 3.0–5.9, low under 3.0. Review status (Open → Reviewed → Resolved) and flags are saved in MongoDB (`reviews` collection) with who changed them, so every researcher sees the same status.
- **Manufacturer agreement** (0–1, higher = more agreement; "Layer 1" in the analysis workbook): a card on the drug page's Graphs tab, plus the full analysis on each Inconsistency report page (term overlap, guidance agreement, manufacturer flags). It reproduces the team's Analysis 1 workbook; the method is described at the top of `backend/scripts/build-layer1.mjs`.
- **Interaction check:** the data has no severity ratings. Pairs are graded by how the monographs document them (named on both labels, on one label, or by drug class only), not by clinical severity. Drug-class phrases are matched by `CLASS_PATTERNS` in `data/interactions.js`.

## Known issues

- Anyone can choose "Researcher" at sign-up; there's no verification yet.
- `CLASS_PATTERNS` (interaction check) still needs a pharmacist to review it.
- 34 companies appear under two spellings (e.g. "Sanis Health Inc" and "Sanis Health Inc."), so Manufacturer agreement counts them as separate manufacturers.
- 454 monograph links need a manual check (213 low-confidence PDF matches, 320 monographs sharing a DIN). The drug page's Source tab warns about them.

## Styling

- Use the variables and shared classes in `global.css` (colours, type, `.btn-*`, `.pill-*`, `.badge-*`, `.input`, …) before writing new ones.
- Each page has its own CSS file. Prefix its classes with the page name (e.g. `.search-page`), because Vite bundles all CSS together.
- Severity colours have a fixed meaning: `hi` red = severe, `md` orange = moderate, `lo` yellow = mild. Don't use them for anything else.
