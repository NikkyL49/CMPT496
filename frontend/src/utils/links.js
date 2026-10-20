import { findProduct } from '../data/monographs'

// Link to a drug page. Tab and strength live in the URL so views can be shared.
//   drugHref('ach-amlodipine-accord-healthcare-inc', { s: 'ACH-AMLODIPINE 5mg', tab: 'research' })
export function drugHref(productId, { s, tab } = {}) {
  const qs = new URLSearchParams()
  if (s) qs.set('s', s)
  if (tab && tab !== 'overview') qs.set('tab', tab)
  const q = qs.toString()
  return `#/drug/${productId}${q ? `?${q}` : ''}`
}

// Drug page link for the sample drugs on Search/Saved/Overview (matched by
// brand + company). Falls back to a search if the brand isn't in the dataset.
export function drugHrefForBrand(brand, company) {
  const p = findProduct(brand, company)
  return p ? drugHref(p.id) : `#/search?q=${encodeURIComponent(brand)}`
}

// Link to the Search page. mode = 'ingredient' | 'condition' |
// 'contraindication' | 'class', or empty to search everything.
export function searchHref(q, mode) {
  const qs = new URLSearchParams()
  if (q) qs.set('q', q)
  if (mode) qs.set('by', mode)
  return `#/search${qs.toString() ? `?${qs}` : ''}`
}
