import { RiLockLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/shared/list/EmptyState'

export function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={RiLockLine}
      title={t('noAccess.title')}
      description={t('noAccess.description')}
      action={
        <Button asChild>
          <Link to="/">{t('noAccess.backHome')}</Link>
        </Button>
      }
    />
  )
}
