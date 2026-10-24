import { useTranslation } from 'react-i18next'

interface RecordMetaProps {
  createdDate?: string
  lastModifiedDate?: string
}

export function RecordMeta({ createdDate, lastModifiedDate }: RecordMetaProps) {
  const { t, i18n } = useTranslation()
  if (!createdDate && !lastModifiedDate) return null
  const formatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })
  const rows = [
    { label: t('form.created'), value: createdDate },
    { label: t('form.modified'), value: lastModifiedDate },
  ]
  return (
    <dl className="grid gap-2 text-sm">
      {rows.map(({ label, value }) =>
        value ? (
          <div key={label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{formatter.format(new Date(value))}</dd>
          </div>
        ) : null,
      )}
    </dl>
  )
}
