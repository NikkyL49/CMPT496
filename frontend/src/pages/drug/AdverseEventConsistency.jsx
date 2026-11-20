import { useMemo, useState } from 'react'
import { termsForProduct } from '../../data/adverseEvents'
import { Card } from './parts'
import './AdverseEventConsistency.css'

// How consistently the brands of one ingredient list each adverse-event term.
// Built from adverse_event_terms.json (already loaded by the drug page), using
// termsForProduct, so each brand counts once with all its strengths combined.
// Brands are not named here: the chart describes the group, not who differs.

const GROUPS = [
  { id: 'every', label: 'On every brand' },
  { id: 'most', label: 'On most brands' },
  { id: 'few', label: 'On half or fewer' },
]

const groupOf = (count, n) => (count === n ? 'every' : count * 2 > n ? 'most' : 'few')

function AdverseEventConsistency({ product, group, aeData, ingredient }) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState(null)

  const stats = useMemo(() => {
    const sets = group.map((p) => termsForProduct(aeData, p)).filter(Boolean)
    const n = sets.length
    const counts = new Map()
    sets.forEach((s) => s.forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1)))
    const tally = { every: 0, most: 0, few: 0 }
    counts.forEach((c) => tally[groupOf(c, n)]++)
    const total = counts.size
    const avgShare = total ? [...counts.values()].reduce((a, c) => a + c / n, 0) / total : 0
    const typical = total ? Math.round([...counts.values()].reduce((a, c) => a + c, 0) / total) : 0
    const terms = [...counts.keys()].sort((a, b) => a.localeCompare(b))
    return { n, counts, tally, total, avgShare, typical, terms }
  }, [aeData, group])

  const mine = useMemo(() => termsForProduct(aeData, product), [aeData, product])

  if (stats.n < 2) {
    return (
      <Card title={`How consistent are side effects across ${ingredient} brands?`}>
        <p className="card-note">
          Only one {ingredient} brand has adverse event information, so there are no other
          labels to compare with.
        </p>
      </Card>
    )
  }

  const { n, counts, tally, total, avgShare, typical, terms } = stats
  const verdict =
    tally.every / total >= 0.6
      ? 'Their labels mostly list the same side effects.'
      : avgShare >= 0.75
        ? 'Most side effects appear on most of them, but only a few appear on every one.'
        : 'Their labels list noticeably different side effects.'

  const q = query.trim().toLowerCase()
  const suggestions = q && !picked ? terms.filter((t) => t.toLowerCase().includes(q)).slice(0, 6) : []

  const pick = (term) => {
    setPicked(term)
    setQuery(term)
  }

  return (
    <Card title={`How consistent are side effects across ${ingredient} brands?`}>
      <p className="aec-lead">
        <strong>{n} brands</strong> of {ingredient} have adverse event information. {verdict}
      </p>

      <div
        className="aec-bar"
        role="img"
        aria-label={GROUPS.map((g) => `${tally[g.id]} side effects ${g.label.toLowerCase()}`).join(', ')}
      >
        {GROUPS.map((g) =>
          tally[g.id] ? (
            <span
              key={g.id}
              className={`aec-seg aec-${g.id}`}
              style={{ flexGrow: tally[g.id] }}
              title={`${g.label}: ${tally[g.id]} side effects`}
            />
          ) : null,
        )}
      </div>
      <ul className="aec-key">
        {GROUPS.map((g) => (
          <li key={g.id}>
            <span className={`aec-swatch aec-${g.id}`} aria-hidden="true" />
            {g.label}: <strong>{tally[g.id]}</strong> side effects
          </li>
        ))}
      </ul>

      <div className="aec-search">
        <h3 className="aec-h3">Check a side effect</h3>
        <p className="card-note">See how many {ingredient} brands list it, and whether this one does.</p>
        <label htmlFor="aec-input" className="visually-hidden">
          Search for a side effect
        </label>
        <input
          id="aec-input"
          className="input"
          type="text"
          autoComplete="off"
          placeholder="Type a side effect, for example: headache"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPicked(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions.length) pick(suggestions[0])
          }}
        />

        <div aria-live="polite">
          {suggestions.length > 0 && (
            <ul className="aec-suggest">
              {suggestions.map((t) => (
                <li key={t}>
                  <button type="button" onClick={() => pick(t)}>
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {q && !picked && suggestions.length === 0 && (
            <p className="aec-note">
              No {ingredient} brand lists a side effect by that name. Labels use medical names,
              so try another word.
            </p>
          )}

          {picked && <Result term={picked} count={counts.get(picked) ?? 0} n={n} onThis={mine?.has(picked)} ingredient={ingredient} typical={typical} />}
        </div>
      </div>
    </Card>
  )
}

function Result({ term, count, n, onThis, ingredient, typical }) {
  const others = n - 1
  const othersListing = count - (onThis ? 1 : 0)
  // This product's dot first, then the other brands (listed first, then not)
  const dots = [
    { listed: !!onThis, self: true },
    ...Array.from({ length: others }, (_, i) => ({ listed: i < othersListing, self: false })),
  ]

  return (
    <div className={`aec-result${count === n ? ' is-every' : ''}`}>
      <p className="aec-answer">
        <strong>{term}</strong>{' '}
        {onThis ? 'is listed on this label' : 'is not listed on this label'}, and on{' '}
        <strong>
          {othersListing} of {others}
        </strong>{' '}
        other {ingredient} {others === 1 ? 'brand' : 'brands'}.
      </p>

      <div className="aec-dots" role="img" aria-label={`${count} of ${n} brands list ${term}`}>
        {dots.map((d, i) => (
          <span
            key={i}
            className={`aec-dot${d.listed ? ' is-listed' : ''}${d.self ? ' is-self' : ''}`}
            title={`${d.self ? 'This product' : 'Another brand'}: ${d.listed ? 'listed' : 'not listed'}`}
          />
        ))}
      </div>

      <ul className="aec-legend">
        <li>
          <span className="aec-dot is-listed" aria-hidden="true" />
          Brand lists it
        </li>
        <li>
          <span className="aec-dot" aria-hidden="true" />
          Brand does not list it
        </li>
        <li>
          <span className="aec-dot is-self" aria-hidden="true" />
          This product
        </li>
      </ul>

      <p className="aec-context">
        For comparison, a typical {ingredient} side effect is listed on {typical} of {n} brands.
      </p>
    </div>
  )
}

export default AdverseEventConsistency
