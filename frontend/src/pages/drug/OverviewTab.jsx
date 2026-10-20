import { isMissing, recommendationLevel, prettyRecommendation } from '../../data/drugDetails'
import { Card, Chips, ClampText, RecBadge } from './parts'

function DoseCard({ title, value }) {
  const level = recommendationLevel(value)
  return (
    <Card title={title}>
      <p className={`dose-line dose-${level}`}>{prettyRecommendation(value)}</p>
    </Card>
  )
}

function OverviewTab({ product, variant, info, terms, onPickStrength, onShowAdverse }) {
  const cyp = isMissing(info.metabolism)
    ? null
    : info.metabolism
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^CYP/i.test(s))
  const termList = terms ? [...terms].sort((a, b) => a.localeCompare(b)) : null

  return (
    <div className="drug-grid">
      <Card title="Dosage">
        {product.variants.length > 1 && (
          <div className="strength-pills" role="group" aria-label="Strength">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`strength-pill${v.id === variant.id ? ' is-active' : ''}`}
                aria-pressed={v.id === variant.id}
                onClick={() => onPickStrength(v.id)}
              >
                {v.strength ?? v.id}
              </button>
            ))}
          </div>
        )}
        <dl className="facts">
          {!isMissing(info.ingredients) && (
            <>
              <dt>Active ingredient</dt>
              <dd>{info.ingredients}</dd>
            </>
          )}
          {!isMissing(info.dosage) && (
            <>
              <dt>Available as</dt>
              <dd>{info.dosage}</dd>
            </>
          )}
        </dl>
      </Card>

      <Card title="Indication of use">
        {info.indicationTerms.length > 0 && <Chips items={info.indicationTerms} variant="caps" />}
        <ClampText text={info.indication} />
      </Card>

      <Card title="Pregnancy & breastfeeding">
        <div className="badge-row">
          <RecBadge label="Pregnancy" value={info.pregnancy} />
          <RecBadge label="Breastfeeding" value={info.breastfeeding} />
        </div>
        <ClampText text={info.pregnancySummary} />
      </Card>

      <Card title="Adverse events">
        {termList ? (
          <>
            <p className="card-note">
              {termList.length} MedDRA terms across {info.bodySystems.length} body systems
            </p>
            <Chips items={termList} limit={8} onMore={onShowAdverse} />
          </>
        ) : (
          <p className="muted">Loading…</p>
        )}
      </Card>

      <DoseCard title="Liver function" value={info.liver} />
      <DoseCard title="Kidney function" value={info.kidney} />

      <Card title="Metabolism">
        {cyp?.length ? (
          <>
            <p className="card-note">Metabolised by these CYP enzymes:</p>
            <Chips items={cyp} />
          </>
        ) : (
          <p>
            {isMissing(info.metabolism)
              ? 'Not stated in the monograph.'
              : 'No CYP metabolism identified.'}
          </p>
        )}
      </Card>
    </div>
  )
}

export default OverviewTab
