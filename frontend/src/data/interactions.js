// Drug interaction check (#/interactions), built in the browser from the same
// files the drug page uses:
//   drug_details.json        "Drug Interactions" list + "Standardized Metabolism" (CYP)
//   adverse_event_terms.json MedDRA adverse-event terms
//   drugClasses.js           drug class per ingredient (not in the CSV)
//
// The CSV has no severity ratings and no mechanism text, so pairs are graded by
// how the monographs document them, not by clinical severity:
//   both  = each drug's monographs name the other drug
//   one   = only one side names the other
//   class = only named through a drug class ("ACE inhibitors", "statins", ...)
// TODO: replace with an API call once the backend serves drug data.
import { useDrugDetails, detailsFor, isMissing } from './drugDetails'
import { useAdverseEvents, termsForProduct } from './adverseEvents'
import { classesFor } from './drugClasses'
import { productsByIngredient } from '../utils/ingredientGroup'

export const MAX_DRUGS = 8

export const GRADES = [
  { id: 'both', label: 'Named on both labels', short: 'Both labels', level: 'hi' },
  { id: 'one', label: 'Named on one label', short: 'One label', level: 'md' },
  { id: 'class', label: 'Named by drug class only', short: 'Class only', level: 'lo' },
]

// Class names used in the "Drug Interactions" lists → our drug classes.
// A term uses the first pattern it matches. `to` tests a class from drugClasses.js.
const ANY = (...tests) => (c) => tests.some((t) => t(c))
const is = (name) => (c) => c === name
const starts = (prefix) => (c) => c.startsWith(prefix)
const has = (part) => (c) => c.includes(part)
const NONE = () => false

const CLASS_PATTERNS = [
  { re: /potassium[- ]sparing|insulin secretagogue|coumarin|antivitamin k|anticoagulant-related|lupus anticoagulant/, to: NONE },
  { re: /\bstatins?\b|hmg-?coa reductase/, to: starts('Statin') },
  { re: /\bace\b[- ]?inhibitor|angiotensin[- ]converting[- ]enzyme.*inhibitor|\(ace\) inhibitor/, to: is('ACE inhibitor') },
  { re: /^arbs?$|angiotensin (ii )?receptor (blocker|antagonist)/, to: has('(ARB)') },
  { re: /dual blockade of the renin|renin-angiotensin-aldosterone system/, to: ANY(is('ACE inhibitor'), has('(ARB)')) },
  { re: /beta[- ]?blockers?|beta[- ]adren\w* block/, to: is('Beta blocker') },
  { re: /^dihydropyridine calcium channel/, to: starts('Dihydropyridine') },
  { re: /calcium channel block/, to: has('calcium channel blocker') },
  { re: /loop diuretic/, to: is('Loop diuretic') },
  { re: /thiazide/, to: is('Thiazide diuretic') },
  { re: /^diuretics?( therapy)?$/, to: ANY(is('Loop diuretic'), is('Thiazide diuretic')) },
  { re: /^(direct oral |oral )?anticoagulants?( therapy| drugs| agents| medications)?$/, to: has('anticoagulant') },
  { re: /sglt-?2/, to: starts('SGLT2') },
  { re: /glp-?1/, to: starts('GLP-1') },
  { re: /^insulins?$/, to: has('insulin') },
  { re: /^oral (antidiabet|hypoglyc)/, to: has('(antidiabetic)') },
  { re: /antidiabet|hypoglyc(a)?emic agents/, to: ANY(has('(antidiabetic)'), starts('GLP-1'), has('insulin')) },
  { re: /proton pump inhibitor|^ppis?$/, to: is('Proton pump inhibitor') },
  { re: /benzodiazepine/, to: is('Benzodiazepine') },
  { re: /^ssris?$|selective serotonin reuptake|^serotonin reuptake inhibitors$|^(other )?antidepressants?$/, to: starts('SSRI') },
  { re: /macrolide/, to: starts('Macrolide') },
  { re: /fluoroquinolone|^quinolones?$/, to: starts('Fluoroquinolone') },
  { re: /^penicillins?$/, to: starts('Penicillin') },
  { re: /^cephalosporins?$/, to: starts('Cephalosporin') },
  { re: /^(systemic )?corticosteroids?$/, to: is('Corticosteroid') },
  {
    re: /antihypertensive/,
    to: ANY(is('ACE inhibitor'), has('(ARB)'), is('Beta blocker'), has('calcium channel blocker'), has('diuretic')),
  },
]

export function ingredientSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// "Amoxicillin + Clavulanate" → ['amoxicillin', 'clavulanate']
function components(name) {
  return name.toLowerCase().split(' + ').map((s) => s.trim())
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function splitTerms(text) {
  if (isMissing(text)) return []
  return text
    .split(/[,;]\s*/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
}

// Specific isoforms only ("CYP3A4", not the family "CYP3A")
function cypIsoforms(text) {
  if (isMissing(text)) return []
  return [...new Set(text.toUpperCase().match(/CYP\d[A-Z]\d+/g) ?? [])]
}

// Values that are true for at least half of the products that state anything
function majority(sets, min = 0.5) {
  const stated = sets.filter((s) => s && s.size)
  if (!stated.length) return []
  const counts = new Map()
  stated.forEach((s) => s.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1)))
  return [...counts].filter(([, c]) => c / stated.length >= min).map(([v]) => v).sort()
}

const cache = new WeakMap() // details file → index

export function buildIndex(details, aeData) {
  const groups = productsByIngredient(details)
  const names = [...groups.keys()].sort((a, b) => a.localeCompare(b))
  const nameRes = names.map((name) => ({
    name,
    res: components(name).map((c) => new RegExp(`\\b${escapeRe(c)}\\b`)),
  }))

  // What each interaction term points at (cached: ~1,500 distinct terms)
  const termInfo = new Map()
  function infoFor(term) {
    if (termInfo.has(term)) return termInfo.get(term)
    const comps = new Set()
    nameRes.forEach(({ name, res }) =>
      components(name).forEach((c, i) => res[i].test(term) && comps.add(c)),
    )
    const pattern = CLASS_PATTERNS.find((p) => p.re.test(term))
    const info = { components: comps, classTest: pattern?.to ?? NONE }
    termInfo.set(term, info)
    return info
  }

  const ingredients = names.map((name) => {
    const products = groups.get(name).map((p) => {
      const rows = p.listings.map((id) => detailsFor(details, id)).filter(Boolean)
      const terms = [...new Set(rows.flatMap((d) => splitTerms(d.interactions)))]
      return {
        product: p,
        terms: terms.map((t) => ({ term: t, ...infoFor(t) })),
        cyp: new Set(rows.flatMap((d) => cypIsoforms(d.metabolism))),
        ae: termsForProduct(aeData, p),
      }
    })
    return {
      name,
      slug: ingredientSlug(name),
      components: components(name),
      classes: classesFor(name).filter((c) => c !== 'Unclassified'),
      products,
      cyp: majority(products.map((p) => p.cyp)),
      // adverse events listed by at least half of this ingredient's products
      commonAe: new Set(majority(products.map((p) => p.ae))),
    }
  })

  const bySlug = new Map(ingredients.map((i) => [i.slug, i]))
  const byProductId = new Map()
  ingredients.forEach((i) => i.products.forEach(({ product }) => byProductId.set(product.id, i)))
  return { ingredients, bySlug, byProductId }
}

// null while the data files load, then the index
export function useInteractionIndex() {
  const details = useDrugDetails()
  const aeData = useAdverseEvents()
  if (!details || !aeData) return null
  if (!cache.has(details)) cache.set(details, buildIndex(details, aeData))
  return cache.get(details)
}

// URL tokens (ingredient slugs, or product ids from the drug page / Saved) → ingredients
export function resolveSelection(index, tokens) {
  const out = []
  for (const t of tokens) {
    const ing = index.bySlug.get(t) ?? index.byProductId.get(t)
    if (ing && !out.includes(ing)) out.push(ing)
  }
  return out.slice(0, MAX_DRUGS)
}

function topTerms(counts, n = 3) {
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([t]) => t)
}

// How A's monographs mention B
function direction(a, b) {
  const shared = new Set(a.components.filter((c) => b.components.includes(c)))
  const targets = b.components.filter((c) => !shared.has(c))
  // a class both drugs belong to is left out: "ACE inhibitors" on an ACE inhibitor's label
  // is about adding another one, which "Same drug class" already covers
  const classes = b.classes.filter((c) => !a.classes.includes(c))
  let byName = 0
  let byClass = 0
  const nameTerms = new Map()
  const classTerms = new Map()
  for (const p of a.products) {
    const named = p.terms.filter((t) => targets.some((c) => t.components.has(c)))
    const viaClass = p.terms.filter((t) => classes.some((c) => t.classTest(c)))
    named.forEach((t) => nameTerms.set(t.term, (nameTerms.get(t.term) ?? 0) + 1))
    if (named.length) byName += 1
    else if (viaClass.length) {
      byClass += 1
      viaClass.forEach((t) => classTerms.set(t.term, (classTerms.get(t.term) ?? 0) + 1))
    }
  }
  return {
    from: a,
    to: b,
    total: a.products.length,
    byName,
    byClass,
    nameTerms: topTerms(nameTerms),
    classTerms: topTerms(classTerms),
  }
}

function gradeOf(ab, ba) {
  if (ab.byName && ba.byName) return 'both'
  if (ab.byName || ba.byName) return 'one'
  if (ab.byClass || ba.byClass) return 'class'
  return null
}

// Everything the page shows for a set of ingredients
export function checkInteractions(selected) {
  const pairs = []
  const quiet = [] // pairs neither side mentions
  for (let i = 0; i < selected.length; i += 1) {
    for (let j = i + 1; j < selected.length; j += 1) {
      const a = selected[i]
      const b = selected[j]
      const ab = direction(a, b)
      const ba = direction(b, a)
      const grade = gradeOf(ab, ba)
      const sharedCyp = a.cyp.filter((c) => b.cyp.includes(c))
      if (!grade) {
        quiet.push({ a, b })
        continue
      }
      const share = (d) => (d.byName + d.byClass) / d.total
      pairs.push({ a, b, ab, ba, grade, sharedCyp, strength: Math.max(share(ab), share(ba)) })
    }
  }
  const order = GRADES.map((g) => g.id)
  pairs.sort((x, y) => order.indexOf(x.grade) - order.indexOf(y.grade) || y.strength - x.strength)

  // Shared metabolism: CYP isoform → ingredients
  const cyp = new Map()
  selected.forEach((s) => s.cyp.forEach((c) => cyp.set(c, [...(cyp.get(c) ?? []), s])))
  const enzymes = [...cyp]
    .map(([name, drugs]) => ({ name, drugs }))
    .sort((x, y) => y.drugs.length - x.drugs.length || x.name.localeCompare(y.name))
  const noCyp = selected.filter((s) => !s.cyp.length)

  // Same drug class (possible duplicate therapy)
  const cls = new Map()
  selected.forEach((s) => s.classes.forEach((c) => cls.set(c, [...(cls.get(c) ?? []), s])))
  const sameClass = [...cls].filter(([, d]) => d.length > 1).map(([name, drugs]) => ({ name, drugs }))

  // Adverse events common to more than one selected drug
  const ae = new Map()
  selected.forEach((s) => s.commonAe.forEach((t) => ae.set(t, [...(ae.get(t) ?? []), s])))
  const sharedAe = [...ae]
    .filter(([, d]) => d.length > 1)
    .map(([term, drugs]) => ({ term, drugs }))
    .sort((x, y) => y.drugs.length - x.drugs.length || x.term.localeCompare(y.term))

  return { pairs, quiet, enzymes, noCyp, sameClass, sharedAe }
}

// Ingredients the selected drugs' labels name most often (for "+ Add" suggestions)
export function partnerSuggestions(index, selected, limit = 3) {
  const score = new Map()
  for (const s of selected) {
    for (const other of index.ingredients) {
      if (selected.includes(other)) continue
      const d = direction(s, other)
      if (d.byName) score.set(other, (score.get(other) ?? 0) + d.byName / d.total)
    }
  }
  return [...score]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([i]) => i)
}
