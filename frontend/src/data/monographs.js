// Loads drug_monographs_dates.json and turns it into comparable products.
//
// The raw file has one entry per strength (e.g. "ACH-AMLODIPINE 10mg",
// "ACH-AMLODIPINE 5mg"). Here we:
//   1. clean the dates (Excel serial numbers, "November 28, 2019",
//      "No date available", ...),
//   2. merge strengths of the same brand + company into one product,
//   3. work out a drug "family" (e.g. Amlodipine) for grouping and suggestions.
// TODO: once the backend exists, fetch this from the API instead.
import raw from './drug_monographs_dates.json'

const MISSING = new Set(['', 'no date available', 'no information', 'extraction_failed'])

// Returns { iso: 'YYYY-MM-DD', approx: bool } or null when the date is missing
export function parseDate(value) {
  if (value == null) return null
  const v = String(value).trim()
  if (MISSING.has(v.toLowerCase())) return null

  // 2023-09-21
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return { iso: v, approx: false }

  // Excel serial day number, e.g. 45180 → 2023-09-11
  if (/^\d{5}$/.test(v)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Number(v) * 86400000)
    return { iso: d.toISOString().slice(0, 10), approx: false }
  }

  // Year only, e.g. "2025" — keep, but mark as approximate
  if (/^\d{4}$/.test(v)) return { iso: `${v}-01-01`, approx: true }

  // "November 28, 2019"
  const d = new Date(`${v} UTC`)
  if (!Number.isNaN(d.getTime())) return { iso: d.toISOString().slice(0, 10), approx: false }

  return null
}

export function formatDate(date) {
  if (!date) return 'No date available'
  return date.approx ? `${date.iso.slice(0, 4)} (year only)` : date.iso
}

// "ACH-AMLODIPINE 10mg"  → brand "ACH-AMLODIPINE", strength "10 mg"
// "AMLODIPINE 10mg-2"    → same brand name, another listing (the -2 suffix)
// "ATORVASTATIN-20"      → brand "ATORVASTATIN", strength "20" (no unit given)
// "Teva 250mg5ml suspension" → strength "250 mg/5 ml"
function cleanStrength(text) {
  const t = text
    .replace(/(\d),(\d)/g, '$1.$2') // 2,5mg → 2.5mg
    .replace(/\bgm\b|(\d)gm\b/gi, (m, d) => (d ? `${d}g` : 'g'))
    .trim()
  let m = t.match(/^([\d.]+)\s*(mg|mcg|g)\s*\/?\s*([\d.]+)\s*ml\b/i) // 250mg5ml
  if (m) return `${m[1]} ${m[2].toLowerCase()}/${m[3]} ml`
  m = t.match(/^([\d.]+)\s*(mg|mcg|g|%|iu|units?)(?![a-z])\s*(ml\b)?/i)
  if (m) return `${m[1]} ${m[2].toLowerCase()}${m[3] ? '/ml' : ''}`
  m = t.match(/^([\d.]+)$/) // bare number
  if (m) return m[1]
  return t || null // unusual format: keep the original text
}

function splitId(id) {
  let s = id.trim()
  // listing suffix "-2"/"_3" at the very end, unless it is the only number
  const suffix = s.match(/[-_](\d)$/)
  if (suffix && /\d/.test(s.slice(0, -2))) s = s.slice(0, -2)
  // strength glued on with a hyphen: "ATORVASTATIN-10", "Apotex-500mg"
  s = s.replace(/([A-Za-z)])\s*-\s*(\d)/, '$1 $2')
  const words = s.split(/\s+/)
  const idx = words.findIndex((w) => /^\d/.test(w))
  if (idx <= 0) return { brand: s, strength: null }
  return {
    brand: words.slice(0, idx).join(' '),
    strength: cleanStrength(words.slice(idx).join(' ')),
  }
}

// Manufacturer prefixes, so "APO-AMLODIPINE" and "AG-AMLODIPINE" group together
const PREFIXES = new Set([
  'AA', 'ACCEL', 'ACH', 'ACT', 'AG', 'AHI', 'ALTA', 'AURO', 'APO', 'BIO', 'DOM',
  'GLN', 'JAMP', 'LUPIN', 'M', 'MAR', 'MINT', 'MYL', 'MYLAN', 'NAT', 'NRA',
  'PDP', 'PHARMA', 'PMS', 'PMSC', 'PRO', 'PRZ', 'RAN', 'REDDY', 'RIVA',
  'SANDOZ', 'SEPTA', 'SIVEM', 'SPC', 'TARO', 'TEVA', 'VAN', 'ZYM',
])

// Brand names don't contain the ingredient, so map the ones in the dataset.
// Combination products are filed under their main ingredient.
// Add to this list when new brands appear in the data.
const BRAND_INGREDIENT = {
  ALTACE: 'Ramipril', AMOXI: 'Amoxicillin-clavulanate', AMOXICLAV: 'Amoxicillin-clavulanate',
  ATACAND: 'Candesartan', ATIVAN: 'Lorazepam', AZITHROMYCINE: 'Azithromycin',
  CILOXAN: 'Ciprofloxacin', CIPRODEX: 'Ciprofloxacin', CLAVULIN: 'Amoxicillin-clavulanate',
  COVERSYL: 'Perindopril', COZAAR: 'Losartan', CRESTOR: 'Rosuvastatin', DIASTAT: 'Diazepam',
  ELIQUIS: 'Apixaban', ENALAPRILAT: 'Enalapril', FORXIGA: 'Dapagliflozin',
  GLUCOPHAGE: 'Metformin', GLUMETZA: 'Metformin', INHIBACE: 'Cilazapril',
  INVOKAMET: 'Canagliflozin', INVOKANA: 'Canagliflozin', IVOZFO: 'Fosfomycin',
  JARDIANCE: 'Empagliflozin', LASIX: 'Furosemide', LIPITOR: 'Atorvastatin', LOSEC: 'Omeprazole',
  MAVIK: 'Trandolapril', MICARDIS: 'Telmisartan', MONUROL: 'Fosfomycin', NEXIUM: 'Esomeprazole',
  NORVASC: 'Amlodipine', OTIXAL: 'Ciprofloxacin', OZEMPIC: 'Semaglutide', PANTOLOC: 'Pantoprazole',
  PARIET: 'Rabeprazole', PEN: 'Penicillin V', QUINSAIR: 'Levofloxacin', RYBELSUS: 'Semaglutide',
  SAXENDA: 'Liraglutide', SEPTRA: 'Sulfamethoxazole-trimethoprim',
  SULFAMETHOXAZOLE: 'Sulfamethoxazole-trimethoprim', SULFATRIM: 'Sulfamethoxazole-trimethoprim',
  SYNJARDY: 'Empagliflozin', TECTA: 'Pantoprazole', TIAZAC: 'Diltiazem', TRULICITY: 'Dulaglutide',
  VALIUM: 'Diazepam', VASOTEC: 'Enalapril', VICTOZA: 'Liraglutide', VIGAMOX: 'Moxifloxacin',
  WEGOVY: 'Semaglutide', XARELTO: 'Rivaroxaban', XIGDUO: 'Dapagliflozin',
  XULTOPHY: 'Liraglutide', ZESTORETIC: 'Lisinopril', ZESTRIL: 'Lisinopril', ZOCOR: 'Simvastatin',
}

function familyOf(brand) {
  let words = brand.toUpperCase().split(/[\s-]+/).filter(Boolean)
  // drop known manufacturer prefixes and short codes like "NB-", "CO-"
  while (words.length > 1 && (PREFIXES.has(words[0]) || words[0].length <= 2)) {
    words = words.slice(1)
  }
  const core = (words[0] || brand).replace(/[^A-Z0-9]+$/i, '') // "PARIET," → "PARIET"
  if (BRAND_INGREDIENT[core]) return BRAND_INGREDIENT[core]
  return core.charAt(0) + core.slice(1).toLowerCase()
}

const slug = (s) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // "Ltée" → "Ltee"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Sort by amount, treating 1 g as 1000 mg
function strengthValue(s) {
  const n = parseFloat(s) || 0
  return /^[\d.]+ g\b/.test(s) ? n * 1000 : /^[\d.]+ mcg\b/.test(s) ? n / 1000 : n
}

function sortStrengths(list) {
  // bare numbers ("10") borrow the unit the product's other strengths use
  const units = new Set(list.map((s) => s.match(/^[\d.]+ ([a-z]+)$/i)?.[1]).filter(Boolean))
  const unit = units.size === 1 ? [...units][0] : null
  const filled = list.map((s) => (unit && /^[\d.]+$/.test(s) ? `${s} ${unit}` : s))
  return [...new Set(filled)].sort((a, b) => strengthValue(a) - strengthValue(b))
}

function buildProducts(rows) {
  const byKey = new Map()
  const seen = new Set()
  for (const row of rows) {
    if (seen.has(row.ID)) continue // the file has one exact duplicate
    seen.add(row.ID)
    const { brand, strength } = splitId(row.ID)
    const company = (row.Company || '').trim().replace(/\.$/, '')
    const key = `${brand}|${company.toLowerCase()}`
    if (!byKey.has(key)) {
      byKey.set(key, {
        id: slug(`${brand}-${company}`),
        brand,
        company,
        family: familyOf(brand),
        strengths: [],
        listings: [],
        variants: [], // [{ id: 'ACH-AMLODIPINE 10mg', strength: '10 mg' }] one per monograph ID
        authorized: null,
        revised: null,
      })
    }
    const p = byKey.get(key)
    if (strength && !p.strengths.includes(strength)) p.strengths.push(strength)
    p.listings.push(row.ID)
    p.variants.push({ id: row.ID, strength })
    const auth = parseDate(row['Initial Authorization'])
    const rev = parseDate(row['Revision Date'])
    // earliest authorization, latest revision across strengths
    if (auth && (!p.authorized || auth.iso < p.authorized.iso)) p.authorized = auth
    if (rev && (!p.revised || rev.iso > p.revised.iso)) p.revised = rev
  }

  // Shortened names join the full family: "Diltiaz" → "Diltiazem"
  const familySize = new Map()
  byKey.forEach((p) => familySize.set(p.family, (familySize.get(p.family) ?? 0) + 1))
  const families = [...familySize.keys()]
  byKey.forEach((p) => {
    if (p.family.length < 5) return
    const fuller = families.find(
      (f) => f !== p.family && f.startsWith(p.family) && familySize.get(f) > familySize.get(p.family),
    )
    if (fuller) p.family = fuller
  })

  // Make ids unique ("X, USP" and "X USP" from one company slug the same)
  const usedIds = new Map()
  byKey.forEach((p) => {
    const n = usedIds.get(p.id) ?? 0
    usedIds.set(p.id, n + 1)
    if (n) p.id = `${p.id}-${n + 1}`
  })

  const products = [...byKey.values()].map((p) => ({
    ...p,
    strengths: sortStrengths(p.strengths),
    variants: [...p.variants].sort((a, b) => strengthValue(a.strength ?? '') - strengthValue(b.strength ?? '')),
    // Revision earlier than authorization means one of the two dates is wrong
    dateConflict: !!(p.authorized && p.revised && p.revised.iso < p.authorized.iso),
  }))

  // Same brand name from different companies (e.g. "AMLODIPINE") → add company
  const nameCount = new Map()
  products.forEach((p) => nameCount.set(p.brand, (nameCount.get(p.brand) ?? 0) + 1))
  products.forEach((p) => {
    p.label = nameCount.get(p.brand) > 1 ? `${p.brand} · ${shortCompany(p.company)}` : p.brand
  })

  return products.sort((a, b) => a.label.localeCompare(b.label))
}

function shortCompany(company) {
  return company
    .replace(/\b(inc|ulc|ltd|llc|corp(oration)?|canada|pharma(ceuticals?)?|healthcare|limited)\b\.?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim() || company
}

export const monographs = buildProducts(raw)
export const monographById = new Map(monographs.map((p) => [p.id, p]))

// ["2.5 mg", "5 mg", "10 mg"] → "2.5/5/10 mg"
export function strengthsLabel(p) {
  if (!p.strengths.length) return '—'
  const parts = p.strengths.map((s) => s.match(/^([\d.]+) ([a-z%]+)$/i))
  if (parts.every(Boolean) && new Set(parts.map((m) => m[2])).size === 1) {
    return `${parts.map((m) => m[1]).join('/')} ${parts[0][2]}`
  }
  return p.strengths.join(', ')
}

// Other products in the same family, for "+ suggestion" chips
export function suggestionsFor(selected, limit = 3) {
  const families = new Set(selected.map((p) => p.family))
  const ids = new Set(selected.map((p) => p.id))
  return monographs
    .filter((p) => families.has(p.family) && !ids.has(p.id))
    .sort((a, b) => (b.revised?.iso ?? '').localeCompare(a.revised?.iso ?? ''))
    .slice(0, limit)
}

export function searchMonographs(query, excludeIds = new Set(), limit = 8) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored = []
  for (const p of monographs) {
    if (excludeIds.has(p.id)) continue
    const label = p.label.toLowerCase()
    let score = 0
    if (label.startsWith(q)) score = 4
    else if (p.family.toLowerCase().startsWith(q)) score = 3
    else if (label.includes(q)) score = 2
    else if (p.company.toLowerCase().includes(q)) score = 1
    if (score) scored.push([score, p])
  }
  return scored
    .sort((a, b) => b[0] - a[0] || a[1].label.localeCompare(b[1].label))
    .slice(0, limit)
    .map(([, p]) => p)
}

// Find the product for a brand name (+ company), e.g. to link the sample
// drugs on Search/Saved to their real drug page. Returns undefined if none.
export function findProduct(brand, company = '') {
  const b = brand.trim().toUpperCase()
  const c = company.trim().toLowerCase().split(/\s+/)[0] ?? ''
  const sameBrand = monographs.filter((p) => p.brand.toUpperCase() === b)
  return sameBrand.find((p) => c && p.company.toLowerCase().startsWith(c)) ?? sameBrand[0]
}

// Product that a monograph ID ("ACH-AMLODIPINE 10mg") belongs to
const productByListing = new Map(monographs.flatMap((p) => p.listings.map((id) => [id, p])))
export function productForListing(id) {
  return productByListing.get(id)
}
