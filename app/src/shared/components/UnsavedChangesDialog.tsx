import { useRef } from 'react'
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

interface UnsavedChangesDialogProps {
  open: boolean
  onStay: () => void
  onLeave: () => void
}

export function UnsavedChangesDialog({ open, onStay, onLeave }: UnsavedChangesDialogProps) {
  const { t } = useTranslation()
  const leaving = useRef(false)

  function leave() {
    leaving.current = true
    onLeave()
  }

  // Cancel, Escape and overlay clicks all land here; "Leave" sets the flag first.
  function handleOpenChange(next: boolean) {
    if (next) return
    if (leaving.current) {
      leaving.current = false
      return
    }
    onStay()
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('unsaved.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('unsaved.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('unsaved.stay')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={leave}>
            {t('unsaved.leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
