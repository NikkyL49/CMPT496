import { monographById, formatDate } from '../data/monographs'
import { useDrugDetails, detailsFor, splitList } from '../data/drugDetails'
import { useAdverseEvents } from '../data/adverseEvents'
import { savedStore, toggleSaved } from '../data/saved'
import { useStore } from '../utils/store'
import { productsByIngredient, sameIngredientFlag } from '../utils/ingredientGroup'
import { drugHref, searchHref } from '../utils/links'
import { classesFor } from '../data/drugClasses'
import OverviewTab from './drug/OverviewTab'
import AdverseEventsTab from './drug/AdverseEventsTab'
import ConflictsTab from './drug/ConflictsTab'
import GraphsTab from './drug/GraphsTab'
import AlternativesTab from './drug/AlternativesTab'
import ResearchTab from './drug/ResearchTab'
import './Drug.css'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'adverse', label: 'Adverse events' },
  { id: 'conflicts', label: 'Conflicts' },
  { id: 'graphs', label: 'Graphs' },
  { id: 'alternatives', label: 'Alternatives' },
  { id: 'research', label: 'Research papers' },
]

function SameIngredientBanner({ flag, ingredient, compareHref }) {
  if (!flag) return null
  const { others, missingCommon, rare } = flag
  const brands = `${others} other ${ingredient} ${others === 1 ? 'brand' : 'brands'}`
  return (
    <section className="drug-banner banner-lo" aria-label="Same-ingredient flag">
      <span className="banner-label">Same-ingredient flag</span>
      <p>
        {missingCommon.length === 0 && rare.length === 0 ? (
          <>This monograph&rsquo;s adverse event list closely matches the {brands}.</>
        ) : (
          <>
            Compared with the {brands}, this monograph{' '}
            {missingCommon.length > 0 && (
              <>
                leaves out <strong>{missingCommon.length}</strong>{' '}
                {missingCommon.length === 1 ? 'term' : 'terms'} that most of them list
                {missingCommon.length <= 4 && ` (${missingCommon.join(', ')})`}
              </>
            )}
            {missingCommon.length > 0 && rare.length > 0 && ', and '}
            {rare.length > 0 && (
              <>
                lists <strong>{rare.length}</strong> {rare.length === 1 ? 'term' : 'terms'} that
                few of them do
              </>
            )}
            .
          </>
        )}
      </p>
      <a href={compareHref} className="banner-link">
        See the comparison →
      </a>
    </section>
  )
}

function Drug({ productId, listingId, tab = 'overview' }) {
  const product = monographById.get(productId)
  const details = useDrugDetails()
  const aeData = useAdverseEvents()
  const savedIds = useStore(savedStore)

  // Selected strength: from the URL, else the highest strength (as in the design)
  const variant =
    product?.variants.find((v) => v.id === listingId) ?? product?.variants.at(-1)
  const info = details && variant ? detailsFor(details, variant.id) : null
  const activeTab = TABS.some((t) => t.id === tab) ? tab : 'overview'

  // Cheap to recompute: the ingredient index is cached in productsByIngredient
  const ingredient = info?.ingredient
  const group = details && ingredient ? (productsByIngredient(details).get(ingredient) ?? []) : []
  const others = group.filter((p) => p.id !== productId)
  const termIdx = aeData && variant ? aeData.byId[variant.id] : null
  const myTerms = termIdx ? new Set(termIdx.map((i) => aeData.terms[i])) : null
  const flag = aeData && myTerms && others.length ? sameIngredientFlag(aeData, myTerms, others) : null

  if (!product) {
    return (
      <main className="simple-page">
        <p className="kicker auth-kicker">Drug not found</p>
        <h1>We couldn&rsquo;t find that drug</h1>
        <p>The link may be out of date.</p>
        <a href="#/search" className="btn-primary">
          Search monographs
        </a>
      </main>
    )
  }

  const go = (opts) =>
    window.location.replace(drugHref(product.id, { s: variant.id, tab: activeTab, ...opts }))

  // Compare with the 2 most recently revised other brands of the same ingredient
  const compareIds = [
    product.id,
    ...[...others]
      .sort((a, b) => (b.revised?.iso ?? '').localeCompare(a.revised?.iso ?? ''))
      .slice(0, 2)
      .map((p) => p.id),
  ]
  const compareHref = `#/compare?ids=${compareIds.join(',')}`
  const saved = savedIds.includes(product.id)
  const warnings = info ? splitList(info.warnings) : []
  const contraTerms = info?.contraindicationTerms ?? []

  return (
    <main className="drug-page">
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <a href="#/search">Search</a>
        <span aria-hidden="true">›</span>
        <a href={searchHref(info?.ingredient ?? product.family, 'ingredient')}>
          {info?.ingredient ?? product.family}
        </a>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{product.brand}</span>
      </nav>

      <div className="drug-head">
        <div>
          <p className="kicker drug-kicker">
            {info?.ingredient ?? product.family}
            {info &&
              classesFor(info.ingredient)
                .filter((c) => c !== 'Unclassified')
                .map((c) => (
                  <span key={c}>
                    {' · '}
                    <a href={searchHref(c, 'class')}>{c}</a>
                  </span>
                ))}
          </p>
          <h1 className="drug-title">
            {product.brand} {variant?.strength}
          </h1>
          <p className="drug-meta">
            {product.company} · authorized {formatDate(product.authorized)} · revised{' '}
            {formatDate(product.revised)}
          </p>
        </div>
        <div className="drug-actions">
          <button
            type="button"
            className={`btn-outline${saved ? ' is-on' : ''}`}
            aria-pressed={saved}
            onClick={() => toggleSaved(product.id)}
          >
            {saved ? '♥ Saved' : '♡ Save'}
          </button>
          <a href={`#/compare?ids=${product.id}`} className="btn-outline">
            Compare
          </a>
          {/* TODO: Interaction check page isn't built yet */}
          <a href={`#/interactions?ids=${product.id}`} className="btn-primary">
            Add to interaction check
          </a>
        </div>
      </div>

      {!info ? (
        <p className="drug-loading">Loading monograph details…</p>
      ) : (
        <>
          {warnings.length > 0 && (
            <section className="drug-banner banner-hi" aria-label="Serious warnings and precautions">
              <span className="banner-label">Serious warnings and precautions</span>
              <p>{warnings.join(' · ')}</p>
            </section>
          )}

          {contraTerms.length > 0 && (
            <section className="drug-banner banner-md" aria-label="Contraindications">
              <span className="banner-label">
                {contraTerms.length} {contraTerms.length === 1 ? 'contraindication' : 'contraindications'}
              </span>
              <p>{contraTerms.join(' · ')}</p>
            </section>
          )}

          <SameIngredientBanner flag={flag} ingredient={info.ingredient} compareHref={compareHref} />

          <div className="tabs drug-tabs" role="tablist" aria-label="Monograph sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`drug-tab-${t.id}`}
                aria-selected={activeTab === t.id}
                aria-controls="drug-panel"
                className={`tab${activeTab === t.id ? ' is-active' : ''}`}
                onClick={() => go({ tab: t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>

          <section id="drug-panel" role="tabpanel" aria-labelledby={`drug-tab-${activeTab}`}>
            {activeTab === 'overview' && (
              <OverviewTab
                product={product}
                variant={variant}
                info={info}
                terms={myTerms}
                onPickStrength={(id) => go({ s: id })}
                onShowAdverse={() => go({ tab: 'adverse' })}
              />
            )}
            {activeTab === 'adverse' && <AdverseEventsTab info={info} terms={myTerms} />}
            {activeTab === 'conflicts' && <ConflictsTab info={info} />}
            {activeTab === 'graphs' && (
              <GraphsTab
                product={product}
                group={group}
                details={details}
                aeData={aeData}
                ingredient={info.ingredient}
              />
            )}
            {activeTab === 'alternatives' && (
              <AlternativesTab product={product} others={others} details={details} aeData={aeData} />
            )}
            {activeTab === 'research' && (
              <ResearchTab product={product} variant={variant} details={details} />
            )}
          </section>
        </>
      )}

      <aside className="notice drug-notice">
        <span className="badge badge-solid-lo">Notice</span>
        Information only, not medical advice. Always confirm against the official Health Canada
        monograph.
      </aside>
    </main>
  )
}

export default Drug
