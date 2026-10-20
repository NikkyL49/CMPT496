import { detailsFor, idsByDin } from '../../data/drugDetails'
import { formatDate } from '../../data/monographs'

// One card per strength: each strength has its own DIN and Drug Product
// Database (DPD) entry. The link shown is the DPD page (dpd_info_url);
// the PDF buttons open the product monograph PDF.
function ResearchTab({ product, variant, details }) {
  // selected strength first
  const variants = [variant, ...product.variants.filter((v) => v.id !== variant.id)]

  return (
    <div className="drug-stack">
      {variants.map((v) => {
        const d = detailsFor(details, v.id)
        if (!d) return null
        const sharedWith = (idsByDin(details).get(d.din) ?? []).filter((id) => id !== v.id)
        return (
          <article key={v.id} className={`paper-card${v.id === variant.id ? ' is-current' : ''}`}>
            <h2 className="alt-brand">
              {product.brand}
              <span className="alt-meta">
                {v.strength} · {product.company}
              </span>
            </h2>
            <p className="alt-sub">
              {d.ingredient} · {d.indication} · revised {formatDate(product.revised)}
            </p>

            <dl className="paper-facts">
              <dt>DIN</dt>
              <dd className="paper-din">{d.din ?? '—'}</dd>
              <dt>Health Canada</dt>
              <dd>
                {d.dpdUrl ? (
                  <a href={d.dpdUrl} target="_blank" rel="noopener noreferrer" className="paper-link">
                    {d.dpdUrl}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </dl>

            {d.matchScore != null && d.matchScore < 0.8 && (
              <p className="paper-warn">
                This DIN was matched to the monograph automatically (
                {Math.round(d.matchScore * 100)}% confidence). Check it on the Health Canada page
                before relying on it.
              </p>
            )}

            {sharedWith.length > 0 && (
              <p className="paper-warn">
                The same DIN is also linked to {sharedWith.join(', ')}. One of these matches is
                probably wrong, so check the DIN on the Health Canada page.
              </p>
            )}

            {d.pdfUrl && (
              <div className="paper-actions">
                <a href={d.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  Open PDF
                </a>
                {/* Browsers ignore `download` for other websites' files, so this
                    opens the PDF in a new tab where it can be saved. */}
                <a href={d.pdfUrl} download target="_blank" rel="noopener noreferrer" className="btn-outline">
                  Download PDF
                </a>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

export default ResearchTab
