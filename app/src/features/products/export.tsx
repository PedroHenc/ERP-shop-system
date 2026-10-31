import { useTranslation } from 'react-i18next'
import { useCan } from '@/app/auth/permissions'
import { ExportCsvButton } from '@/shared/export/ExportCsvButton'
import type { CsvColumn } from '@/shared/export/csv'
import { fetchProductsPage } from './api'
import { marginOf } from './margin'
import type { Product, ProductListParams } from './types'

function roundMargin(margin: number | null): number | null {
  return margin === null ? null : Math.round(margin * 10_000) / 10_000
}

/** Every product matching the list's filters and sort, as a spreadsheet. */
export function ExportProductsButton({ params }: { params: ProductListParams }) {
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation()
  const canSeeCost = useCan('products.write')
  const columns: CsvColumn<Product>[] = [
    { header: t('form.fields.sku'), value: (p) => p.sku },
    { header: t('form.fields.barcode'), value: (p) => p.barcode },
    { header: t('form.fields.name'), value: (p) => p.name },
    { header: t('form.fields.category'), value: (p) => p.category },
    { header: t('form.fields.subcategory'), value: (p) => p.subcategory },
    { header: t('form.fields.brand'), value: (p) => p.brandName },
    { header: t('form.fields.price'), value: (p) => p.price },
    ...(canSeeCost
      ? ([
          { header: t('form.fields.costPrice'), value: (p) => p.costPrice },
          // A fraction (0.365), which spreadsheets format as a percentage.
          { header: t('columns.margin'), value: (p) => roundMargin(marginOf(p.price, p.costPrice)) },
        ] satisfies CsvColumn<Product>[])
      : []),
    { header: t('form.fields.unitOfMeasure'), value: (p) => t(`units.${p.unitOfMeasure}`) },
    { header: t('columns.stock'), value: (p) => p.stockQuantity },
    { header: t('form.fields.minimumStock'), value: (p) => p.minimumStock },
    { header: t('form.fields.reorderPoint'), value: (p) => p.reorderPoint },
    { header: t('columns.status'), value: (p) => (p.active ? tc('status.active') : tc('status.inactive')) },
  ]
  return (
    <ExportCsvButton
      filename={t('export.filename')}
      columns={columns}
      fetchPage={(page, size) => fetchProductsPage({ ...params, page, size })}
      size="default"
    />
  )
}
