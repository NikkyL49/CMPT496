// Monograph content for the drug page, from drug_details.json
// (built by scripts/build-drug-details.mjs from the MedDRA CSV + pdf_links_cache.json).
// ~2.7 MB (≈250 KB gzipped), so it's loaded on demand, not in the main bundle.
// TODO: replace with an API call per drug once the backend is connected.
import { useEffect, useState } from 'react'

let pending = null

export function loadDrugDetails() {
  pending ??= import('./drug_details.json').then((m) => m.default)
  return pending
}

// null while loading, then the raw { strings, byId } file
// enabled = false waits (e.g. until the user starts typing in a search box)
export function useDrugDetails(enabled = true) {
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!enabled) return
    let active = true
    loadDrugDetails().then((d) => active && setData(d))
    return () => {
      active = false
    }
  }, [enabled])
  return data
}

// Turn the string indexes back into text for one monograph ID
export function detailsFor(data, id) {
  const raw = data?.byId[id]
  if (!raw) return null
  const s = data.strings
  const out = {}
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) out[key] = value.map((i) => s[i])
    else if (typeof value === 'number' && !['drugCode', 'matchScore'].includes(key)) out[key] = s[value]
    else out[key] = value
  }
  return out
}

// Values the extraction uses when a section wasn't found
const MISSING = new Set(['', 'SECTION_NOT_FOUND', 'NO INFORMATION', 'NO', 'NAN', 'N/A'])
export function isMissing(value) {
  return value == null || MISSING.has(String(value).trim().toUpperCase())
}

// Recommendation → severity level used for colour + label
//   hi = contraindicated, md = not recommended / adjust dose,
//   lo = use with caution, ok = safe / no adjustment, none = not stated
export function recommendationLevel(value) {
  const v = String(value ?? '').toUpperCase()
  if (isMissing(value)) return 'none'
  if (v.includes('CONTRAINDICATED')) return 'hi'
  if (v.includes('NOT RECOMMENDED') || v.includes('DOSE ADJUSTMENT RECOMMENDED')) return 'md'
  if (v.includes('CAUTION')) return 'lo'
  if (v.includes('SAFE') || v.includes('NO DOSE ADJUSTMENT')) return 'ok'
  return 'none'
}

export function prettyRecommendation(value) {
  if (isMissing(value)) {
    return String(value).toUpperCase() === 'NO INFORMATION' ? 'No information' : 'Not stated in monograph'
  }
  const v = String(value).trim()
  return v === v.toUpperCase() ? v.charAt(0) + v.slice(1).toLowerCase() : v
}

// "Warfarin, Phenytoin (with X, Y), Rifampin" → ["Warfarin", "Phenytoin (with X, Y)", "Rifampin"]
export function splitList(text) {
  if (isMissing(text)) return []
  const out = []
  let depth = 0
  let current = ''
  for (const ch of text) {
    if (ch === '(') depth++
    if (ch === ')') depth = Math.max(0, depth - 1)
    if ((ch === ',' || ch === ';') && depth === 0) {
      if (current.trim()) out.push(current.trim())
      current = ''
    } else current += ch
  }
  if (current.trim()) out.push(current.trim())
  return out
}

// Monograph IDs that share each DIN. The links file sometimes gives several
// monographs the same DIN (usually a matching mistake), so the Research
// papers tab points that out.
const dinCache = new WeakMap()
export function idsByDin(data) {
  if (dinCache.has(data)) return dinCache.get(data)
  const map = new Map()
  for (const [id, entry] of Object.entries(data.byId)) {
    if (!entry.din) continue
    if (!map.has(entry.din)) map.set(entry.din, [])
    map.get(entry.din).push(id)
  }
  dinCache.set(data, map)
  return map
}
