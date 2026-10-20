import { useEffect, useMemo, useRef, useState } from 'react'
import { arc, hierarchy, interpolate, partition, select } from 'd3'
import { SECTIONS, shortSoc } from '../data/safetySections'
import './SafetySunburst.css'

// Zoomable sunburst (after d3's "Zoomable sunburst" example): products →
// safety sections → MedDRA organ categories. Two rings show at a time; click
// an arc to zoom in, the centre (or the breadcrumb) to zoom out.
// Each category counts as 1, so a section's size = how many categories it
// covers. The source data doesn't link terms to categories, so terms only
// appear in tooltips and the table, not as a third ring.

const SIZE = 640 // viewBox width/height
const RADIUS = SIZE / 6 // ring thickness
const MAX_LABEL = 20

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

const arcVisible = (d) => d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0
const labelVisible = (d) => d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03

function labelTransform(d) {
  const x = (((d.x0 + d.x1) / 2) * 180) / Math.PI
  const y = ((d.y0 + d.y1) / 2) * RADIUS
  return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`
}

const truncate = (s) => (s.length > MAX_LABEL ? `${s.slice(0, MAX_LABEL - 1)}…` : s)

// Products are neutral; sections wear their colour; categories a tint of it
const fillOf = (d) => d.data.section?.color ?? 'var(--cream-300)'
const opacityOf = (d) => (d.data.kind === 'category' ? 0.55 : 1)
const inkOf = (d) => (d.data.kind === 'section' ? d.data.section.ink : '#000')
function labelOf(d) {
  if (d.data.kind === 'category') return truncate(shortSoc(d.data.name))
  if (d.data.kind === 'section') return d.data.section.short
  return truncate(d.data.name)
}

function buildTree(products, sectionsByProduct, aeTermSets) {
  const productNodes = products
    .map((p, i) => {
      const sections = sectionsByProduct[i]
      if (!sections) return null
      return {
        name: p.label,
        kind: 'product',
        children: SECTIONS.filter((s) => sections[s.key]).map((s) => {
          const { socs, terms } = sections[s.key]
          const ae = aeTermSets?.[i]
          return {
            name: s.label,
            kind: 'section',
            section: s,
            product: p,
            terms: s.key === 'ae' ? (ae ? [...ae].sort((a, b) => a.localeCompare(b)) : null) : terms,
            children: socs.map((soc) => ({ name: soc, kind: 'category', section: s, product: p, value: 1 })),
          }
        }),
      }
    })
    .filter(Boolean)
  if (productNodes.length === 0) return null
  if (productNodes.length === 1) return productNodes[0]
  return { name: 'All products', kind: 'root', children: productNodes }
}

function countLabel(n, one, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`
}

function Tooltip({ node }) {
  const d = node.data
  if (d.kind === 'product') {
    const cats = new Set(node.leaves().map((l) => l.data.name)).size
    return (
      <>
        <strong>{d.name}</strong>
        <span>
          {countLabel(node.children.length, 'safety section')} ·{' '}
          {countLabel(cats, 'organ category', 'organ categories')}
        </span>
        <span className="sunburst-tip-hint">Click to zoom in</span>
      </>
    )
  }
  if (d.kind === 'section') {
    const cats = countLabel(node.children.length, 'organ category', 'organ categories')
    return (
      <>
        <strong>{d.name}</strong>
        <span>{d.product.label}</span>
        <span>{d.terms ? `${countLabel(d.terms.length, 'MedDRA term')} in ${cats}` : cats}</span>
        {d.terms?.length > 0 && (
          <span className="sunburst-tip-terms">
            {d.terms.slice(0, 6).join(', ')}
            {d.terms.length > 6 && `, +${d.terms.length - 6} more`}
          </span>
        )}
        <span className="sunburst-tip-hint">Click to zoom in</span>
      </>
    )
  }
  return (
    <>
      <strong>{d.name}</strong>
      <span>
        {d.section.label} · {d.product.label}
      </span>
    </>
  )
}

function SafetySunburst({ products, sectionsByProduct, aeTermSets }) {
  const cardRef = useRef(null)
  const chartRef = useRef(null)
  const zoomRef = useRef(null) // zoom(node), set up by the d3 effect
  const [focus, setFocus] = useState(null) // zoomed-in node; null = whole chart
  const [tip, setTip] = useState(null) // { node, x, y }

  const tree = useMemo(
    () => buildTree(products, sectionsByProduct, aeTermSets),
    [products, sectionsByProduct, aeTermSets],
  )
  const root = useMemo(() => {
    if (!tree) return null
    const h = hierarchy(tree).sum((d) => d.value ?? 0) // no sort: keep product/section order
    return partition().size([2 * Math.PI, h.height + 1])(h)
  }, [tree])

  useEffect(() => {
    if (!root) return
    const g = select(chartRef.current)
    g.selectAll('*').remove()
    root.each((d) => (d.current = d))

    const arcPath = arc()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .padAngle((d) => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(RADIUS * 1.5)
      .innerRadius((d) => d.y0 * RADIUS)
      .outerRadius((d) => Math.max(d.y0 * RADIUS, d.y1 * RADIUS - 2)) // 2px gap between rings

    const showTip = (event, d) => {
      const card = cardRef.current.getBoundingClientRect()
      const half = 140 // keep the tooltip inside the card
      let x, y
      if (event.type === 'focus') {
        const r = event.currentTarget.getBoundingClientRect()
        x = r.left + r.width / 2 - card.left
        y = r.bottom - card.top + 8
      } else {
        x = event.clientX - card.left
        y = event.clientY - card.top + 18
      }
      setTip({ node: d, x: Math.min(Math.max(x, half), card.width - half), y })
    }
    const hideTip = () => setTip(null)

    const path = g
      .append('g')
      .selectAll('path')
      .data(root.descendants().slice(1))
      .join('path')
      .attr('class', 'sunburst-arc')
      .attr('fill', fillOf)
      .attr('fill-opacity', (d) => (arcVisible(d.current) ? opacityOf(d) : 0))
      .attr('pointer-events', (d) => (arcVisible(d.current) ? 'auto' : 'none'))
      .attr('tabindex', (d) => (arcVisible(d.current) ? 0 : -1))
      .attr('aria-label', (d) =>
        [d.data.name, d.data.kind === 'category' && d.data.section.label, d.data.product?.label]
          .filter(Boolean)
          .join(', '),
      )
      .attr('d', (d) => arcPath(d.current))
      .on('pointerenter pointermove focus', showTip)
      .on('pointerleave blur', hideTip)

    path
      .filter((d) => d.children)
      .classed('is-zoomable', true)
      .attr('role', 'button')
      .on('click', (_, d) => zoom(d))
      .on('keydown', (event, d) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          zoom(d)
        }
      })

    const label = g
      .append('g')
      .attr('class', 'sunburst-labels')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .selectAll('text')
      .data(root.descendants().slice(1))
      .join('text')
      .attr('dy', '0.35em')
      .attr('fill', inkOf)
      .attr('fill-opacity', (d) => +labelVisible(d.current))
      .attr('transform', (d) => labelTransform(d.current))
      .text(labelOf)

    // Centre: click to zoom out one level
    const centre = g
      .append('circle')
      .datum(root)
      .attr('r', RADIUS)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .attr('class', 'sunburst-centre')
      .on('click', (_, d) => zoom(d))

    function zoom(p) {
      centre.datum(p.parent ?? root)
      setTip(null)
      setFocus(p === root ? null : p)

      root.each(
        (d) =>
          (d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth),
          }),
      )

      const t = g.transition().duration(reducedMotion() ? 0 : 750)

      // Only arcs that are or will be visible need animating
      path
        .attr('pointer-events', (d) => (arcVisible(d.target) ? 'auto' : 'none'))
        .attr('tabindex', (d) => (arcVisible(d.target) ? 0 : -1))
        .transition(t)
        .tween('data', (d) => {
          const i = interpolate(d.current, d.target)
          return (k) => (d.current = i(k))
        })
        .filter(function (d) {
          return +this.getAttribute('fill-opacity') || arcVisible(d.target)
        })
        .attr('fill-opacity', (d) => (arcVisible(d.target) ? opacityOf(d) : 0))
        .attrTween('d', (d) => () => arcPath(d.current))

      label
        .filter(function (d) {
          return +this.getAttribute('fill-opacity') || labelVisible(d.target)
        })
        .transition(t)
        .attr('fill-opacity', (d) => +labelVisible(d.target))
        .attrTween('transform', (d) => () => labelTransform(d.current))
    }
    zoomRef.current = zoom
  }, [root])

  if (!root) return null

  const missing = products.filter((_, i) => !sectionsByProduct[i])
  const sectionKeys = new Set(root.descendants().filter((d) => d.data.section).map((d) => d.data.section.key))
  const trail = (focus ?? root).ancestors().reverse()
  const current = focus ?? root

  return (
    <div className="sunburst-card" ref={cardRef} onMouseLeave={() => setTip(null)}>
      <h2 className="sunburst-title">Safety sections by organ category</h2>
      <p className="sunburst-sub">
        {root.data.kind === 'root' ? 'The inner ring is each product. ' : ''}
        Each coloured slice is a safety section of the monograph, and each outer slice is a MedDRA
        organ category that section mentions, so bigger slices cover more categories. Click a slice
        to zoom in and the centre to zoom out.
      </p>

      <div className="sunburst-legend">
        {SECTIONS.filter((s) => sectionKeys.has(s.key)).map((s) => (
          <span key={s.key} className="legend-item">
            <span className="sunburst-swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <nav className="sunburst-trail" aria-label="Sunburst zoom level">
        {trail.map((d, i) =>
          i === trail.length - 1 ? (
            <span key={i} aria-current="location">
              {d.data.name}
            </span>
          ) : (
            <span key={i}>
              <button type="button" className="link-button" onClick={() => zoomRef.current?.(d)}>
                {d.data.name}
              </button>
              <span aria-hidden="true"> › </span>
            </span>
          ),
        )}
      </nav>

      <svg
        className="sunburst-svg"
        viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`}
        aria-label="Zoomable sunburst of safety sections and organ categories"
      >
        <g className="sunburst-centre-label" pointerEvents="none" textAnchor="middle">
          <text y={current.parent ? -6 : 4}>{truncate(current.data.name)}</text>
          {current.parent && (
            <text y={14} className="sunburst-centre-hint">
              Click to zoom out
            </text>
          )}
        </g>
        <g ref={chartRef} />
      </svg>

      {missing.length > 0 && (
        <p className="sunburst-note">
          No safety-section data for {missing.map((p) => p.label).join(', ')}.
        </p>
      )}

      <details className="sunburst-table">
        <summary>Show as a table</summary>
        <div className="sunburst-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Section</th>
                <th scope="col">Organ categories</th>
                <th scope="col">Terms</th>
              </tr>
            </thead>
            <tbody>
              {(root.data.kind === 'root' ? root.children : [root]).flatMap((p) =>
                p.children.map((s) => (
                  <tr key={`${p.data.name}-${s.data.name}`}>
                    <th scope="row">{p.data.name}</th>
                    <td>{s.data.name}</td>
                    <td>{s.children.map((c) => shortSoc(c.data.name)).join(', ')}</td>
                    <td>{s.data.terms ? s.data.terms.length : '—'}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </details>

      {tip && (
        <div className="sunburst-tip" style={{ left: tip.x, top: tip.y }} role="status">
          <Tooltip node={tip.node} />
        </div>
      )}
    </div>
  )
}

export default SafetySunburst
