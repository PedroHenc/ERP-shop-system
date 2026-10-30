/**
 * CSV files that open right in spreadsheets of the user's language: Excel in pt-BR expects `;` between
 * fields and a decimal comma, in English `,` and a decimal point. A UTF-8 BOM keeps accents intact.
 */

export type CsvValue = string | number | boolean | null | undefined

export interface CsvColumn<Row> {
  header: string
  value: (row: Row) => CsvValue
}

function separatorFor(language: string): ',' | ';' {
  // A language whose decimal separator is a comma needs another field separator.
  return new Intl.NumberFormat(language).format(1.5).includes(',') ? ';' : ','
}

export function toCsv<Row>(columns: CsvColumn<Row>[], rows: Row[], language: string): string {
  const separator = separatorFor(language)
  const number = new Intl.NumberFormat(language, { useGrouping: false, maximumFractionDigits: 3 })
  const cell = (value: CsvValue): string => {
    if (value === null || value === undefined) return ''
    const text = typeof value === 'number' ? number.format(value) : String(value)
    // Quote when needed; a leading =, +, - or @ is prefixed so spreadsheets don't run it as a formula.
    const safe = typeof value === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
    const needsQuotes = safe.includes(separator) || /["\n\r]/.test(safe) || safe !== safe.trim()
    return needsQuotes ? `"${safe.replaceAll('"', '""')}"` : safe
  }
  const lines = [columns.map((column) => cell(column.header)), ...rows.map((row) => columns.map((column) => cell(column.value(row))))]
  return lines.map((line) => line.join(separator)).join('\r\n')
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "produtos-2026-10-30": the base name plus the local date. */
export function datedFilename(base: string, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${base}-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

interface Page<Row> {
  content: Row[]
  totalPages: number
}

/** Every page of a list (100 rows each), up to `maxRows`; `truncated` says the cap was hit. */
export async function fetchAllPages<Row>(
  fetchPage: (page: number, size: number) => Promise<Page<Row>>,
  maxRows = 10_000,
): Promise<{ rows: Row[]; truncated: boolean }> {
  const size = 100
  const rows: Row[] = []
  for (let page = 0; ; page++) {
    const result = await fetchPage(page, size)
    rows.push(...result.content)
    if (page + 1 >= result.totalPages) return { rows, truncated: false }
    if (rows.length >= maxRows) return { rows: rows.slice(0, maxRows), truncated: true }
  }
}
