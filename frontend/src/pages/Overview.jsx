import { useState } from 'react'
import {
  stats,
  searchFilters,
  inconsistencyCount,
  recentMonographs,
} from '../data/overview'
import './Overview.css'

// Divergence score → badge colour (thresholds are a guess; tune with the team)
function divergenceLevel(score) {
  if (score >= 7) return 'hi'
  if (score >= 3) return 'md'
  return 'lo'
}

function Overview() {
  const [query, setQuery] = useState('')

  function handleSearch(e) {
    e.preventDefault()
    // TODO: route to search results once the API exists
    console.log('search:', query)
  }

  return (
    <main className="overview">
      <section className="hero">
        <p className="kicker hero-kicker">
          {stats.source} · {stats.meddraVersion} ·{' '}
          {stats.productCount.toLocaleString()} products
        </p>
        <h1 className="text-hero">
          Every Canadian drug monograph,
          <br />
          read in one place.
        </h1>
        <p className="hero-sub">
          Search by drug, ingredient or condition. See the warnings that matter
          before anything else.
        </p>

        <form className="search-box" onSubmit={handleSearch} role="search">
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            type="search"
            placeholder="Search by drug, ingredient or condition"
            aria-label="Search by drug, ingredient or condition"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        <div className="filter-chips">
          {searchFilters.map((f) => (
            <button key={f} type="button" className="chip">
              {f}
            </button>
          ))}
        </div>
      </section>

      <section className="feature-cards">
        <a href="#" className="card">
          <p className="kicker card-kicker">Discovery</p>
          <h2 className="card-title">Explore by category</h2>
          <p className="card-body">
            Combine a condition with a contradiction and see what is left
            standing -- plus pharmacies and clinics near you.
          </p>
        </a>

        <a href="#" className="card card-raised">
          <p className="kicker card-kicker">Check interactions</p>
          <h2 className="card-title">Enter a medication list</h2>
          <p className="card-body">
            Flags contradictions and shared mechanisms across every drug you
            add.
          </p>
          <div className="severity-legend">
            <span className="badge badge-solid-hi">Major</span>
            <span className="badge badge-solid-md">Moderate</span>
            <span className="badge badge-solid-lo">Minor</span>
          </div>
        </a>

        <div className="card card-raised card-locked">
          <p className="kicker card-kicker">Researcher</p>
          <h2 className="card-title">Inconsistency Report</h2>
          <p className="card-body">
            {inconsistencyCount} same-ingredient inconsistencies flagged for
            review.
          </p>
          <a href="#" className="unlock-link">
            Log in to unlock →
          </a>
        </div>
      </section>

      <section className="recent">
        <div className="section-head">
          <h2 className="text-h1 recent-title">Recently Revised Monographs</h2>
          <a href="#" className="view-all">
            View all
          </a>
        </div>

        <div className="table-wrap">
          <table className="monograph-table">
            <thead>
              <tr>
                <th>Brand</th>
                <th>Active ingredient</th>
                <th>Company</th>
                <th>Revised</th>
                <th>Adverse events</th>
                <th>Flags</th>
              </tr>
            </thead>
            <tbody>
              {recentMonographs.map((m) => (
                <tr key={m.id}>
                  <td>
                    <a href="#" className="brand-link">
                      {m.brand}
                    </a>
                  </td>
                  <td>{m.ingredient}</td>
                  <td>{m.company}</td>
                  <td>{m.revised}</td>
                  <td>{m.adverseEvents} terms</td>
                  <td>
                    <span
                      className={`badge badge-solid-${divergenceLevel(m.divergence)}`}
                    >
                      Divergence {m.divergence.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <aside className="notice">
        <span className="badge badge-solid-lo">Notice</span>
        Information only, not medical advice. Always confirm against the
        official Health Canada monograph.
      </aside>
    </main>
  )
}

export default Overview
