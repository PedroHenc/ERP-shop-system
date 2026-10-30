import { useTranslation } from 'react-i18next'
import { ExportCsvButton } from '@/shared/export/ExportCsvButton'
import type { CsvColumn } from '@/shared/export/csv'
import { fetchSuppliersPage } from './api'
import type { Supplier, SupplierListParams } from './types'

/** Every supplier matching the list's filters and sort, as a spreadsheet. */
export function ExportSuppliersButton({ params }: { params: SupplierListParams }) {
  const { t } = useTranslation('suppliers')
  const { t: tc } = useTranslation()
  const columns: CsvColumn<Supplier>[] = [
    { header: t('form.fields.legalName'), value: (s) => s.legalName },
    { header: t('form.fields.tradeName'), value: (s) => s.tradeName },
    { header: t('form.fields.taxId'), value: (s) => s.taxId },
    { header: t('form.fields.email'), value: (s) => s.email },
    { header: t('form.fields.phone'), value: (s) => s.phone },
    { header: t('columns.status'), value: (s) => (s.active ? tc('status.active') : tc('status.inactive')) },
  ]
  return (
    <ExportCsvButton
      filename={t('export.filename')}
      columns={columns}
      fetchPage={(page, size) => fetchSuppliersPage({ ...params, page, size })}
      size="default"
    />
  )
}
