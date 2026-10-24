import { useState } from 'react'
import { strengthsLabel, formatDate } from '../../data/monographs'
import { termsForProduct } from '../../data/adverseEvents'
import { productSummary } from '../../utils/ingredientGroup'
import { drugHref } from '../../utils/links'
import { RecBadge } from './parts'

const PAGE = 10

// Other brands with the same active ingredient
function AlternativesTab({ product, others, details, aeData, canCompare = true }) {
  const [showAll, setShowAll] = useState(false)
  if (!others.length) {
    return <p className="muted drug-empty">No other brands with this active ingredient are in the dataset.</p>
  }
  const sorted = [...others].sort((a, b) => (b.revised?.iso ?? '').localeCompare(a.revised?.iso ?? ''))
  const shown = showAll ? sorted : sorted.slice(0, PAGE)

  return (
    <div className="drug-stack">
      <p className="card-note">
        {others.length} other {others.length === 1 ? 'brand has' : 'brands have'} the same active
        ingredient. Most recently revised first.
      </p>
      {shown.map((p) => {
        const s = productSummary(details, p)
        const n = aeData ? termsForProduct(aeData, p)?.size : null
        return (
          <article key={p.id} className="alt-card">
            <div className="alt-main">
              <h2 className="alt-brand">
                <a href={drugHref(p.id)}>{p.brand}</a>
                <span className="alt-meta">
                  {strengthsLabel(p)} · {p.company}
                </span>
              </h2>
              <p className="alt-sub">
                {s?.ingredient} · {s?.indication} · revised {formatDate(p.revised)}
              </p>
              <div className="badge-row">
                {n != null && <span className="term-chip term-soft">{n} adverse event terms</span>}
                {s && <RecBadge label="Pregnancy" value={s.pregnancy} />}
              </div>
            </div>
            {canCompare && (
              <a href={`#/compare?ids=${product.id},${p.id}`} className="pill pill-action alt-compare">
                Compare with this
              </a>
            )}
          </article>
        )
      })}
      {!showAll && sorted.length > PAGE && (
        <button type="button" className="btn-outline alt-more" onClick={() => setShowAll(true)}>
          Show all {sorted.length}
        </button>
      )}
    </div>
  )
}

export default AlternativesTab
