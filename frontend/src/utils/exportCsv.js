function escapeCsv(val) {
  const str = String(val ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function triggerDownload(filename, csv) {
  // BOM so Excel parses as UTF-8 (the em-dash in titles would otherwise render
  // as mojibake on Windows). CRLF line endings per RFC 4180.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ]
  triggerDownload(filename, lines.join('\r\n'))
}

export function downloadCsvRows(filename, rows) {
  const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n')
  triggerDownload(filename, csv)
}
