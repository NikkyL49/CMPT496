// Review status for the Inconsistency report: Open → Reviewed → Resolved,
// plus "Flag for review" notes (companies + reason) from the detail page.
//
// TODO: move to the backend (MongoDB, researcher-only routes) so every
// researcher sees the same status. For now it's kept in this browser's
// localStorage, like the logged-out saved list.
import { createStore } from '../utils/store'

const KEY = 'monobyte.inconsistencyReviews'

export const STATUSES = {
  open: 'Open',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
}

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {}
  } catch {
    return {}
  }
}

// { [ingredientSlug]: { status, updated, flags: [{ companies, reason, by, at }] } }
export const reviewsStore = createStore(read())

reviewsStore.subscribe(() => {
  try {
    localStorage.setItem(KEY, JSON.stringify(reviewsStore.get()))
  } catch {
    // storage blocked — changes last for this visit only
  }
})

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function reviewFor(reviews, slug) {
  return reviews[slug] ?? { status: 'open', flags: [] }
}

export function setStatus(slug, status) {
  reviewsStore.set((all) => ({
    ...all,
    [slug]: { ...reviewFor(all, slug), status, updated: today() },
  }))
}

export function addFlag(slug, { companies, reason, by }) {
  reviewsStore.set((all) => {
    const current = reviewFor(all, slug)
    return {
      ...all,
      [slug]: {
        ...current,
        // a new flag reopens a resolved ingredient
        status: current.status === 'resolved' ? 'open' : current.status,
        updated: today(),
        flags: [...current.flags, { companies, reason, by, at: today() }],
      },
    }
  })
}
