import { useTranslation } from 'react-i18next'
import { ROLES } from '@/app/auth/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { userListParams } from '@/features/users/list-params'
import type { UserListParams } from '@/features/users/types'
import { useDebouncedText } from '@/shared/list/useDebouncedText'

interface UserFiltersProps {
  params: UserListParams
  onChange: (changes: Partial<UserListParams>) => void
  /** Commit for the debounced text input (the page replaces the history entry). */
  onTextChange: (changes: Partial<UserListParams>) => void
  onClear: () => void
}

function SearchInput({ params, onChange }: Pick<UserFiltersProps, 'params'> & { onChange: UserFiltersProps['onTextChange'] }) {
  const { t } = useTranslation('users')
  const [value, setValue] = useDebouncedText(params.search, (next) => onChange({ search: next }))
  return (
    <Input
      aria-label={t('filters.search')}
      placeholder={t('filters.search')}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className="w-56"
    />
  )
}

export function UserFilters({ params, onChange, onTextChange, onClear }: UserFiltersProps) {
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()
  const status = params.active === undefined ? 'all' : String(params.active)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <SearchInput params={params} onChange={onTextChange} />
      <Select
        value={params.role ?? 'all'}
        onValueChange={(value) => onChange({ role: value === 'all' ? undefined : value })}
      >
        <SelectTrigger aria-label={t('filters.role')} className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.allRoles')}</SelectItem>
          {ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {tc(`roles.${role}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
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
      {userListParams.hasActiveFilters(params) ? (
        <Button variant="ghost" onClick={onClear}>
          {tc('actions.clearFilters')}
        </Button>
      ) : null}
    </div>
  )
}
