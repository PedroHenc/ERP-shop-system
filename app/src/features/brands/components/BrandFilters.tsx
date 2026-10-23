import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { brandListParams } from '@/features/brands/list-params'
import type { BrandListParams } from '@/features/brands/types'
import { useDebouncedText } from '@/shared/list/useDebouncedText'

interface BrandFiltersProps {
  params: BrandListParams
  onChange: (changes: Partial<BrandListParams>) => void
  /** Commit for the debounced text input (the page replaces the history entry). */
  onTextChange: (changes: Partial<BrandListParams>) => void
  onClear: () => void
}

function NameFilterInput({ params, onChange }: { params: BrandListParams; onChange: BrandFiltersProps['onTextChange'] }) {
  const { t } = useTranslation('brands')
  const [value, setValue] = useDebouncedText(params.name, (next) => onChange({ name: next }))
  return (
    <Input
      aria-label={t('filters.name')}
      placeholder={t('filters.name')}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className="w-48"
    />
  )
}

export function BrandFilters({ params, onChange, onTextChange, onClear }: BrandFiltersProps) {
  const { t } = useTranslation('brands')
  const { t: tc } = useTranslation()
  const status = params.active === undefined ? 'all' : String(params.active)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <NameFilterInput params={params} onChange={onTextChange} />
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
      {brandListParams.hasActiveFilters(params) ? (
        <Button variant="ghost" onClick={onClear}>
          {tc('actions.clearFilters')}
        </Button>
      ) : null}
    </div>
  )
}
