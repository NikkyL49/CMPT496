// Builds src/data/safety_sections.json from the MedDRA monograph CSV.
//
// For each monograph, which MedDRA organ categories (System Organ Classes,
// SOCs) each safety section covers, plus the terms of the non-AE sections:
//   ID                                          (matches drug_monographs_dates.json)
//   <Section> MedDRA Primary SOCs               (pipe-separated)
//   <Section> MedDRA Preferred Terms            (pipe-separated)
// The Compare page's safety sunburst uses it.
//
// Usage (from the frontend folder):
//   node scripts/build-safety-sections.mjs path/to/canadian_drug_monographs_all_applicable_meddra_v27.csv
//
// Output shape (compact: each string is stored once):
//   {
//     "source": "<csv file name>",
//     "socs":  ["Blood and lymphatic system disorders", ...],   // sorted A–Z
//     "terms": ["Aortic stenosis", ...],                        // non-AE section terms, A–Z
//     "byId": {                                                 // non-empty sections only
//       "ACH-AMLODIPINE 10mg": {
//         "ae":     { "s": [socs indexes] },                    // AE terms: adverse_event_terms.json
//         "contra": { "s": [socs indexes], "t": [terms indexes] },
//         ...
//       }
//     }
//   }
//
// The CSV doesn't say which category each term belongs to, only which
// categories a section covers overall, so the two lists stay separate.
// Broken quoting in some rows shifts their columns; rows without a valid
// Record Key, or with anything but the 27 MedDRA SOCs as categories, are skipped.
import { writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv, splitList } from './csv.mjs'

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node scripts/build-safety-sections.mjs <path-to-csv>')
  process.exit(1)
}
const outPath = join(dirname(fileURLToPath(import.meta.url)), '../src/data/safety_sections.json')

// Short keys used by the app → CSV column prefix
const SECTIONS = {
  ae: 'Adverse Event',
  contra: 'Contraindication',
  warn: 'Warning/Precaution',
  preg: 'Pregnancy Safety',
  breast: 'Breastfeeding Safety',
}

// The 27 MedDRA System Organ Classes
const MEDDRA_SOCS = new Set([
  'Blood and lymphatic system disorders',
  'Cardiac disorders',
  'Congenital, familial and genetic disorders',
  'Ear and labyrinth disorders',
  'Endocrine disorders',
  'Eye disorders',
  'Gastrointestinal disorders',
  'General disorders and administration site conditions',
  'Hepatobiliary disorders',
  'Immune system disorders',
  'Infections and infestations',
  'Injury, poisoning and procedural complications',
  'Investigations',
  'Metabolism and nutrition disorders',
  'Musculoskeletal and connective tissue disorders',
  'Neoplasms benign, malignant and unspecified (incl cysts and polyps)',
  'Nervous system disorders',
  'Pregnancy, puerperium and perinatal conditions',
  'Product issues',
  'Psychiatric disorders',
  'Renal and urinary disorders',
  'Reproductive system and breast disorders',
  'Respiratory, thoracic and mediastinal disorders',
  'Skin and subcutaneous tissue disorders',
  'Social circumstances',
  'Surgical and medical procedures',
  'Vascular disorders',
])

const { rows, col } = readCsv(csvPath)
const ID = col('ID')
const KEY = col('Record Key') // HCX-000001; anything else means shifted columns
const cols = Object.entries(SECTIONS).map(([key, name]) => ({
  key,
  socs: col(`${name} MedDRA Primary SOCs`),
  terms: col(`${name} MedDRA Preferred Terms`),
}))

// `${id}\t${section}` → { socs: Set, terms: Set }. Union, because the CSV
// lists one ID twice with different terms.
const found = new Map()
const skipped = []
for (const r of rows) {
  const valid =
    /^HCX-\d+$/.test(r[KEY]) &&
    cols.every((c) => splitList(r[c.socs] ?? '').every((s) => MEDDRA_SOCS.has(s)))
  if (!valid) {
    skipped.push(r[ID].trim().slice(0, 40))
    continue
  }
  const id = r[ID].trim()
  for (const c of cols) {
    const key = `${id}\t${c.key}`
    const entry = found.get(key) ?? { socs: new Set(), terms: new Set() }
    splitList(r[c.socs]).forEach((s) => entry.socs.add(s))
    if (c.key !== 'ae') splitList(r[c.terms]).forEach((t) => entry.terms.add(t))
    found.set(key, entry)
  }
}

const indexOf = (list) => new Map(list.map((x, i) => [x, i]))
const sorted = (pick) =>
  [...new Set([...found.values()].flatMap((e) => [...pick(e)]))].sort((a, b) => a.localeCompare(b))
const socs = sorted((e) => e.socs)
const terms = sorted((e) => e.terms)
const socIndex = indexOf(socs)
const termIndex = indexOf(terms)
const toIndexes = (set, index) => [...set].map((x) => index.get(x)).sort((a, b) => a - b)

const byId = {}
for (const [key, { socs: s, terms: t }] of found) {
  if (!s.size) continue
  const [id, section] = key.split('\t')
  byId[id] ??= {}
  byId[id][section] = { s: toIndexes(s, socIndex) }
  if (t.size) byId[id][section].t = toIndexes(t, termIndex)
}

writeFileSync(outPath, JSON.stringify({ source: basename(csvPath), socs, terms, byId }))
console.log(
  `Wrote ${outPath}\n  ${Object.keys(byId).length} monographs, ${socs.length} organ categories, ${terms.length} terms`,
)
if (skipped.length) {
  console.warn(`  Skipped ${skipped.length} malformed rows: ${skipped.join(' · ')}`)
}
