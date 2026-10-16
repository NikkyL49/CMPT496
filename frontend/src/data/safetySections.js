// Which MedDRA organ categories each safety section covers, per monograph,
// from safety_sections.json (built by scripts/build-safety-sections.mjs).
// Loaded on demand, like adverseEvents.js.
// TODO: once the source data links each term to its category, add the terms
// as the sunburst's outer ring.
import { useEffect, useState } from 'react'

// Order and colours of the sections in the sunburst. Red/orange/yellow are
// reserved for severity. Checked with the dataviz validator: colour-blind
// safe for every pair that can touch, including last → first around the ring.
// Green and pink are under 3:1 on white, so arcs also carry text labels and
// there's a table view.
// `short` labels the arcs; `label` the legend, tooltips and table.
export const SECTIONS = [
  { key: 'ae', label: 'Adverse events', short: 'Adverse events', color: '#3083b0', ink: '#fff' },
  { key: 'contra', label: 'Contraindications', short: 'Contraindications', color: '#1baf7a', ink: '#000' },
  { key: 'warn', label: 'Warnings & precautions', short: 'Warnings', color: '#6250d6', ink: '#fff' },
  { key: 'preg', label: 'Pregnancy', short: 'Pregnancy', color: '#e87ba4', ink: '#000' },
  { key: 'breast', label: 'Breastfeeding', short: 'Breastfeeding', color: '#008300', ink: '#fff' },
]

// Short names for the 27 MedDRA System Organ Classes, for arc labels
const SHORT_SOC = {
  'Blood and lymphatic system disorders': 'Blood & lymph',
  'Congenital, familial and genetic disorders': 'Congenital',
  'Ear and labyrinth disorders': 'Ear',
  'General disorders and administration site conditions': 'General',
  'Infections and infestations': 'Infections',
  'Injury, poisoning and procedural complications': 'Injury & poisoning',
  'Metabolism and nutrition disorders': 'Metabolism',
  'Musculoskeletal and connective tissue disorders': 'Musculoskeletal',
  'Neoplasms benign, malignant and unspecified (incl cysts and polyps)': 'Neoplasms',
  'Pregnancy, puerperium and perinatal conditions': 'Pregnancy & perinatal',
  'Renal and urinary disorders': 'Renal & urinary',
  'Reproductive system and breast disorders': 'Reproductive',
  'Respiratory, thoracic and mediastinal disorders': 'Respiratory',
  'Skin and subcutaneous tissue disorders': 'Skin',
  'Social circumstances': 'Social',
  'Surgical and medical procedures': 'Procedures',
}

export function shortSoc(name) {
  return SHORT_SOC[name] ?? name.replace(/ disorders$/, '')
}

let pending = null

export function loadSafetySections() {
  pending ??= import('./safety_sections.json').then((m) => m.default)
  return pending
}

// null while loading, then { socs, terms, byId }
export function useSafetySections() {
  const [data, setData] = useState(null)
  useEffect(() => {
    let active = true
    loadSafetySections().then((d) => active && setData(d))
    return () => {
      active = false
    }
  }, [])
  return data
}

// { [section key]: { socs: [names A–Z], terms: [names A–Z] | null } } for a
// product (union across its strengths), or null if none of its listings are
// in the file. AE terms are null here: they come from adverseEvents.js.
export function sectionsForProduct(data, product) {
  if (!data) return null
  const entries = product.listings.map((id) => data.byId[id]).filter(Boolean)
  if (!entries.length) return null
  const out = {}
  for (const { key } of SECTIONS) {
    const parts = entries.map((e) => e[key]).filter(Boolean)
    if (!parts.length) continue
    const names = (list, pick) =>
      [...new Set(parts.flatMap((p) => p[pick] ?? []))].map((i) => list[i]).sort((a, b) => a.localeCompare(b))
    out[key] = {
      socs: names(data.socs, 's'),
      terms: key === 'ae' ? null : names(data.terms, 't'),
    }
  }
  return out
}
