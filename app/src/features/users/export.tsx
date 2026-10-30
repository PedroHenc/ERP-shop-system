import { useTranslation } from 'react-i18next'
import { ExportCsvButton } from '@/shared/export/ExportCsvButton'
import type { CsvColumn } from '@/shared/export/csv'
import { fetchUsersPage } from './api'
import type { UserListParams } from './list-params'
import type { User } from './types'

/** Every user matching the list's filters and sort, as a spreadsheet. */
export function ExportUsersButton({ params }: { params: UserListParams }) {
  const { t, i18n } = useTranslation('users')
  const { t: tc } = useTranslation()
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' })
  const columns: CsvColumn<User>[] = [
    { header: t('form.fields.name'), value: (u) => u.name },
    { header: t('form.fields.email'), value: (u) => u.email },
    { header: t('columns.role'), value: (u) => tc(`roles.${u.role}`) },
    { header: t('columns.status'), value: (u) => (u.active ? tc('status.active') : tc('status.inactive')) },
    { header: t('columns.lastLogin'), value: (u) => (u.lastLoginAt ? date.format(new Date(u.lastLoginAt)) : null) },
  ]
  return (
    <ExportCsvButton
      filename={t('export.filename')}
      columns={columns}
      fetchPage={(page, size) => fetchUsersPage({ ...params, page, size })}
      size="default"
    />
  )
}
