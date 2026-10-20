import { useMemo, useState } from 'react'
import { SEGMENTS } from '../utils/termOverlap'
import './AdverseEventGrid.css'

// Which MedDRA adverse-event terms each selected product lists.
// Rows = terms, columns = products. Filled dot = listed, ring = not listed.
// Default view shows only terms that some products leave out — the
// inconsistencies MonoByte is about.

const VIEWS = [
  { id: 'some', label: 'Listed by only some' },
  { id: 'all', label: 'All terms' },
]

const SORTS = [
  { id: 'fewest', label: 'Fewest products first' },
  { id: 'az', label: 'A–Z' },
]

// focus: { productId, kind } from a click on the overlap chart, or null
function AdverseEventGrid({ products, termSets, meddraVersion, focus, onClearFocus }) {
  const [view, setView] = useState('some')
  const [sort, setSort] = useState('fewest')
  const [query, setQuery] = useState('')

  const withData = termSets.filter(Boolean).length

  const rows = useMemo(() => {
    const union = new Set(termSets.filter(Boolean).flatMap((s) => [...s]))
    return [...union].map((term) => ({
      term,
      listed: termSets.map((s) => (s ? s.has(term) : null)),
      count: termSets.filter((s) => s?.has(term)).length,
    }))
  }, [termSets])

  const inAll = rows.filter((r) => r.count === withData).length
  const q = query.trim().toLowerCase()
  const focusIndex = focus ? products.findIndex((p) => p.id === focus.productId) : -1
  const focusSeg = focus && SEGMENTS.find((s) => s.kind === focus.kind)
  const inFocus = (r) => {
    const on = r.listed[focusIndex]
    if (focus.kind === 'missing') return on === false
    if (!on) return false
    if (focus.kind === 'all') return r.count === withData
    if (focus.kind === 'unique') return r.count === 1
    return r.count > 1 && r.count < withData // 'some'
  }
  const shown = rows
    .filter((r) => (focusIndex >= 0 ? inFocus(r) : view === 'all' || r.count < withData))
    .filter((r) => !q || r.term.toLowerCase().includes(q))
    .sort((a, b) =>
      sort === 'fewest' ? a.count - b.count || a.term.localeCompare(b.term) : a.term.localeCompare(b.term),
    )

  return (
    <div className="ae-card" id="ae-grid">
      <div className="ae-head">
        <div>
          <h2 className="ae-title">Adverse event terms</h2>
          <p className="ae-sub">
            MedDRA v{meddraVersion} preferred terms in each monograph&rsquo;s adverse-event
            section. A filled dot means the product lists the term.
          </p>
        </div>
      </div>

      <p className="ae-summary">
        <strong>{rows.length}</strong> terms in total · <strong>{inAll}</strong> listed by all{' '}
        {withData} · <strong className="ae-summary-flag">{rows.length - inAll}</strong> listed by
        only some
      </p>

      {focusIndex >= 0 && (
        <div className="ae-focus" role="status">
          Showing <strong>{products[focusIndex].label}</strong> — {focusSeg.label.toLowerCase()}
          <button type="button" className="link-button" onClick={onClearFocus}>
            Show all again
          </button>
        </div>
      )}

      <div className="ae-controls">
        <div className="ae-chips" role="group" aria-label="Which terms to show" hidden={focusIndex >= 0}>
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              className={`sort-chip${view === v.id ? ' is-active' : ''}`}
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        <div className="ae-chips" role="group" aria-label="Sort terms">
          <span className="ae-label">Sort:</span>
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`sort-chip${sort === s.id ? ' is-active' : ''}`}
              aria-pressed={sort === s.id}
              onClick={() => setSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="input ae-search"
          placeholder="Find a term…"
          aria-label="Find an adverse event term"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="ae-legend" aria-hidden="true">
        <span><span className="ae-dot is-on" /> Listed</span>
        <span><span className="ae-dot" /> Not listed</span>
      </div>

      {shown.length ? (
        <div className="ae-scroll" tabIndex={0} aria-label="Adverse event terms by product">
          <table className="ae-table">
            <thead>
              <tr>
                <th scope="col" className="ae-term-col">
                  Term <span className="ae-count">({shown.length})</span>
                </th>
                {products.map((p, i) => (
                  <th key={p.id} scope="col" className="ae-prod-col" title={`${p.label} — ${p.company}`}>
                    {p.label}
                    {!termSets[i] && <span className="ae-nodata">no data</span>}
                  </th>
                ))}
                <th scope="col" className="ae-by-col">Listed by</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.term}>
                  <th scope="row" className="ae-term-col">{r.term}</th>
                  {r.listed.map((on, i) => (
                    <td
                      key={products[i].id}
                      title={
                        on == null
                          ? `${products[i].label}: no data`
                          : `${products[i].label} ${on ? 'lists' : 'does not list'} ${r.term}`
                      }
                    >
                      {on == null ? (
                        <span className="ae-na">–</span>
                      ) : (
                        <>
                          <span className={`ae-dot${on ? ' is-on' : ''}`} aria-hidden="true" />
                          <span className="visually-hidden">{on ? 'Listed' : 'Not listed'}</span>
                        </>
                      )}
                    </td>
                  ))}
                  <td className="ae-by-col">
                    {r.count} of {withData}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="ae-empty">
          {q
            ? `No terms match “${query.trim()}”.`
            : 'Every term is listed by all of these products.'}
        </p>
      )}
    </div>
  )
}

export default AdverseEventGrid
