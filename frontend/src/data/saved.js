// Saved drugs list, shared by the Search and Saved pages.
// Logged out: kept in the browser's localStorage so it survives a refresh.
// Logged in: the list belongs to the account and every change is saved
// through the API (auth.js switches between the two).
import { createStore } from '../utils/store'
import { api } from './api'

const KEY = 'monobyte.saved'
// First visit: start with the three drugs from the design mockup (real products)
const DEFAULT_SAVED = ['aa-diltiaz-aa-pharma-inc', 'apo-simvastatin-apotex-inc', 'apixaban-sanis-health-inc']

// The list saved while logged out; null if this browser never saved one
function readGuest() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeGuest(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // storage blocked (private mode etc.) — list still works for this visit
  }
}

export const savedStore = createStore(readGuest() ?? DEFAULT_SAVED)

let account = false // true while logged in
let fromServer = false // true while applying a list the server sent (don't send it back)
let pendingSave = Promise.resolve() // PUTs go out one at a time, in order

savedStore.subscribe(() => {
  const ids = savedStore.get()
  if (!account) {
    writeGuest(ids)
  } else if (!fromServer) {
    pendingSave = pendingSave
      .then(() => api('PUT', '/saved', { ids }))
      .catch((err) => console.warn('Could not save your saved drugs:', err.message))
  }
})

function applyServerList(ids) {
  fromServer = true
  savedStore.set(ids)
  fromServer = false
}

// ---- Called by auth.js ----

// Logged in: show the account's list
export function loadAccountSaved(ids) {
  account = true
  applyServerList(ids)
}

// Right after log in: add drugs saved while logged out to the account.
// The mockup defaults only count if the user actually kept them.
export async function mergeGuestSaved() {
  const guest = readGuest()
  if (!guest?.length) return
  try {
    const { ids } = await api('POST', '/saved/merge', { ids: guest })
    applyServerList(ids)
    writeGuest([]) // they live in the account now
  } catch (err) {
    console.warn('Could not merge saved drugs:', err.message)
  }
}

// Logged out: back to the browser's own list
export function resetToGuestSaved() {
  account = false
  applyServerList(readGuest() ?? [])
}

// ---- Used by the pages ----

export function toggleSaved(id) {
  savedStore.set((ids) =>
    ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
  )
}

export function removeSaved(id) {
  savedStore.set((ids) => ids.filter((x) => x !== id))
}

// Put a removed drug back at its old position (for Undo)
export function restoreSaved(id, index) {
  savedStore.set((ids) => {
    if (ids.includes(id)) return ids
    const next = [...ids]
    next.splice(Math.min(index, next.length), 0, id)
    return next
  })
}

export function addManySaved(newIds) {
  savedStore.set((ids) => [...ids, ...newIds.filter((id) => !ids.includes(id))])
}

export function clearSaved() {
  savedStore.set([])
}
