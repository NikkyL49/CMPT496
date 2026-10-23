import {
  stats,
  inconsistencyCount,
  recentMonographs,
} from '../data/overview'
import { drugHrefForBrand } from '../utils/links'
import SearchBox from '../components/SearchBox'
import { useStore } from '../utils/store'
import { sessionStore } from '../data/session'
import { useCan } from '../data/access'
import './Overview.css'

// Divergence score → badge colour (thresholds are a guess; tune with the team)
function divergenceLevel(score) {
  if (score >= 7) return 'hi'
  if (score >= 3) return 'md'
  return 'lo'
}

// Text under a card the current role can't open
function LockNote({ path, who }) {
  const { user } = useStore(sessionStore)
  return user ? (
    <p className="unlock-link">{who} only</p>
  ) : (
    <a href={`#/login?next=${encodeURIComponent(`#${path}`)}`} className="unlock-link">
      Log in to unlock →
    </a>
  )
}

function Overview() {
  const canCheckInteractions = useCan('/interactions')
  const canSeeReport = useCan('/inconsistency')
  // A card is a link when the role can open the page, a locked box otherwise
  const InteractionCard = canCheckInteractions ? 'a' : 'div'
  const ReportCard = canSeeReport ? 'a' : 'div'

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
          Search by drug, ingredient, condition, contraindication or drug class.
          See the warnings that matter before anything else.
        </p>

        <SearchBox />
      </section>

      <section className="feature-cards">
        <a href="#/discovery" className="card">
          <p className="kicker card-kicker">Discovery</p>
          <h2 className="card-title">Explore by category</h2>
          <p className="card-body">
            Combine a condition with a contradiction and see what is left
            standing -- plus pharmacies and clinics near you.
          </p>
        </a>

        <InteractionCard
          {...(canCheckInteractions ? { href: '#/interactions' } : {})}
          className={`card card-raised${canCheckInteractions ? '' : ' card-locked'}`}
        >
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
          {!canCheckInteractions && (
            <LockNote path="/interactions" who="Pharmacists, physicians and researchers" />
          )}
        </InteractionCard>

        <ReportCard
          {...(canSeeReport ? { href: '#/inconsistency' } : {})}
          className={`card card-raised${canSeeReport ? '' : ' card-locked'}`}
        >
          <p className="kicker card-kicker">Researcher</p>
          <h2 className="card-title">Inconsistency Report</h2>
          <p className="card-body">
            {inconsistencyCount} same-ingredient inconsistencies flagged for
            review.
          </p>
          {canSeeReport ? (
            <span className="unlock-link">Open report →</span>
          ) : (
            <LockNote path="/inconsistency" who="Researchers" />
          )}
        </ReportCard>
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
                    <a href={drugHrefForBrand(m.brand, m.company)} className="brand-link">
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
