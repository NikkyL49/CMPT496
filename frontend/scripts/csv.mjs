// Shared by the scripts that build data files from the MedDRA CSV.
import { readFileSync } from 'node:fs'

// Minimal RFC 4180 CSV parser (quoted fields, "" escapes, newlines in quotes)
export function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else quoted = false
      } else field += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += c
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

// Reads the CSV → { header, rows, col(name) → column index }
export function readCsv(path) {
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '') // strip BOM
  const [header, ...rows] = parseCsv(text).filter((r) => r.length > 1)
  const col = (name) => {
    const i = header.indexOf(name)
    if (i < 0) throw new Error(`Column not found: ${name}`)
    return i
  }
  return { header, rows, col }
}

// "a | b | c" → ['a', 'b', 'c']
export const splitList = (s) => s.split('|').map((t) => t.trim()).filter(Boolean)
