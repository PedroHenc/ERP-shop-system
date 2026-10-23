import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supplierListParams } from '@/features/suppliers/list-params'
import type { SupplierListParams } from '@/features/suppliers/types'
import { useDebouncedText } from '@/shared/list/useDebouncedText'

interface SupplierFiltersProps {
  params: SupplierListParams
  onChange: (changes: Partial<SupplierListParams>) => void
  /** Commit for the debounced text inputs (the page replaces the history entry). */
  onTextChange: (changes: Partial<SupplierListParams>) => void
  onClear: () => void
}

function TextFilterInput({
  field,
  params,
  onChange,
}: {
  field: 'name' | 'taxId'
  params: SupplierListParams
  onChange: SupplierFiltersProps['onTextChange']
}) {
  const { t } = useTranslation('suppliers')
  const [value, setValue] = useDebouncedText(params[field], (next) => onChange({ [field]: next }))
  return (
    <Input
      aria-label={t(`filters.${field}`)}
      placeholder={t(`filters.${field}`)}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className="w-48"
    />
  )
}

export function SupplierFilters({ params, onChange, onTextChange, onClear }: SupplierFiltersProps) {
  const { t } = useTranslation('suppliers')
  const { t: tc } = useTranslation()
  const status = params.active === undefined ? 'all' : String(params.active)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <TextFilterInput field="name" params={params} onChange={onTextChange} />
      <TextFilterInput field="taxId" params={params} onChange={onTextChange} />
      <Select
        value={status}
        onValueChange={(value) => onChange({ active: value === 'all' ? undefined : value === 'true' })}
      >
        <SelectTrigger aria-label={t('filters.status')} className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.all')}</SelectItem>
          <SelectItem value="true">{tc('status.active')}</SelectItem>
          <SelectItem value="false">{tc('status.inactive')}</SelectItem>
        </SelectContent>
      </Select>
      {supplierListParams.hasActiveFilters(params) ? (
        <Button variant="ghost" onClick={onClear}>
          {tc('actions.clearFilters')}
        </Button>
      ) : null}
    </div>
  )
}
