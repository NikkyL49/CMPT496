import { useEffect, useMemo, useRef, useState } from 'react'
import { formatDate, strengthsLabel } from '../data/monographs'
import { todayIso, toYear, yearsBetween, formatSpan } from '../utils/dates'
import './CompareTimeline.css'

// Timeline in the style of "World History Timeline" (Observable, @tezzutezzu):
// one row per product, a bar from first authorization to latest revision,
// the name beside its bar, a guide line that follows the mouse, and a tooltip.
// Only the products the user picked are shown.

const ROW = 46 // row height
const BAR = 14 // bar thickness
const M = { top: 52, right: 24, bottom: 36, left: 16 } // top leaves room for the guide's date label
const CHAR_W = 7.6 // rough label width per character (13px serif, semibold)

const SORTS = [
  { id: 'added', label: 'Order added' },
  { id: 'authorized', label: 'First authorized' },
  { id: 'revised', label: 'Last revised' },
]

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(800)
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, width]
}

// Year ticks spaced at least ~70px apart
function yearTicks(min, max, width) {
  const span = max - min
  const steps = [1, 2, 5, 10, 20]
  const step = steps.find((s) => (width / span) * s >= 70) ?? 20
  const ticks = []
  for (let y = Math.ceil(min / step) * step; y <= max; y += step) ticks.push(y)
  return ticks
}

function sortProducts(products, sort) {
  const list = [...products]
  if (sort === 'authorized') {
    list.sort((a, b) => (a.authorized?.iso ?? '9').localeCompare(b.authorized?.iso ?? '9'))
  } else if (sort === 'revised') {
    list.sort((a, b) => (b.revised?.iso ?? '0').localeCompare(a.revised?.iso ?? '0'))
  }
  return list
}

function Tooltip({ product: p, x, y, flip }) {
  const today = todayIso()
  return (
    <div
      className="tl-tooltip"
      style={{ left: x, top: y, transform: flip ? 'translate(calc(-100% - 14px), -50%)' : 'translate(14px, -50%)' }}
      role="status"
    >
      <strong>{p.label}</strong>
      <span className="tl-tip-muted">
        {p.company} · {strengthsLabel(p)}
      </span>
      <dl>
        <dt>First authorized</dt>
        <dd>{formatDate(p.authorized)}</dd>
        <dt>Last revised</dt>
        <dd>{formatDate(p.revised)}</dd>
        {p.authorized && p.revised && !p.dateConflict && (
          <>
            <dt>Authorized → revised</dt>
            <dd>{formatSpan(yearsBetween(p.authorized.iso, p.revised.iso))}</dd>
          </>
        )}
        {p.revised && (
          <>
            <dt>Since last revision</dt>
            <dd>{formatSpan(yearsBetween(p.revised.iso, today))}</dd>
          </>
        )}
      </dl>
      {p.dateConflict && <span className="tl-tip-warn">Revision date is earlier than authorization — check the source.</span>}
    </div>
  )
}

function CompareTimeline({ products, colors }) {
  const [wrapRef, width] = useWidth()
  const [sort, setSort] = useState('added')
  const [hover, setHover] = useState(null) // { id, x, y }
  const [guideX, setGuideX] = useState(null)

  const today = todayIso()
  const todayY = toYear(today)
  const rows = useMemo(() => sortProducts(products, sort), [products, sort])

  // x domain: earliest date → today, padded to whole years
  const years = products.flatMap((p) => [p.authorized, p.revised].filter(Boolean).map((d) => toYear(d.iso)))
  const minY = Math.floor(Math.min(todayY - 1, ...years)) - 0.5
  const maxY = Math.ceil(todayY) + 0.25
  const innerW = Math.max(200, width - M.left - M.right)
  const x = (yr) => M.left + ((yr - minY) / (maxY - minY)) * innerW
  const yearAt = (px) => minY + ((px - M.left) / innerW) * (maxY - minY)
  const height = M.top + rows.length * ROW + M.bottom
  const ticks = yearTicks(minY, maxY, innerW)
  const families = [...new Set(products.map((p) => p.family))]
  const hovered = hover && products.find((p) => p.id === hover.id)

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    setGuideX(px >= M.left && px <= M.left + innerW ? px : null)
  }

  function rowGeometry(p) {
    const a = p.authorized && toYear(p.authorized.iso)
    const r = p.revised && toYear(p.revised.iso)
    if (a != null && r != null) {
      const [s, e] = p.dateConflict ? [r, a] : [a, r]
      return { start: x(s), end: x(e), tailFrom: x(Math.max(a, r)), kind: p.dateConflict ? 'conflict' : 'full' }
    }
    if (a != null) return { start: x(a), end: x(a), tailFrom: x(a), kind: 'noRevision' }
    if (r != null) return { start: x(r), end: x(r), tailFrom: x(r), kind: 'noAuthorization' }
    return { kind: 'none' }
  }

  const guideYear = guideX != null ? yearAt(guideX) : null
  const guideLabel =
    guideYear != null
      ? new Date(Date.UTC(Math.floor(guideYear), Math.floor((guideYear % 1) * 12), 1))
          .toLocaleDateString('en-CA', { year: 'numeric', month: 'short', timeZone: 'UTC' })
      : null

  return (
    <div className="timeline-card">
      <div className="timeline-head">
        <div>
          <h2 className="timeline-title">Monograph timeline</h2>
          <p className="timeline-sub">
            Each bar runs from first authorization to the latest revision. The dashed
            line shows how long it has been since that revision.
          </p>
        </div>
        <div className="timeline-sort" role="group" aria-label="Sort rows">
          <span>Sort:</span>
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`sort-chip${sort === s.id ? ' is-active' : ''}`}
              aria-pressed={sort === s.id}
              onClick={() => setSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="timeline-legend">
        {families.length > 1 &&
          families.slice(0, 3).map((f) => (
            <span key={f} className="legend-item">
              <span className="legend-swatch" style={{ background: colors.get(f) }} />
              {f}
            </span>
          ))}
        {families.length > 3 && (
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: colors.get(families[3]) }} />
            Other families
          </span>
        )}
        <span className="legend-item">
          <span
            className="legend-swatch legend-bar"
            style={{ background: families.length === 1 ? colors.get(families[0]) : undefined }}
          />
          Authorized → last revised
        </span>
        <span className="legend-item">
          <span className="legend-dash" />
          Since last revision
        </span>
      </div>

      <div className="timeline-wrap" ref={wrapRef}>
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`Timeline of ${products.length} products from first authorization to latest revision`}
          onMouseMove={onMove}
          onMouseLeave={() => {
            setGuideX(null)
            setHover(null)
          }}
        >
          {/* year grid + axis labels top and bottom */}
          {ticks.map((t) => (
            <g key={t} className="tl-tick">
              <line x1={x(t)} x2={x(t)} y1={M.top - 6} y2={height - M.bottom + 6} />
              <text x={x(t)} y={M.top - 14}>{t}</text>
              <text x={x(t)} y={height - M.bottom + 22}>{t}</text>
            </g>
          ))}

          {/* today */}
          <line className="tl-today" x1={x(todayY)} x2={x(todayY)} y1={M.top - 6} y2={height - M.bottom + 6} />

          {rows.map((p, i) => {
            const cy = M.top + i * ROW + ROW / 2
            const g = rowGeometry(p)
            const color = p.dateConflict ? '#8f8c86' : colors.get(p.family)
            const isHover = hover?.id === p.id
            const labelW = p.label.length * CHAR_W
            // Label to the left of the bar if it fits, otherwise just above it
            const leftFits = g.start != null && g.start - M.left >= labelW + 10
            const note = {
              noRevision: 'no revision date',
              noAuthorization: 'authorization date missing',
              conflict: 'dates conflict',
              none: 'no dates available',
            }[g.kind]

            return (
              <g
                key={p.id}
                className={`tl-row${isHover ? ' is-hover' : ''}`}
                tabIndex={0}
                aria-label={`${p.label}: authorized ${formatDate(p.authorized)}, last revised ${formatDate(p.revised)}`}
                onMouseEnter={(e) => {
                  const r = e.currentTarget.ownerSVGElement.getBoundingClientRect()
                  setHover({ id: p.id, x: e.clientX - r.left, y: cy })
                }}
                onMouseMove={(e) => {
                  const r = e.currentTarget.ownerSVGElement.getBoundingClientRect()
                  setHover({ id: p.id, x: e.clientX - r.left, y: cy })
                }}
                onFocus={() => setHover({ id: p.id, x: g.end ?? M.left + innerW / 2, y: cy })}
                onBlur={() => setHover(null)}
              >
                {/* hit area bigger than the mark */}
                <rect className="tl-hit" x={0} y={cy - ROW / 2} width={width} height={ROW} />

                {g.kind !== 'none' && (
                  <line
                    className="tl-tail"
                    x1={g.tailFrom}
                    x2={x(todayY)}
                    y1={cy}
                    y2={cy}
                  />
                )}

                {(g.kind === 'full' || g.kind === 'conflict') && (
                  <rect
                    x={g.start}
                    y={cy - BAR / 2}
                    width={Math.max(4, g.end - g.start)}
                    height={BAR}
                    rx={4}
                    fill={color}
                    className="tl-bar"
                  />
                )}
                {(g.kind === 'noRevision' || g.kind === 'noAuthorization') && (
                  <circle cx={g.start} cy={cy} r={6} fill={color} className="tl-bar" />
                )}

                <text
                  className="tl-label"
                  x={g.kind === 'none' ? M.left : leftFits ? g.start - 10 : g.start}
                  y={leftFits || g.kind === 'none' ? cy + 4.5 : cy - BAR / 2 - 6}
                  textAnchor={leftFits && g.kind !== 'none' ? 'end' : 'start'}
                >
                  {p.label}
                  {note && <tspan className="tl-note"> — {note}</tspan>}
                </text>
              </g>
            )
          })}

          {/* mouse guide line */}
          {guideX != null && (
            <g className="tl-guide" pointerEvents="none">
              <line x1={guideX} x2={guideX} y1={M.top - 6} y2={height - M.bottom + 6} />
              <rect x={guideX - 34} y={2} width={68} height={18} rx={3} />
              <text x={guideX} y={15}>{guideLabel}</text>
            </g>
          )}
        </svg>

        {hovered && (
          <Tooltip product={hovered} x={hover.x} y={hover.y} flip={hover.x > width / 2} />
        )}
      </div>
      <p className="timeline-foot">
        Dates from <code>drug_monographs_dates.json</code>. Dashed line ends at today ({today}).
      </p>
    </div>
  )
}

export default CompareTimeline
