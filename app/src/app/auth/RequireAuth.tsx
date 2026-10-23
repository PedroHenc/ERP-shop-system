import { RiLoader4Line } from '@remixicon/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'

export function AuthLoading() {
  const { t } = useTranslation()
  return (
    <div role="status" className="flex min-h-svh items-center justify-center text-muted-foreground">
      <RiLoader4Line className="animate-spin" aria-hidden="true" />
      <span className="sr-only">{t('loading')}</span>
    </div>
  )
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { status, signedOut } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <AuthLoading />
  if (status === 'anonymous') {
    const target = signedOut
      ? '/login'
      : `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`
    return <Navigate to={target} replace />
  }
  return children
}
