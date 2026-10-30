import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Circle, CircleMarker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useCatalog, suggest } from '../data/catalog'
import { PLACE_TYPES, DEFAULT_CENTER, RADIUS_KM, getUserLocation, geocode, fetchNearbyPlaces } from '../data/places'
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

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${km.toFixed(1)} km`
}

// Keeps the map on the searched spot, and reports when the user drags it away
function MapSync({ search, onDrag }) {
  const map = useMap()
  useEffect(() => {
    if (search) map.setView([search.lat, search.lng], 13)
  }, [map, search])
  useMapEvents({ dragend: () => onDrag(map.getCenter()) })
  return null
}

// Live map: OpenStreetMap tiles + real places from data/places.js
function PlacesMap() {
  const [types, setTypes] = useState(PLACE_TYPES.map((t) => t.id))
  // The spot we searched around: { lat, lng, label?, mine?, accuracyM?, fallback? }
  const [search, setSearch] = useState(null)
  const [result, setResult] = useState({ status: 'locating', places: [], error: '' })
  const [pickedId, setPickedId] = useState(null)
  const [dragged, setDragged] = useState(null) // map center after the user pans away
  const [address, setAddress] = useState('')

  function searchAt(spot) {
    setResult((r) => ({ ...r, status: 'loading', error: '' }))
    setDragged(null)
    setSearch(spot)
  }

  // Start at the user's location, or the default city if they don't share it
  useEffect(() => {
    getUserLocation().then((loc) => searchAt(loc ? { ...loc, mine: true } : { ...DEFAULT_CENTER, fallback: true }))
  }, [])

  function locateMe() {
    setResult((r) => ({ ...r, status: 'locating', error: '' }))
    getUserLocation().then((loc) => {
      if (loc) searchAt({ ...loc, mine: true })
      else setResult((r) => ({ ...r, status: 'error', error: 'Location is blocked. Allow it in your browser, or enter a postal code.' }))
    })
  }

  async function searchAddress(e) {
    e.preventDefault()
    if (!address.trim()) return
    setResult((r) => ({ ...r, status: 'loading', error: '' }))
    try {
      const spot = await geocode(address.trim())
      if (spot) searchAt(spot)
      else setResult((r) => ({ ...r, status: 'error', error: `Couldn't find "${address.trim()}". Try a full postal code like M4S 2B8.` }))
    } catch (err) {
      setResult((r) => ({ ...r, status: 'error', error: err.message }))
    }
  }

  useEffect(() => {
    if (!search) return
    const ctrl = new AbortController()
    fetchNearbyPlaces(search, { signal: ctrl.signal })
      .then((places) => {
        setResult({ status: 'ready', places, error: '' })
        setPickedId(places[0]?.id ?? null)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setResult({ status: 'error', places: [], error: err.message })
      })
    return () => ctrl.abort()
  }, [search])

  const shown = result.places.filter((p) => types.includes(p.type))
  const picked = shown.find((p) => p.id === pickedId) ?? shown[0]
  const typeLabel = (id) => PLACE_TYPES.find((t) => t.id === id).label
  const where = search?.mine
    ? 'you'
    : search?.fallback
      ? `${search.label} (location not shared)`
      : search?.label || 'this area'
  // Laptops without GPS guess location from the network and can be km off
  const roughKm = search?.mine && search.accuracyM > 1000 ? Math.round(search.accuracyM / 1000) : 0

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

      <form className="disc-locate" onSubmit={searchAddress}>
        <input
          type="search"
          className="disc-locate-input"
          placeholder="Postal code or address"
          aria-label="Postal code or address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <button type="submit" className="btn-primary">
          Search
        </button>
        <button type="button" className="btn-outline" onClick={locateMe}>
          Use my location
        </button>
      </form>
      {roughKm > 0 && (
        <p className="disc-locate-warn" role="status">
          Your browser only knows your location to within about {roughKm} km (the shaded circle). Enter your postal
          code for accurate results.
        </p>
      )}

      <div className="disc-map">
        <MapContainer center={[DEFAULT_CENTER.lat, DEFAULT_CENTER.lng]} zoom={13} className="disc-map-canvas">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapSync search={search} onDrag={setDragged} />
          {roughKm > 0 && (
            <Circle
              center={[search.lat, search.lng]}
              radius={search.accuracyM}
              pathOptions={{ className: 'place-accuracy', weight: 1, fillOpacity: 0.08 }}
            />
          )}
          {search && !search.fallback && (search.mine || search.label) && (
            <CircleMarker
              center={[search.lat, search.lng]}
              radius={8}
              pathOptions={{ className: 'place-you', weight: 3, fillOpacity: 1 }}
            >
              <Tooltip>{search.mine ? 'You are here' : search.label}</Tooltip>
            </CircleMarker>
          )}
          {shown.map((p) => (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={picked?.id === p.id ? 11 : 7}
              pathOptions={{
                className: `place-${p.type}`,
                color: picked?.id === p.id ? '#111' : '#fff',
                weight: picked?.id === p.id ? 3 : 2,
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => setPickedId(p.id) }}
            >
              <Tooltip>{p.name}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        {dragged && (
          <button
            type="button"
            className="btn-primary disc-map-research"
            onClick={() => searchAt({ lat: dragged.lat, lng: dragged.lng, mine: false })}
          >
            Search this area
          </button>
        )}
        {result.status !== 'ready' && (
          <p className="disc-map-status" role="status">
            {result.status === 'locating'
              ? 'Finding your location…'
              : result.status === 'loading'
                ? 'Loading places…'
                : result.error}
          </p>
        )}

        <ul className="disc-legend" aria-label="Legend">
          {PLACE_TYPES.map((t) => (
            <li key={t.id} className={`legend-${t.id}`}>
              {t.label}
            </li>
          ))}
        </ul>
      </div>

      {result.status === 'ready' && (
        <p className="disc-map-count">
          {shown.length} {shown.length === 1 ? 'place' : 'places'} within {RADIUS_KM} km of {where}
        </p>
      )}

      {picked ? (
        <div className="disc-place">
          <h2 className="disc-place-name">{picked.name}</h2>
          <span className="term-chip term-soft disc-place-type">{typeLabel(picked.type)}</span>
          <p className="disc-place-meta">
            {[formatDistance(picked.distanceKm), picked.hours, picked.phone].filter(Boolean).join(' · ')}
          </p>
          {picked.address && <p className="disc-place-address">{picked.address}</p>}
          <div className="disc-place-actions">
            <a
              className="btn-primary"
              href={`https://www.google.com/maps/dir/?api=1&destination=${picked.lat},${picked.lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Directions
            </a>
            {picked.phone && (
              <a className="btn-outline" href={`tel:${picked.phone.replace(/[^\d+]/g, '')}`}>
                Call
              </a>
            )}
            {picked.website && (
              <a className="btn-outline" href={picked.website} target="_blank" rel="noopener noreferrer">
                Website
              </a>
            )}
          </div>
        </div>
      ) : (
        result.status === 'ready' && (
          <p className="disc-place disc-empty">
            {types.length
              ? 'Nothing of that type nearby. Drag the map and search another area.'
              : 'Pick at least one place type to see it on the map.'}
          </p>
        )
      )}

      {shown.length > 1 && (
        <h3 className="disc-nearby-title" id="disc-nearby-title">
          Nearest {types.length === 1 ? PLACE_TYPES.find((t) => t.id === types[0]).plural.toLowerCase() : 'places'}
        </h3>
      )}
      {shown.length > 1 && (
        <ul className="disc-nearby" aria-labelledby="disc-nearby-title">
          {shown.slice(0, 6).map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={picked?.id === p.id ? 'is-picked' : ''}
                aria-pressed={picked?.id === p.id}
                onClick={() => setPickedId(p.id)}
              >
                <span className={`disc-nearby-dot dot-${p.type}`} aria-hidden="true" />
                <span className="disc-nearby-name">{p.name}</span>
                <span className="disc-nearby-dist">{formatDistance(p.distanceKm)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="disc-sample-note">Place data from OpenStreetMap — hours and phone numbers may be out of date.</p>
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
