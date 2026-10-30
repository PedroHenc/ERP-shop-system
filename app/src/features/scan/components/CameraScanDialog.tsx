import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CameraScanner } from './CameraScanner'

interface CameraScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string) => void
}

/** Reads a barcode with this device's camera; the camera runs only while the dialog is open. */
export function CameraScanDialog({ open, onOpenChange, onDetected }: CameraScanDialogProps) {
  const { t } = useTranslation('scan')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('camera.title')}</DialogTitle>
          <DialogDescription>{t('camera.description')}</DialogDescription>
        </DialogHeader>
        {open ? (
          <CameraScanner
            onDetected={(code) => {
              onDetected(code)
              onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
