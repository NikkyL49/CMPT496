import { useState } from 'react'
import { useCatalog, suggest } from '../data/catalog'
import { places, PLACE_TYPES } from '../data/places'
import { drugHref } from '../utils/links'
import './Discovery.css'

const PAGE_SIZE = 20

// Starting chips — the design's examples, spelled the way the data spells them
// (MedDRA terms). "+ Add More" adds any other term from the dataset.
const START_CONDITIONS = [
  'Hypertension',
  'Angina pectoris',
  'Type 2 diabetes mellitus',
  'Hypercholesterolaemia',
  'Gastrooesophageal reflux disease',
]
const START_CONTRAS = ['Pregnancy', 'Breast feeding', 'Hypotension', 'Renal impairment', 'Liver disorder']

// Most severe first, like the design
const STATUS = {
  hi: { label: 'Contraindicated', className: 'rec-hi', order: 0 },
  md: { label: 'Caution', className: 'rec-md', order: 1 },
  ok: { label: 'No stated restriction', className: 'rec-lo', order: 2 },
}

// ["A", "B", "C"] → "A, B and C"
function joinAnd(list) {
  return list.length < 2 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`
}

// How a product stands against the ticked contraindications:
//   named in its Contraindications section → Contraindicated
//   named in its Warnings section          → Caution
//   neither                                → No stated restriction
function classify(r, contras) {
  if (!contras.length) return null
  const lower = (list) => new Set(list.map((t) => t.toLowerCase()))
  const contraSet = lower(r.contraindications)
  const warnSet = lower(r.warnings)
  const hits = contras.filter((t) => contraSet.has(t.toLowerCase()))
  if (hits.length) {
    return { level: 'hi', reason: `Contraindicated in ${joinAnd(hits)} per the product monograph.` }
  }
  const warns = contras.filter((t) => warnSet.has(t.toLowerCase()))
  if (warns.length) {
    return {
      level: 'md',
      reason: `${joinAnd(warns)} ${warns.length > 1 ? 'appear' : 'appears'} in the warnings section.`,
    }
  }
  return {
    level: 'ok',
    reason: `${joinAnd(contras)} ${contras.length > 1 ? 'are' : 'is'} not named in warnings or contraindications.`,
  }
}

function toggleIn(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

// One row of chips (Condition / Contraindication) with "+ Add More"
function ChipRow({ title, mode, catalog, chips, selected, onToggle, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const matches = adding && text.trim() ? (suggest(catalog, text, mode, 8)[0]?.items ?? []) : []

  function add(term) {
    onAdd(term)
    setText('')
    setAdding(false)
  }

  return (
    <div className="disc-row">
      <span className="disc-row-title" id={`disc-${mode}`}>
        {title}
      </span>
      <div className="disc-chips" role="group" aria-labelledby={`disc-${mode}`}>
        {chips.map((term) => (
          <button
            key={term}
            type="button"
            className={`disc-chip${selected.includes(term) ? ' is-on' : ''}`}
            aria-pressed={selected.includes(term)}
            onClick={() => onToggle(term)}
          >
            {term}
          </button>
        ))}

        {adding ? (
          <div className="disc-add">
            <input
              autoFocus
              type="search"
              className="disc-add-input"
              placeholder={`Type a ${title.toLowerCase()}…`}
              aria-label={`Add a ${title.toLowerCase()}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setAdding(false)
                if (e.key === 'Enter' && matches[0]) add(matches[0].term)
              }}
              onBlur={() => setTimeout(() => setAdding(false), 150)}
            />
            {matches.length > 0 && (
              <ul className="disc-add-list">
                {matches.map((m) => (
                  <li key={m.term}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()} // keep the input focused
                      onClick={() => add(m.term)}
                    >
                      <span>{m.term}</span>
                      <span className="disc-add-count">{m.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <button type="button" className="disc-chip disc-chip-add" onClick={() => setAdding(true)} disabled={!catalog}>
            + Add More
          </button>
        )}
      </div>
    </div>
  )
}

function DrugCard({ r, status }) {
  return (
    <article className="disc-card">
      <div className="disc-card-head">
        <h2 className="disc-card-name">
          <a href={drugHref(r.id)}>{r.label}</a>
        </h2>
        {status && <span className={`rec-badge ${STATUS[status.level].className}`}>{STATUS[status.level].label}</span>}
      </div>
      <p className="disc-card-reason">{status ? status.reason : r.indication || r.ingredient}</p>
      <p className="disc-card-meta">
        {r.ingredient} · {r.company}
      </p>
    </article>
  )
}

// Mock map: drawn streets + clickable dots. Sample places only (data/places.js).
function PlacesMap() {
  const [types, setTypes] = useState(PLACE_TYPES.map((t) => t.id))
  const [pickedId, setPickedId] = useState(places[0].id)
  const shown = places.filter((p) => types.includes(p.type))
  const picked = shown.find((p) => p.id === pickedId) ?? shown[0]
  const typeLabel = (id) => PLACE_TYPES.find((t) => t.id === id).label

  return (
    <section className="disc-map-col" aria-label="Places near you">
      <div className="disc-types" role="group" aria-label="Show on map">
        {PLACE_TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`disc-type${types.includes(t.id) ? ' is-on' : ''}`}
            aria-pressed={types.includes(t.id)}
            onClick={() => setTypes((list) => toggleIn(list, t.id))}
          >
            {t.plural}
          </button>
        ))}
      </div>

      <div className="disc-map">
        <svg className="disc-map-streets" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 18 L100 14" />
          <path d="M0 42 L100 46" />
          <path d="M30 0 L26 60" />
          <path d="M66 0 L70 60" />
          <path d="M0 58 Q40 50 100 56" className="disc-map-shore" />
        </svg>

        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`disc-dot dot-${p.type}${picked?.id === p.id ? ' is-picked' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            aria-label={`${p.name}, ${typeLabel(p.type)}`}
            aria-pressed={picked?.id === p.id}
            title={p.name}
            onClick={() => setPickedId(p.id)}
          />
        ))}

        <ul className="disc-legend" aria-label="Legend">
          {PLACE_TYPES.map((t) => (
            <li key={t.id} className={`legend-${t.id}`}>
              {t.label}
            </li>
          ))}
        </ul>
      </div>

      {picked ? (
        <div className="disc-place">
          <h2 className="disc-place-name">{picked.name}</h2>
          <span className="term-chip term-soft disc-place-type">{typeLabel(picked.type)}</span>
          <p className="disc-place-meta">
            {picked.distance} · {picked.hours} · {picked.phone}
          </p>
          <p className="disc-place-address">{picked.address}</p>
          <div className="disc-place-actions">
            <a
              className="btn-primary"
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(picked.address)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Directions
            </a>
            <a className="btn-outline" href={`tel:${picked.phone.replace(/\D/g, '')}`}>
              Call
            </a>
          </div>
        </div>
      ) : (
        <p className="disc-place disc-empty">Pick at least one place type to see it on the map.</p>
      )}
      <p className="disc-sample-note">Sample locations for the prototype — not real places.</p>
    </section>
  )
}

function Discovery() {
  const catalog = useCatalog()
  const [conditionChips, setConditionChips] = useState(START_CONDITIONS)
  const [contraChips, setContraChips] = useState(START_CONTRAS)
  const [conditions, setConditions] = useState([START_CONDITIONS[0]])
  const [contras, setContras] = useState([START_CONTRAS[0]])
  const [limit, setLimit] = useState(PAGE_SIZE)

  // Products indicated for any ticked condition, most severe status first
  const wanted = new Set(conditions.map((t) => t.toLowerCase()))
  const results = (catalog ?? [])
    .filter((r) => r.conditions.some((t) => wanted.has(t.toLowerCase())))
    .map((r) => ({ r, status: classify(r, contras) }))
    .sort(
      (a, b) =>
        (a.status ? STATUS[a.status.level].order : 0) - (b.status ? STATUS[b.status.level].order : 0) ||
        a.r.label.localeCompare(b.r.label),
    )
  const counts = results.reduce((c, { status }) => (status ? { ...c, [status.level]: (c[status.level] ?? 0) + 1 } : c), {})

  function changed(fn) {
    fn()
    setLimit(PAGE_SIZE) // back to the first page when the picks change
  }

  return (
    <main className="disc-page">
      <h1 className="disc-title">Discovery — find a drug and where to fill it</h1>

      <section className="disc-filters" aria-label="Pick conditions and contraindications">
        <ChipRow
          title="Condition"
          mode="condition"
          catalog={catalog}
          chips={conditionChips}
          selected={conditions}
          onToggle={(t) => changed(() => setConditions((l) => toggleIn(l, t)))}
          onAdd={(t) =>
            changed(() => {
              setConditionChips((l) => (l.includes(t) ? l : [...l, t]))
              setConditions((l) => (l.includes(t) ? l : [...l, t]))
            })
          }
        />
        <ChipRow
          title="Contraindication"
          mode="contraindication"
          catalog={catalog}
          chips={contraChips}
          selected={contras}
          onToggle={(t) => changed(() => setContras((l) => toggleIn(l, t)))}
          onAdd={(t) =>
            changed(() => {
              setContraChips((l) => (l.includes(t) ? l : [...l, t]))
              setContras((l) => (l.includes(t) ? l : [...l, t]))
            })
          }
        />
      </section>

      <div className="disc-layout">
        <section className="disc-results" aria-label="Drugs" aria-live="polite">
          {!catalog ? (
            <p className="disc-empty">Loading drugs…</p>
          ) : !conditions.length ? (
            <p className="disc-empty">Pick at least one condition to see drugs for it.</p>
          ) : !results.length ? (
            <p className="disc-empty">No drugs in the dataset are indicated for {joinAnd(conditions)}.</p>
          ) : (
            <>
              <p className="disc-summary">
                {results.length} {results.length === 1 ? 'drug' : 'drugs'} for {joinAnd(conditions)}
                {contras.length > 0 &&
                  ` · ${counts.hi ?? 0} contraindicated · ${counts.md ?? 0} caution · ${counts.ok ?? 0} no stated restriction`}
              </p>
              {results.slice(0, limit).map(({ r, status }) => (
                <DrugCard key={r.id} r={r} status={status} />
              ))}
              {results.length > limit && (
                <button type="button" className="btn-outline disc-more" onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                  Show more ({results.length - limit} left)
                </button>
              )}
            </>
          )}
        </section>

        <PlacesMap />
      </div>
    </main>
  )
}

export default Discovery
