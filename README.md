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

Demo login (mock auth): **demo@monobyte.ca** / **Monobyte1!**. Accounts you create on the sign-up page also work until you reload the page.

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
| —                    | Monograph detail, Discovery, Compare, Interaction check, Saved, Inconsistency report, Profile | Not started (see the MonoByte design PDF) |

## Project structure

```
CMPT496-housekeeping-filestructure/
├── README.md
└── frontend/                 React 19 + Vite
    ├── index.html
    ├── package.json
    └── src/
        ├── main.jsx          Entry point; imports global.css
        ├── App.jsx           Hash router and page switch
        ├── global.css        Design tokens and shared components
        ├── components/
        │   ├── Header.jsx    Top nav, role selector, log-in link
        │   └── Header.css
        ├── pages/
        │   ├── Overview.jsx / .css
        │   ├── Search.jsx   / .css
        │   ├── Login.jsx
        │   ├── Signup.jsx
        │   └── Auth.css      Shared by Login and Signup
        ├── data/             Placeholder data (replace with API calls)
        │   ├── overview.js
        │   ├── search.js
        │   ├── roles.js      The four user roles (header + sign-up)
        │   └── auth.js       Mock login/signup — swap for real API calls
        └── assets/
```

## Styling conventions

- **Use `global.css` first.** It holds the MonoByte "Broadsheet" design tokens as CSS variables:
  - colours: `--color-*`, `--accent-100…900`, `--cream-100…400`, `--severity-hi|md|lo` and their `-ground` and `-ink` versions
  - the Source Serif 4 type ramp: `--text-hero`, `--text-h1…h3`, `--text-body`, `--text-kicker`

  Use these variables instead of hardcoded colours or fonts.
- **Shared component classes live in `global.css` too:**
  - `.btn-primary`, `.btn-secondary`, `.btn-block`
  - `.search-box`
  - `.badge` and `.badge-solid-hi|md|lo`
  - `.field`, `.input`, `.field-error`
  - `.kicker`

  Reuse them before writing new ones.
- **Each page gets its own CSS file** (`pages/Name.css`) for layout specific to that page. Vite bundles all CSS globally, so prefix page classes (e.g. `.search-page`, `.auth-form`) to avoid clashes.
- **Severity colours mean something.** Use `hi` (red) for severe or major, `md` (orange) for moderate, and `lo` (yellow) for mild or minor.

## Notes and TODOs

- `TODO` comments mark the places that still need a real API: search and forgot password.
- **Auth is mocked** in `data/auth.js`. Accounts are held in memory, and passwords are compared as plain text. That's fine for a demo, but the real backend has to hash passwords and handle sessions. To connect it, replace the bodies of `login()` and `signup()`. The pages already handle loading states and show any error thrown as an `AuthError`.
- On the Search page, the severity filter shows only tags at the chosen levels and hides products with none. This behaviour is an assumption and needs team confirmation.
- The header logo is a placeholder. Swap in the real MonoByte logo in `src/assets`.

> Information only, not medical advice. Always confirm against the official Health Canada monograph.
