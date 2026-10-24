import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'

export function StatusBadge({ active }: { active: boolean }) {
  const { t } = useTranslation()
  return active ? (
    <Badge variant="success">{t('status.active')}</Badge>
  ) : (
    <Badge variant="neutral">{t('status.inactive')}</Badge>
  )
}
