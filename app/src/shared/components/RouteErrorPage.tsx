import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

export function RouteErrorPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-6">
      <Alert variant="destructive">
        <AlertDescription>{t('errors.unexpected')}</AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()}>{t('actions.tryAgain')}</Button>
        <Button variant="outline" asChild>
          <Link to="/">{t('notFound.backHome')}</Link>
        </Button>
      </div>
    </div>
  )
}
