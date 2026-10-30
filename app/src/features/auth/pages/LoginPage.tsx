import { motion, useReducedMotion } from 'motion/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { RiArrowLeftLine, RiArrowRightLine, RiEyeLine, RiEyeOffLine, RiLoader4Line, RiStore2Line } from '@remixicon/react'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/app/auth/AuthProvider'
import { AuthLoading } from '@/app/auth/RequireAuth'
import { safeRedirect } from '@/app/auth/redirect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { isApiError } from '@/shared/api/http'
import { PreferencesMenu } from '@/shared/layout/PreferencesMenu'
import { HeroSpiral } from '../components/HeroSpiral'
import { useHeroSwap } from '../components/use-hero-swap'
import { loginFormDefaults, loginFormSchema, type LoginFormValues } from '../schema'

const VALIDATION_PREFIX = 'auth:validation.'
const EASE_OUT = [0.2, 0.8, 0.2, 1] as const
const SWAP_EASE = [0.45, 0, 0.25, 1] as const
/** How long the accent wipe plays after signing in before the app opens. */
const WELCOME_MS = 900

type View = 'login' | 'forgot'
const VIEW_ORDER: View[] = ['login', 'forgot']

const inputClasses =
  'h-13 rounded-full border-2 border-input bg-card px-5 text-[15px] shadow-none transition-[border-color,box-shadow] focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-accent'

export function LoginPage() {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const { status, user, login } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const [failure, setFailure] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  // Set before the request: once signed in, the page stays up for the welcome wipe instead of
  // redirecting at once.
  const [welcoming, setWelcoming] = useState(false)
  const [view, setView] = useState<View>('login')
  const hero = useHeroSwap(view)
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema), defaultValues: loginFormDefaults })
  const { errors, isSubmitting } = form.formState
  const target = safeRedirect(params.get('redirect'))
  const showWelcome = welcoming && status === 'authenticated'

  useEffect(() => {
    if (!showWelcome) return
    const timer = window.setTimeout(() => void navigate(target, { replace: true }), reducedMotion ? 0 : WELCOME_MS)
    return () => window.clearTimeout(timer)
  }, [showWelcome, navigate, target, reducedMotion])

  if (status === 'loading') return <AuthLoading />
  // Already signed in (not by this form): go straight to the redirect target.
  if (status === 'authenticated' && !welcoming) return <Navigate to={target} replace />

  // Client-side messages are i18n keys (see schema.ts).
  function errorText(message: string | undefined): string | undefined {
    if (message === undefined) return undefined
    if (message === `${VALIDATION_PREFIX}required`) return t('validation.required')
    if (message === `${VALIDATION_PREFIX}invalidEmail`) return t('validation.invalidEmail')
    return message
  }

  function loginFailureText(error: unknown): string {
    if (isApiError(error) && error.status === 401) return t('login.invalidCredentials')
    if (isApiError(error) && error.status === 403) return t('login.storeSuspended')
    return tc('errors.unexpected')
  }

  const submit = form.handleSubmit(async (values) => {
    setFailure(null)
    setWelcoming(true)
    try {
      await login(values.email, values.password)
    } catch (error) {
      setWelcoming(false)
      setFailure(loginFailureText(error))
    }
  })

  const heroCopy =
    hero.shown === 'login'
      ? { title: t('login.tagline'), body: t('login.heroBody'), pills: [t('login.pills.stock'), t('login.pills.catalog'), t('login.pills.roles')] }
      : { title: t('forgot.heroTitle'), body: t('forgot.heroBody'), pills: [t('forgot.heroPill')] }
  // Hidden views wait on the side they'd come from: earlier views to the left, later ones to the right.
  const reference = hero.leaving ? view : hero.shown
  const viewState = (v: View) => ({
    active: hero.shown === v && !hero.leaving,
    dir: VIEW_ORDER.indexOf(v) < VIEW_ORDER.indexOf(reference) ? -1 : 1,
  })
  const firstName = user?.name.split(' ')[0] ?? ''

  return (
    <div className="relative grid min-h-svh gap-4 p-4 md:grid-cols-2">
      <motion.section
        ref={hero.scope}
        className="bg-primary relative isolate flex min-h-[340px] flex-col gap-8 overflow-hidden rounded-[2rem] px-9 py-8 text-white"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ opacity: { duration: 0.6 }, default: { duration: 0.8, ease: EASE_OUT } }}
      >
        <HeroSpiral host={hero.scope} />
        <div className="flex items-center gap-2.5 text-[17px] font-extrabold">
          <span className="text-primary flex size-[38px] items-center justify-center rounded-full bg-white">
            <RiStore2Line className="size-5" aria-hidden="true" />
          </span>
          {tc('appName')}
        </div>
        <motion.div data-hero-content className="flex flex-1 flex-col gap-8" style={{ originX: 0.5, originY: 0.4 }}>
          <div className="mt-auto flex max-w-[520px] flex-col gap-4">
            <p className="text-[clamp(40px,5vw,64px)] leading-none font-extrabold tracking-[-0.03em] text-pretty">{heroCopy.title}</p>
            <p className="text-[17px] leading-normal text-pretty">{heroCopy.body}</p>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {heroCopy.pills.map((pill) => (
              <li key={pill} className="rounded-full bg-white/16 px-3.5 py-2 text-[13px] font-semibold">
                {pill}
              </li>
            ))}
          </ul>
        </motion.div>
      </motion.section>

      <main className="relative flex flex-col items-center justify-center px-2 py-6">
        <div className="absolute top-0 right-0 z-10">
          <PreferencesMenu />
        </div>
        <motion.div
          className="flex w-full max-w-[440px] flex-col gap-7"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ opacity: { duration: 0.6, delay: 0.12 }, y: { duration: 0.8, ease: EASE_OUT, delay: 0.12 } }}
        >
          <div className="grid">
            <LoginView {...viewState('login')} label={t('login.title')}>
              <Heading title={t('login.heading')} description={t('login.description')} />
              <form onSubmit={(event) => void submit(event)} noValidate className="flex flex-col gap-4">
                {failure ? (
                  <Alert variant="destructive" className="rounded-2xl">
                    <AlertDescription>{failure}</AlertDescription>
                  </Alert>
                ) : null}
                <Field data-invalid={errors.email ? true : undefined}>
                  <FieldLabel htmlFor="login-email" className="text-[13px] font-semibold">
                    {t('login.email')}
                  </FieldLabel>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    placeholder={t('login.emailPlaceholder')}
                    className={inputClasses}
                    aria-invalid={errors.email ? true : undefined}
                    {...form.register('email')}
                  />
                  {errors.email ? <FieldError>{errorText(errors.email.message)}</FieldError> : null}
                </Field>
                <Field data-invalid={errors.password ? true : undefined}>
                  <div className="flex items-center justify-between">
                    <FieldLabel htmlFor="login-password" className="text-[13px] font-semibold">
                      {t('login.password')}
                    </FieldLabel>
                    <button
                      type="button"
                      onClick={() => setView('forgot')}
                      className="text-accent-foreground text-[13px] font-semibold underline-offset-4 outline-none hover:underline focus-visible:underline"
                    >
                      {t('login.forgot')}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={cn(inputClasses, 'pr-14')}
                      aria-invalid={errors.password ? true : undefined}
                      {...form.register('password')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground absolute top-1/2 right-2 size-9 -translate-y-1/2 rounded-full"
                      aria-pressed={showPassword}
                      aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <RiEyeOffLine aria-hidden="true" /> : <RiEyeLine aria-hidden="true" />}
                    </Button>
                  </div>
                  {errors.password ? <FieldError>{errorText(errors.password.message)}</FieldError> : null}
                </Field>
                <Button
                  type="submit"
                  aria-busy={isSubmitting || undefined}
                  disabled={isSubmitting || showWelcome}
                  className="mt-1 h-[54px] justify-between rounded-full pr-2 pl-6 text-[15px] font-semibold disabled:opacity-100"
                >
                  {isSubmitting ? t('login.submitting') : t('login.submit')}
                  <span className="flex size-10 items-center justify-center rounded-full bg-white/20">
                    {isSubmitting ? (
                      <RiLoader4Line className="size-[18px] animate-spin" aria-hidden="true" />
                    ) : (
                      <RiArrowRightLine className="size-[18px]" aria-hidden="true" />
                    )}
                  </span>
                </Button>
              </form>
            </LoginView>

            <LoginView {...viewState('forgot')} label={t('forgot.title')}>
              <button
                type="button"
                onClick={() => setView('login')}
                className="text-accent-foreground flex items-center gap-1 self-start text-[13px] font-semibold underline-offset-4 outline-none hover:underline focus-visible:underline"
              >
                <RiArrowLeftLine className="size-4" aria-hidden="true" />
                {t('forgot.back')}
              </button>
              <Heading title={t('forgot.title')} description={t('forgot.body')} />
              <p className="bg-accent text-accent-foreground rounded-3xl px-5 py-4 text-sm text-pretty">{t('forgot.afterReset')}</p>
            </LoginView>
          </div>
          <span className="text-muted-foreground text-xs">
            © {new Date().getFullYear()} {tc('appName')} · {t('login.secure')}
          </span>
        </motion.div>
      </main>

      {showWelcome && !reducedMotion ? (
        <motion.div
          role="status"
          className="bg-primary fixed inset-0 z-50 grid place-items-center text-white"
          initial={{ clipPath: 'circle(0% at 75% 50%)' }}
          animate={{ clipPath: 'circle(150% at 75% 50%)' }}
          transition={{ duration: 0.7, ease: [0.7, 0, 0.2, 1] }}
        >
          <motion.div
            className="flex flex-col items-center gap-3.5 text-[15px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.35 }}
          >
            <span className="text-[40px] font-extrabold tracking-[-0.02em]">
              {firstName ? t('login.welcome', { name: firstName }) : t('login.heading')}
            </span>
            <span>{t('login.opening')}</span>
          </motion.div>
        </motion.div>
      ) : null}
    </div>
  )
}

function Heading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-[32px] leading-tight font-extrabold tracking-[-0.02em]">{title}</h1>
      <p className="text-muted-foreground text-[15px] text-pretty">{description}</p>
    </div>
  )
}

/** One of the stacked views (sign-in, password help). Hidden ones slide aside, blur, and leave the tab order. */
function LoginView({ active, dir, label, children }: { active: boolean; dir: number; label: string; children: ReactNode }) {
  return (
    <motion.section
      aria-label={label}
      aria-hidden={!active}
      inert={!active}
      className="col-start-1 row-start-1 flex flex-col gap-5"
      initial={false}
      animate={
        active
          ? { opacity: 1, x: 0, filter: 'blur(0px)', visibility: 'visible' }
          : { opacity: 0, x: dir * 24, filter: 'blur(4px)', transitionEnd: { visibility: 'hidden' } }
      }
      transition={{ duration: 0.45, ease: SWAP_EASE, x: { duration: 0.5, ease: SWAP_EASE } }}
    >
      {children}
    </motion.section>
  )
}
