// Small building blocks shared by the drug page tabs.
import { useState } from 'react'
import { isMissing, prettyRecommendation, recommendationLevel } from '../../data/drugDetails'

// Coloured label + text, e.g. "Pregnancy: Not recommended".
// Colour follows severity (hi/md/lo), and the words always say it too.
export function RecBadge({ label, value }) {
  const level = recommendationLevel(value)
  return (
    <span className={`rec-badge rec-${level}`}>
      {label && `${label}: `}
      {prettyRecommendation(value)}
    </span>
  )
}

export function Chips({ items, variant = 'outline', limit, onMore, empty = 'None listed' }) {
  if (!items?.length) return <p className="muted">{empty}</p>
  const shown = limit ? items.slice(0, limit) : items
  const hidden = items.length - shown.length
  return (
    <ul className="chip-list">
      {shown.map((t) => (
        <li key={t} className={`term-chip term-${variant}`}>
          {t}
        </li>
      ))}
      {hidden > 0 &&
        (onMore ? (
          <li>
            <button type="button" className="link-button chip-more" onClick={onMore}>
              +{hidden} more
            </button>
          </li>
        ) : (
          <li className="chip-more">+{hidden} more</li>
        ))}
    </ul>
  )
}

// Long monograph text, cut to a few lines with "Read more"
export function ClampText({ text }) {
  const [open, setOpen] = useState(false)
  if (isMissing(text)) return <p className="muted">Not stated in the monograph.</p>
  const long = text.length > 260
  return (
    <div>
      <p className={`clamp${long && !open ? ' is-clamped' : ''}`}>{text}</p>
      {long && (
        <button type="button" className="link-button" onClick={() => setOpen((v) => !v)}>
          {open ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  )
}

export function Card({ title, children, className = '' }) {
  return (
    <section className={`drug-card ${className}`}>
      <h2 className="drug-card-title">{title}</h2>
      {children}
    </section>
  )
}
