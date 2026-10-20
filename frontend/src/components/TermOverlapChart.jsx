import { useState } from 'react'
import { SEGMENTS, segmentTerms } from '../utils/termOverlap'
import './TermOverlapChart.css'

// Stacked bar per product: how its MedDRA adverse-event terms overlap with the
// other selected products. Every bar has the same length = all terms listed
// by any product, so the hatched "missing" part shows what this one leaves out.
// Clicking a segment opens the term grid (Tables tab) filtered to those terms.

function TermOverlapChart({ products, termSets, multiFamily, onSelect }) {
  const [tip, setTip] = useState(null) // { i, kind, x, y }

  const sets = termSets.filter(Boolean)
  const union = new Set(sets.flatMap((s) => [...s])).size
  const rows = products.map((p, i) => ({
    product: p,
    segs: termSets[i] ? segmentTerms(termSets, i) : null,
  }))
  const used = new Set(
    rows.flatMap((r) => (r.segs ? SEGMENTS.filter((s) => r.segs[s.kind].length).map((s) => s.kind) : [])),
  )

  function showTip(e, i, kind) {
    const card = e.currentTarget.closest('.overlap-card').getBoundingClientRect()
    const seg = e.currentTarget.getBoundingClientRect()
    const half = 150 // keep the tooltip inside the card
    const x = Math.min(Math.max(seg.left - card.left + seg.width / 2, half), card.width - half)
    setTip({ i, kind, x, y: seg.bottom - card.top + 8 })
  }

  const tipRow = tip && rows[tip.i]
  const tipSeg = tip && SEGMENTS.find((s) => s.kind === tip.kind)
  const tipTerms = tipRow?.segs[tip.kind] ?? []

  return (
    <div className="overlap-card" onMouseLeave={() => setTip(null)}>
      <h2 className="overlap-title">How adverse event terms overlap</h2>
      <p className="overlap-sub">
        Each bar is the {union} MedDRA terms listed by any of these products. The coloured
        part is what this product lists; the hatched part is what it leaves out. Click a
        segment to see those terms.
      </p>
      {multiFamily && (
        <p className="overlap-note">
          These are different drugs, so different adverse events are expected. Overlap is most
          meaningful between brands of the same drug.
        </p>
      )}

      <div className="overlap-legend">
        {SEGMENTS.filter((s) => used.has(s.kind)).map((s) => (
          <span key={s.kind} className="legend-item">
            <span
              className={`overlap-swatch${s.hatch ? ' is-hatch' : ''}`}
              style={s.hatch ? undefined : { background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <div className="overlap-rows">
        {rows.map(({ product: p, segs }, i) => {
          const listed = termSets[i]?.size ?? 0
          return (
            <div key={p.id} className="overlap-row">
              <div className="overlap-name" title={p.company}>
                {p.label}
              </div>
              {segs ? (
                <>
                  <div className="overlap-track">
                    {SEGMENTS.map((s) => {
                      const n = segs[s.kind].length
                      if (!n) return null
                      const pct = (n / union) * 100
                      return (
                        <button
                          key={s.kind}
                          type="button"
                          className={`overlap-seg${s.hatch ? ' is-hatch' : ''}`}
                          style={{ width: `${pct}%`, background: s.hatch ? undefined : s.color, color: s.ink }}
                          aria-label={`${p.label}: ${s.label}, ${n} ${n === 1 ? 'term' : 'terms'}. Show these terms.`}
                          onMouseEnter={(e) => showTip(e, i, s.kind)}
                          onFocus={(e) => showTip(e, i, s.kind)}
                          onBlur={() => setTip(null)}
                          onClick={() => onSelect({ productId: p.id, kind: s.kind })}
                        >
                          {pct >= 7 && <span className="overlap-num">{n}</span>}
                        </button>
                      )
                    })}
                  </div>
                  <div className="overlap-total">
                    {listed} of {union}
                  </div>
                </>
              ) : (
                <div className="overlap-nodata">No adverse event data for this product</div>
              )}
            </div>
          )
        })}
      </div>

      {tip && tipRow && (
        <div className="overlap-tip" style={{ left: tip.x, top: tip.y }} role="status">
          <strong>{tipRow.product.label}</strong>
          <span>
            {tipSeg.label}: {tipTerms.length} {tipTerms.length === 1 ? 'term' : 'terms'}
          </span>
          <span className="overlap-tip-terms">
            {tipTerms.slice(0, 6).join(', ')}
            {tipTerms.length > 6 && `, +${tipTerms.length - 6} more`}
          </span>
          <span className="overlap-tip-hint">Click to see them in the table</span>
        </div>
      )}
    </div>
  )
}

export default TermOverlapChart
