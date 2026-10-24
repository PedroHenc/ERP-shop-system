import { RiErrorWarningLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface ListErrorProps {
  message: string
  onRetry: () => void
}

export function ListError({ message, onRetry }: ListErrorProps) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <RiErrorWarningLine className="size-7" />
      </div>
      <h2 className="text-base font-semibold">{t('listError.title')}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t('actions.tryAgain')}
      </Button>
    </div>
  )
}
