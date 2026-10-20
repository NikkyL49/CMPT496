import { useState } from 'react'
import { Card, Chips } from './parts'

function AdverseEventsTab({ info, terms }) {
  const [query, setQuery] = useState('')
  if (!terms) return <p className="muted">Loading adverse event terms…</p>

  const q = query.trim().toLowerCase()
  const list = [...terms].sort((a, b) => a.localeCompare(b)).filter((t) => !q || t.toLowerCase().includes(q))

  return (
    <div className="drug-stack">
      <Card title={`Adverse event terms (${terms.size})`}>
        <p className="card-note">
          MedDRA v27 preferred terms from this monograph&rsquo;s adverse-event section. The
          monograph data doesn&rsquo;t rate severity, so terms aren&rsquo;t colour-coded.
        </p>
        <input
          type="search"
          className="input term-search"
          placeholder="Find a term…"
          aria-label="Find an adverse event term"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Chips items={list} empty={`No terms match “${query.trim()}”.`} />
      </Card>

      <Card title={`Body systems affected (${info.bodySystems.length})`}>
        <p className="card-note">MedDRA system organ classes these adverse events fall under.</p>
        <Chips items={info.bodySystems} variant="soft" />
      </Card>
    </div>
  )
}

export default AdverseEventsTab
