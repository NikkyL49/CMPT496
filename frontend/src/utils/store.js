import { useSyncExternalStore } from 'react'

// Minimal shared-state store: any component that calls useStore(store)
// re-renders when store.set() is called. Swap for Zustand/Redux if needed.
export function createStore(initial) {
  let state = initial
  const listeners = new Set()
  return {
    get: () => state,
    set(update) {
      state = typeof update === 'function' ? update(state) : update
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

export function useStore(store) {
  return useSyncExternalStore(store.subscribe, store.get)
}
