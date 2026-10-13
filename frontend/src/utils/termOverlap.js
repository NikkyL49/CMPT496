// Segments for the adverse-event overlap chart (Compare → Graphs) and the
// matching filters on the term grid (Compare → Tables).
// Colours: one blue ramp (dark = shared by all → light = only this product),
// checked with the dataviz validator; "missing" uses a hatch pattern instead.

export const SEGMENTS = [
  { kind: 'all', label: 'Shared by all', color: '#17414f', ink: '#fff' }, // accent-900
  { kind: 'some', label: 'Shared with some', color: '#3083b0', ink: '#fff' }, // accent-500
  { kind: 'unique', label: 'Only this product', color: '#6fb3d8', ink: '#000' }, // accent-400
  { kind: 'missing', label: 'Missing (others list it)', hatch: true, ink: '#000' },
]

// Which terms fall in each segment for product i
export function segmentTerms(termSets, i) {
  const sets = termSets.filter(Boolean)
  const mine = termSets[i]
  const union = new Set(sets.flatMap((s) => [...s]))
  const count = (t) => sets.filter((s) => s.has(t)).length
  const out = { all: [], some: [], unique: [], missing: [] }
  for (const t of [...union].sort((a, b) => a.localeCompare(b))) {
    const n = count(t)
    if (!mine.has(t)) out.missing.push(t)
    else if (n === sets.length) out.all.push(t)
    else if (n === 1) out.unique.push(t)
    else out.some.push(t)
  }
  return out
}
