import { useId, useRef, useState } from 'react'
import { searchMonographs, strengthsLabel } from '../data/monographs'

// "+ Add More" bubble that turns into a search box with a suggestion list.
function ProductPicker({ excludeIds, onPick, disabled, autoOpen = false }) {
  const [open, setOpen] = useState(autoOpen)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listId = useId()

  const results = searchMonographs(query, excludeIds)

  function close() {
    setOpen(false)
    setQuery('')
    setActive(0)
  }

  function pick(p) {
    onPick(p)
    setQuery('')
    setActive(0)
    inputRef.current?.focus()
  }

  function handleKey(e) {
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
  }

  if (!open) {
    return (
      <button
        type="button"
        className="bubble bubble-add"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? 'You can compare up to 6 products' : undefined}
      >
        + Add More
      </button>
    )
  }

  return (
    <div className="picker">
      <input
        ref={inputRef}
        autoFocus
        className="input picker-input"
        placeholder="Type a drug or company…"
        role="combobox"
        aria-label="Add a product to compare"
        aria-expanded={results.length > 0}
        aria-controls={listId}
        aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={handleKey}
        onBlur={() => setTimeout(close, 150)} // let a click on an option land first
      />
      {query.trim() && (
        <ul id={listId} role="listbox" className="picker-list">
          {results.length ? (
            results.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'is-active' : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(p)}
                onMouseEnter={() => setActive(i)}
              >
                <span className="picker-name">{p.label}</span>
                <span className="picker-meta">
                  {p.company} · {strengthsLabel(p)}
                </span>
              </li>
            ))
          ) : (
            <li className="picker-empty">No matching products</li>
          )}
        </ul>
      )}
    </div>
  )
}

export default ProductPicker
