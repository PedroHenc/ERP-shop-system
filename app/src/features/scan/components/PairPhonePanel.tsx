import { RiRefreshLine, RiSmartphoneLine } from '@remixicon/react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useEffectEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { closeScanSession, createScanSession, fetchScanSession } from '../api'

const POLL_MS = 1500
/** Matches the API's session lifetime; counted from when it arrived, so a wrong clock here does not matter. */
const SESSION_TTL_MS = 10 * 60 * 1000
const BATCH_TTL_MS = 30 * 60 * 1000

type PairPhonePanelProps =
  | { batch?: false; onCode: (code: string) => void }
  /** Several products: the phone keeps reading; `onCodes` gets every code so far, in order, as they arrive. */
  | { batch: true; onCodes: (codes: string[]) => void }

export function scanUrl(token: string): string {
  return `${window.location.origin}/scan#${token}`
}

/**
 * Shows a QR code that opens the scanner page on a phone (no sign-in there: the single-use token in the
 * link is the credential) and waits for the code the phone reads. Each mount starts a fresh session; a
 * batch session is closed on unmount, so the phone stops sending codes nobody receives.
 */
export function PairPhonePanel(props: PairPhonePanelProps) {
  const batch = props.batch === true
  const { t } = useTranslation('scan')
  const [attempt, setAttempt] = useState(0)
  // A query rather than a mutation: React's double effects in development would open two sessions.
  const created = useQuery({
    queryKey: ['scan-sessions', 'new', batch, attempt],
    queryFn: () => createScanSession(batch),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
    retry: false,
  })
  const id = created.data?.id
  const session = useQuery({
    queryKey: ['scan-sessions', id],
    queryFn: ({ signal }) => fetchScanSession(id as number, signal),
    enabled: id !== undefined,
    gcTime: 0,
    refetchInterval: (query) => (query.state.data?.status === undefined || query.state.data.status === 'WAITING' ? POLL_MS : false),
    refetchIntervalInBackground: true,
  })
  const [qr, setQr] = useState<string | null>(null)
  const token = created.data?.token

  useEffect(() => {
    setQr(null)
    if (!token) return
    let current = true
    // Loaded on demand: only this dialog draws QR codes.
    void import('qrcode')
      .then(({ default: QRCode }) => QRCode.toDataURL(scanUrl(token), { width: 520, margin: 1, errorCorrectionLevel: 'M' }))
      .then((url) => {
        if (current) setQr(url)
      })
      .catch(() => undefined)
    return () => {
      current = false
    }
  }, [token])

  const secondsLeft = useSecondsLeft(created.data ? created.dataUpdatedAt + (batch ? BATCH_TTL_MS : SESSION_TTL_MS) : undefined)
  const status = session.data?.status ?? 'WAITING'
  const expired = status === 'EXPIRED' || (secondsLeft !== null && secondsLeft <= 0 && status === 'WAITING')
  const scanned = status === 'SCANNED' ? session.data?.code : null

  const deliver = useEffectEvent((code: string) => {
    if (!props.batch) props.onCode(code)
  })
  useEffect(() => {
    if (scanned) deliver(scanned)
  }, [scanned])

  const codes = session.data?.codes
  const deliverAll = useEffectEvent((all: string[]) => {
    if (props.batch) props.onCodes(all)
  })
  useEffect(() => {
    if (codes && codes.length > 0) deliverAll(codes)
  }, [codes])

  useEffect(() => {
    if (!batch || id === undefined) return
    return () => void closeScanSession(id).catch(() => undefined)
  }, [batch, id])

  if (created.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p role="alert" className="text-sm font-semibold">
          {t('pair.error')}
        </p>
        <Button variant="outline" className="rounded-full" onClick={() => setAttempt((n) => n + 1)}>
          <RiRefreshLine data-icon="inline-start" />
          {t('pair.retry')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <div className="rounded-3xl bg-white p-3 shadow-[var(--shadow-card)]">
          {qr ? (
            <motion.img
              key={qr}
              src={qr}
              alt={t('pair.qrAlt')}
              className="size-56 [image-rendering:pixelated] sm:size-60"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: expired ? 0.15 : 1, scale: 1, filter: expired ? 'blur(3px)' : 'blur(0px)' }}
              transition={{ duration: 0.35 }}
            />
          ) : (
            <Skeleton className="size-56 rounded-2xl sm:size-60" />
          )}
        </div>
        <AnimatePresence>
          {expired ? (
            <motion.div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-sm font-bold text-black">{t('pair.expired')}</p>
              <Button className="rounded-full" onClick={() => setAttempt((n) => n + 1)}>
                <RiRefreshLine data-icon="inline-start" />
                {t('pair.newCode')}
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <ol className="text-muted-foreground flex w-full flex-col gap-2 text-sm">
        {(['step1', 'step2', 'step3'] as const).map((step, index) => (
          <li key={step} className="flex items-start gap-3">
            <span className="bg-muted text-foreground flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {index + 1}
            </span>
            <span className="pt-0.5">{t(batch ? `pair.batch.${step}` : `pair.${step}`)}</span>
          </li>
        ))}
      </ol>

      <p className="bg-muted flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold" aria-live="polite">
        {expired ? null : (
          <span className="relative flex size-2.5" aria-hidden="true">
            <span className="bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-60" />
            <span className="bg-primary relative inline-flex size-2.5 rounded-full" />
          </span>
        )}
        <RiSmartphoneLine className="size-4" aria-hidden="true" />
        {expired
          ? t('pair.expiredShort')
          : batch && codes && codes.length > 0
            ? t('pair.batch.received', { count: codes.length, time: secondsLeft === null ? '' : formatClock(secondsLeft) })
            : t('pair.waiting', { time: secondsLeft === null ? '' : formatClock(secondsLeft) })}
      </p>
    </div>
  )
}

function formatClock(seconds: number): string {
  const s = Math.max(0, seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function useSecondsLeft(deadline: number | undefined): number | null {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (deadline === undefined) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [deadline])
  return deadline === undefined ? null : Math.round((deadline - now) / 1000)
}
