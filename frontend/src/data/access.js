// Which roles can open which pages.
//
// - General Public: home, search, drug overview, saved, discovery, settings
//   (+ log in / sign up / password pages)
// - Pharmacist + Physician: everything except Analysis and the Inconsistency report
// - Researcher: everything
//
// The role comes from the logged-in account (user.defaultRole from the backend)
// and is fixed: it's picked at sign up and can't be switched afterwards (the
// header only shows it, Settings shows it read-only, and the backend refuses a
// change). Logged out = General Public.
//
// NOTE: this only hides pages in the browser. Anything that must stay private
// (e.g. the analysis data) has to be protected by the backend too.
import { ROLES, DEFAULT_ROLE } from './roles'
import { sessionStore } from './session'
import { useStore } from '../utils/store'

const PROFESSIONAL = ['Pharmacist', 'Physician', 'Researcher']
const RESEARCHER = ['Researcher']

// Pages not listed here are open to everyone.
export const RESTRICTED = {
  '/compare': PROFESSIONAL,
  '/interactions': PROFESSIONAL,
  '/analysis': RESEARCHER,
  '/inconsistency': RESEARCHER,
}

// Page names for the "restricted" message
export const PAGE_NAMES = {
  '/compare': 'Compare',
  '/interactions': 'Interaction check',
  '/analysis': 'Analysis',
  '/inconsistency': 'Inconsistency report',
}

// The RESTRICTED entry a path falls under: '/inconsistency/amlodipine' → '/inconsistency'
export function restrictedKey(path) {
  return Object.keys(RESTRICTED).find((key) => path === key || path.startsWith(`${key}/`))
}

export function canAccess(path, role) {
  const allowed = RESTRICTED[restrictedKey(path)]
  return !allowed || allowed.includes(role)
}

// The account's role: what it signed up with, or General Public when logged out
export function accountRole(user) {
  return user && ROLES.includes(user.defaultRole) ? user.defaultRole : DEFAULT_ROLE
}

// The role the site is acting as right now. Always the account's own role:
// nothing in the browser (an old "viewRole" in the session) can raise it.
export function effectiveRole({ user }) {
  return accountRole(user)
}

export function useRole() {
  return effectiveRole(useStore(sessionStore))
}

// Can the current role open this page? (for hiding links/buttons)
export function useCan(path) {
  return canAccess(path, useRole())
}
