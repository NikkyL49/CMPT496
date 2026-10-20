import { useMemo } from 'react'
import { termsForProduct } from '../../data/adverseEvents'
import { prettyRecommendation, recommendationLevel } from '../../data/drugDetails'
import { productSummary } from '../../utils/ingredientGroup'
import { drugHref } from '../../utils/links'
import { Card, RecBadge } from './parts'

// Severity order for the agreement bars (most severe first)
const LEVELS = ['hi', 'md', 'lo', 'ok', 'none']

// Kidney/liver answers repeat the row title ("… with kidney impairment"),
// so the chart uses short names. The full text is on the Overview tab.
function answerName(key, value) {
  if (key !== 'kidney' && key !== 'liver') return prettyRecommendation(value)
  return {
    hi: 'Contraindicated',
    md: 'Dose adjustment',
    lo: 'Use with caution',
    ok: 'No adjustment needed',
  }[recommendationLevel(value)] ?? prettyRecommendation(value)
}

const TOPICS = [
  { key: 'pregnancy', label: 'Pregnancy' },
  { key: 'breastfeeding', label: 'Breastfeeding' },
  { key: 'kidney', label: 'Kidney impairment' },
  { key: 'liver', label: 'Liver impairment' },
]

// 1. How many adverse-event terms each brand lists
function TermCountChart({ product, rows, ingredient }) {
  const max = Math.max(...rows.map((r) => r.count))
  return (
    <Card title={`Adverse event terms listed by each ${ingredient} brand`}>
      <p className="card-note">
        Same ingredient, so the lists should be similar. A much shorter or longer bar means
        that monograph reports adverse events differently. Counts combine all strengths of a
        brand.
      </p>
      <div className="hbar-chart" role="list">
        {rows.map((r) => {
          const mine = r.product.id === product.id
          return (
            <div key={r.product.id} className={`hbar-row${mine ? ' is-mine' : ''}`} role="listitem">
              <span className="hbar-label">
                {mine ? (
                  <strong>{r.product.label}</strong>
                ) : (
                  <a href={drugHref(r.product.id, { tab: 'graphs' })}>{r.product.label}</a>
                )}
              </span>
              <span className="hbar-track">
                <span
                  className="hbar-bar"
                  style={{ width: `${(r.count / max) * 100}%` }}
                  title={`${r.product.label}: ${r.count} terms`}
                />
                <span className="hbar-value">
                  {r.count}
                  {mine && <span className="hbar-tag">this product</span>}
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// 2. Do the brands agree on pregnancy / breastfeeding / kidney / liver?
function AgreementChart({ product, summaries, ingredient }) {
  const mine = summaries.find((s) => s.product.id === product.id)?.summary
  return (
    <Card title={`Do the ${ingredient} brands agree?`}>
      <p className="card-note">
        What each brand&rsquo;s monograph recommends. Several colours in one bar means the brands
        disagree.
      </p>
      <div className="agree-list">
        {TOPICS.map(({ key, label }) => {
          const groups = new Map()
          summaries.forEach(({ summary }) => {
            const value = summary?.[key]
            const level = recommendationLevel(value)
            const name = answerName(key, value)
            const g = groups.get(name) ?? { name, level, count: 0 }
            g.count++
            groups.set(name, g)
          })
          const segs = [...groups.values()].sort(
            (a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || b.count - a.count,
          )
          const total = summaries.length
          return (
            <div key={key} className="agree-row">
              <div className="agree-head">
                <span className="agree-label">{label}</span>
                <span className="agree-count">
                  {segs.length === 1 ? 'All agree' : `${segs.length} different answers`}
                </span>
              </div>
              <div className="agree-track">
                {segs.map((s) => {
                  const pct = (s.count / total) * 100
                  return (
                    <span
                      key={s.name}
                      className={`agree-seg seg-${s.level}`}
                      style={{ width: `${pct}%` }}
                      title={`${s.name}: ${s.count} of ${total} brands`}
                      aria-label={`${s.name}: ${s.count} of ${total} brands`}
                    >
                      {pct >= 9 && s.count}
                    </span>
                  )
                })}
              </div>
              <ul className="agree-legend">
                {segs.map((s) => (
                  <li key={s.name}>
                    <span className={`agree-dot seg-${s.level}`} aria-hidden="true" />
                    {s.name} ({s.count})
                  </li>
                ))}
              </ul>
              {mine && (
                <p className="agree-mine">
                  This product: <RecBadge value={mine[key]} />
                </p>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function GraphsTab({ product, group, details, aeData, ingredient }) {
  const rows = useMemo(
    () =>
      aeData
        ? group
            .map((p) => ({ product: p, count: termsForProduct(aeData, p)?.size ?? 0 }))
            .sort((a, b) => b.count - a.count || a.product.label.localeCompare(b.product.label))
        : [],
    [aeData, group],
  )
  const summaries = useMemo(
    () => group.map((p) => ({ product: p, summary: productSummary(details, p) })),
    [details, group],
  )

  if (group.length < 2) {
    return (
      <p className="muted drug-empty">
        These graphs compare brands of the same ingredient, and this is the only {ingredient}{' '}
        product in the dataset.
      </p>
    )
  }

  return (
    <div className="drug-stack">
      {aeData ? (
        <TermCountChart product={product} rows={rows} ingredient={ingredient} />
      ) : (
        <p className="muted">Loading adverse event terms…</p>
      )}
      <AgreementChart product={product} summaries={summaries} ingredient={ingredient} />
    </div>
  )
}

export default GraphsTab
