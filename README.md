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
| other `#/...`        | Coming soon      | Placeholder for pages not built yet: monograph detail, Discovery, Compare, Interaction check, Inconsistency report |

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
        │   ├── Header.jsx    Top nav, role selector, log-in / account links
        │   ├── Header.css
        │   ├── PasswordStrength.jsx  Strength meter (sign-up, reset, settings)
        │   └── Switch.jsx    On/off toggle
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
        │   └── ComingSoon.jsx  Placeholder for unbuilt pages
        ├── data/             Placeholder data (replace with API calls)
        │   ├── overview.js
        │   ├── search.js
        │   ├── roles.js      The four user roles (header + sign-up)
        │   ├── auth.js       Mock auth + account settings — swap for real API calls
        │   ├── session.js    Logged-in user, header role, search history
        │   └── saved.js      Saved drugs list (shared by Search + Saved)
        ├── utils/
        │   ├── validation.js Email check + password strength scoring
        │   ├── store.js      Tiny shared-state store (useStore hook)
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
- On the Search page, the severity filter shows only tags at the chosen levels and hides products with none. This behaviour is an assumption and needs team confirmation.
- **Logo files** are in `frontend/src/assets`: `logo-mark.png` (the capsule icon, used in the header) and `logo-full.png` (icon plus the MonoByte wordmark). Both have transparent backgrounds. The browser-tab icon is `frontend/public/favicon.png`.

> Information only, not medical advice. Always confirm against the official Health Canada monograph.
