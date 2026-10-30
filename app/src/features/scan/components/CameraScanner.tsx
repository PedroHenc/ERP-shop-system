import { RiCameraOffLine, RiCheckLine, RiKeyboardLine } from '@remixicon/react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getDetector, productCode } from '../detector'

type CameraState = 'starting' | 'scanning' | 'denied' | 'unavailable'

const SCAN_EVERY_MS = 180
/** The same code in this many consecutive reads before it is accepted: one odd frame is not enough. */
const CONFIRMING_READS = 2
/** Continuous mode: the code just taken is ignored until it has been out of view this long. */
const SAME_CODE_PAUSE_MS = 1500
const FLASH_MS = 1200

interface CameraScannerProps {
  /** Called with each code read (or typed). Once only, with the camera already off, unless `continuous`. */
  onDetected: (code: string) => void
  /** Keep reading after a code (several products): each new code is reported and briefly confirmed. */
  continuous?: boolean
}

/**
 * The back camera in a rounded frame with an aiming guide and a sweeping line, reading barcodes several
 * times a second. A typed code is always an alternative (no camera, permission denied, a worn label).
 */
export function CameraScanner({ onDetected, continuous = false }: CameraScannerProps) {
  const { t } = useTranslation('scan')
  const videoRef = useRef<HTMLVideoElement>(null)
  const [state, setState] = useState<CameraState>('starting')
  const [typing, setTyping] = useState(false)
  const [typed, setTyped] = useState('')
  const done = useRef(false)
  const [flash, setFlash] = useState<{ code: string; at: number } | null>(null)
  const detected = useEffectEvent((code: string) => {
    if (done.current) return
    if (!continuous) done.current = true
    navigator.vibrate?.(80)
    if (continuous) setFlash({ code, at: Date.now() })
    onDetected(code)
  })

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), FLASH_MS)
    return () => window.clearTimeout(timer)
  }, [flash])

  useEffect(() => {
    let stream: MediaStream | null = null
    let timer: ReturnType<typeof setInterval> | undefined
    let cancelled = false
    const stop = () => {
      clearInterval(timer)
      for (const track of stream?.getTracks() ?? []) track.stop()
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
      } catch (error) {
        if (!cancelled) setState(error instanceof DOMException && error.name === 'NotAllowedError' ? 'denied' : 'unavailable')
        return
      }
      if (cancelled) return stop()
      const video = videoRef.current
      if (!video) return stop()
      video.srcObject = stream
      await video.play().catch(() => undefined)
      let detector: Awaited<ReturnType<typeof getDetector>>
      try {
        detector = await getDetector()
      } catch {
        // The reader failed to load (offline, old browser): typing the code is still possible.
        stop()
        if (!cancelled) setState('unavailable')
        return
      }
      if (cancelled) return
      setState('scanning')
      let busy = false
      let candidate: string | null = null
      let reads = 0
      // Continuous mode: the last code taken, and when it was last in view.
      let taken: string | null = null
      let takenSeenAt = 0
      timer = setInterval(async () => {
        if (busy || done.current || video.readyState < 2) return
        busy = true
        try {
          const barcodes = await detector.detect(video)
          const code = barcodes.map(productCode).find((value) => value !== null) ?? null
          if (code === null) return
          const now = Date.now()
          if (code === taken && now - takenSeenAt < SAME_CODE_PAUSE_MS) {
            // Still the same product in front of the camera: not a second one.
            takenSeenAt = now
            return
          }
          reads = code === candidate ? reads + 1 : 1
          candidate = code
          if (reads < CONFIRMING_READS) return
          if (continuous) {
            taken = code
            takenSeenAt = now
            candidate = null
            reads = 0
          } else {
            stop()
          }
          detected(code)
        } catch {
          // A frame that cannot be read (e.g. while the camera refocuses): try the next one.
        } finally {
          busy = false
        }
      }, SCAN_EVERY_MS)
    }

    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') setState('unavailable')
    else void start()
    return () => {
      cancelled = true
      stop()
    }
  }, [continuous])

  const failed = state === 'denied' || state === 'unavailable'

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-black">
        {/* playsInline + muted: iOS only plays an inline camera feed with both. */}
        <video ref={videoRef} className="size-full object-cover" playsInline muted />
        {failed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-white">
            <RiCameraOffLine className="size-8 opacity-80" aria-hidden="true" />
            <p role="alert" className="text-sm font-semibold">
              {t(state === 'denied' ? 'camera.denied' : 'camera.unavailable')}
            </p>
          </div>
        ) : (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
            <div className="relative h-[38%] w-[78%]">
              {(['top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl', 'right-0 bottom-0 border-r-4 border-b-4 rounded-br-2xl'] as const).map(
                (corner) => (
                  <span key={corner} className={`absolute size-7 border-white ${corner}`} />
                ),
              )}
              {state === 'scanning' ? (
                <motion.span
                  className="bg-primary absolute inset-x-3 h-0.5 rounded-full shadow-[0_0_12px_2px_var(--primary)]"
                  initial={{ top: '12%' }}
                  animate={{ top: ['12%', '88%', '12%'] }}
                  transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity }}
                />
              ) : null}
            </div>
          </div>
        )}
        <AnimatePresence>
          {flash ? (
            <motion.p
              key={flash.at}
              role="status"
              className="bg-primary text-primary-foreground absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-sm font-semibold shadow-lg"
              initial={{ opacity: 0, y: -12, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', bounce: 0.4, duration: 0.35 }}
            >
              <RiCheckLine className="size-4" aria-hidden="true" />
              {flash.code}
            </motion.p>
          ) : null}
        </AnimatePresence>
        <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-white/85" aria-live="polite">
          {state === 'starting' ? t('camera.starting') : state === 'scanning' ? t(continuous ? 'camera.aimNext' : 'camera.aim') : ''}
        </p>
      </div>

      {typing || failed ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const code = typed.trim()
            if (!code) return
            detected(code)
            if (continuous) setTyped('')
          }}
        >
          <Input
            aria-label={t('camera.typeLabel')}
            inputMode="numeric"
            autoComplete="off"
            autoFocus={typing}
            placeholder={t('camera.typePlaceholder')}
            className="h-11 rounded-full px-4"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
          <Button type="submit" className="h-11 rounded-full px-5" disabled={typed.trim() === ''}>
            {t('camera.useCode')}
          </Button>
        </form>
      ) : (
        <Button type="button" variant="ghost" className="self-center rounded-full" onClick={() => setTyping(true)}>
          <RiKeyboardLine data-icon="inline-start" />
          {t('camera.type')}
        </Button>
      )}
    </div>
  )
}
