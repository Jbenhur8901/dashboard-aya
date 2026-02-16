type ExportColumn<T> = {
  header: string
  accessor: (row: T) => string | number | boolean | null | undefined
}

type ExportOptions<T> = {
  filename: string
  sheetName?: string
  columns: ExportColumn<T>[]
  rows: T[]
}

function toCsvCell(value: string | number | boolean | null | undefined): string {
  const normalized = value == null ? '' : String(value)
  const escaped = normalized.replace(/"/g, '""')
  return `"${escaped}"`
}

export function exportToXlsx<T>({ filename, sheetName, columns, rows }: ExportOptions<T>) {
  const safeFilename = filename.toLowerCase().endsWith('.csv')
    ? filename
    : `${filename}.csv`

  const headerLine = columns.map((col) => toCsvCell(col.header)).join(',')
  const dataLines = rows.map((row) =>
    columns
      .map((col) => {
        const value = col.accessor(row)
        return toCsvCell(value)
      })
      .join(',')
  )

  const csv = `${headerLine}\n${dataLines.join('\n')}`
  const csvWithBom = `\ufeff${csv}`
  const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.setAttribute('download', safeFilename)
  if (sheetName) {
    link.dataset.sheetName = sheetName
  }
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
