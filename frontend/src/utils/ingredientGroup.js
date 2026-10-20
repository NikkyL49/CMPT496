// Groups products by their normalized active ingredient (from drug_details.json)
// and compares one monograph with the other brands of the same ingredient.
import { monographs } from '../data/monographs'
import { detailsFor } from '../data/drugDetails'
import { termsForProduct } from '../data/adverseEvents'

const cache = new WeakMap()

// Map(ingredient → [product, ...]) — built once per loaded details file
export function productsByIngredient(details) {
  if (cache.has(details)) return cache.get(details)
  const map = new Map()
  for (const p of monographs) {
    const ing = details.strings[details.byId[p.listings[0]]?.ingredient]
    if (!ing) continue
    if (!map.has(ing)) map.set(ing, [])
    map.get(ing).push(p)
  }
  cache.set(details, map)
  return map
}

function mostCommon(values) {
  const counts = new Map()
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

// One-line summary of a product across its strengths
export function productSummary(details, product) {
  const rows = product.listings.map((id) => detailsFor(details, id)).filter(Boolean)
  if (!rows.length) return null
  return {
    ...rows[0],
    pregnancy: mostCommon(rows.map((r) => r.pregnancy)),
    breastfeeding: mostCommon(rows.map((r) => r.breastfeeding)),
    kidney: mostCommon(rows.map((r) => r.kidney)),
    liver: mostCommon(rows.map((r) => r.liver)),
  }
}

// How this monograph's adverse-event terms compare with the other brands.
// common = listed by ≥ 75% of the others; rare = listed by ≤ 25% of them.
export function sameIngredientFlag(aeData, myTerms, others) {
  const otherSets = others.map((p) => termsForProduct(aeData, p)).filter(Boolean)
  if (!myTerms || !otherSets.length) return null
  const share = new Map()
  otherSets.forEach((s) => s.forEach((t) => share.set(t, (share.get(t) ?? 0) + 1)))
  const n = otherSets.length
  const missingCommon = [...share.entries()]
    .filter(([t, c]) => c / n >= 0.75 && !myTerms.has(t))
    .map(([t]) => t)
    .sort()
  const rare = [...myTerms].filter((t) => (share.get(t) ?? 0) / n <= 0.25).sort()
  return { others: n, missingCommon, rare }
}
