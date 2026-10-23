// Which roles can open which pages.
//
// - General Public: home, search, drug overview, saved, discovery, settings
//   (+ log in / sign up / password pages)
// - Pharmacist + Physician: everything except Analysis and the Inconsistency report
// - Researcher: everything
//
// The role comes from the logged-in account (user.defaultRole from the backend).
// Logged out = General Public. The header dropdown can switch to a role at or
// below the account's own role (e.g. a researcher can preview the public view),
// never above it.
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

// Access level: General Public 0, Pharmacist/Physician 1, Researcher 2
const LEVEL = { 'General Public': 0, Pharmacist: 1, Physician: 1, Researcher: 2 }

export function canAccess(path, role) {
  const allowed = RESTRICTED[path]
  return !allowed || allowed.includes(role)
}

// Roles the header dropdown offers: the account's own role and anything below it.
// Pharmacist and Physician don't get each other's role.
export function rolesFor(user) {
  if (!user) return [DEFAULT_ROLE]
  const own = ROLES.includes(user.defaultRole) ? user.defaultRole : DEFAULT_ROLE
  const level = LEVEL[own]
  // Researcher can preview all four; others get their own role + General Public
  return ROLES.filter((r) => r === own || LEVEL[r] < level || own === 'Researcher')
}

// The role the site is acting as right now: the header pick if the account
// allows it, otherwise General Public.
export function effectiveRole({ user, viewRole }) {
  return rolesFor(user).includes(viewRole) ? viewRole : DEFAULT_ROLE
}

export function useRole() {
  return effectiveRole(useStore(sessionStore))
}

// Can the current role open this page? (for hiding links/buttons)
export function useCan(path) {
  return canAccess(path, useRole())
}
