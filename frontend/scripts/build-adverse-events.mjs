// Builds src/data/adverse_event_terms.json from the MedDRA monograph CSV.
//
// Keeps only what the Compare page's adverse-event grid needs:
//   ID                                   (matches drug_monographs_dates.json)
//   Adverse Event MedDRA Preferred Terms (pipe-separated)
//   Adverse Event MedDRA Version
//
// Usage (from the frontend folder):
//   node scripts/build-adverse-events.mjs path/to/canadian_drug_monographs_all_applicable_meddra_v27.csv
//
// Output shape (compact: each term string is stored once):
//   {
//     "meddraVersion": "27.0",
//     "source": "<csv file name>",
//     "terms": ["Abdominal pain", "Abnormal dreams", ...],       // sorted A–Z
//     "byId":  { "ACH-AMLODIPINE 10mg": [0, 1, 7, ...], ... }    // indexes into terms
//   }
import { writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readCsv } from './csv.mjs'

const csvPath = process.argv[2]
if (!csvPath) {
  console.error('Usage: node scripts/build-adverse-events.mjs <path-to-csv>')
  process.exit(1)
}
const outPath = join(dirname(fileURLToPath(import.meta.url)), '../src/data/adverse_event_terms.json')

const { rows, col } = readCsv(csvPath)
const ID = col('ID')
const PTS = col('Adverse Event MedDRA Preferred Terms')
const VERSION = col('Adverse Event MedDRA Version')

const termsById = new Map()
const versions = new Set()
for (const r of rows) {
  const id = r[ID].trim()
  const terms = r[PTS].split('|').map((t) => t.trim()).filter(Boolean)
  if (r[VERSION]) versions.add(r[VERSION])
  // The CSV lists one ID twice with different terms: keep the union
  const set = termsById.get(id) ?? new Set()
  terms.forEach((t) => set.add(t))
  termsById.set(id, set)
}

const allTerms = [...new Set([...termsById.values()].flatMap((s) => [...s]))].sort((a, b) =>
  a.localeCompare(b),
)
const index = new Map(allTerms.map((t, i) => [t, i]))
const byId = {}
for (const [id, set] of termsById) {
  byId[id] = [...set].map((t) => index.get(t)).sort((a, b) => a - b)
}

const out = {
  meddraVersion: [...versions].map((v) => (String(v).includes('.') ? v : `${v}.0`)).join(', '),
  source: basename(csvPath),
  terms: allTerms,
  byId,
}
writeFileSync(outPath, JSON.stringify(out))
console.log(
  `Wrote ${outPath}\n  ${Object.keys(byId).length} monographs, ${allTerms.length} distinct terms, MedDRA ${out.meddraVersion}`,
)
