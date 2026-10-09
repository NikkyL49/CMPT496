import { useState } from 'react'
import { products } from '../data/search'
import {
  savedStore,
  removeSaved,
  restoreSaved,
  addManySaved,
} from '../data/saved'
import { useStore } from '../utils/store'
import { downloadFile, toCsv, today } from '../utils/download'
import './Saved.css'

const byId = new Map(products.map((p) => [p.id, p]))

function severePill(count) {
  // 3+ severe terms reads as moderate concern, fewer as low
  return count >= 3 ? 'pill-severity-md' : 'pill-severity-lo'
}

function exportCsv(list) {
  const rows = [
    [
      'Brand', 'Strength', 'Active ingredient', 'Indication', 'Company',
      'Drug class', 'Revised', 'Severe terms', 'Adverse event terms',
      'Inconsistency flagged',
    ],
    ...list.map((p) => [
      p.brand, p.strength, p.ingredient, p.indication, p.company,
      p.drugClass, p.revised, p.severeCount, p.adverseEventCount,
      p.inconsistencyFlagged ? 'Yes' : 'No',
    ]),
  ]
  downloadFile(`monobyte-saved-drugs-${today()}.csv`, toCsv(rows), 'text/csv')
}

function SavedCard({ product: p, onRemove }) {
  return (
    <article className="saved-card">
      <div className="saved-main">
        <h2 className="saved-brand">
          {/* TODO: link to the monograph detail page once it's built */}
          <a href={`#/drug/${p.id}`}>{p.brand}</a>
        </h2>
        <p className="saved-sub">
          {p.ingredient} · {p.indication} · {p.company}
        </p>
      </div>
      <div className="saved-tags">
        {p.inconsistencyFlagged && (
          <span className="pill pill-flag">Inconsistency flagged</span>
        )}
        <span className={`pill ${severePill(p.severeCount)}`}>
          {p.severeCount} severe {p.severeCount === 1 ? 'term' : 'terms'}
        </span>
        {onRemove && (
          <button type="button" className="pill pill-quiet" onClick={onRemove}>
            Remove
          </button>
        )}
      </div>
    </article>
  )
}

function Saved({ sharedIds }) {
  const savedIds = useStore(savedStore)
  const [undo, setUndo] = useState(null) // { id, index, brand }
  const [shareState, setShareState] = useState(null) // 'copied' | url (fallback)

  const isShared = sharedIds != null
  const ids = isShared ? sharedIds : savedIds
  const list = ids.map((id) => byId.get(id)).filter(Boolean)
  const count = list.length

  function handleRemove(p) {
    setUndo({ id: p.id, index: savedIds.indexOf(p.id), brand: p.brand })
    removeSaved(p.id)
  }

  async function handleShare() {
    const url = `${location.origin}${location.pathname}#/saved?shared=${savedIds.join(',')}`
    try {
      await navigator.clipboard.writeText(url)
      setShareState('copied')
    } catch {
      setShareState(url) // clipboard blocked: show the link so it can be copied by hand
    }
  }

  const interactionsHref = `#/interactions?ids=${ids.join(',')}`
  const alreadySavedAll = isShared && list.every((p) => savedIds.includes(p.id))

  return (
    <main className="saved-page">
      {isShared && (
        <p className="form-success shared-banner" role="status">
          You&rsquo;re viewing a shared list.{' '}
          <a href="#/saved">Go to my saved drugs</a>
        </p>
      )}

      <div className="saved-head">
        <h1 className="saved-title">
          {isShared ? 'Shared list · ' : ''}
          {count} saved {count === 1 ? 'drug' : 'drugs'}
        </h1>
        <div className="saved-actions">
          {isShared ? (
            <button
              type="button"
              className="pill pill-action"
              onClick={() => addManySaved(list.map((p) => p.id))}
              disabled={alreadySavedAll || count === 0}
            >
              {alreadySavedAll ? 'All in my list' : 'Save all to my list'}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="pill pill-action"
                onClick={() => exportCsv(list)}
                disabled={count === 0}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="pill pill-action"
                onClick={handleShare}
                disabled={count === 0}
              >
                {shareState === 'copied' ? 'Link copied ✓' : 'Share link'}
              </button>
            </>
          )}
        </div>
      </div>

      {shareState && shareState !== 'copied' && (
        <div className="share-fallback">
          <label htmlFor="share-url">Copy this link to share your list:</label>
          <input
            id="share-url"
            className="input"
            readOnly
            value={shareState}
            onFocus={(e) => e.target.select()}
          />
        </div>
      )}

      {undo && !isShared && (
        <div className="undo-bar" role="status">
          Removed <strong>{undo.brand}</strong>.
          <button
            type="button"
            className="link-button"
            onClick={() => {
              restoreSaved(undo.id, undo.index)
              setUndo(null)
            }}
          >
            Undo
          </button>
        </div>
      )}

      {count > 0 ? (
        <>
          {list.map((p) => (
            <SavedCard
              key={p.id}
              product={p}
              onRemove={isShared ? null : () => handleRemove(p)}
            />
          ))}

          <div className="saved-footer">
            {/* TODO: Interaction check page isn't built yet */}
            {count >= 2 ? (
              <a href={interactionsHref} className="btn-primary">
                Check interactions across {isShared ? 'this' : 'my'} list
              </a>
            ) : (
              <p className="saved-hint">
                Save at least two drugs to check interactions between them.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="saved-empty">
          <h2>{isShared ? 'This shared list is empty' : 'No saved drugs yet'}</h2>
          <p>
            Use <strong>Save</strong> on any search result to keep it here.
          </p>
          <a href="#/search" className="btn-primary">
            Search monographs
          </a>
        </div>
      )}
    </main>
  )
}

export default Saved
