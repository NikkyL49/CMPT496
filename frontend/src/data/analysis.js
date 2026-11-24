// Analysis results for the Analysis page (and the Layer 1 section of the
// Inconsistency report). Served by the backend to researchers only
// (backend/src/routes/analysisRoutes.js), so they're no longer bundled into
// the website.
import { useEffect, useState } from 'react'
import { api } from './api'

// Each table: { meta, rows }. Names match TABLES in analysisRoutes.js.
export const ANALYSIS_TABLES = [
  'combination-alignment',
  'reciprocity',
  'coverage-by-year',
  'within-drug-coverage',
]

const cache = new Map() // name → table, kept for the visit

export function loadAnalysis(name) {
  if (!cache.has(name)) {
    const request = api('GET', `/analysis/${name}`)
    cache.set(name, request)
    request.catch(() => cache.delete(name)) // let a later visit retry
  }
  return cache.get(name)
}

// { tables: { name: table } | null, error: message | null }
export function useAnalysisTables(names = ANALYSIS_TABLES) {
  const key = names.join(',')
  const [state, setState] = useState({ key: null, tables: null, error: null })

  useEffect(() => {
    let current = true
    Promise.all(key.split(',').map(loadAnalysis))
      .then((list) => {
        if (current) setState({ key, tables: Object.fromEntries(key.split(',').map((n, i) => [n, list[i]])), error: null })
      })
      .catch((err) => current && setState({ key, tables: null, error: err.message }))
    return () => {
      current = false
    }
  }, [key])

  return state.key === key ? state : { tables: null, error: null }
}
