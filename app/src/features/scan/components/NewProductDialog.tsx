import { RiArrowLeftLine, RiArrowRightSLine, RiLoader4Line } from '@remixicon/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Product } from '@/features/products/types'
import { findProductByBarcode } from '../api'
import { canUseCamera, isTouchDevice } from '../detector'
import { CameraScanner } from './CameraScanner'
import { PairPhonePanel } from './PairPhonePanel'

type Step =
  | { kind: 'choose' }
  | { kind: 'phone' }
  | { kind: 'camera' }
  | { kind: 'checking'; code: string }
  | { kind: 'exists'; code: string; product: Product }

interface NewProductDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * "New product": type everything in, or start from the barcode — read by a phone paired through a QR
 * code, or by this device's own camera on a phone or tablet. A code already in the catalogue offers that
 * product instead of a duplicate.
 */
export function NewProductDialog({ open, onOpenChange }: NewProductDialogProps) {
  const { t } = useTranslation('scan')
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>({ kind: 'choose' })
  const ownCamera = canUseCamera() && isTouchDevice()

  function changeOpen(next: boolean) {
    onOpenChange(next)
    if (!next) setStep({ kind: 'choose' })
  }

  async function continueWithCode(code: string) {
    setStep({ kind: 'checking', code })
    // A failed lookup is not a reason to stop: the form still rejects a duplicate on save.
    const product = await findProductByBarcode(code).catch(() => null)
    if (product) setStep({ kind: 'exists', code, product })
    else void navigate(`/products/new?barcode=${encodeURIComponent(code)}`)
  }

  const titles: Record<Step['kind'], { title: string; description: string }> = {
    choose: { title: t('chooser.title'), description: t('chooser.description') },
    phone: { title: t('pair.title'), description: t('pair.description') },
    camera: { title: t('camera.title'), description: t('camera.description') },
    checking: { title: t('chooser.checkingTitle'), description: '' },
    exists: { title: t('chooser.existsTitle'), description: t('chooser.existsDescription') },
  }
  const { title, description } = titles[step.kind]

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className={description ? undefined : 'sr-only'}>{description || title}</DialogDescription>
        </DialogHeader>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step.kind}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col gap-3"
          >
            {step.kind === 'choose' ? (
              <>
                <Option
                  emoji="✍️"
                  title={t('chooser.manual')}
                  description={t('chooser.manualHint')}
                  onClick={() => void navigate('/products/new')}
                />
                <Option
                  emoji="📱"
                  title={t('chooser.phone')}
                  description={t('chooser.phoneHint')}
                  onClick={() => setStep({ kind: 'phone' })}
                />
                {ownCamera ? (
                  <Option
                    emoji="📷"
                    title={t('chooser.camera')}
                    description={t('chooser.cameraHint')}
                    onClick={() => setStep({ kind: 'camera' })}
                  />
                ) : null}
              </>
            ) : null}

            {step.kind === 'phone' ? <PairPhonePanel onCode={(code) => void continueWithCode(code)} /> : null}
            {step.kind === 'camera' ? <CameraScanner onDetected={(code) => void continueWithCode(code)} /> : null}

            {step.kind === 'checking' ? (
              <p className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm font-semibold" role="status">
                <RiLoader4Line className="size-5 animate-spin" aria-hidden="true" />
                {t('chooser.checking', { code: step.code })}
              </p>
            ) : null}

            {step.kind === 'exists' ? (
              <>
                <div className="bg-muted flex flex-col gap-1 rounded-2xl p-4">
                  <span className="font-semibold">{step.product.name}</span>
                  <span className="text-muted-foreground font-mono text-xs">
                    {step.product.sku} · {step.code}
                  </span>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" className="rounded-full" onClick={() => setStep({ kind: 'choose' })}>
                    {t('chooser.scanAnother')}
                  </Button>
                  <Button asChild className="rounded-full">
                    <Link to={`/products/${step.product.id}/edit`}>{t('chooser.openProduct')}</Link>
                  </Button>
                </div>
              </>
            ) : null}

            {step.kind === 'phone' || step.kind === 'camera' ? (
              <Button variant="ghost" className="self-start rounded-full" onClick={() => setStep({ kind: 'choose' })}>
                <RiArrowLeftLine data-icon="inline-start" />
                {t('chooser.back')}
              </Button>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

function Option({ emoji, title, description, onClick }: { emoji: string; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group/option bg-card hover:border-primary/60 hover:bg-muted/60 focus-visible:ring-ring/50 flex items-center gap-4 rounded-2xl border p-4 text-left outline-none transition-[background-color,border-color,transform] duration-200 focus-visible:ring-3 active:scale-[0.98]"
    >
      <span
        aria-hidden="true"
        className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full text-2xl transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/option:scale-110 group-hover/option:-rotate-6"
      >
        {emoji}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        <span className="text-muted-foreground text-sm text-pretty">{description}</span>
      </span>
      <RiArrowRightSLine
        aria-hidden="true"
        className="text-muted-foreground size-5 shrink-0 transition-transform duration-200 group-hover/option:translate-x-0.5"
      />
    </button>
  )
}
