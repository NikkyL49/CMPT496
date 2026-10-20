// Colours for drug families in charts. Red/orange/yellow are reserved for
// severity in MonoByte, so families use blue, aqua and violet.
// Checked with the dataviz palette validator (colour-blind safe, all pairs).
// Families past the third share a neutral grey ("Other").
export const FAMILY_COLORS = ['#3083b0', '#1baf7a', '#6250d6']
export const OTHER_COLOR = '#8f8c86'

// families: ordered list (order the user added them) → Map(family → colour)
export function familyColorMap(families) {
  const map = new Map()
  families.forEach((f, i) => map.set(f, FAMILY_COLORS[i] ?? OTHER_COLOR))
  return map
}
