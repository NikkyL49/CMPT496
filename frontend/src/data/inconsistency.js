// Inconsistency report (#/inconsistency): how differently the brands of one
// active ingredient list MedDRA adverse-event terms. Built in the browser from
// drug_details.json (ingredient per product) + adverse_event_terms.json, the
// same files the drug page and Search use.
//
// For each ingredient with 2+ products:
//   share(term) = products listing the term ÷ products compared
//   most  = terms listed by ≥ 75% of products (the consensus)
//   some  = listed by 2+ products but < 75%
//   one   = listed by exactly one product
//   divergent terms = some + one
//   score = 10 × Σ (1 − share) over divergent terms ÷ distinct terms
// Terms unique to one product weigh the most, partly shared terms less.
// 0 = every product lists the same terms; ~10 = almost nothing in common.
// TODO: switch to the team's Layer 1 concordance results once they're final.
import { useDrugDetails } from './drugDetails'
import { useAdverseEvents, termsForProduct } from './adverseEvents'
import { productsByIngredient } from '../utils/ingredientGroup'
import { ingredientSlug } from './interactions'

export const CONSENSUS = 0.75

export const LEVELS = [
  { id: 'hi', label: 'High', min: 6, range: 'score 6.0 and above' },
  { id: 'md', label: 'Medium', min: 3, range: '3.0 to 5.9' },
  { id: 'lo', label: 'Low', min: 0, range: 'under 3.0' },
]

export function levelFor(score) {
  return LEVELS.find((l) => score >= l.min) ?? LEVELS.at(-1)
}

function latest(products) {
  return products
    .map((p) => p.revised?.iso)
    .filter(Boolean)
    .sort()
    .at(-1)
}

function buildRow(name, group, aeData) {
  const products = group
    .map((product) => ({ product, terms: termsForProduct(aeData, product) }))
    .filter((p) => p.terms?.size)
  const n = products.length
  if (n < 2) return null

  const listedBy = new Map()
  products.forEach((p, i) =>
    p.terms.forEach((t) => listedBy.set(t, [...(listedBy.get(t) ?? []), i])),
  )
  const terms = [...listedBy]
    .map(([term, idx]) => ({ term, listedBy: idx, share: idx.length / n }))
    .sort((a, b) => a.share - b.share || a.term.localeCompare(b.term))

  const most = terms.filter((t) => t.share >= CONSENSUS)
  const one = terms.filter((t) => t.listedBy.length === 1 && t.share < CONSENSUS)
  const some = terms.filter((t) => t.listedBy.length > 1 && t.share < CONSENSUS)
  const weight = [...one, ...some].reduce((s, t) => s + (1 - t.share), 0)
  const score = Math.round((100 * weight) / terms.length) / 10

  // Per product: consensus terms it leaves out, and terms only it lists
  const consensus = new Set(most.map((t) => t.term))
  const productRows = products.map((p, i) => ({
    ...p,
    missing: [...consensus].filter((t) => !p.terms.has(t)).sort(),
    unique: one.filter((t) => t.listedBy[0] === i).map((t) => t.term),
  }))

  return {
    name,
    slug: ingredientSlug(name),
    products: productRows,
    terms,
    most,
    some,
    one,
    divergent: some.length + one.length,
    score,
    level: levelFor(score).id,
    latestRevision: latest(products.map((p) => p.product)),
  }
}

const cache = new WeakMap() // details file → report rows

export function buildReport(details, aeData) {
  const rows = []
  for (const [name, group] of productsByIngredient(details)) {
    const row = buildRow(name, group, aeData)
    if (row) rows.push(row)
  }
  return rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

// null while loading, then one row per ingredient (highest score first)
export function useInconsistencyReport() {
  const details = useDrugDetails()
  const aeData = useAdverseEvents()
  if (!details || !aeData) return null
  if (!cache.has(details)) cache.set(details, buildReport(details, aeData))
  return cache.get(details)
}

// "ACH-AMLODIPINE only (1 of 3)" / "12 of 20 products"
export function listedByLabel(row, term) {
  const n = row.products.length
  if (term.listedBy.length === 1) {
    return `${row.products[term.listedBy[0]].product.label} only (1 of ${n})`
  }
  return `${term.listedBy.length} of ${n} products`
}
