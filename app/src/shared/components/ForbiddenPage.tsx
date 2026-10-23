import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{t('noAccess.title')}</h1>
      <p className="text-muted-foreground text-sm">{t('noAccess.description')}</p>
      <Button asChild>
        <Link to="/">{t('noAccess.backHome')}</Link>
      </Button>
    </div>
  )
}
