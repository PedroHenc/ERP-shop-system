import { useTranslation } from 'react-i18next'
import { ExportCsvButton } from '@/shared/export/ExportCsvButton'
import type { CsvColumn } from '@/shared/export/csv'
import { fetchStockMovements } from './api'
import type { StockMovement, StockMovementQuery } from './types'

/** Every movement matching the page's filters, as a spreadsheet. */
export function ExportMovementsButton({ query }: { query: StockMovementQuery }) {
  const { t, i18n } = useTranslation('stock')
  const { t: tp } = useTranslation('products')
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' })
  const columns: CsvColumn<StockMovement>[] = [
    { header: t('export.date'), value: (m) => date.format(new Date(m.createdAt)) },
    { header: tp('form.fields.sku'), value: (m) => m.productSku },
    { header: tp('columns.product'), value: (m) => m.productName },
    { header: t('dialog.type'), value: (m) => t(`types.${m.type}`) },
    { header: t('dialog.reason'), value: (m) => t(`reasons.${m.reason}`) },
    { header: t('export.quantity'), value: (m) => m.quantity },
    { header: tp('form.fields.unitOfMeasure'), value: (m) => tp(`units.${m.unitOfMeasure}`) },
    { header: t('export.balance'), value: (m) => m.balanceAfter },
    { header: t('export.author'), value: (m) => m.createdByName ?? t('list.automatic') },
    { header: t('dialog.note'), value: (m) => m.note },
  ]
  return (
    <ExportCsvButton
      filename={t('export.filename')}
      columns={columns}
      fetchPage={(page, size) => fetchStockMovements({ ...query, page, size })}
      size="default"
    />
  )
}
