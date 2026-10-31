import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CameraScanner } from './CameraScanner'

interface CameraScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDetected: (code: string) => void
  /** Keep the dialog open and reading (several products) instead of closing after one code. */
  continuous?: boolean
}

/** Reads a barcode with this device's camera; the camera runs only while the dialog is open. */
export function CameraScanDialog({ open, onOpenChange, onDetected, continuous = false }: CameraScanDialogProps) {
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
            continuous={continuous}
            onDetected={(code) => {
              onDetected(code)
              if (!continuous) onOpenChange(false)
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
