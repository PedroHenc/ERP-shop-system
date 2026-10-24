import { RiErrorWarningLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/shared/list/EmptyState'

export function RouteErrorPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex min-h-svh max-w-md items-center justify-center p-6">
      <EmptyState
        icon={RiErrorWarningLine}
        title={t('errors.unexpected')}
        action={
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>{t('actions.tryAgain')}</Button>
            <Button variant="outline" asChild>
              <Link to="/">{t('notFound.backHome')}</Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}
