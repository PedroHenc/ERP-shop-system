import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FormLayout } from './FormLayout'

export function FormSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <FormLayout
      main={Array.from({ length: sections }, (_, index) => (
        <Card key={index} data-testid="form-skeleton-section">
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
