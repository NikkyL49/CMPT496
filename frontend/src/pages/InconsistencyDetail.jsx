import { useEffect, useRef, useState } from 'react'
import { useInconsistencyReport, listedByLabel, CONSENSUS } from '../data/inconsistency'
import { reviewsStore, reviewFor, addFlag, setStatus, STATUSES } from '../data/reviews'
import { sessionStore } from '../data/session'
import { useStore } from '../utils/store'
import { drugHref, searchHref } from '../utils/links'
import './Inconsistency.css'

const PAGE_SIZE = 40
const SAMPLE_CHIPS = 6
const COMPARE_MAX = 6 // Compare page limit

const GROUPS = [
  { id: 'all', label: 'All terms' },
  { id: 'one', label: 'One product only' },
  { id: 'some', label: 'Some products' },
  { id: 'most', label: `Most products (≥ ${CONSENSUS * 100}%)` },
]

function SummaryCard({ tone, title, terms }) {
  return (
    <div className={`inc-group group-${tone}`}>
      <p className="kicker inc-group-label">{title}</p>
      <p className="inc-group-value">{terms.length}</p>
      <ul className="chip-row">
        {terms.slice(0, SAMPLE_CHIPS).map((t) => (
          <li key={t.term} className="term-chip term-soft">
            {t.term}
          </li>
        ))}
        {terms.length > SAMPLE_CHIPS && <li className="inc-more">+{terms.length - SAMPLE_CHIPS} more</li>}
      </ul>
    </div>
  )
}

function FlagDialog({ row, onClose }) {
  const { user } = useStore(sessionStore)
  const companies = [...new Set(row.products.map((p) => p.product.company))].sort()
  const [picked, setPicked] = useState([])
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const firstRef = useRef(null)

  // Focus the first company when the dialog opens
  useEffect(() => {
    firstRef.current?.focus()
  }, [])

  function submit(e) {
    e.preventDefault()
    if (!picked.length) return setError('Pick at least one company.')
    if (!reason.trim()) return setError('Say what should be reviewed.')
    addFlag(row.slug, { companies: picked, reason: reason.trim(), by: user?.name ?? 'Researcher' })
    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <form className="modal" role="dialog" aria-modal="true" aria-labelledby="flag-title" onSubmit={submit}>
        <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
          ×
        </button>
        <h2 id="flag-title" className="modal-title">
          Flag {row.name} for review
        </h2>
        <fieldset className="modal-field">
          <legend>Company</legend>
          <div className="chip-row">
            {companies.map((c, i) => {
              const on = picked.includes(c)
              return (
                <button
                  key={c}
                  ref={i === 0 ? firstRef : undefined}
                  type="button"
                  aria-pressed={on}
                  className={`company-chip${on ? ' is-on' : ''}`}
                  onClick={() => setPicked((p) => (on ? p.filter((x) => x !== c) : [...p, c]))}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </fieldset>
        <label className="modal-field">
          <span className="modal-label">Reason</span>
          <textarea
            className="input modal-reason"
            rows={4}
            value={reason}
            placeholder="e.g. Leaves out hepatic terms every other brand lists — check the 2019 revision."
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        {error && (
          <p className="form-alert" role="alert">
            {error}
          </p>
        )}
        <div className="modal-actions">
          <button type="submit" className="btn-primary">
            Submit
          </button>
          <button type="button" className="btn-outline" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function InconsistencyDetail({ slug }) {
  const rows = useInconsistencyReport()
  const reviews = useStore(reviewsStore)
  const [group, setGroup] = useState('all')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [flagging, setFlagging] = useState(false)

  if (!rows) {
    return (
      <main className="inc-page">
        <p className="inc-loading">Scoring monographs…</p>
      </main>
    )
  }

  const row = rows.find((r) => r.slug === slug)
  if (!row) {
    return (
      <main className="simple-page">
        <p className="kicker auth-kicker">Not found</p>
        <h1>No report for that ingredient</h1>
        <p>It may have only one product, so there is nothing to compare.</p>
        <a href="#/inconsistency" className="btn-primary">
          Back to the report
        </a>
      </main>
    )
  }

  const review = reviewFor(reviews, slug)
  const n = row.products.length
  const q = query.trim().toLowerCase()
  const groupTerms = group === 'all' ? row.terms : row[group]
  const terms = groupTerms.filter((t) => !q || t.term.toLowerCase().includes(q))

  // Products furthest from the consensus first
  const products = [...row.products].sort(
    (a, b) =>
      b.missing.length + b.unique.length - (a.missing.length + a.unique.length) ||
      a.product.label.localeCompare(b.product.label),
  )
  const compareIds = products.slice(0, COMPARE_MAX).map((p) => p.product.id)
  const names = row.products.map((p) => p.product.label)

  return (
    <main className="inc-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="#/inconsistency">Inconsistency report</a>
        <span aria-hidden="true">›</span>
        <a href={searchHref(row.name, 'ingredient')}>{row.name}</a>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Same-ingredient flag</span>
      </nav>

      <section className={`inc-banner banner-${row.level}`}>
        <div className="inc-banner-top">
          <span className={`badge badge-solid-${row.level}`}>Inconsistency</span>
          <span className={`score score-${row.level} score-lg`}>Divergence {row.score.toFixed(1)}</span>
        </div>
        <h1 className="inc-banner-title">
          {row.name} — {n} products compared, {row.divergent} terms not reported consistently
        </h1>
        <p className="inc-banner-sub">
          {names.slice(0, 4).join(', ')}
          {names.length > 4 && ` and ${names.length - 4} more`} · {row.terms.length} distinct terms ·
          MedDRA v27 · status: {STATUSES[review.status]}
        </p>
      </section>

      <section className="inc-groups" aria-label="Terms by how many products list them">
        <SummaryCard tone="ok" title={`Reported by most (≥ ${CONSENSUS * 100}%)`} terms={row.most} />
        <SummaryCard tone="md" title="Reported by some" terms={row.some} />
        <SummaryCard tone="hi" title="Reported by one only" terms={row.one} />
      </section>

      <h2 className="inc-h2">Products</h2>
      <div className="inc-table-wrap surface">
        <table className="inc-table inc-products">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Company</th>
              <th scope="col">Terms listed</th>
              <th scope="col">Common terms left out</th>
              <th scope="col">Terms only it lists</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.product.id}>
                <th scope="row">
                  <a href={drugHref(p.product.id)}>{p.product.label}</a>
                </th>
                <td>{p.product.company}</td>
                <td>{p.terms.size}</td>
                <td title={p.missing.join(', ')}>{p.missing.length}</td>
                <td title={p.unique.join(', ')}>{p.unique.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="inc-h2">MedDRA terms</h2>
      <div className="inc-term-tools">
        <div className="inc-filters" role="group" aria-label="Show terms">
          {GROUPS.map((g) => (
            <button
              key={g.id}
              type="button"
              aria-pressed={group === g.id}
              className={`sort-chip${group === g.id ? ' is-active' : ''}`}
              onClick={() => {
                setGroup(g.id)
                setLimit(PAGE_SIZE)
              }}
            >
              {g.label} ({g.id === 'all' ? row.terms.length : row[g.id].length})
            </button>
          ))}
        </div>
        <input
          type="search"
          className="input inc-term-search"
          placeholder="Find a term…"
          aria-label="Find a term"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setLimit(PAGE_SIZE)
          }}
        />
      </div>

      <div className="inc-table-wrap surface">
        <table className="inc-table inc-terms">
          <thead>
            <tr>
              <th scope="col">MedDRA preferred term</th>
              <th scope="col">Products listing it</th>
              <th scope="col">Share</th>
            </tr>
          </thead>
          <tbody>
            {terms.slice(0, limit).map((t) => (
              <tr key={t.term}>
                <th scope="row">{t.term}</th>
                <td>{listedByLabel(row, t)}</td>
                <td>
                  <span className="share" title={`${Math.round(t.share * 100)}%`}>
                    <span
                      className={`share-fill ${t.share >= CONSENSUS ? 'is-most' : t.listedBy.length === 1 ? 'is-one' : 'is-some'}`}
                      style={{ width: `${t.share * 100}%` }}
                    />
                  </span>
                  <span className="share-pct">{Math.round(t.share * 100)}%</span>
                </td>
              </tr>
            ))}
            {terms.length === 0 && (
              <tr>
                <td colSpan={3} className="inc-empty-cell">
                  No terms match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {terms.length > limit && (
        <div className="inc-more-row">
          <span>
            Showing {limit} of {terms.length}
          </span>
          <button type="button" className="btn-outline" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
            Show {Math.min(PAGE_SIZE, terms.length - limit)} more
          </button>
        </div>
      )}

      {review.flags.length > 0 && (
        <section className="inc-flags">
          <h2 className="inc-h2">Flagged for review</h2>
          <ul>
            {review.flags.map((f, i) => (
              <li key={i} className="inc-flag">
                <p className="inc-flag-meta">
                  {f.at} · {f.by} · {f.companies.join(', ')}
                </p>
                <p>{f.reason}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="inc-actions">
        <a href={`#/compare?ids=${compareIds.join(',')}`} className="btn-primary">
          Compare side-by-side
        </a>
        <span className="inc-actions-note">
          Opens the {compareIds.length} products furthest from the consensus
        </span>
        <div className="inc-actions-right">
          {review.status !== 'reviewed' && (
            <button type="button" className="btn-outline" onClick={() => setStatus(slug, 'reviewed')}>
              Mark reviewed
            </button>
          )}
          <button type="button" className="btn-primary" onClick={() => setFlagging(true)}>
            Flag for review
          </button>
        </div>
      </div>

      {flagging && <FlagDialog row={row} onClose={() => setFlagging(false)} />}
    </main>
  )
}

export default InconsistencyDetail
