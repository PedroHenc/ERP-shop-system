import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { Blocker } from 'react-router'
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

export function UnsavedChangesDialog({ blocker }: { blocker: Blocker }) {
  const { t } = useTranslation('products')
  const leaving = useRef(false)

  function leave() {
    leaving.current = true
    if (blocker.state === 'blocked') blocker.proceed()
  }

  // Cancel, Escape and overlay clicks all land here; "Leave" sets the flag first.
  function handleOpenChange(open: boolean) {
    if (open) return
    if (leaving.current) {
      leaving.current = false
      return
    }
    if (blocker.state === 'blocked') blocker.reset()
  }

  return (
    <AlertDialog open={blocker.state === 'blocked'} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('form.unsavedTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('form.unsavedDescription')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('form.stay')}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={leave}>
            {t('form.leave')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
