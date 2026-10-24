import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import type { ProductListParams } from '@/features/products/types'
import { useDebouncedText } from '@/shared/list/useDebouncedText'
import { BrandCombobox } from './BrandCombobox'

type TextFilter = 'sku' | 'category'

interface ProductFiltersProps {
  params: ProductListParams
  onChange: (changes: Partial<ProductListParams>) => void
  /** Commit for the debounced text inputs (the page replaces the history entry). */
  onTextChange: (changes: Partial<ProductListParams>) => void
}

function TextFilterInput({
  field,
  params,
  onChange,
}: {
  field: TextFilter
  params: ProductListParams
  onChange: ProductFiltersProps['onTextChange']
}) {
  const { t } = useTranslation('products')
  const [value, setValue] = useDebouncedText(params[field], (next) => onChange({ [field]: next }))
  return (
    <Input
      aria-label={t(`filters.${field}`)}
      placeholder={t(`filters.${field}`)}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  )
}

/** Content of the Filters popover / bottom sheet: the secondary filters only. */
export function ProductFilters({ params, onChange, onTextChange }: ProductFiltersProps) {
  const { t } = useTranslation('products')
  return (
    <>
      <TextFilterInput field="sku" params={params} onChange={onTextChange} />
      <TextFilterInput field="category" params={params} onChange={onTextChange} />
      <BrandCombobox
        aria-label={t('filters.brand')}
        allowNone
        noneLabel={t('filters.allBrands')}
        value={params.brandId ?? null}
        onChange={(id) => onChange({ brandId: id ?? undefined })}
      />
    </>
  )
}
