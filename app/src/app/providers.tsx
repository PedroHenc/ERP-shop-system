import { useState, type ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { Toaster } from '@/components/ui/sonner'
import type { InitialSession } from './auth/AuthProvider'
import { InitialSessionContext } from './auth/initial-session'
import { CurrencyProvider } from './currency-provider'
import { createQueryClient } from './query-client'
import { ThemeProvider, useTheme } from './theme-provider'

function ThemedToaster() {
  const { resolvedTheme } = useTheme()
  return <Toaster theme={resolvedTheme} />
}

export function AppProviders({
  children,
  queryClient,
  initialSession,
}: {
  children: ReactNode
  queryClient?: QueryClient
  /** Skips the start-up session restore (tests): a session starts signed in, null anonymous. */
  initialSession?: InitialSession | null
}) {
  const [defaultClient] = useState(createQueryClient)
  return (
    // reducedMotion="user": with prefers-reduced-motion, transforms (layoutId indicators included) jump instead of animating.
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <CurrencyProvider>
          <QueryClientProvider client={queryClient ?? defaultClient}>
            <InitialSessionContext.Provider value={initialSession}>{children}</InitialSessionContext.Provider>
            <ThemedToaster />
          </QueryClientProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </MotionConfig>
  )
}
