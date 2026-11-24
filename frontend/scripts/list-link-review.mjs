// Writes a CSV of the monograph links that need a manual check before launch:
//   - links matched with low confidence (match score under 0.8)
//   - DINs shared by more than one monograph in our data
// The drug page's Source tab already warns on these; this is the to-do list.
//
//   cd frontend
//   node scripts/list-link-review.mjs            → link_review.csv
//   node scripts/list-link-review.mjs out.csv
//
// Fill in the "Checked" and "Correct link?" columns as you go (open the DPD
// page, confirm the brand, company and strength match the monograph).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const OUT = process.argv[2] ?? path.join(here, '../link_review.csv')
const LOW = 0.8

const data = JSON.parse(fs.readFileSync(path.join(here, '../src/data/drug_details.json'), 'utf8'))
const s = data.strings
const byDin = new Map()
for (const [id, e] of Object.entries(data.byId)) {
  if (e.din) byDin.set(e.din, [...(byDin.get(e.din) ?? []), id])
}

const rows = []
for (const [id, e] of Object.entries(data.byId)) {
  const shared = e.din ? byDin.get(e.din).filter((x) => x !== id) : []
  const low = e.matchScore != null && e.matchScore < LOW
  if (!low && !shared.length) continue
  rows.push({
    Monograph: id,
    Ingredient: s[e.ingredient] ?? '',
    DIN: e.din ?? '',
    'Match score': e.matchScore ?? '',
    Reason: [low && 'Low-confidence match', shared.length && 'DIN shared'].filter(Boolean).join('; '),
    'Shares DIN with': shared.join(' | '),
    'DPD page': e.dpdUrl ?? '',
    'Monograph PDF': e.pdfUrl ?? '',
    Checked: '',
    'Correct link?': '',
    Notes: '',
  })
}
rows.sort((a, b) => (a['Match score'] === '' ? 2 : a['Match score']) - (b['Match score'] === '' ? 2 : b['Match score']) || a.Monograph.localeCompare(b.Monograph))

const cell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))
const header = Object.keys(rows[0] ?? { Monograph: '' })
fs.writeFileSync(OUT, [header, ...rows.map((r) => header.map((h) => r[h]))].map((r) => r.map(cell).join(',')).join('\n') + '\n')
const lowCount = rows.filter((r) => r.Reason.includes('Low')).length
const sharedCount = rows.filter((r) => r.Reason.includes('shared')).length
console.log(`${rows.length} links to check (${lowCount} low-confidence, ${sharedCount} with a shared DIN) → ${path.relative(process.cwd(), OUT)}`)
