import { useEffect, useId, useRef, useState } from 'react'
import {
  useInteractionIndex,
  resolveSelection,
  checkInteractions,
  partnerSuggestions,
  GRADES,
  MAX_DRUGS,
} from '../data/interactions'
import { monographById } from '../data/monographs'
import { savedStore } from '../data/saved'
import { useStore } from '../utils/store'
import { searchHref } from '../utils/links'
import './Interactions.css'

const SHARED_AE_PREVIEW = 12

// Starting point when nothing is selected (the set from the hi-fi design)
const QUICK_START = ['diltiazem', 'simvastatin', 'apixaban', 'perindopril', 'losartan']

function setDrugs(slugs) {
  window.location.assign(slugs.length ? `#/interactions?drugs=${slugs.join(',')}` : '#/interactions')
}

function DrugLink({ drug }) {
  return <a href={searchHref(drug.name, 'ingredient')}>{drug.name}</a>
}

// "+ Add more" bubble that turns into a search box over the 60 ingredients
function IngredientPicker({ index, exclude, onPick, disabled }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listId = useId()

  const q = query.trim().toLowerCase()
  const results = index.ingredients
    .filter((i) => !exclude.includes(i) && (!q || i.name.toLowerCase().includes(q)))
    .sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)))
    .slice(0, 8)

  function close() {
    setOpen(false)
    setQuery('')
    setActive(0)
  }

  function pick(i) {
    onPick(i)
    close()
  }

  if (!open) {
    return (
      <button
        type="button"
        className="bubble bubble-add"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? `You can check up to ${MAX_DRUGS} drugs` : undefined}
      >
        + Add more
      </button>
    )
  }

  return (
    <div className="picker">
      <input
        ref={inputRef}
        autoFocus
        className="input picker-input"
        placeholder="Type an active ingredient…"
        role="combobox"
        aria-label="Add a drug to the interaction check"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(i + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault()
            pick(results[active])
          } else if (e.key === 'Escape') {
            close()
          }
        }}
        onBlur={() => setTimeout(close, 150)}
      />
      <ul id={listId} role="listbox" className="picker-list">
        {results.length ? (
          results.map((i, n) => (
            <li
              key={i.slug}
              id={`${listId}-${n}`}
              role="option"
              aria-selected={n === active}
              className={n === active ? 'is-active' : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(i)}
              onMouseEnter={() => setActive(n)}
            >
              <span className="picker-name">{i.name}</span>
              <span className="picker-meta">
                {i.products.length} {i.products.length === 1 ? 'product' : 'products'}
                {i.classes.length > 0 && ` · ${i.classes.join(', ')}`}
              </span>
            </li>
          ))
        ) : (
          <li className="picker-empty">No matching ingredient</li>
        )}
      </ul>
    </div>
  )
}

function quote(terms) {
  return terms.map((t) => `“${t}”`).join(', ')
}

// One line: how A's monographs mention B
function DirectionLine({ d }) {
  const { from, to, total, byName, byClass, classTerms } = d
  const of = `${total} ${from.name} ${total === 1 ? 'product' : 'products'}`
  if (!byName && !byClass) {
    return (
      <li className="ix-dir is-none">
        None of the {of} mention {to.name.toLowerCase()}.
      </li>
    )
  }
  return (
    <li className="ix-dir">
      {byName > 0 && (
        <>
          <strong>
            {byName} of {of}
          </strong>{' '}
          name {to.name.toLowerCase()}
          {byClass > 0 ? '; ' : '.'}
        </>
      )}
      {byClass > 0 && (
        <>
          {byName > 0 ? (
            <>{byClass} more</>
          ) : (
            <strong>
              {byClass} of {of}
            </strong>
          )}{' '}
          name it only by class ({quote(classTerms)}).
        </>
      )}
    </li>
  )
}

function PairCard({ pair }) {
  const grade = GRADES.find((g) => g.id === pair.grade)
  const tag = pair.sharedCyp.length
    ? `Both metabolized by ${pair.sharedCyp.join(', ')}`
    : pair.grade === 'class'
      ? 'Drug-class mention'
      : null
  return (
    <article className={`ix-card ix-${grade.level}`}>
      <header className="ix-card-head">
        <span className={`badge badge-solid-${grade.level}`}>{grade.short}</span>
        <h3 className="ix-pair">
          <DrugLink drug={pair.a} /> + <DrugLink drug={pair.b} />
        </h3>
        {tag && <span className="ix-tag">{tag}</span>}
      </header>
      <ul className="ix-dirs">
        <DirectionLine d={pair.ab} />
        <DirectionLine d={pair.ba} />
      </ul>
    </article>
  )
}

function MechanismCard({ title, drugs, total, note }) {
  return (
    <div className="mech-card">
      <h3 className="mech-title">{title}</h3>
      <ul className="chip-row">
        {drugs.map((d) => (
          <li key={d.slug} className="term-chip term-soft">
            {d.name}
          </li>
        ))}
      </ul>
      <div
        className="mech-bar"
        role="img"
        aria-label={`${drugs.length} of ${total} drugs`}
      >
        <span style={{ width: `${(drugs.length / total) * 100}%` }} />
      </div>
      <p className="mech-count">
        {drugs.length} of {total} drugs{note ? ` · ${note}` : ''}
      </p>
    </div>
  )
}

function Interactions({ tokens = [] }) {
  const index = useInteractionIndex()
  const savedIds = useStore(savedStore)
  const [showAllAe, setShowAllAe] = useState(false)

  const selected = index ? resolveSelection(index, tokens) : []
  const slugs = selected.map((s) => s.slug)

  // Links from the drug page and Saved pass product ids: rewrite them as ingredients
  const canonical = slugs.join(',')
  useEffect(() => {
    if (!index) return
    if (tokens.join(',') !== canonical) {
      window.location.replace(canonical ? `#/interactions?drugs=${canonical}` : '#/interactions')
    }
  }, [index, tokens, canonical])

  if (!index) {
    return (
      <main className="ix-page">
        <h1 className="ix-title">Drug interaction check</h1>
        <p className="ix-loading">Loading monograph data…</p>
      </main>
    )
  }

  // Suggestions: saved drugs first, then drugs the selected labels name most
  const fromSaved = savedIds
    .map((id) => monographById.get(id) && index.byProductId.get(id))
    .filter((i, n, all) => i && !selected.includes(i) && all.indexOf(i) === n)
  const suggestions = [...fromSaved, ...partnerSuggestions(index, selected)]
    .filter((i, n, all) => all.indexOf(i) === n)
    .slice(0, 3)

  const full = selected.length >= MAX_DRUGS
  const result = selected.length >= 2 ? checkInteractions(selected) : null
  const counts = Object.fromEntries(
    GRADES.map((g) => [g.id, result ? result.pairs.filter((p) => p.grade === g.id).length : 0]),
  )
  const sharedAe = result ? (showAllAe ? result.sharedAe : result.sharedAe.slice(0, SHARED_AE_PREVIEW)) : []

  return (
    <main className="ix-page">
      <h1 className="ix-title">Drug interaction check</h1>

      <section className="ix-picker surface" aria-label="Selected drugs">
        <div className="bubbles ix-bubbles">
          {selected.map((s) => (
            <span key={s.slug} className="bubble bubble-selected">
              {s.name}
              <button
                type="button"
                className="bubble-remove"
                aria-label={`Remove ${s.name}`}
                onClick={() => setDrugs(slugs.filter((x) => x !== s.slug))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="bubbles ix-bubbles">
          {!full &&
            suggestions.map((s) => (
              <button
                key={s.slug}
                type="button"
                className="bubble bubble-suggest"
                onClick={() => setDrugs([...slugs, s.slug])}
              >
                + {s.name}
              </button>
            ))}
          <IngredientPicker
            index={index}
            exclude={selected}
            disabled={full}
            onPick={(i) => setDrugs([...slugs, i.slug])}
          />
          <span className="ix-count">
            {selected.length} {selected.length === 1 ? 'drug' : 'drugs'} selected
          </span>
        </div>
      </section>

      {!result ? (
        <section className="ix-empty">
          <h2>Add at least two drugs</h2>
          <p>
            We check each pair against the Drug Interactions section of every Canadian monograph for
            those ingredients.
          </p>
          <button type="button" className="btn-outline" onClick={() => setDrugs(QUICK_START)}>
            Try diltiazem, simvastatin, apixaban, perindopril, losartan
          </button>
        </section>
      ) : (
        <>
          <div className="ix-summary" aria-label="Pairs by how the labels document them">
            {GRADES.map((g) => (
              <span key={g.id} className={`badge badge-solid-${g.level}`}>
                {g.short} {counts[g.id]}
              </span>
            ))}
            <span className="ix-summary-note">
              {result.pairs.length} of {result.pairs.length + result.quiet.length} pairs mentioned
              in the monographs
            </span>
          </div>

          <p className="ix-how">
            Graded by how the monographs document each pair, not by clinical severity: the data has
            no severity ratings. A pair named on both drugs&rsquo; labels is the best documented.
          </p>

          {result.pairs.length > 0 ? (
            <div className="ix-list">
              {result.pairs.map((p) => (
                <PairCard key={`${p.a.slug}+${p.b.slug}`} pair={p} />
              ))}
            </div>
          ) : (
            <p className="ix-none">None of these drugs&rsquo; monographs mention each other.</p>
          )}

          {result.quiet.length > 0 && (
            <section className="ix-quiet">
              <h2 className="ix-h2">Not mentioned on either label</h2>
              <ul className="chip-row">
                {result.quiet.map((q) => (
                  <li key={`${q.a.slug}+${q.b.slug}`} className="term-chip term-outline">
                    {q.a.name} + {q.b.name}
                  </li>
                ))}
              </ul>
              <p className="ix-note">
                Not finding a pair in the monographs doesn&rsquo;t mean it&rsquo;s safe to combine.
              </p>
            </section>
          )}

          <section aria-labelledby="mech-heading">
            <h2 id="mech-heading" className="ix-h2">
              Shared mechanisms
            </h2>
            <div className="mech-grid surface">
              {result.enzymes.map((e) => (
                <MechanismCard key={e.name} title={e.name} drugs={e.drugs} total={selected.length} />
              ))}
              {result.sameClass.map((c) => (
                <MechanismCard
                  key={c.name}
                  title={`Same class: ${c.name}`}
                  drugs={c.drugs}
                  total={selected.length}
                  note="possible duplicate therapy"
                />
              ))}
              {result.enzymes.length === 0 && result.sameClass.length === 0 && (
                <p className="ix-note">No shared CYP enzyme or drug class.</p>
              )}
            </div>
            {result.noCyp.length > 0 && (
              <p className="ix-note">
                No CYP metabolism stated in most monographs for{' '}
                {result.noCyp.map((d) => d.name).join(', ')}.
              </p>
            )}
          </section>

          {result.sharedAe.length > 0 && (
            <section aria-labelledby="ae-heading" className="ix-ae">
              <h2 id="ae-heading" className="ix-h2">
                Adverse events listed for more than one of these drugs
              </h2>
              <p className="ix-note">
                Terms listed by at least half of each drug&rsquo;s monographs ({result.sharedAe.length}{' '}
                terms).
              </p>
              <ul className="ae-list surface">
                {sharedAe.map((a) => (
                  <li key={a.term} className="ae-row">
                    <span className="ae-term">{a.term}</span>
                    <span className="ae-count">
                      {a.drugs.length} of {selected.length}
                    </span>
                    <span className="ae-drugs">{a.drugs.map((d) => d.name).join(', ')}</span>
                  </li>
                ))}
              </ul>
              {result.sharedAe.length > SHARED_AE_PREVIEW && (
                <button type="button" className="link-button" onClick={() => setShowAllAe((v) => !v)}>
                  {showAllAe ? 'Show fewer' : `Show all ${result.sharedAe.length}`}
                </button>
              )}
            </section>
          )}
        </>
      )}

      <aside className="notice ix-notice">
        <span className="badge badge-solid-lo">Notice</span>
        Information only, not medical advice. Always confirm against the official Health Canada
        monograph and check with a pharmacist.
      </aside>
    </main>
  )
}

export default Interactions
