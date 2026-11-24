// Review status for the Inconsistency report: Open → Reviewed → Resolved,
// plus "Flag for review" notes (companies + reason) from the detail page.
//
// Saved in MongoDB through the researcher-only /api/reviews routes
// (backend/src/routes/reviewRoutes.js), so every researcher sees the same
// status and who changed it. Reloaded each time a report page opens.
import { useEffect } from 'react'
import { api } from './api'
import { sessionStore } from './session'
import { createStore, useStore } from '../utils/store'

export const STATUSES = {
  open: 'Open',
  reviewed: 'Reviewed',
  resolved: 'Resolved',
}

// reviews: { [ingredientSlug]: { status, statusBy, statusAt, flags: [{ companies, reason, by, at }] } }
// error: last load or save error, shown on the report pages
export const reviewsStore = createStore({ reviews: {}, loaded: false, error: null })

// Status used to be kept in the browser only; that copy is no longer read
try {
  localStorage.removeItem('monobyte.inconsistencyReviews')
} catch {
  // storage blocked, nothing to clean up
}

let loading = null

export function loadReviews() {
  loading ??= api('GET', '/reviews')
    .then(({ reviews }) => reviewsStore.set({ reviews, loaded: true, error: null }))
    .catch((err) => reviewsStore.set((s) => ({ ...s, error: `Couldn't load review status: ${err.message}` })))
    .finally(() => {
      loading = null
    })
  return loading
}

// Loads (or reloads) the shared status when a report page opens or the user changes
export function useReviews() {
  const { user } = useStore(sessionStore)
  const email = user?.email
  useEffect(() => {
    if (email) loadReviews()
  }, [email])
  return useStore(reviewsStore)
}

export function reviewFor(reviews, slug) {
  return reviews[slug] ?? { status: 'open', statusBy: null, statusAt: null, flags: [] }
}

// Resolves to the saved review, or null if saving failed (the error goes in the store)
function save(request) {
  return request
    .then(({ review }) => {
      reviewsStore.set((s) => ({ ...s, reviews: { ...s.reviews, [review.slug]: review }, error: null }))
      return review
    })
    .catch((err) => {
      reviewsStore.set((s) => ({ ...s, error: `Couldn't save: ${err.message}` }))
      return null
    })
}

export function setStatus(slug, status) {
  return save(api('PUT', `/reviews/${slug}/status`, { status }))
}

// A new flag reopens a resolved ingredient (done by the backend)
export function addFlag(slug, { companies, reason }) {
  return save(api('POST', `/reviews/${slug}/flags`, { companies, reason }))
}

// "2026-11-24" from an ISO timestamp
export function day(iso) {
  return iso ? iso.slice(0, 10) : ''
}

// "Reviewed by Sam Lee on 2026-11-24"
export function statusNote(review) {
  if (!review.statusBy) return ''
  return `${STATUSES[review.status]} by ${review.statusBy} on ${day(review.statusAt)}`
}
