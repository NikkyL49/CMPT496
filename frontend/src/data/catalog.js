// Search catalog: one record per product, built in the browser from
//   monographs.js            (products = brand + company, strengths merged)
//   drug_details.json        (ingredient, indication, pregnancy, contraindications, DINs)
//   adverse_event_terms.json (MedDRA adverse-event terms)
//   drugClasses.js           (drug class per ingredient — not in the CSV)
// These are the same files the drug page uses, so going from Search to a
// drug page doesn't download anything new.
// TODO: replace with a search API once the backend (MongoDB) is connected.
import { monographs, strengthsLabel } from './monographs'
import { useDrugDetails, detailsFor, recommendationLevel, isMissing } from './drugDetails'
import { useAdverseEvents, termsForProduct } from './adverseEvents'
import { classesFor } from './drugClasses'
import { productsByIngredient, productSummary, sameIngredientFlag } from '../utils/ingredientGroup'

const cache = new WeakMap()

// Search shows "Inconsistency flagged" when a product leaves out at least this
// many adverse-event terms that most other brands of the same ingredient list.
// Almost every product misses a few (448 of 565 miss at least 1), so a low
// number would flag nearly everything; 10 flags about a quarter (141).
// Team decision — adjust as needed.
export const FLAG_THRESHOLD = 10

// The "By …" buttons under the search box. No button selected = search all.
export const SEARCH_MODES = [
  { id: 'ingredient', label: 'By ingredient', group: 'Ingredients' },
  { id: 'condition', label: 'By condition', group: 'Conditions' },
  { id: 'contraindication', label: 'By contraindication', group: 'Contraindications' },
  { id: 'class', label: 'By drug class', group: 'Drug classes' },
]

function buildCatalog(details, aeData) {
  const groups = productsByIngredient(details)
  return monographs.map((p) => {
    const summary = productSummary(details, p)
    // Same strength the drug page opens by default (the highest), so the
    // "leaves out N common terms" number matches the drug page banner.
    const defaultId = p.variants.at(-1)?.id
    const idx = defaultId ? aeData.byId[defaultId] : null
    const myTerms = idx ? new Set(idx.map((i) => aeData.terms[i])) : null
    const others = (groups.get(summary?.ingredient) ?? []).filter((q) => q.id !== p.id)
    const flag = myTerms && others.length ? sameIngredientFlag(aeData, myTerms, others) : null
    const dins = p.listings.map((id) => detailsFor(details, id)?.din).filter(Boolean)
    const ingredient = summary?.ingredient ?? p.family
    const classes = classesFor(ingredient)
    const conditions = summary?.indicationTerms ?? []
    const contraindications = summary?.contraindicationTerms ?? []
    const contraText = isMissing(summary?.contraindications) ? '' : summary.contraindications
    return {
      product: p,
      id: p.id,
      label: p.label,
      company: p.company,
      strengths: strengthsLabel(p),
      ingredient,
      classes,
      conditions,
      indication: summary?.indication ?? '',
      revised: p.revised?.iso ?? '',
      pregnancy: summary?.pregnancy,
      pregnancyLevel: recommendationLevel(summary?.pregnancy),
      contraindications,
      aeCount: termsForProduct(aeData, p)?.size ?? 0,
      missingCommon: flag?.missingCommon.length ?? 0,
      dins,
      // lower-case text the search box looks through
      haystack: {
        name: `${p.label} ${p.brand}`.toLowerCase(),
        ingredient: `${ingredient} ${summary?.ingredients ?? ''}`.toLowerCase(),
        company: p.company.toLowerCase(),
        indication: `${summary?.indication ?? ''} ${conditions.join(' ')}`.toLowerCase(),
        conditions: conditions.map((t) => t.toLowerCase()),
        contraindications: contraindications.map((t) => t.toLowerCase()),
        contraText: contraText.toLowerCase(),
        classes: classes.map((t) => t.toLowerCase()),
      },
    }
  })
}

// null until the data files load, then the array of product records.
// enabled = false waits (the home page loads data once you start typing).
export function useCatalog(enabled = true) {
  const details = useDrugDetails(enabled)
  const aeData = useAdverseEvents(enabled)
  if (!details || !aeData) return null
  if (!cache.has(details)) cache.set(details, buildCatalog(details, aeData))
  return cache.get(details)
}

// "ac" matches "Acute myocardial infarction" and "Lactic acidosis"
// (any word starting with the typed letters).
export function wordPrefix(text, q) {
  const t = text.toLowerCase()
  return t.startsWith(q) || t.split(/[\s\-/(),+]+/).some((w) => w.startsWith(q))
}

// How well a list of terms matches: exact term > word starts with q > contains q
function listScore(list, q, exact, prefix, contains) {
  if (list.some((t) => t === q)) return exact
  if (list.some((t) => wordPrefix(t, q))) return prefix
  if (contains && list.some((t) => t.includes(q))) return contains
  return 0
}

// Score for an exact term match within a category (e.g. a picked suggestion)
export const EXACT = 10

// 0 = no match; higher = better match. `by` limits the search to one category.
export function matchScore(r, q, by) {
  if (!q) return 1
  const h = r.haystack
  if (by === 'ingredient') {
    if (r.ingredient.toLowerCase() === q) return EXACT
    return h.ingredient.startsWith(q) ? 5 : wordPrefix(h.ingredient, q) ? 4 : h.ingredient.includes(q) ? 2 : 0
  }
  if (by === 'condition') return listScore(h.conditions, q, EXACT, 4, 3) || (h.indication.includes(q) ? 2 : 0)
  if (by === 'contraindication') return listScore(h.contraindications, q, EXACT, 4, 3) || (h.contraText.includes(q) ? 2 : 0)
  if (by === 'class') return listScore(h.classes, q, EXACT, 4, 3)

  // No button selected: search everything
  if (/^\d{6,8}$/.test(q) && r.dins.some((d) => d.includes(q))) return 6 // DIN
  if (h.name.startsWith(q)) return 5
  if (h.ingredient.startsWith(q)) return 4
  if (h.name.includes(q) || h.ingredient.includes(q)) return 3
  return (
    listScore(h.classes, q, 3, 2, 0) ||
    (h.company.includes(q) ? 2 : 0) ||
    listScore(h.conditions, q, 2, 1, 1) ||
    (h.indication.includes(q) ? 1 : 0) ||
    listScore(h.contraindications, q, 1, 1, 0)
  )
}

// Every distinct ingredient / condition / contraindication / class with the
// number of products it appears in — the vocabulary for suggestions.
const vocabCache = new WeakMap()
function vocabulary(catalog) {
  if (vocabCache.has(catalog)) return vocabCache.get(catalog)
  const fields = {
    ingredient: (r) => [r.ingredient],
    condition: (r) => r.conditions,
    contraindication: (r) => r.contraindications,
    class: (r) => r.classes.filter((c) => c !== 'Unclassified'),
  }
  const vocab = {}
  for (const [mode, get] of Object.entries(fields)) {
    const counts = new Map()
    catalog.forEach((r) => new Set(get(r)).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    vocab[mode] = [...counts.entries()]
  }
  vocabCache.set(catalog, vocab)
  return vocab
}

// Suggestions for the search box, grouped by category.
// mode = one category (from a "By …" button) or null for all four.
export function suggest(catalog, text, mode, perGroup = mode ? 10 : 5) {
  const q = text.trim().toLowerCase()
  if (!catalog || !q) return []
  const vocab = vocabulary(catalog)
  return SEARCH_MODES.filter((m) => !mode || m.id === mode)
    .map((m) => {
      const all = vocab[m.id]
        .filter(([term]) => wordPrefix(term, q))
        .sort(
          ([a, ac], [b, bc]) =>
            Number(b.toLowerCase().startsWith(q)) - Number(a.toLowerCase().startsWith(q)) ||
            bc - ac ||
            a.localeCompare(b),
        )
      return {
        ...m,
        total: all.length,
        items: all.slice(0, perGroup).map(([term, count]) => ({ term, count, mode: m.id })),
      }
    })
    .filter((g) => g.items.length)
}
