// Trigger a file download in the browser from text content.
export function downloadFile(filename, content, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// rows: array of arrays. Quotes every cell so commas/quotes are safe.
export function toCsv(rows) {
  return rows
    .map((row) =>
      row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','),
    )
    .join('\r\n')
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}
