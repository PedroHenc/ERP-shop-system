import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface SetStatusDialogProps {
  /** Name of the record being deactivated; the dialog is open while this is not null. */
  name: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

/** Confirmation for deactivating a record. Locked while `onConfirm` is pending. */
export function SetStatusDialog({ name, onOpenChange, onConfirm }: SetStatusDialogProps) {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)

  async function confirm() {
    setPending(true)
    try {
      await onConfirm()
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={name !== null} onOpenChange={(open) => !pending && onOpenChange(open)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('deactivate.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('deactivate.description', { name: name ?? '' })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t('actions.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault()
              void confirm()
            }}
          >
            {t('deactivate.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
