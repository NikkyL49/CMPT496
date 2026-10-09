// Who is logged in, which role the site is showing, and recent searches.
// Lives in memory only — a page refresh logs you out (mock auth).
import { createStore } from '../utils/store'
import { DEFAULT_ROLE } from './roles'

export const sessionStore = createStore({
  user: null, // { name, email, defaultRole, landingPage, notifications }
  viewRole: DEFAULT_ROLE, // role picked in the header dropdown
  searchHistory: [], // [{ query, at }]
})

export function setViewRole(role) {
  sessionStore.set((s) => ({ ...s, viewRole: role }))
}

export function recordSearch(query) {
  const q = query.trim()
  if (!q) return
  sessionStore.set((s) =>
    s.user
      ? {
          ...s,
          searchHistory: [
            { query: q, at: new Date().toISOString() },
            ...s.searchHistory,
          ].slice(0, 50),
        }
      : s,
  )
}
