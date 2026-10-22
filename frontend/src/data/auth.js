// Auth service — talks to the backend's /api/auth and /api/users routes.
// The pages only depend on these functions resolving or throwing AuthError.
//
// The login session is an httpOnly cookie set by the backend, so a page
// refresh keeps you logged in (restoreSession() runs on startup).
import { sessionStore } from './session'
import { api, ApiError } from './api'
import { loadAccountSaved, mergeGuestSaved, resetToGuestSaved } from './saved'

export { ApiError as AuthError }

function setUser(user) {
  sessionStore.set((s) => ({ ...s, user }))
}

// Local logged-out state (the cookie is cleared by the server, or already gone)
function clearSession() {
  sessionStore.set((s) => ({ ...s, user: null, searchHistory: [] }))
  resetToGuestSaved()
}

// Any call that answers 401 means the cookie expired — show the user as logged out
async function authed(method, path, body) {
  try {
    return await api(method, path, body)
  } catch (err) {
    if (err.status === 401) clearSession()
    throw err
  }
}

// ---- Startup ----

// Called once from main.jsx: who does the cookie belong to?
export async function restoreSession() {
  try {
    const { user, savedDrugs } = await api('GET', '/auth/me')
    if (!user) return
    sessionStore.set((s) => ({ ...s, user, viewRole: user.defaultRole }))
    loadAccountSaved(savedDrugs)
  } catch {
    // backend down — stay logged out, the rest of the site still works
  }
}

// ---- Log in / sign up / log out ----

export async function login(email, password) {
  const { user, savedDrugs } = await api('POST', '/auth/login', { email, password })
  sessionStore.set((s) => ({ ...s, user, viewRole: user.defaultRole }))
  loadAccountSaved(savedDrugs)
  await mergeGuestSaved() // drugs saved while logged out join the account
  return user
}

// Sign up doesn't log you in — the page sends you to the login page.
export async function signup({ name, email, password, role }) {
  const { user } = await api('POST', '/auth/signup', { name, email, password, role })
  return user
}

export function logout() {
  clearSession()
  api('POST', '/auth/logout').catch(() => {}) // cookie cleared server side
}

// ---- Settings ----

export async function updateProfile({ name, email }) {
  const { user } = await authed('PATCH', '/users/me', { name, email })
  setUser(user)
}

export async function changePassword(currentPassword, newPassword) {
  await authed('POST', '/users/me/password', { currentPassword, newPassword })
}

// patch: any of { defaultRole, landingPage, notifications: {...} }
export async function updatePreferences(patch) {
  const { user } = await authed('PATCH', '/users/me/preferences', patch)
  setUser(user)
}

export async function deleteAccount(password) {
  await authed('DELETE', '/users/me', { password })
  clearSession()
}

// ---- Password reset ----
// TODO: the backend should email the link. Until it has an email service, it
// returns the token outside production so the Forgot password page can show it.

export async function requestPasswordReset(email) {
  return api('POST', '/auth/forgot-password', { email }) // { demoToken }
}

export async function resetPassword(token, newPassword) {
  await api('POST', '/auth/reset-password', { token, password: newPassword })
}
