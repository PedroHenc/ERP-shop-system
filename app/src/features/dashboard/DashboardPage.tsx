import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/shared/components/PageHeader'

export function DashboardPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('home.title')} />
      <div className="flex flex-col items-start gap-3">
        <p className="text-lg font-medium">{t('home.greeting')}</p>
        <p className="text-muted-foreground text-sm">{t('home.description')}</p>
        <Button asChild>
          <Link to="/products">{t('home.goToProducts')}</Link>
        </Button>
      </div>
    </>
  )
}
