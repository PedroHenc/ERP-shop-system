import { useTranslation } from 'react-i18next'
import { ExportCsvButton } from '@/shared/export/ExportCsvButton'
import type { CsvColumn } from '@/shared/export/csv'
import { fetchBrandsPage } from './api'
import type { BrandDetail, BrandListParams } from './types'

/** Every brand matching the list's filters and sort, as a spreadsheet. */
export function ExportBrandsButton({ params }: { params: BrandListParams }) {
  const { t } = useTranslation('brands')
  const { t: tc } = useTranslation()
  const columns: CsvColumn<BrandDetail>[] = [
    { header: t('columns.name'), value: (b) => b.name },
    { header: t('columns.status'), value: (b) => (b.active ? tc('status.active') : tc('status.inactive')) },
  ]
  return (
    <ExportCsvButton
      filename={t('export.filename')}
      columns={columns}
      fetchPage={(page, size) => fetchBrandsPage({ ...params, page, size })}
      size="default"
    />
  )
}
