import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FormLayout } from './FormLayout'
import { placeholderKeys } from '@/shared/list/placeholder-keys'

export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  const { t } = useTranslation()
  return (
    <FormLayout
      asideLabel={t('form.summary')}
      main={placeholderKeys(sections).map((key) => (
        <Card key={key} data-testid="form-skeleton-section">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full md:col-span-2" />
          </CardContent>
        </Card>
      ))}
      aside={
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      }
    />
  )
}
