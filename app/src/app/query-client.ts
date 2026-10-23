import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18n from '@/app/i18n'
import { isApiError } from '@/shared/api/http'

export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isApiError(error) && error.status >= 400 && error.status < 500) return false
  return failureCount < 1
}

function toastForbidden(error: unknown): void {
  if (isApiError(error) && error.status === 403) toast.error(i18n.t('errors.forbidden', { ns: 'common' }))
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({ onError: toastForbidden }),
    mutationCache: new MutationCache({ onError: toastForbidden }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
    },
  })
}
