import { RiArrowRightLine, RiEyeLine, RiEyeOffLine, RiLoader4Line } from '@remixicon/react'
import { useState, type ComponentProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { passwordScore } from '../schema'

/** Pill fields of the sign-in screens (Modernist design). */
export const authInputClasses =
  'h-13 rounded-full border-2 border-input bg-card px-5 text-[15px] shadow-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-accent'

const VALIDATION_PREFIX = 'auth:validation.'

/** Turns a schema message (an `auth:validation.*` key) or a server message into display text. */
export function useAuthErrorText() {
  const { t } = useTranslation('auth')
  return (message: string | undefined): string | undefined => {
    if (message === undefined) return undefined
    if (message.startsWith(VALIDATION_PREFIX)) return t(`validation.${message.slice(VALIDATION_PREFIX.length)}` as 'validation.required')
    return message
  }
}

/** Password input with the show/hide toggle inside the pill. */
export function PasswordInput({ className, ...props }: ComponentProps<typeof Input>) {
  const { t } = useTranslation('auth')
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input {...props} type={shown ? 'text' : 'password'} className={cn(authInputClasses, 'pr-14', className)} />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="text-muted-foreground absolute top-1/2 right-2 size-9 -translate-y-1/2 rounded-full"
        aria-pressed={shown}
        aria-label={shown ? t('login.hidePassword') : t('login.showPassword')}
        onClick={() => setShown((value) => !value)}
      >
        {shown ? <RiEyeOffLine aria-hidden="true" /> : <RiEyeLine aria-hidden="true" />}
      </Button>
    </div>
  )
}

const STRENGTH_COLORS = ['bg-destructive', 'bg-warning', 'bg-[oklch(0.75_0.12_90)]', 'bg-success']

/** Four bars and a hint, from "use 8+ characters…" to "strong password". */
export function StrengthMeter({ password, id }: { password: string; id?: string }) {
  const { t } = useTranslation('auth')
  const score = passwordScore(password)
  return (
    <div className="flex flex-col gap-1.5">
      <div aria-hidden="true" className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors duration-300',
              i < score ? STRENGTH_COLORS[score - 1] : 'bg-input',
            )}
          />
        ))}
      </div>
      <span id={id} className="text-muted-foreground text-xs" aria-live="polite">
        {t(`strength.${score}` as 'strength.0')}
      </span>
    </div>
  )
}

/** Primary pill button: label on the left, arrow (or spinner while busy) in a circle on the right. */
export function AuthSubmitButton({ busy, disabled, label, busyLabel }: { busy: boolean; disabled?: boolean; label: string; busyLabel: string }) {
  return (
    <Button
      type="submit"
      aria-busy={busy || undefined}
      disabled={busy || disabled}
      className="mt-1 h-[54px] justify-between rounded-full pr-2 pl-6 text-[15px] font-semibold disabled:opacity-100"
    >
      {busy ? busyLabel : label}
      <span className="flex size-10 items-center justify-center rounded-full bg-white/20">
        {busy ? (
          <RiLoader4Line className="size-[18px] animate-spin" aria-hidden="true" />
        ) : (
          <RiArrowRightLine className="size-[18px]" aria-hidden="true" />
        )}
      </span>
    </Button>
  )
}
