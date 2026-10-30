import { RiDownload2Line } from '@remixicon/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/shared/api/http'
import { type CsvColumn, datedFilename, downloadCsv, fetchAllPages, toCsv } from './csv'

interface Page<Row> {
  content: Row[]
  totalPages: number
}

interface ExportCsvButtonProps<Row> {
  /** File name without date or extension, e.g. "produtos". */
  filename: string
  columns: CsvColumn<Row>[]
  /** Rows already at hand (a report section)… */
  rows?: Row[]
  /** …or a page fetcher with the list's current filters: every page is exported, not just the one on screen. */
  fetchPage?: (page: number, size: number) => Promise<Page<Row>>
  label?: string
  size?: 'sm' | 'default'
}

/** Downloads a CSV of a list or a report section, in the user's language and separators. */
export function ExportCsvButton<Row>({ filename, columns, rows, fetchPage, label, size = 'sm' }: ExportCsvButtonProps<Row>) {
  const { t, i18n } = useTranslation()
  const [busy, setBusy] = useState(false)

  async function exportCsv() {
    setBusy(true)
    try {
      let data = rows ?? []
      if (fetchPage) {
        const result = await fetchAllPages(fetchPage)
        data = result.rows
        if (result.truncated) toast.warning(t('export.truncated', { count: data.length }))
      }
      downloadCsv(datedFilename(filename), toCsv(columns, data, i18n.language))
      toast.success(t('export.done', { count: data.length }))
    } catch (error) {
      // A 403 already got the global permission toast.
      if (!(isApiError(error) && error.status === 403)) toast.error(t('export.failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button type="button" variant="outline" size={size} loading={busy} onClick={() => void exportCsv()}>
      <RiDownload2Line data-icon="inline-start" />
      {label ?? t('export.csv')}
    </Button>
  )
}
