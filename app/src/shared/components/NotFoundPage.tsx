import { RiCompass3Line } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/shared/list/EmptyState'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <EmptyState
      icon={RiCompass3Line}
      title={t('notFound.title')}
      description={t('notFound.description')}
      action={
        <Button asChild>
          <Link to="/">{t('notFound.backHome')}</Link>
        </Button>
      }
    />
  )
}
