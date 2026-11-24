import { useAnalysisTables } from '../data/analysis'
import './Layer1Concordance.css'

// Layer 1: manufacturer concordance (the team's full workbook analysis) for one
// ingredient. Data: backend/data/analysis/layer1_concordance.json, built by
// `npm run build:layer1` in backend/ and served to researchers only.

const TABLE = ['layer1-concordance']

const DOMAINS = [
  { key: 'ae', label: 'Adverse events' },
  { key: 'warning', label: 'Warnings and precautions' },
  { key: 'contra', label: 'Contraindications' },
]

const GUIDANCE = [
  { key: 'pregnancy', label: 'Pregnancy' },
  { key: 'breastfeeding', label: 'Breastfeeding' },
  { key: 'kidney', label: 'Kidney impairment' },
  { key: 'liver', label: 'Liver impairment' },
]

const FLAG_TONE = {
  'High-priority review': 'hi',
  Review: 'md',
  'Within consensus range': 'ok',
  'Not enough data': 'none',
}

const BAND_TONE = { High: 'ok', Moderate: 'md', 'Lower / review': 'hi' }

const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`)

function Meter({ value }) {
  if (value == null) return <span className="l1-muted">No terms on either side</span>
  return (
    <span className="l1-meter">
      <span className="l1-meter-track" aria-hidden="true">
        <span className="l1-meter-fill" style={{ width: `${value * 100}%` }} />
      </span>
      <span className="l1-meter-value">{pct(value)}</span>
    </span>
  )
}

// Sentence-case a category from the CSV ("NOT RECOMMENDED" → "Not recommended")
function tidy(value) {
  if (value === 'MIXED/TIE') return 'Mixed (tie)'
  if (value === 'SECTION_NOT_FOUND') return 'Section not found'
  return value === value.toUpperCase() ? value.charAt(0) + value.slice(1).toLowerCase() : value
}

function Layer1Concordance({ ingredient }) {
  const { tables, error } = useAnalysisTables(TABLE)

  if (error) {
    return (
      <p className="form-alert" role="alert">
        Couldn&rsquo;t load the manufacturer agreement results: {error}
      </p>
    )
  }
  if (!tables) return <p className="l1-muted">Loading manufacturer agreement…</p>

  const data = tables['layer1-concordance']
  const row = data.ingredients.find((r) => r.ingredient === ingredient)
  if (!row) {
    return (
      <p className="l1-muted">
        Only one manufacturer makes {ingredient}, so there is nothing to compare at the
        manufacturer level.
      </p>
    )
  }
  const mfrs = data.manufacturers.filter((m) => m.ingredient === ingredient)
  const flagged = mfrs.filter((m) => FLAG_TONE[m.flag] === 'hi' || FLAG_TONE[m.flag] === 'md')

  return (
    <div className="l1">
      <p className="l1-lead">
        Each manufacturer&rsquo;s strengths are combined into one profile, then compared on MedDRA
        terms and on pregnancy, breastfeeding, kidney and liver guidance. A manufacturer is flagged
        when its terms sit far from what at least half of the manufacturers list.
      </p>

      <div className="l1-kpis">
        <div className={`l1-kpi tone-${BAND_TONE[row.band] ?? 'none'}`}>
          <p className="kicker l1-kpi-label">Overall agreement</p>
          <p className="l1-kpi-value">{row.composite?.toFixed(3) ?? '—'}</p>
          <p className="l1-kpi-sub">{row.band} · triage only</p>
        </div>
        <div className="l1-kpi">
          <p className="kicker l1-kpi-label">Manufacturers</p>
          <p className="l1-kpi-value">{row.manufacturers}</p>
          <p className="l1-kpi-sub">{row.manufacturers < 3 ? 'Low confidence: very few to compare' : 'compared pairwise'}</p>
        </div>
        <div className={`l1-kpi${flagged.length ? ' tone-md' : ''}`}>
          <p className="kicker l1-kpi-label">Flagged manufacturers</p>
          <p className="l1-kpi-value">{flagged.length}</p>
          <p className="l1-kpi-sub">review or high-priority review</p>
        </div>
      </div>

      <h3 className="l1-h3">How much the manufacturers&rsquo; terms overlap</h3>
      <div className="inc-table-wrap surface">
        <table className="inc-table l1-table">
          <thead>
            <tr>
              <th scope="col">Section</th>
              <th scope="col">Preferred terms (average Jaccard)</th>
              <th scope="col">Organ classes (average Jaccard)</th>
              <th scope="col">Consensus terms</th>
            </tr>
          </thead>
          <tbody>
            {DOMAINS.map((d) => (
              <tr key={d.key}>
                <th scope="row">{d.label}</th>
                <td>
                  <Meter value={row.jaccard[`${d.key}Pt`]} />
                </td>
                <td>
                  <Meter value={row.jaccard[`${d.key}Soc`]} />
                </td>
                <td>{row.consensusSize[`${d.key}Pt`]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="l1-note">
        Jaccard = terms both manufacturers list ÷ terms either lists, averaged over every pair of
        manufacturers. Consensus terms = listed by at least half of the manufacturers.
      </p>

      <h3 className="l1-h3">Do they give the same guidance?</h3>
      <div className="inc-table-wrap surface">
        <table className="inc-table l1-table">
          <thead>
            <tr>
              <th scope="col">Guidance</th>
              <th scope="col">Most common</th>
              <th scope="col">Agreement</th>
              <th scope="col">Spread</th>
              <th scope="col">All answers</th>
            </tr>
          </thead>
          <tbody>
            {GUIDANCE.map((g) => {
              const c = row.categorical[g.key]
              return (
                <tr key={g.key}>
                  <th scope="row">{g.label}</th>
                  <td>{tidy(c.mode)}</td>
                  <td>
                    <Meter value={c.agreement} />
                  </td>
                  <td title="Normalized entropy: 0 = everyone agrees, 1 = evenly split">
                    {c.entropy.toFixed(2)}
                  </td>
                  <td>
                    <ul className="l1-cats">
                      {Object.entries(c.categories).map(([value, count]) => (
                        <li key={value}>
                          {tidy(value)} <strong>{count}</strong>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <h3 className="l1-h3">Manufacturers, furthest from the consensus first</h3>
      <div className="inc-table-wrap surface">
        <table className="inc-table l1-table">
          <thead>
            <tr>
              <th scope="col">Manufacturer</th>
              <th scope="col">Distance</th>
              <th scope="col">Adverse events</th>
              <th scope="col">Warnings</th>
              <th scope="col">Contraindications</th>
              <th scope="col">Latest revision</th>
            </tr>
          </thead>
          <tbody>
            {mfrs.map((m) => (
              <tr key={m.company}>
                <th scope="row">
                  {m.company}
                  <span className="l1-brands">{m.brands.join(', ')}</span>
                </th>
                <td>
                  <span className={`l1-flag tone-${FLAG_TONE[m.flag]}`} title={m.flag}>
                    {m.distance?.toFixed(3) ?? '—'}
                  </span>
                  <span className="l1-flag-label">{m.flag}</span>
                </td>
                <td>{pct(m.similarity.aePt)}</td>
                <td>{pct(m.similarity.warningPt)}</td>
                <td>{pct(m.similarity.contraPt)}</td>
                <td>{m.latestRevision ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="l1-note">
        Distance = 1 − the average overlap (Jaccard) of the manufacturer&rsquo;s adverse event,
        warning and contraindication terms with the consensus. Under 0.40 is within range,
        0.40–0.59 is worth a review, 0.60 or more is a high-priority review. A large distance can
        come from a different formulation, indication or an older label, so check the source before
        acting on it.
      </p>
    </div>
  )
}

export default Layer1Concordance
