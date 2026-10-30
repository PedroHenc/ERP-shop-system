import { useTranslation } from 'react-i18next'
import { ExportCsvButton } from '@/shared/export/ExportCsvButton'
import type { CsvColumn } from '@/shared/export/csv'
import { fetchSalesPage } from './api'
import type { SaleQuery, SaleSummary } from './types'

/** Every sale matching the page's filters, as a spreadsheet. */
export function ExportSalesButton({ query }: { query: SaleQuery }) {
  const { t, i18n } = useTranslation('sales')
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' })
  const columns: CsvColumn<SaleSummary>[] = [
    { header: t('export.number'), value: (s) => s.number },
    { header: t('export.date'), value: (s) => date.format(new Date(s.createdAt)) },
    { header: t('export.cashier'), value: (s) => s.createdByName },
    { header: t('export.items'), value: (s) => s.itemCount },
    { header: t('export.payment'), value: (s) => t(`payment.${s.paymentMethod}`) },
    { header: t('export.status'), value: (s) => t(`history.status.${s.status}`) },
    { header: t('export.total'), value: (s) => s.total },
  ]
  return (
    <ExportCsvButton
      filename={t('export.filename')}
      columns={columns}
      fetchPage={(page, size) => fetchSalesPage({ ...query, page, size })}
      size="default"
    />
  )
}
