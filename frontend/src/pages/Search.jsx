import { useEffect, useMemo, useState } from 'react'
import { products, sortOptions, severityLevels } from '../data/search'
import { savedStore, toggleSaved } from '../data/saved'
import { recordSearch } from '../data/session'
import { useStore } from '../utils/store'
import './Search.css'

const MAX_TAGS = 4

// Fields the search box looks through
function matchScore(p, q) {
  if (!q) return 1
  const brand = p.brand.toLowerCase()
  if (brand.startsWith(q)) return 4
  if (brand.includes(q)) return 3
  if (p.ingredient.toLowerCase().includes(q)) return 2
  const rest = [p.indication, p.drugClass, p.company].join(' ').toLowerCase()
  return rest.includes(q) ? 1 : 0
}

// Count how many results fall into each value of a field (for the facet numbers)
function countBy(list, field) {
  const counts = new Map()
  for (const p of list) counts.set(p[field], (counts.get(p[field]) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function toggleInSet(set, value) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function FilterGroup({ title, options, selected, onToggle }) {
  return (
    <fieldset className="filter-group">
      <legend className="filter-title">{title}</legend>
      {options.map(([value, count]) => (
        <label key={value} className="filter-option">
          <input
            type="checkbox"
            checked={selected.has(value)}
            onChange={() => onToggle(value)}
          />
          <span className="filter-label">{value}</span>
          <span className="filter-count">{count}</span>
        </label>
      ))}
    </fieldset>
  )
}

function ResultCard({ product: p, events, saved, onToggleSave }) {
  const shown = events.slice(0, MAX_TAGS)
  const hidden = p.adverseEventCount - shown.length

  return (
    <article className="result-card">
      <div className="result-head">
        <h2 className="result-brand">
          <a href="#">{p.brand}</a>
        </h2>
        <span className="result-meta">
          {p.strength} · {p.company}
        </span>

        <div className="result-actions">
          {p.inconsistencyFlagged && (
            <span className="pill pill-flag">Inconsistency flagged</span>
          )}
          <button
            type="button"
            className={`pill pill-save${saved ? ' is-saved' : ''}`}
            aria-pressed={saved}
            onClick={onToggleSave}
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <p className="result-sub">
        {p.ingredient} · {p.indication} · revised {p.revised}
      </p>

      <ul className="result-tags" aria-label="Top adverse events">
        {shown.map((e) => (
          <li key={e.term} className={`badge badge-solid-${e.severity}`}>
            {e.term}
          </li>
        ))}
        {hidden > 0 && (
          <li className="result-more">
            +{hidden} more of {p.adverseEventCount}
          </li>
        )}
      </ul>
    </article>
  )
}

function Search({ initialQuery = '' }) {
  const [input, setInput] = useState(initialQuery)
  const query = initialQuery.trim().toLowerCase()

  const [sort, setSort] = useState('relevance')
  const [classes, setClasses] = useState(new Set())
  const [companies, setCompanies] = useState(new Set())
  const [severities, setSeverities] = useState(new Set())
  const savedIds = useStore(savedStore)

  // Keep a search history for logged-in users (shown in their data export)
  useEffect(() => {
    recordSearch(initialQuery)
  }, [initialQuery])

  // Results matching the text query only — facet counts are based on these
  const matched = useMemo(
    () =>
      products
        .map((p) => ({ product: p, score: matchScore(p, query) }))
        .filter((r) => r.score > 0),
    [query],
  )

  const classOptions = useMemo(
    () => countBy(matched.map((r) => r.product), 'drugClass'),
    [matched],
  )
  const companyOptions = useMemo(
    () => countBy(matched.map((r) => r.product), 'company'),
    [matched],
  )

  const results = useMemo(() => {
    const list = matched
      .filter(({ product: p }) => !classes.size || classes.has(p.drugClass))
      .filter(({ product: p }) => !companies.size || companies.has(p.company))
      // Severity filter: only show tags at the chosen levels, and drop
      // products with none. (Assumption — confirm intended behaviour with team.)
      .map((r) => ({
        ...r,
        events: severities.size
          ? r.product.topEvents.filter((e) => severities.has(e.severity))
          : r.product.topEvents,
      }))
      .filter((r) => r.events.length > 0)

    if (sort === 'newest') {
      list.sort((a, b) => b.product.revised.localeCompare(a.product.revised))
    } else if (sort === 'fewest-severe') {
      list.sort((a, b) => a.product.severeCount - b.product.severeCount)
    } else {
      list.sort((a, b) => b.score - a.score)
    }
    return list
  }, [matched, classes, companies, severities, sort])

  const hasFilters = classes.size || companies.size || severities.size

  function handleSearch(e) {
    e.preventDefault()
    // TODO: call the search API once it exists
    window.location.hash = `#/search?q=${encodeURIComponent(input.trim())}`
  }

  function resetFilters() {
    setClasses(new Set())
    setCompanies(new Set())
    setSeverities(new Set())
  }

  return (
    <main className="search-page">
      <form className="search-box" onSubmit={handleSearch} role="search">
        <span className="search-icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          placeholder="Search by drug, ingredient or condition"
          aria-label="Search by drug, ingredient or condition"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
      </form>

      <div className="search-layout">
        <aside className="filters" aria-label="Filters">
          <div className="filters-head">
            <span className="kicker filters-kicker">Filter</span>
            <button
              type="button"
              className="link-button"
              onClick={resetFilters}
              disabled={!hasFilters}
            >
              Reset
            </button>
          </div>

          <FilterGroup
            title="Drug class"
            options={classOptions}
            selected={classes}
            onToggle={(v) => setClasses((s) => toggleInSet(s, v))}
          />

          <FilterGroup
            title="Company"
            options={companyOptions}
            selected={companies}
            onToggle={(v) => setCompanies((s) => toggleInSet(s, v))}
          />

          <fieldset className="filter-group">
            <legend className="filter-title">Adverse effect severity</legend>
            <div className="severity-toggles">
              {severityLevels.map((s) => {
                const on = severities.has(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    className={`badge badge-solid-${s.id} severity-toggle${
                      severities.size && !on ? ' is-dimmed' : ''
                    }`}
                    onClick={() => setSeverities((set) => toggleInSet(set, s.id))}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </fieldset>
        </aside>

        <section className="results" aria-live="polite">
          <div className="results-toolbar">
            <div className="sort-pills" role="group" aria-label="Sort results">
              {sortOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={sort === o.id}
                  className={`sort-pill${sort === o.id ? ' is-active' : ''}`}
                  onClick={() => setSort(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <span className="results-count">
              {results.length} {results.length === 1 ? 'result' : 'results'}
              {initialQuery.trim() && <> for “{initialQuery.trim()}”</>}
            </span>
          </div>

          {results.length > 0 ? (
            results.map(({ product, events }) => (
              <ResultCard
                key={product.id}
                product={product}
                events={events}
                saved={savedIds.includes(product.id)}
                onToggleSave={() => toggleSaved(product.id)}
              />
            ))
          ) : (
            <div className="results-empty">
              <h2>No monographs match</h2>
              <p>Try a different spelling, or clear some filters.</p>
              {hasFilters ? (
                <button type="button" className="link-button" onClick={resetFilters}>
                  Clear filters
                </button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

export default Search
