import { useEffect, useState } from 'react'
import { useCatalog, matchScore, FLAG_THRESHOLD, SEARCH_MODES, EXACT } from '../data/catalog'
import SearchBox from '../components/SearchBox'
import { formatDate } from '../data/monographs'
import { prettyRecommendation } from '../data/drugDetails'
import { savedStore, toggleSaved } from '../data/saved'
import { recordSearch } from '../data/session'
import { useStore } from '../utils/store'
import { drugHref } from '../utils/links'
import './Search.css'

const PAGE_SIZE = 20
const FACET_PREVIEW = 8
const MAX_TAGS = 4

const SORTS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'newest', label: 'Newest revision' },
  { id: 'fewest-terms', label: 'Fewest adverse event terms' },
]

// Pregnancy advice levels (colour + words), most severe first
const PREGNANCY = [
  { id: 'hi', label: 'Contraindicated' },
  { id: 'md', label: 'Not recommended' },
  { id: 'lo', label: 'Use with caution' },
  { id: 'ok', label: 'Considered safe' },
  { id: 'none', label: 'Not stated' },
]

// Count how many results fall into each value of a field (for the facet numbers).
// Works for list fields too (a combination product has several drug classes).
function countBy(list, field) {
  const counts = new Map()
  for (const r of list) {
    const values = Array.isArray(r[field]) ? r[field] : [r[field]]
    values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1))
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function toggleInSet(set, value) {
  const next = new Set(set)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  return next
}

function FilterGroup({ title, options, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  // always show ticked options, even if they'd be past the preview cut-off
  const shown = expanded
    ? options
    : options.filter(([v], i) => i < FACET_PREVIEW || selected.has(v))
  return (
    <fieldset className="filter-group">
      <legend className="filter-title">{title}</legend>
      {shown.map(([value, count]) => (
        <label key={value} className="filter-option">
          <input type="checkbox" checked={selected.has(value)} onChange={() => onToggle(value)} />
          <span className="filter-label">{value}</span>
          <span className="filter-count">{count}</span>
        </label>
      ))}
      {options.length > FACET_PREVIEW && (
        <button type="button" className="link-button filter-more" onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'Show fewer' : `Show all ${options.length}`}
        </button>
      )}
    </fieldset>
  )
}

function ResultCard({ r, saved, onToggleSave }) {
  const tags = r.contraindications.slice(0, MAX_TAGS)
  const hidden = r.contraindications.length - tags.length

  return (
    <article className="result-card">
      <div className="result-head">
        <h2 className="result-brand">
          <a href={drugHref(r.id)}>{r.label}</a>
        </h2>
        <span className="result-meta">
          {r.strengths} · {r.company}
        </span>

        <div className="result-actions">
          {r.missingCommon >= FLAG_THRESHOLD && (
            <a
              href={drugHref(r.id)}
              className="pill pill-flag"
              title={`Leaves out ${r.missingCommon} adverse event terms that most other ${r.ingredient} brands list`}
            >
              Inconsistency flagged
            </a>
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
        {r.ingredient}
        {r.indication && ` · ${r.indication.length > 90 ? `${r.indication.slice(0, 88)}…` : r.indication}`}
        {' · '}
        {r.product.revised ? `revised ${formatDate(r.product.revised)}` : 'no revision date'}
      </p>

      <div className="result-foot">
        <span className={`rec-badge rec-${r.pregnancyLevel}`}>
          Pregnancy: {prettyRecommendation(r.pregnancy)}
        </span>
        <span className="result-count">{r.aeCount} adverse event terms</span>
      </div>

      {tags.length > 0 && (
        <ul className="result-tags" aria-label="Contraindications">
          <li className="result-tags-label">Contraindications:</li>
          {tags.map((t) => (
            <li key={t} className="term-chip term-soft-md">
              {t}
            </li>
          ))}
          {hidden > 0 && <li className="result-more">+{hidden} more</li>}
        </ul>
      )}
    </article>
  )
}

function Search({ initialQuery = '', mode = null }) {
  const catalog = useCatalog()
  const query = initialQuery.trim().toLowerCase()

  const [sort, setSort] = useState('relevance')
  const [classes, setClasses] = useState(new Set())
  const [ingredients, setIngredients] = useState(new Set())
  const [companies, setCompanies] = useState(new Set())
  const [pregnancy, setPregnancy] = useState(new Set())
  const [limit, setLimit] = useState(PAGE_SIZE)
  const savedIds = useStore(savedStore)

  // Keep a search history for logged-in users (shown in their data export)
  useEffect(() => {
    recordSearch(initialQuery)
  }, [initialQuery])

  // Results matching the text query only — facet counts are based on these
  const scored = (catalog ?? [])
    .map((r) => ({ r, score: matchScore(r, query, mode) }))
    .filter((m) => m.score > 0)
  // A picked suggestion ("Dihydropyridine calcium channel blocker") shows exact
  // matches only — not "Non-dihydropyridine…" which merely contains the words.
  const exactOnly = mode && scored.some((m) => m.score === EXACT)
  const matched = exactOnly ? scored.filter((m) => m.score === EXACT) : scored
  const matchedRecords = matched.map((m) => m.r)
  const classOptions = countBy(matchedRecords, 'classes')
  const ingredientOptions = countBy(matchedRecords, 'ingredient')
  const companyOptions = countBy(matchedRecords, 'company')
  const pregnancyCounts = new Map(countBy(matchedRecords, 'pregnancyLevel'))

  const results = matched
    .filter(({ r }) => !classes.size || r.classes.some((c) => classes.has(c)))
    .filter(({ r }) => !ingredients.size || ingredients.has(r.ingredient))
    .filter(({ r }) => !companies.size || companies.has(r.company))
    .filter(({ r }) => !pregnancy.size || pregnancy.has(r.pregnancyLevel))
    .sort((a, b) => {
      if (sort === 'newest') return b.r.revised.localeCompare(a.r.revised)
      if (sort === 'fewest-terms') return a.r.aeCount - b.r.aeCount
      return b.score - a.score || a.r.label.localeCompare(b.r.label)
    })

  const hasFilters = classes.size || ingredients.size || companies.size || pregnancy.size
  const modeInfo = SEARCH_MODES.find((m) => m.id === mode)

  // Any change to filters or sort starts the list from the top again
  const resetLimit = () => setLimit(PAGE_SIZE)

  function resetFilters() {
    setClasses(new Set())
    setIngredients(new Set())
    setCompanies(new Set())
    setPregnancy(new Set())
    resetLimit()
  }

  return (
    <main className="search-page">
      <SearchBox initialQuery={initialQuery} initialMode={mode} rerunOnModeChange />

      <div className="search-layout">
        <aside className="filters" aria-label="Filters">
          <div className="filters-head">
            <span className="kicker filters-kicker">Filter</span>
            <button type="button" className="link-button" onClick={resetFilters} disabled={!hasFilters}>
              Reset
            </button>
          </div>

          {catalog && (
            <>
              <FilterGroup
                title="Drug class"
                options={classOptions}
                selected={classes}
                onToggle={(v) => {
                  setClasses((s) => toggleInSet(s, v))
                  resetLimit()
                }}
              />

              <FilterGroup
                title="Active ingredient"
                options={ingredientOptions}
                selected={ingredients}
                onToggle={(v) => {
                  setIngredients((s) => toggleInSet(s, v))
                  resetLimit()
                }}
              />

              <FilterGroup
                title="Company"
                options={companyOptions}
                selected={companies}
                onToggle={(v) => {
                  setCompanies((s) => toggleInSet(s, v))
                  resetLimit()
                }}
              />

              <fieldset className="filter-group">
                <legend className="filter-title">Pregnancy advice</legend>
                <div className="severity-toggles">
                  {PREGNANCY.filter((p) => pregnancyCounts.has(p.id)).map((p) => {
                    const on = pregnancy.has(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        aria-pressed={on}
                        className={`rec-badge rec-${p.id} severity-toggle${pregnancy.size && !on ? ' is-dimmed' : ''}`}
                        onClick={() => {
                          setPregnancy((set) => toggleInSet(set, p.id))
                          resetLimit()
                        }}
                      >
                        {p.label} ({pregnancyCounts.get(p.id)})
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </>
          )}
        </aside>

        <section className="results" aria-live="polite">
          <div className="results-toolbar">
            <div className="sort-pills" role="group" aria-label="Sort results">
              {SORTS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={sort === o.id}
                  className={`sort-pill${sort === o.id ? ' is-active' : ''}`}
                  onClick={() => {
                    setSort(o.id)
                    resetLimit()
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {catalog && (
              <span className="results-count">
                {results.length} {results.length === 1 ? 'product' : 'products'}
                {initialQuery.trim() && <> for “{initialQuery.trim()}”</>}
                {modeInfo && <> in {modeInfo.group.toLowerCase()}</>}
              </span>
            )}
          </div>

          {!catalog ? (
            <p className="results-loading">Loading monographs…</p>
          ) : results.length > 0 ? (
            <>
              {results.slice(0, limit).map(({ r }) => (
                <ResultCard
                  key={r.id}
                  r={r}
                  saved={savedIds.includes(r.id)}
                  onToggleSave={() => toggleSaved(r.id)}
                />
              ))}
              {results.length > limit && (
                <div className="results-more">
                  <span>
                    Showing {limit} of {results.length}
                  </span>
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setLimit((n) => n + PAGE_SIZE)}
                  >
                    Show {Math.min(PAGE_SIZE, results.length - limit)} more
                  </button>
                </div>
              )}
            </>
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
