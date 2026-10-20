import { useId, useRef, useState } from 'react'
import { useCatalog, suggest, SEARCH_MODES } from '../data/catalog'
import { searchHref } from '../utils/links'
import './SearchBox.css'

// Bold the part of a suggestion that matches what was typed
function Highlight({ term, q }) {
  const lower = term.toLowerCase()
  let i = lower.startsWith(q) ? 0 : -1
  if (i < 0) {
    const m = lower.match(new RegExp(`[\\s\\-/(),+]${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))
    i = m ? m.index + 1 : -1
  }
  if (i < 0) return term
  return (
    <>
      {term.slice(0, i)}
      <mark>{term.slice(i, i + q.length)}</mark>
      {term.slice(i + q.length)}
    </>
  )
}

// Search box with suggestions and "By …" buttons.
// - No button selected: suggestions from ingredients, conditions,
//   contraindications and drug classes; Enter searches everything.
// - A button selected: suggestions and search use only that category.
// `rerunOnModeChange`: on the Search page, switching button re-runs the search.
function SearchBox({ initialQuery = '', initialMode = null, rerunOnModeChange = false }) {
  const [text, setText] = useState(initialQuery)
  const [mode, setMode] = useState(initialMode)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [wantData, setWantData] = useState(false) // load data on first focus/typing
  const inputRef = useRef(null)
  const listId = useId()

  const catalog = useCatalog(wantData)
  const q = text.trim().toLowerCase()
  const groups = open && q ? suggest(catalog, text, mode) : []
  const flat = groups.flatMap((g) => g.items)
  const modeInfo = SEARCH_MODES.find((m) => m.id === mode)

  function go(term, byMode) {
    setOpen(false)
    window.location.assign(searchHref(term.trim(), byMode))
  }

  function pickMode(id) {
    const next = mode === id ? null : id
    setMode(next)
    setActive(-1)
    if (rerunOnModeChange && initialQuery.trim()) {
      go(text, next)
      return
    }
    setOpen(true)
    inputRef.current?.focus()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' && flat.length) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp' && flat.length) {
      e.preventDefault()
      setActive((i) => (i <= 0 ? flat.length - 1 : i - 1))
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    } else if (e.key === 'Enter' && active >= 0 && flat[active]) {
      e.preventDefault()
      go(flat[active].term, flat[active].mode)
    }
  }

  const showList = open && q.length > 0
  let index = -1

  return (
    <div className="searchbox">
      <div className="searchbox-field">
        <form
          className="search-box"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            go(text, mode)
          }}
        >
          <span className="search-icon" aria-hidden="true">⌕</span>
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-expanded={showList && flat.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            placeholder={
              modeInfo
                ? `Search ${modeInfo.group.toLowerCase()}…`
                : 'Search by drug, ingredient, condition, contraindication or class'
            }
            aria-label="Search monographs"
            value={text}
            onFocus={() => {
              setWantData(true)
              setOpen(true)
            }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onChange={(e) => {
              setText(e.target.value)
              setWantData(true)
              setOpen(true)
              setActive(-1)
            }}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className="btn-primary">
            Search
          </button>
        </form>

        <div className="filter-chips" role="group" aria-label="Search by">
          {SEARCH_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`chip${mode === m.id ? ' is-active' : ''}`}
              aria-pressed={mode === m.id}
              onMouseDown={(e) => e.preventDefault()} // keep the input focused
              onClick={() => pickMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        {showList && (
          <div className="suggest" id={listId} role="listbox" aria-label="Suggestions">
            {!catalog ? (
              <p className="suggest-empty">Loading suggestions…</p>
            ) : groups.length === 0 ? (
              <p className="suggest-empty">
                No {modeInfo ? modeInfo.group.toLowerCase() : 'ingredients, conditions, contraindications or classes'}{' '}
                start with “{text.trim()}”. Press Enter to search drug names too.
              </p>
            ) : (
              groups.map((g) => (
                <div key={g.id} role="group" aria-label={g.group} className="suggest-group">
                  <div className="suggest-head">
                    <span>{g.group}</span>
                    {g.total > g.items.length && (
                      <span className="suggest-total">
                        {g.items.length} of {g.total}
                      </span>
                    )}
                  </div>
                  {g.items.map((it) => {
                    index += 1
                    const i = index
                    return (
                      <div
                        key={`${g.id}-${it.term}`}
                        id={`${listId}-${i}`}
                        role="option"
                        aria-selected={i === active}
                        className={`suggest-item${i === active ? ' is-active' : ''}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(it.term, it.mode)}
                      >
                        <span className="suggest-term">
                          <Highlight term={it.term} q={q} />
                        </span>
                        <span className="suggest-count">
                          {it.count} {it.count === 1 ? 'product' : 'products'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchBox
