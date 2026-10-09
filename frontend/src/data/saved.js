// Saved drugs list, shared by the Search and Saved pages.
// Kept in the browser's localStorage so it survives a refresh.
// TODO: once the backend exists, load/save this per user through the API.
import { createStore } from '../utils/store'

const KEY = 'monobyte.saved'
// First visit: start with the three drugs from the design mockup
const DEFAULT_SAVED = ['aa-diltiaz', 'apo-simvastatin', 'apixaban']

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : DEFAULT_SAVED
  } catch {
    return DEFAULT_SAVED
  }
}

export const savedStore = createStore(load())

savedStore.subscribe(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(savedStore.get()))
  } catch {
    // storage blocked (private mode etc.) — list still works for this visit
  }
})

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
