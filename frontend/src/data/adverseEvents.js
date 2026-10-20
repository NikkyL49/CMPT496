// MedDRA adverse-event terms per monograph, from adverse_event_terms.json
// (built by scripts/build-adverse-events.mjs from the MedDRA CSV).
// The file is ~500 KB, so it's loaded on demand rather than in the main bundle.
// TODO: once the backend exists, fetch terms for the selected products only.
import { useEffect, useState } from 'react'

let pending = null

export function loadAdverseEvents() {
  pending ??= import('./adverse_event_terms.json').then((m) => m.default)
  return pending
}

// null while loading, then { meddraVersion, terms, byId }
// enabled = false waits (e.g. until the user starts typing in a search box)
export function useAdverseEvents(enabled = true) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!enabled) return
    let active = true
    loadAdverseEvents().then((d) => active && setData(d))
    return () => {
      active = false
    }
  }, [enabled])
  return data
}

// All terms listed for a product (union across its strengths), or null if
// none of its listings are in the file.
export function termsForProduct(data, product) {
  if (!data) return null
  const lists = product.listings.map((id) => data.byId[id]).filter(Boolean)
  if (!lists.length) return null
  return new Set(lists.flat().map((i) => data.terms[i]))
}

// Terms listed by some but not all of the given products
export function inconsistencySummary(termSets) {
  const sets = termSets.filter(Boolean)
  if (sets.length < 2) return null
  const union = new Set(sets.flatMap((s) => [...s]))
  const inAll = [...union].filter((t) => sets.every((s) => s.has(t))).length
  return { total: union.size, inAll, inconsistent: union.size - inAll }
}
