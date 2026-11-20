import { useState } from 'react'
import { useInconsistencyReport, LEVELS, levelFor } from '../data/inconsistency'
import { reviewsStore, reviewFor, setStatus, STATUSES } from '../data/reviews'
import { formatDate } from '../data/monographs'
import { useStore } from '../utils/store'
import { downloadFile, toCsv, today } from '../utils/download'
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
          <span className={`status-pill status-${review.status}`}>{STATUSES[review.status]}</span>
          <button
            type="button"
            className="link-button status-next"
            onClick={() => setStatus(slug, review.status === 'reviewed' ? 'resolved' : 'open')}
          >
            {review.status === 'reviewed' ? 'Resolve' : 'Reopen'}
          </button>
        </>
      )}
      {flags > 0 && (
        <span className="pill pill-flag status-flags" title="Flagged for review on the detail page">
          {flags} {flags === 1 ? 'flag' : 'flags'}
        </span>
      )}
    </div>
  )
}

function Inconsistency() {
  const rows = useInconsistencyReport()
  const reviews = useStore(reviewsStore)
  const [level, setLevel] = useState('all')

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

  function exportCsv() {
    const header = [
      'Active ingredient',
      'Products compared',
      'Distinct terms',
      'Divergent terms',
      'Listed by one product only',
      'Listed by some',
      `Listed by most (>= 75%)`,
      'Score',
      'Level',
      'Latest revision',
      'Status',
      'Flags',
    ]
    const body = shown.map((r) => {
      const review = reviewFor(reviews, r.slug)
      return [
        r.name,
        r.products.length,
        r.terms.length,
        r.divergent,
        r.one.length,
        r.some.length,
        r.most.length,
        r.score.toFixed(1),
        levelFor(r.score).label,
        r.latestRevision ?? '',
        STATUSES[review.status],
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
              <th scope="col">Score</th>
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
                <td>{r.products.length} products</td>
                <td>
                  {r.divergent} of {r.terms.length}
                </td>
                <td>
                  <span className={`score score-${r.level}`}>{r.score.toFixed(1)}</span>
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
        Scores come from the MedDRA adverse-event terms in each ingredient&rsquo;s monographs. Terms
        listed by only one product weigh the most, then terms listed by some but fewer than 75% of
        products; terms most products list count as agreement. 0 means every product lists the same
        terms. A high score is a prompt to check the monographs (indications, formulation, revision
        date, extraction), not proof that a label is wrong. Review status is saved in this browser
        only.
      </p>
    </main>
  )
}

export default Inconsistency
