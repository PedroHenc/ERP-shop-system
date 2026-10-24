import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import type { SupplierListParams } from '@/features/suppliers/types'
import { useDebouncedText } from '@/shared/list/useDebouncedText'

interface SupplierFiltersProps {
  params: SupplierListParams
  /** Commit for the debounced text input (the page replaces the history entry). */
  onTextChange: (changes: Partial<SupplierListParams>) => void
}

/** Content of the Filters popover / bottom sheet: the secondary filters only. */
export function SupplierFilters({ params, onTextChange }: SupplierFiltersProps) {
  const { t } = useTranslation('suppliers')
  const [value, setValue] = useDebouncedText(params.taxId, (taxId) => onTextChange({ taxId }))
  return (
    <Input
      aria-label={t('filters.taxId')}
      placeholder={t('filters.taxId')}
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  )
}
