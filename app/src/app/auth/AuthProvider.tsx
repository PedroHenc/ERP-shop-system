import { useQueryClient } from '@tanstack/react-query'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router'
import { pendingRefresh, refreshOnce } from '@/shared/api/http'
import { login as loginRequest, logoutSession } from './api'
import { endSession, onSessionExpired, onSessionRefreshed, setAccessToken } from './token-store'
import type { AuthUser } from './types'

export interface InitialSession {
  user: AuthUser
  accessToken: string
}

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  status: AuthStatus
  user: AuthUser | null
  /** True after the user chose to sign out, so the guard does not remember the page. */
  signedOut: boolean
  login(email: string, password: string): Promise<void>
  logout(): Promise<void>
}

interface State {
  status: AuthStatus
  user: AuthUser | null
  signedOut: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function initialState(session: InitialSession | null | undefined): State {
  if (session === undefined) return { status: 'loading', user: null, signedOut: false }
  if (session === null) return { status: 'anonymous', user: null, signedOut: false }
  return { status: 'authenticated', user: session.user, signedOut: false }
}

/**
 * `initialSession`: undefined restores the session through the refresh cookie on mount,
 * null starts anonymous and a session starts authenticated, both without calling the API.
 */
export function AuthProvider({
  initialSession,
  children,
}: {
  initialSession?: InitialSession | null
  children: ReactNode
}) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [shouldRestore] = useState(initialSession === undefined)
  const [state, setState] = useState<State>(() => {
    // Set synchronously: children's first requests run before this component's effects.
    if (initialSession !== undefined) setAccessToken(initialSession?.accessToken ?? null)
    return initialState(initialSession)
  })

  useEffect(() => {
    if (!shouldRestore) return
    let cancelled = false
    refreshOnce().then(
      (auth) => {
        if (!cancelled) setState({ status: 'authenticated', user: auth.user, signedOut: false })
      },
      () => {
        if (!cancelled) setState({ status: 'anonymous', user: null, signedOut: false })
      },
    )
    return () => {
      cancelled = true
    }
  }, [shouldRestore])

  useEffect(
    () =>
      onSessionExpired(() => {
        setAccessToken(null)
        setState({ status: 'anonymous', user: null, signedOut: false })
        queryClient.clear()
      }),
    [queryClient],
  )

  // A silent refresh returns the current user: role or name changes show without a reload.
  useEffect(
    () =>
      onSessionRefreshed((user) => {
        setState({ status: 'authenticated', user, signedOut: false })
      }),
    [],
  )

  const login = useCallback(async (email: string, password: string) => {
    const auth = await loginRequest(email, password)
    setAccessToken(auth.accessToken)
    setState({ status: 'authenticated', user: auth.user, signedOut: false })
  }, [])

  const logout = useCallback(async () => {
    // Discard any refresh in flight, but wait for it: it rotates the refresh cookie, and
    // /auth/logout must revoke the cookie the browser holds once it completes.
    endSession()
    const refresh = pendingRefresh()
    if (refresh !== null) {
      try {
        await refresh
      } catch {
        // Discarded or failed: either way the session is ending.
      }
    }
    try {
      await logoutSession()
    } catch {
      // The local session ends even when the server could not be reached.
    }
    // Also invalidates a refresh started while /auth/logout was running.
    endSession()
    setState({ status: 'anonymous', user: null, signedOut: true })
    void navigate('/login', { replace: true })
    queryClient.clear()
  }, [navigate, queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({ status: state.status, user: state.user, signedOut: state.signedOut, login, logout }),
    [state, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
