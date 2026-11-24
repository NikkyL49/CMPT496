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

// Shared rules for comparing brands of one ingredient (same as the Layer 1
// card on the Graphs tab, so every page agrees):
// - a term is "common" when MORE THAN HALF of the brands list it
// - a brand whose list is under 20% of the other brands' median length is a
//   "possible data gap" (likely an extraction/mapping problem, e.g. NRA-AMLODIPINE
//   lists 9 terms where its peers list ~92). Gaps are left out of the comparisons.
// - fewer than 3 brands with data = low confidence (one label moves everything)
export const isCommon = (count, n) => count * 2 > n
export const DATA_GAP_RATIO = 0.2
export const MIN_CONFIDENT_GROUP = 3

function median(values) {
  const v = [...values].sort((a, b) => a - b)
  const m = v.length >> 1
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

const gapCache = new WeakMap()

// Map(product id → { terms, peerMedian }) for the possible data gaps in a group
export function dataGaps(aeData, group) {
  if (gapCache.has(group)) return gapCache.get(group)
  const sizes = group.map((p) => termsForProduct(aeData, p)?.size ?? null)
  const gaps = new Map()
  group.forEach((p, i) => {
    const peers = sizes.filter((n, j) => j !== i && n)
    if (sizes[i] == null || peers.length < 2) return
    const peerMedian = median(peers)
    if (sizes[i] < DATA_GAP_RATIO * peerMedian) gaps.set(p.id, { terms: sizes[i], peerMedian })
  })
  gapCache.set(group, gaps)
  return gaps
}

// How this monograph's adverse-event terms compare with the other brands.
// common = listed by more than half of the others; rare = listed by ≤ 25% of them.
// `group` = all brands of the ingredient (this one included), for the data-gap check.
export function sameIngredientFlag(aeData, myTerms, others, group = null) {
  const gaps = group ? dataGaps(aeData, group) : new Map()
  const me = group?.find((p) => !others.includes(p))
  const otherSets = others
    .filter((p) => !gaps.has(p.id))
    .map((p) => termsForProduct(aeData, p))
    .filter(Boolean)
  if (!myTerms || !otherSets.length) return null
  const share = new Map()
  otherSets.forEach((s) => s.forEach((t) => share.set(t, (share.get(t) ?? 0) + 1)))
  const n = otherSets.length
  const missingCommon = [...share.entries()]
    .filter(([t, c]) => isCommon(c, n) && !myTerms.has(t))
    .map(([t]) => t)
    .sort()
  const rare = [...myTerms].filter((t) => (share.get(t) ?? 0) / n <= 0.25).sort()
  return {
    others: n,
    missingCommon,
    rare,
    dataGap: me ? (gaps.get(me.id) ?? null) : null,
    lowConfidence: n + 1 < MIN_CONFIDENT_GROUP,
  }
}
