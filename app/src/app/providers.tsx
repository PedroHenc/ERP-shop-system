import { useState, type ReactNode } from 'react'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { CurrencyProvider } from './currency-provider'
import { createQueryClient } from './query-client'
import { ThemeProvider } from './theme-provider'

export function AppProviders({
  children,
  queryClient,
}: {
  children: ReactNode
  queryClient?: QueryClient
}) {
  const [defaultClient] = useState(createQueryClient)
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <QueryClientProvider client={queryClient ?? defaultClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </CurrencyProvider>
    </ThemeProvider>
  )
}
