import { RiCameraLine, RiCheckLine, RiErrorWarningLine, RiLoader4Line, RiStore2Line } from '@remixicon/react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { isApiError } from '@/shared/api/http'
import { popSpring } from '@/shared/motion/presets'
import { previewScan, submitScan } from '../api'
import { CameraScanner } from '../components/CameraScanner'

/**
 * Opened on a phone from the QR code on the computer (`/scan#<token>`): no sign-in, the token in the
 * fragment (never sent to a server as part of the URL) is the credential. Reads one barcode and sends it.
 */
export function ScanPage() {
  const { t } = useTranslation('scan')
  const { hash } = useLocation()
  const token = hash.length > 1 ? decodeURIComponent(hash.slice(1)) : ''
  const [scanning, setScanning] = useState(false)
  const preview = useQuery({
    queryKey: ['scan-preview', token],
    queryFn: () => previewScan(token),
    enabled: token !== '',
    retry: (count, error) => !(isApiError(error) && error.status === 404) && count < 2,
    staleTime: Number.POSITIVE_INFINITY,
  })
  const submit = useMutation({ mutationFn: (code: string) => submitScan(token, code) })

  const invalid =
    token === '' ||
    (isApiError(preview.error) && preview.error.status === 404) ||
    (isApiError(submit.error) && submit.error.status === 404)

  let content: ReactNode
  let key: string
  if (invalid) {
    key = 'invalid'
    content = (
      <Message icon={<RiErrorWarningLine className="size-7" />} tone="destructive" title={t('phone.invalidTitle')}>
        {t('phone.invalidBody')}
      </Message>
    )
  } else if (submit.isSuccess) {
    key = 'sent'
    content = (
      <Message icon={<RiCheckLine className="size-8" />} tone="primary" title={t('phone.sentTitle')}>
        <span className="font-mono text-foreground">{submit.variables}</span>
        <br />
        {t('phone.sentBody')}
      </Message>
    )
  } else if (submit.isPending) {
    key = 'sending'
    content = (
      <p role="status" className="text-muted-foreground flex items-center justify-center gap-2 py-16 font-semibold">
        <RiLoader4Line className="size-5 animate-spin" aria-hidden="true" />
        {t('phone.sending')}
      </p>
    )
  } else if (preview.isPending) {
    key = 'loading'
    content = (
      <p role="status" className="text-muted-foreground flex items-center justify-center gap-2 py-16 font-semibold">
        <RiLoader4Line className="size-5 animate-spin" aria-hidden="true" />
        {t('phone.loading')}
      </p>
    )
  } else if (preview.isError) {
    key = 'error'
    content = (
      <Message icon={<RiErrorWarningLine className="size-7" />} tone="destructive" title={t('phone.errorTitle')}>
        <Button variant="outline" className="mt-2 rounded-full" onClick={() => void preview.refetch()}>
          {t('pair.retry')}
        </Button>
      </Message>
    )
  } else if (scanning) {
    key = 'scanning'
    content = (
      <div className="flex flex-col gap-3">
        {submit.isError ? (
          <p role="alert" className="text-destructive text-center text-sm font-semibold">
            {t('phone.sendError')}
          </p>
        ) : null}
        <CameraScanner onDetected={(code) => submit.mutate(code)} />
      </div>
    )
  } else {
    key = 'ready'
    content = (
      <div className="flex flex-col items-center gap-6 py-6 text-center">
        <motion.span
          className="text-6xl"
          aria-hidden="true"
          initial={{ scale: 0.5, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={popSpring}
        >
          📷
        </motion.span>
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em]">{t('phone.readyTitle')}</h1>
          <p className="text-muted-foreground text-[15px] text-pretty">{t('phone.readyBody')}</p>
        </div>
        <Button className="h-12 w-full rounded-full text-base" onClick={() => setScanning(true)}>
          <RiCameraLine data-icon="inline-start" />
          {t('phone.openCamera')}
        </Button>
      </div>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex items-center gap-2.5">
        <span className="bg-primary text-primary-foreground flex size-[38px] shrink-0 items-center justify-center rounded-full">
          <RiStore2Line className="size-5" aria-hidden="true" />
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-[15px] font-extrabold">{t('phone.brand')}</span>
          {preview.data ? <span className="text-muted-foreground truncate text-xs font-semibold">{preview.data.storeName}</span> : null}
        </span>
      </header>
      <section className="bg-card rounded-3xl p-5 shadow-[var(--shadow-card)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            {content}
          </motion.div>
        </AnimatePresence>
      </section>
    </main>
  )
}

function Message({
  icon,
  tone,
  title,
  children,
}: {
  icon: ReactNode
  tone: 'primary' | 'destructive'
  title: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 text-center">
      <motion.span
        aria-hidden="true"
        className={
          tone === 'primary'
            ? 'bg-primary text-primary-foreground flex size-16 items-center justify-center rounded-full'
            : 'bg-destructive/10 text-destructive flex size-16 items-center justify-center rounded-full'
        }
        initial={{ scale: 0.4 }}
        animate={{ scale: 1 }}
        transition={popSpring}
      >
        {icon}
      </motion.span>
      <h1 className="text-xl font-extrabold tracking-[-0.02em]">{title}</h1>
      <p className="text-muted-foreground text-[15px] text-pretty">{children}</p>
    </div>
  )
}
