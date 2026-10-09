// MOCK auth service — stands in for the real backend until it exists.
// Swap the function bodies for fetch() calls to the API; the pages only
// depend on these functions resolving or throwing AuthError.
//
// Accounts and the login session live in memory, so a page refresh logs you
// out and forgets any accounts created with signup().
import { sessionStore } from './session'
import { DEFAULT_ROLE } from './roles'

const DEFAULT_NOTIFICATIONS = {
  inconsistency: true, // a new inconsistency is flagged
  interactions: true, // interaction alerts for saved drugs
  news: false, // product news
}

const users = [
  {
    name: 'Demo User',
    email: 'demo@monobyte.ca',
    password: 'Monobyte1!',
    defaultRole: 'General Public',
    landingPage: '/',
    notifications: { ...DEFAULT_NOTIFICATIONS },
  },
]

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export class AuthError extends Error {}

const sameEmail = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()

// What the frontend is allowed to see (never the password)
function publicUser(u) {
  return {
    name: u.name,
    email: u.email,
    defaultRole: u.defaultRole,
    landingPage: u.landingPage,
    notifications: { ...u.notifications },
  }
}

function currentRecord() {
  const me = sessionStore.get().user
  const user = me && users.find((u) => sameEmail(u.email, me.email))
  if (!user) throw new AuthError('You need to log in again.')
  return user
}

function refreshSession(user) {
  sessionStore.set((s) => ({ ...s, user: publicUser(user) }))
}

// ---- Log in / sign up / log out ----

export async function login(email, password) {
  await delay(400) // simulate network
  const user = users.find((u) => sameEmail(u.email, email))
  // Same message for unknown email and wrong password, so the form
  // doesn't reveal which emails have accounts.
  if (!user || user.password !== password) {
    throw new AuthError('Incorrect email or password.')
  }
  sessionStore.set((s) => ({
    ...s,
    user: publicUser(user),
    viewRole: user.defaultRole,
  }))
  return publicUser(user)
}

export async function signup({ name, email, password, role }) {
  await delay(400)
  if (users.some((u) => sameEmail(u.email, email))) {
    throw new AuthError('An account with this email already exists.')
  }
  const user = {
    name: name.trim(),
    email: email.trim(),
    password,
    defaultRole: role || DEFAULT_ROLE,
    landingPage: '/',
    notifications: { ...DEFAULT_NOTIFICATIONS },
  }
  users.push(user)
  return publicUser(user)
}

export function logout() {
  sessionStore.set((s) => ({ ...s, user: null, searchHistory: [] }))
}

// ---- Settings ----

export async function updateProfile({ name, email }) {
  await delay(300)
  const user = currentRecord()
  const taken = users.some((u) => u !== user && sameEmail(u.email, email))
  if (taken) throw new AuthError('Another account already uses this email.')
  user.name = name.trim()
  user.email = email.trim()
  refreshSession(user)
}

export async function changePassword(currentPassword, newPassword) {
  await delay(400)
  const user = currentRecord()
  if (user.password !== currentPassword) {
    throw new AuthError('Your current password is incorrect.')
  }
  user.password = newPassword
}

// patch: any of { defaultRole, landingPage, notifications: {...} }
export async function updatePreferences(patch) {
  await delay(200)
  const user = currentRecord()
  if (patch.defaultRole) user.defaultRole = patch.defaultRole
  if (patch.landingPage) user.landingPage = patch.landingPage
  if (patch.notifications) {
    user.notifications = { ...user.notifications, ...patch.notifications }
  }
  refreshSession(user)
}

export async function deleteAccount(password) {
  await delay(400)
  const user = currentRecord()
  if (user.password !== password) {
    throw new AuthError('Incorrect password.')
  }
  users.splice(users.indexOf(user), 1)
  logout()
}

// ---- Password reset ----
// Real flow: the backend emails a one-time link. The mock returns the token
// so the Forgot password page can show the link on screen for testing.

const RESET_TTL_MS = 30 * 60 * 1000 // links expire after 30 minutes
const resetTokens = new Map() // token -> { email, expires }

function makeToken() {
  return crypto.randomUUID().replaceAll('-', '')
}

export async function requestPasswordReset(email) {
  await delay(400)
  const user = users.find((u) => sameEmail(u.email, email))
  // The page shows the same message either way; only the mock returns the token.
  if (!user) return { demoToken: null }
  const token = makeToken()
  resetTokens.set(token, { email: user.email, expires: Date.now() + RESET_TTL_MS })
  return { demoToken: token }
}

export async function resetPassword(token, newPassword) {
  await delay(400)
  const entry = resetTokens.get(token)
  const user = entry && users.find((u) => u.email === entry.email)
  if (!entry || entry.expires < Date.now() || !user) {
    resetTokens.delete(token)
    throw new AuthError('This reset link is invalid or has expired.')
  }
  user.password = newPassword
  resetTokens.delete(token) // one-time use
}
