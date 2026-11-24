import { useState } from 'react'
import { useInconsistencyReport, LEVELS, levelFor } from '../data/inconsistency'
import { useReviews, reviewFor, setStatus, statusNote, STATUSES } from '../data/reviews'
import { formatDate } from '../data/monographs'
import { downloadFile, toCsv, today } from '../utils/download'
import { useAnalysisTables } from '../data/analysis'
import './Inconsistency.css'

function StatusCell({ slug, review }) {
  const flags = review.flags.length
  return (
    <div className="status-cell">
      {review.status === 'open' ? (
        <button type="button" className="btn-outline status-btn" onClick={() => setStatus(slug, 'reviewed')}>
          Mark reviewed
        </button>
      ) : (
        <>
          <span className={`status-pill status-${review.status}`} title={statusNote(review)}>
            {STATUSES[review.status]}
          </span>
          <button
            type="button"
            className="link-button status-next"
            onClick={() => setStatus(slug, review.status === 'reviewed' ? 'resolved' : 'open')}
          >
            {review.status === 'reviewed' ? 'Resolve' : 'Reopen'}
          </button>
        </>
      )}
      {review.statusBy && <span className="status-by">by {review.statusBy}</span>}
      {flags > 0 && (
        <span className="pill pill-flag status-flags" title="Flagged for review on the detail page">
          {flags} {flags === 1 ? 'flag' : 'flags'}
        </span>
      )}
    </div>
  )
}

const LAYER1 = ['layer1-concordance']
const BAND_CLASS = { High: 'score-ok', Moderate: 'score-md', 'Lower / review': 'score-hi' }

// Layer 1 summary per ingredient: { composite, band, flagged }
function layer1ByIngredient(table) {
  const out = new Map()
  if (!table) return out
  for (const r of table.ingredients) out.set(r.ingredient, { composite: r.composite, band: r.band, flagged: 0 })
  for (const m of table.manufacturers) {
    if ((m.flag === 'Review' || m.flag === 'High-priority review') && out.has(m.ingredient)) {
      out.get(m.ingredient).flagged += 1
    }
  }
  return out
}

function Inconsistency() {
  const rows = useInconsistencyReport()
  const { reviews, error: reviewError } = useReviews()
  const [level, setLevel] = useState('all')
  const layer1Tables = useAnalysisTables(LAYER1)

  if (!rows) {
    return (
      <main className="inc-page">
        <h1 className="inc-title">Inconsistency report</h1>
        <p className="inc-loading">Scoring monographs…</p>
      </main>
    )
  }

  const counts = Object.fromEntries(LEVELS.map((l) => [l.id, rows.filter((r) => r.level === l.id).length]))
  const totalTerms = rows.reduce((s, r) => s + r.terms.length, 0)
  const shown = level === 'all' ? rows : rows.filter((r) => r.level === level)
  const layer1 = layer1ByIngredient(layer1Tables.tables?.['layer1-concordance'])

  function exportCsv() {
    const header = [
      'Active ingredient',
      'Products compared',
      'Distinct terms',
      'Divergent terms',
      'Possible data gaps (left out)',
      'Listed by one product only',
      'Listed by some',
      'Listed by most (more than half)',
      'Brand divergence (0-10)',
      'Brand divergence level',
      'Low confidence (fewer than 3 products)',
      'Manufacturer agreement (0-1, Layer 1)',
      'Manufacturer agreement band',
      'Flagged manufacturers',
      'Latest revision',
      'Status',
      'Status changed by',
      'Status changed on',
      'Flags',
    ]
    const body = shown.map((r) => {
      const review = reviewFor(reviews, r.slug)
      return [
        r.name,
        r.products.length,
        r.terms.length,
        r.divergent,
        r.gapProducts.length,
        r.one.length,
        r.some.length,
        r.most.length,
        r.score.toFixed(1),
        levelFor(r.score).label,
        r.lowConfidence ? 'Yes' : 'No',
        layer1.get(r.name)?.composite ?? '',
        layer1.get(r.name)?.band ?? '',
        layer1.get(r.name)?.flagged ?? '',
        r.latestRevision ?? '',
        STATUSES[review.status],
        review.statusBy ?? '',
        review.statusAt ? review.statusAt.slice(0, 10) : '',
        review.flags.length,
      ]
    })
    downloadFile(`monobyte-inconsistency-report-${today()}.csv`, toCsv([header, ...body]), 'text/csv')
  }

  return (
    <main className="inc-page">
      <div className="inc-head">
        <h1 className="inc-title">Inconsistency report</h1>
        <div className="inc-exports">
          <button type="button" className="pill pill-quiet" onClick={exportCsv}>
            Export CSV
          </button>
          <button type="button" className="pill pill-quiet" onClick={() => window.print()}>
            Export PDF
          </button>
        </div>
      </div>

      <section className="inc-kpis" aria-label="Summary">
        {LEVELS.map((l) => (
          <div key={l.id} className={`inc-kpi kpi-${l.id}`}>
            <p className="kicker inc-kpi-label">{l.label} divergence</p>
            <p className="inc-kpi-value">{counts[l.id]}</p>
            <p className="inc-kpi-sub">{l.range}</p>
          </div>
        ))}
        <div className="inc-kpi">
          <p className="kicker inc-kpi-label">Total terms compared</p>
          <p className="inc-kpi-value">{totalTerms.toLocaleString()}</p>
          <p className="inc-kpi-sub">across {rows.length} ingredient families</p>
        </div>
      </section>

      {reviewError && (
        <p className="form-alert" role="alert">
          {reviewError}
        </p>
      )}

      <div className="inc-filters" role="group" aria-label="Filter by divergence">
        {[{ id: 'all', label: 'All' }, ...LEVELS].map((l) => (
          <button
            key={l.id}
            type="button"
            aria-pressed={level === l.id}
            className={`sort-chip${level === l.id ? ' is-active' : ''}`}
            onClick={() => setLevel(l.id)}
          >
            {l.label} ({l.id === 'all' ? rows.length : counts[l.id]})
          </button>
        ))}
      </div>

      <div className="inc-table-wrap surface">
        <table className="inc-table">
          <thead>
            <tr>
              <th scope="col">Active ingredient</th>
              <th scope="col">Products compared</th>
              <th scope="col">Divergent terms</th>
              <th scope="col" title="0–10: how differently the brands list adverse events. Higher = more disagreement.">
                Brand<br />divergence
              </th>
              <th scope="col" title="0–1: how closely the manufacturers agree on adverse events, warnings, contraindications and guidance. Higher = more agreement. (Layer 1 in the analysis workbook.)">
                Manufacturer<br />agreement
              </th>
              <th scope="col">Latest revision</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.slug}>
                <th scope="row">
                  <a href={`#/inconsistency/${r.slug}`}>{r.name}</a>
                </th>
                <td>
                  {r.products.length} products
                  {r.gapProducts.length > 0 && (
                    <span className="inc-sub" title="Very short adverse event lists, left out of the score">
                      +{r.gapProducts.length} possible data {r.gapProducts.length === 1 ? 'gap' : 'gaps'}
                    </span>
                  )}
                </td>
                <td>
                  {r.divergent} of {r.terms.length}
                </td>
                <td>
                  <span className={`score score-${r.level}`}>{r.score.toFixed(1)}</span>
                  {r.lowConfidence && (
                    <span className="inc-low" title="Fewer than 3 products to compare">
                      Low confidence
                    </span>
                  )}
                </td>
                <td>
                  {layer1.has(r.name) ? (
                    <>
                      <span
                        className={`score ${BAND_CLASS[layer1.get(r.name).band] ?? ''}`}
                        title={`Manufacturer agreement: ${layer1.get(r.name).band}`}
                      >
                        {layer1.get(r.name).composite.toFixed(3)}
                      </span>
                      {layer1.get(r.name).flagged > 0 && (
                        <span className="inc-sub">
                          {layer1.get(r.name).flagged} flagged{' '}
                          {layer1.get(r.name).flagged === 1 ? 'manufacturer' : 'manufacturers'}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="inc-sub">{layer1Tables.error ? 'Unavailable' : '—'}</span>
                  )}
                </td>
                <td>{r.latestRevision ? formatDate({ iso: r.latestRevision }) : 'No date'}</td>
                <td>
                  <StatusCell slug={r.slug} review={reviewFor(reviews, r.slug)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="inc-note">
        <strong>Brand divergence</strong> (0&ndash;10, higher = more disagreement) comes from the
        MedDRA adverse-event terms in each ingredient&rsquo;s monographs. Terms listed by only one
        product weigh the most, then terms listed by some but not more than half of the products;
        terms more than half list count as agreement (the same rule as the brand comparison on drug
        pages). Products whose list is under a fifth of the usual length are left out as possible
        data gaps, and fewer than 3 products is low confidence. <strong>Manufacturer agreement</strong>{' '}
        (0&ndash;1, higher = more agreement; Layer 1 in the analysis workbook) compares manufacturers
        on adverse events, warnings, contraindications and guidance; open an ingredient for the
        detail. A high divergence or low agreement is a prompt to check the monographs (indications,
        formulation, revision date, extraction), not proof that a label is wrong. Review status and
        flags are shared with every researcher.
      </p>
    </main>
  )
}

export default Inconsistency
