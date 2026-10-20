// Builds src/data/drug_details.json for the drug overview page (#/drug/...).
//
// Inputs:
//   1. canadian_drug_monographs_all_applicable_meddra_v27.csv  (monograph content)
//   2. pdf_links_cache.json                                    (DIN + Health Canada links)
//
// Keeps only the columns the drug page shows. Left out on purpose (too big for
// the browser, not on the page yet): Pharmacokinetics, Pharmacodynamics and the
// raw "Adverse Events" text. Adverse-event terms come from adverse_event_terms.json.
//
// Usage (from the frontend folder):
//   node scripts/build-drug-details.mjs path/to/the.csv path/to/pdf_links_cache.json
//
// Output shape — long texts are often identical across strengths, so every text
// value is stored once in `strings` and fields hold its index:
//   {
//     "strings": ["Hypertension, angina", ...],
//     "byId": {
//       "ACH-AMLODIPINE 10mg": {
//         "ingredient": 0, "ingredients": 1, "dosage": 2, "indication": 3, ...,
//         "indicationTerms": [4, 5], ...,
//         "din": "02419572", "dpdUrl": "https://health-products.canada.ca/...",
//         "pdfUrl": "https://pdf.hres.ca/...", "matchScore": 1
//       }
//     }
//   }
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseCsv } from './lib/csv.mjs'

const [csvPath, linksPath] = process.argv.slice(2)
if (!csvPath || !linksPath) {
  console.error('Usage: node scripts/build-drug-details.mjs <monographs.csv> <pdf_links_cache.json>')
  process.exit(1)
}
const outPath = join(dirname(fileURLToPath(import.meta.url)), '../src/data/drug_details.json')

// CSV column → field name in the JSON
const TEXT_COLUMNS = {
  ingredient: 'Normalized Active Ingredient',
  ingredients: 'Ingredients',
  dosage: 'Dosage',
  indication: 'Indication of Use',
  contraindications: 'Contraindications',
  warnings: 'Serious warning and precautions',
  interactions: 'Drug Interactions',
  kidney: 'Kidney Function Dose Adjustment',
  liver: 'Liver Function Dose Adjustment',
  metabolism: 'Standardized Metabolism',
  pregnancy: 'Pregnancy Recommendation',
  pregnancySummary: 'Pregnancy Summary',
  breastfeeding: 'Breastfeeding Recommendation',
  breastfeedingSummary: 'Breastfeeding Summary',
}
// Pipe-separated MedDRA term lists
const LIST_COLUMNS = {
  indicationTerms: 'Indication MedDRA Preferred Terms',
  contraindicationTerms: 'Contraindication MedDRA Preferred Terms',
  warningTerms: 'Warning/Precaution MedDRA Preferred Terms',
  bodySystems: 'Adverse Event MedDRA Primary SOCs',
}

const text = readFileSync(csvPath, 'utf8').replace(/^﻿/, '')
const [header, ...rows] = parseCsv(text).filter((r) => r.length > 1)
const col = (name) => {
  const i = header.indexOf(name)
  if (i < 0) throw new Error(`Column not found: ${name}`)
  return i
}
const ID = col('ID')
const textIdx = Object.fromEntries(Object.entries(TEXT_COLUMNS).map(([k, c]) => [k, col(c)]))
const listIdx = Object.fromEntries(Object.entries(LIST_COLUMNS).map(([k, c]) => [k, col(c)]))

// Links file is keyed by the lower-case monograph ID
const links = JSON.parse(readFileSync(linksPath, 'utf8'))

const strings = []
const stringIndex = new Map()
const intern = (value) => {
  const v = (value ?? '').trim()
  if (!stringIndex.has(v)) {
    stringIndex.set(v, strings.length)
    strings.push(v)
  }
  return stringIndex.get(v)
}

const byId = {}
let withLinks = 0
for (const r of rows) {
  const id = r[ID].trim()
  if (byId[id]) continue // the CSV repeats one ID (PMS-QUINAPRIL 10mg); keep the first
  const entry = {}
  for (const [key, i] of Object.entries(textIdx)) entry[key] = intern(r[i])
  for (const [key, i] of Object.entries(listIdx)) {
    entry[key] = r[i].split('|').map((t) => t.trim()).filter(Boolean).map(intern)
  }
  const link = links[id.toLowerCase()]
  if (link) {
    withLinks++
    entry.din = link.din
    entry.drugCode = link.drug_code
    entry.dpdUrl = link.dpd_info_url
    entry.pdfUrl = link.pdf_url
    entry.matchScore = link.match_score
  }
  byId[id] = entry
}

writeFileSync(
  outPath,
  JSON.stringify({ sources: [basename(csvPath), basename(linksPath)], strings, byId }),
)
const kb = Math.round(readFileSync(outPath).length / 1024)
console.log(
  `Wrote ${outPath} (${kb} KB)\n  ${Object.keys(byId).length} monographs, ${withLinks} with DIN/links, ${strings.length} distinct text values`,
)
