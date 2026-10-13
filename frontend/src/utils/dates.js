const DAY = 86400000
const YEAR = 365.25 * DAY

export function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function toTime(iso) {
  return Date.parse(`${iso}T00:00:00Z`)
}

// Fractional year, e.g. 2023-07-02 → 2023.5 (used for the timeline x-axis)
export function toYear(iso) {
  const t = toTime(iso)
  const y = new Date(t).getUTCFullYear()
  const start = Date.UTC(y, 0, 1)
  return y + (t - start) / (Date.UTC(y + 1, 0, 1) - start)
}

export function yearsBetween(fromIso, toIso) {
  return (toTime(toIso) - toTime(fromIso)) / YEAR
}

// 0.4 → "5 months", 2.26 → "2.3 years"
export function formatSpan(years) {
  if (years < 0) return '—'
  if (years < 1) {
    const months = Math.max(1, Math.round(years * 12))
    return `${months} ${months === 1 ? 'month' : 'months'}`
  }
  const y = Math.round(years * 10) / 10
  return `${y} ${y === 1 ? 'year' : 'years'}`
}
