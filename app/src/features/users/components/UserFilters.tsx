import { useTranslation } from 'react-i18next'
import { ROLES } from '@/app/auth/types'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { UserListParams } from '@/features/users/types'

interface UserFiltersProps {
  params: UserListParams
  onChange: (changes: Partial<UserListParams>) => void
}

/** Content of the Filters popover / bottom sheet: the secondary filters only. */
export function UserFilters({ params, onChange }: UserFiltersProps) {
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()

  return (
    <Select
      value={params.role ?? 'all'}
      onValueChange={(value) => onChange({ role: value === 'all' ? undefined : value })}
    >
      <SelectTrigger aria-label={t('filters.role')} className="w-full">
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
  )
}
