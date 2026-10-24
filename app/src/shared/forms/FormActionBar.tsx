import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface FormActionBarProps {
  dirty: boolean
  submitting: boolean
  onCancel: () => void
}

export function FormActionBar({ dirty, submitting, onCancel }: FormActionBarProps) {
  const { t } = useTranslation()
  return (
    <div className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 border-t bg-background/90 px-1 py-3 backdrop-blur">
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {dirty ? t('form.unsaved') : null}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('actions.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {t('actions.save')}
        </Button>
      </div>
    </div>
  )
}
