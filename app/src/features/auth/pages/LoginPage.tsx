import { motion, useReducedMotion } from 'motion/react'
import { zodResolver } from '@hookform/resolvers/zod'
import { RiArrowLeftLine, RiStore2Line } from '@remixicon/react'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '@/app/auth/AuthProvider'
import { AuthLoading } from '@/app/auth/RequireAuth'
import { safeRedirect } from '@/app/auth/redirect'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { isApiError } from '@/shared/api/http'
import { PreferencesMenu } from '@/shared/layout/PreferencesMenu'
import { SegmentedControl } from '@/shared/components/SegmentedControl'
import { AuthSubmitButton, PasswordInput, authInputClasses, useAuthErrorText } from '../components/auth-fields'
import { HeroSpiral } from '../components/HeroSpiral'
import { JoinForm } from '../components/JoinForm'
import { SignupForm } from '../components/SignupForm'
import { useHeroSwap } from '../components/use-hero-swap'
import { loginFormDefaults, loginFormSchema, type LoginFormValues } from '../schema'

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const
const SWAP_EASE = [0.45, 0, 0.25, 1] as const
/** How long the accent wipe plays after signing in before the app opens. */
const WELCOME_MS = 900

export type LoginView = 'login' | 'signup' | 'forgot' | 'join'
const VIEW_ORDER: LoginView[] = ['login', 'signup', 'forgot', 'join']
const TABS = ['login', 'signup'] as const

interface LoginPageProps {
  /** `join`: the invite link (`/join#<code>`); the code stays in the URL fragment, never sent to a server. */
  initialView?: LoginView
}

export function LoginPage({ initialView = 'login' }: LoginPageProps) {
  const { t } = useTranslation('auth')
  const { t: tc } = useTranslation()
  const { status, user, login, logout } = useAuth()
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const reducedMotion = useReducedMotion()
  const errorText = useAuthErrorText()
  const [failure, setFailure] = useState<string | null>(null)
  // Set before a sign-in or sign-up request: once signed in, the page stays up for the welcome
  // wipe instead of redirecting at once.
  const [welcoming, setWelcoming] = useState(false)
  const [view, setView] = useState<LoginView>(initialView)
  const hero = useHeroSwap(view)
  const form = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema), defaultValues: loginFormDefaults })
  const { errors, isSubmitting } = form.formState
  const target = safeRedirect(params.get('redirect'))
  const inviteToken = location.hash.length > 1 ? decodeURIComponent(location.hash.slice(1)) : null
  const showWelcome = welcoming && status === 'authenticated'

  useEffect(() => {
    if (!showWelcome) return
    const timer = window.setTimeout(() => void navigate(target, { replace: true }), reducedMotion ? 0 : WELCOME_MS)
    return () => window.clearTimeout(timer)
  }, [showWelcome, navigate, target, reducedMotion])

  if (status === 'loading') return <AuthLoading />
  if (status === 'authenticated' && !welcoming) {
    // An invite opened while signed in: joining would need another account, so say so instead of
    // silently going to the app.
    if (initialView === 'join') {
      // logout() goes to /login; come back to this invite link (fragment included) afterwards.
      const signOutAndStay = async () => {
        await logout()
        void navigate(`/join${location.hash}`, { replace: true })
      }
      return <SignedInInvite name={user?.name ?? ''} onSignOut={() => void signOutAndStay()} />
    }
    return <Navigate to={target} replace />
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

  const heroCopy: Record<LoginView, { title: string; body: string; pills: string[] }> = {
    login: { title: t('login.tagline'), body: t('login.heroBody'), pills: [t('login.pills.stock'), t('login.pills.catalog'), t('login.pills.roles')] },
    signup: { title: t('signup.heroTitle'), body: t('signup.heroBody'), pills: [t('signup.pills.own'), t('signup.pills.invites'), t('signup.pills.ready')] },
    forgot: { title: t('forgot.heroTitle'), body: t('forgot.heroBody'), pills: [t('forgot.heroPill')] },
    join: { title: t('join.heroTitle'), body: t('join.heroBody'), pills: [t('join.heroPill')] },
  }
  const copy = heroCopy[hero.shown]
  // Hidden views wait on the side they'd come from: earlier views to the left, later ones to the right.
  const reference = hero.leaving ? view : hero.shown
  const viewState = (v: LoginView) => ({
    shown: hero.shown === v,
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
            <p className="text-[clamp(40px,5vw,64px)] leading-none font-extrabold tracking-[-0.03em] text-pretty">{copy.title}</p>
            <p className="text-[17px] leading-normal text-pretty">{copy.body}</p>
          </div>
          <ul className="flex flex-wrap gap-2.5">
            {copy.pills.map((pill) => (
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
          <SegmentedControl
            label={t('tabs.label')}
            size="md"
            fullWidth
            value={view}
            onChange={setView}
            options={TABS.map((tab) => ({ value: tab as LoginView, label: t(`tabs.${tab}`) }))}
          />

          <div className="grid">
            <AuthView {...viewState('login')} label={t('login.title')}>
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
                    className={authInputClasses}
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
                    <TextButton onClick={() => setView('forgot')}>{t('login.forgot')}</TextButton>
                  </div>
                  <PasswordInput
                    id="login-password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={errors.password ? true : undefined}
                    {...form.register('password')}
                  />
                  {errors.password ? <FieldError>{errorText(errors.password.message)}</FieldError> : null}
                </Field>
                <AuthSubmitButton
                  busy={isSubmitting}
                  disabled={showWelcome}
                  label={t('login.submit')}
                  busyLabel={t('login.submitting')}
                />
              </form>
            </AuthView>

            <AuthView {...viewState('signup')} label={t('signup.title')}>
              <Heading title={t('signup.title')} description={t('signup.description')} />
              <SignupForm onPendingChange={setWelcoming} />
            </AuthView>

            <AuthView {...viewState('forgot')} label={t('forgot.title')}>
              <TextButton onClick={() => setView('login')} back>
                {t('forgot.back')}
              </TextButton>
              <Heading title={t('forgot.title')} description={t('forgot.body')} />
              <p className="bg-accent text-accent-foreground rounded-3xl px-5 py-4 text-sm text-pretty">{t('forgot.afterReset')}</p>
            </AuthView>

            <AuthView {...viewState('join')} label={t('join.title')}>
              <Heading title={t('join.title')} description={t('join.description')} />
              <JoinForm token={inviteToken} onPendingChange={setWelcoming} onGoToLogin={() => setView('login')} />
            </AuthView>
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

function TextButton({ onClick, back, children }: { onClick: () => void; back?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-accent-foreground flex items-center gap-1 self-start text-[13px] font-semibold underline-offset-4 outline-none hover:underline focus-visible:underline"
    >
      {back ? <RiArrowLeftLine className="size-4" aria-hidden="true" /> : null}
      {children}
    </button>
  )
}

interface AuthViewProps {
  /** Mounted: the hero shows this view (it may be fading out while the spiral covers the hero). */
  shown: boolean
  active: boolean
  /** Side it slides to and from: -1 left, 1 right. */
  dir: number
  label: string
  children: ReactNode
}

/**
 * One of the views. Only the shown one is mounted, so there is a single e-mail and password field on
 * the page (screen readers and password managers see one form). It slides in from its side with a blur
 * and slides out the same way.
 */
function AuthView({ shown, active, dir, label, children }: AuthViewProps) {
  if (!shown) return null
  const hidden = { opacity: 0, x: dir * 24, filter: 'blur(4px)' }
  return (
    <motion.section
      aria-label={label}
      inert={!active}
      className="col-start-1 row-start-1 flex flex-col gap-5"
      initial={hidden}
      animate={active ? { opacity: 1, x: 0, filter: 'blur(0px)' } : hidden}
      transition={{ duration: 0.45, ease: SWAP_EASE, x: { duration: 0.5, ease: SWAP_EASE } }}
    >
      {children}
    </motion.section>
  )
}

/** Shown when an invite link is opened by someone who is already signed in. */
function SignedInInvite({ name, onSignOut }: { name: string; onSignOut: () => void }) {
  const { t } = useTranslation('auth')
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="bg-card flex w-full max-w-[440px] flex-col gap-5 rounded-xl p-7 shadow-[var(--shadow-card)]">
        <h1 className="text-2xl font-extrabold tracking-[-0.02em]">{t('join.signedInTitle')}</h1>
        <p className="text-muted-foreground text-[15px] text-pretty">{t('join.signedInBody', { name })}</p>
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 rounded-full px-6" onClick={onSignOut}>
            {t('menu.signOut')}
          </Button>
          <Button asChild variant="outline" className="h-11 rounded-full px-6">
            <Link to="/">{t('join.goToApp')}</Link>
          </Button>
        </div>
      </div>
    </main>
  )
}
