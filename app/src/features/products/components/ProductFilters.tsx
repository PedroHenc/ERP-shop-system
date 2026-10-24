import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { hasActiveFilters } from '@/features/products/list-params'
import type { ProductListParams } from '@/features/products/types'
import { BrandCombobox } from './BrandCombobox'

const DEBOUNCE_MS = 300

type TextFilter = 'name' | 'sku' | 'category'

interface ProductFiltersProps {
  params: ProductListParams
  onChange: (changes: Partial<ProductListParams>) => void
  /** Commit for the debounced text inputs (the page replaces the history entry). */
  onTextChange: (changes: Partial<ProductListParams>) => void
  onClear: () => void
}

/** Text value committed to the URL after a pause; follows external URL changes (e.g. Clear filters). */
function useDebouncedText(external: string | undefined, commit: (value: string | undefined) => void) {
  const [local, setLocal] = useState(external ?? '')
  const committed = useRef(external ?? '')
  const commitRef = useRef(commit)
  commitRef.current = commit

  useEffect(() => {
    const next = external ?? ''
    if (next !== committed.current) {
      committed.current = next
      setLocal(next)
    }
  }, [external])

  useEffect(() => {
    if (local === committed.current) return
    const timer = setTimeout(() => {
      committed.current = local
      commitRef.current(local === '' ? undefined : local)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [local])

  return [local, setLocal] as const
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
      className="w-40"
    />
  )
}

export function ProductFilters({ params, onChange, onTextChange, onClear }: ProductFiltersProps) {
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation()
  const status = params.active === undefined ? 'all' : String(params.active)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <TextFilterInput field="name" params={params} onChange={onTextChange} />
      <TextFilterInput field="sku" params={params} onChange={onTextChange} />
      <TextFilterInput field="category" params={params} onChange={onTextChange} />
      <div className="w-48">
        <BrandCombobox
          aria-label={t('filters.brand')}
          allowNone
          noneLabel={t('filters.allBrands')}
          value={params.brandId ?? null}
          onChange={(id) => onChange({ brandId: id ?? undefined })}
        />
      </div>
      <Select
        value={status}
        onValueChange={(value) => onChange({ active: value === 'all' ? undefined : value === 'true' })}
      >
        <SelectTrigger aria-label={t('filters.status')} className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.all')}</SelectItem>
          <SelectItem value="true">{t('status.active')}</SelectItem>
          <SelectItem value="false">{t('status.inactive')}</SelectItem>
        </SelectContent>
      </Select>
      {hasActiveFilters(params) ? (
        <Button variant="ghost" onClick={onClear}>
          {tc('actions.clearFilters')}
        </Button>
      ) : null}
    </div>
  )
}
