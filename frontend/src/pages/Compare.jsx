import { useMemo, useState } from 'react'
import {
  monographById,
  formatDate,
  strengthsLabel,
  suggestionsFor,
} from '../data/monographs'
import { todayIso, yearsBetween, formatSpan } from '../utils/dates'
import { familyColorMap } from '../utils/chartColors'
import ProductPicker from '../components/ProductPicker'
import CompareTimeline from '../components/CompareTimeline'
import AdverseEventGrid from '../components/AdverseEventGrid'
import TermOverlapChart from '../components/TermOverlapChart'
import {
  useAdverseEvents,
  termsForProduct,
  inconsistencySummary,
} from '../data/adverseEvents'
import { drugHref } from '../utils/links'
import './Compare.css'

const MAX_PRODUCTS = 6

// Starting points when nothing is selected yet
const QUICK_STARTS = [
  {
    label: 'Amlodipine: ACH, APO, NORVASC',
    ids: ['ach-amlodipine-accord-healthcare-inc', 'apo-amlodipine-apotex-inc', 'norvasc-bgp-pharma-ulc'],
  },
  {
    label: 'ELIQUIS vs XARELTO',
    ids: ['eliquis-pfizer-canada-ulc', 'xarelto-bayer-inc'],
  },
]

function setIds(ids) {
  window.location.hash = ids.length ? `#/compare?ids=${ids.join(',')}` : '#/compare'
}

// Rows of the comparison table. `safety: true` rows tint pink when they differ.
// TODO: add contraindications and pregnancy rows from the MedDRA CSV
// (they're in the hi-fi design).
function buildRows(products, termSets) {
  const today = todayIso()
  return [
    { label: 'Drug family', values: products.map((p) => p.family) },
    { label: 'Company', values: products.map((p) => p.company) },
    { label: 'Strengths', values: products.map((p) => strengthsLabel(p)) },
    { label: 'Initial authorization', values: products.map((p) => formatDate(p.authorized)) },
    { label: 'Last revised', values: products.map((p) => formatDate(p.revised)) },
    {
      label: 'Since last revision',
      values: products.map((p) =>
        p.revised ? formatSpan(yearsBetween(p.revised.iso, today)) : 'No revision date',
      ),
    },
    {
      label: 'MedDRA adverse event terms',
      values: products.map((p, i) =>
        termSets ? (termSets[i] ? String(termSets[i].size) : 'No data') : 'Loading…',
      ),
    },
  ].map((row) => ({ ...row, identical: new Set(row.values).size === 1 }))
}

function cellClass(row, value) {
  if (/^(No (date|revision|data)|Loading)/.test(value)) return 'cell-missing'
  if (row.identical) return 'cell-same'
  return row.safety ? 'cell-diff-safety' : 'cell-diff'
}

function SummaryBanner({ products, terms }) {
  const families = [...new Set(products.map((p) => p.family))]
  const revised = products.filter((p) => p.revised).map((p) => p.revised.iso).sort()
  const missing = products.length - revised.length
  const sameFamily = families.length === 1
  const facts = []
  // Only meaningful for the same drug: different drugs should list different terms
  if (terms && sameFamily) {
    facts.push(`${terms.inconsistent} of ${terms.total} MedDRA terms not reported consistently`)
  }
  if (revised.length >= 2) {
    facts.push(
      `last revisions are ${formatSpan(yearsBetween(revised[0], revised.at(-1)))} apart`,
    )
  }
  if (missing) facts.push(`${missing} ${missing === 1 ? 'has' : 'have'} no revision date`)
  if (products.some((p) => p.dateConflict)) facts.push('some dates conflict — check the source')

  return (
    <div className="compare-banner">
      <span className="banner-tag">{sameFamily ? 'Cluster' : 'Mixed'}</span>
      <p>
        {products.length}{' '}
        {sameFamily
          ? `${families[0]} products compared`
          : `products compared across ${families.length} drug families (${families.join(', ')})`}
        {facts.length > 0 && ` · ${facts.join(' · ')}`}.
      </p>
    </div>
  )
}

function CompareTable({ products, rows, colors, multiFamily }) {
  const kinds = new Set(
    rows.flatMap((r) => r.values.map((v) => cellClass(r, v))).filter((k) => k !== 'cell-missing'),
  )
  return (
    <>
      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Field</span>
              </th>
              {products.map((p) => (
                <th key={p.id} scope="col">
                  {multiFamily && (
                    <span
                      className="family-dot"
                      style={{ background: colors.get(p.family) }}
                      aria-hidden="true"
                    />
                  )}
                  <a href={drugHref(p.id)} className="compare-drug-link">
                    {p.label}
                  </a>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <th scope="row">{row.label}</th>
                {row.values.map((v, i) => (
                  <td key={products[i].id}>
                    <span className={`cell ${cellClass(row, v)}`}>{v}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="compare-legend">
        {kinds.has('cell-same') && <span className="legend-chip cell-same">Identical</span>}
        {kinds.has('cell-diff') && <span className="legend-chip cell-diff">Differs (non-safety)</span>}
        {kinds.has('cell-diff-safety') && (
          <span className="legend-chip cell-diff-safety">Differs (safety)</span>
        )}
      </div>
      <p className="compare-note">
        Contraindication and pregnancy rows from the MedDRA data are coming next.
      </p>
    </>
  )
}

function Compare({ ids = [] }) {
  const [tab, setTab] = useState('tables')
  const [diffOnly, setDiffOnly] = useState(false)
  const [termFocus, setTermFocus] = useState(null) // set by clicking the overlap chart

  const products = useMemo(
    () => [...new Set(ids)].map((id) => monographById.get(id)).filter(Boolean),
    [ids],
  )
  const selectedIds = useMemo(() => new Set(products.map((p) => p.id)), [products])
  const families = [...new Set(products.map((p) => p.family))]
  const colors = familyColorMap(families)
  const suggestions = suggestionsFor(products).filter(
    () => products.length < MAX_PRODUCTS,
  )

  const aeData = useAdverseEvents()
  const termSets = useMemo(
    () => (aeData ? products.map((p) => termsForProduct(aeData, p)) : null),
    [aeData, products],
  )
  const termSummary = termSets && inconsistencySummary(termSets)

  const allRows = buildRows(products, termSets)
  const rows = diffOnly ? allRows.filter((r) => !r.identical) : allRows

  const add = (p) => setIds([...products.map((x) => x.id), p.id].slice(0, MAX_PRODUCTS))
  const remove = (p) => setIds(products.filter((x) => x.id !== p.id).map((x) => x.id))

  return (
    <main className="compare-page">
      <div className="compare-head">
        <h1 className="compare-title">Compare</h1>
        {products.length >= 2 && (
          <button
            type="button"
            className={`toggle-pill${diffOnly ? ' is-on' : ''}`}
            aria-pressed={diffOnly}
            onClick={() => setDiffOnly((v) => !v)}
          >
            Show differences only
          </button>
        )}
      </div>

      <div className="bubbles" aria-label="Products being compared">
        {products.map((p) => (
          <span key={p.id} className="bubble bubble-selected" title={p.company}>
            {p.label}
            <button
              type="button"
              className="bubble-remove"
              aria-label={`Remove ${p.label}`}
              onClick={() => remove(p)}
            >
              ×
            </button>
          </span>
        ))}
        {suggestions.map((p) => (
          <button
            key={p.id}
            type="button"
            className="bubble bubble-suggest"
            title={`Add ${p.label} (${p.company})`}
            onClick={() => add(p)}
          >
            + {p.label}
          </button>
        ))}
        <ProductPicker
          // reopen while fewer than 2 products are picked; collapse to the
          // "+ Add More" bubble once a comparison is loaded
          key={products.length < 2 ? 'start' : 'compare'}
          excludeIds={selectedIds}
          onPick={add}
          disabled={products.length >= MAX_PRODUCTS}
          autoOpen={products.length < 2}
        />
      </div>

      {products.length === 0 && (
        <div className="compare-empty">
          <h2>Pick two or more products to compare</h2>
          <p>Search above, or start with one of these:</p>
          <div className="quick-starts">
            {QUICK_STARTS.filter((q) => q.ids.every((id) => monographById.has(id))).map((q) => (
              <button key={q.label} type="button" className="pill pill-action" onClick={() => setIds(q.ids)}>
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {products.length === 1 && (
        <p className="compare-hint">Add at least one more product to compare.</p>
      )}

      {products.length >= 1 && (
        <>
          {products.length >= 2 && <SummaryBanner products={products} terms={termSummary} />}

          <div className="tabs" role="tablist" aria-label="Comparison view">
            {[
              ['tables', 'Tables'],
              ['graphs', 'Graphs'],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={tab === id}
                aria-controls={`panel-${id}`}
                className={`tab${tab === id ? ' is-active' : ''}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'tables' ? (
              <>
                {rows.length ? (
                  <CompareTable
                    products={products}
                    rows={rows}
                    colors={colors}
                    multiFamily={families.length > 1}
                  />
                ) : (
                  <p className="compare-hint">These products are identical on every field shown.</p>
                )}
                {products.length >= 2 && termSets && (
                  <AdverseEventGrid
                    key={termFocus ? `${termFocus.productId}-${termFocus.kind}` : 'all'}
                    products={products}
                    termSets={termSets}
                    meddraVersion={aeData.meddraVersion}
                    focus={termFocus}
                    onClearFocus={() => setTermFocus(null)}
                  />
                )}
              </>
            ) : (
              <>
                {products.length >= 2 &&
                  (termSets ? (
                    <TermOverlapChart
                      products={products}
                      termSets={termSets}
                      multiFamily={families.length > 1}
                      onSelect={(f) => {
                        setTermFocus(f)
                        setTab('tables')
                        requestAnimationFrame(() =>
                          document.getElementById('ae-grid')?.scrollIntoView({ behavior: 'smooth' }),
                        )
                      }}
                    />
                  ) : (
                    <p className="compare-hint">Loading adverse event terms…</p>
                  ))}
                <CompareTimeline products={products} colors={colors} />
              </>
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default Compare
