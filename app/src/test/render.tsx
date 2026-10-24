import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import type { InitialSession } from '@/app/auth/AuthProvider'
import type { Role } from '@/app/auth/types'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/router'
import { userFixture } from './fixtures'

type TestRouter = ReturnType<typeof createMemoryRouter>

export interface RenderRouteOptions {
  queryClient?: QueryClient
  /** Role of the signed-in user (default 'ADMIN'); `null` starts anonymous. */
  role?: Role | null
  /** Start without a session so the provider restores it through /auth/refresh. */
  restoreSession?: boolean
}

export function renderRoute(
  path: string,
  options: RenderRouteOptions = {},
): { user: UserEvent; router: TestRouter; queryClient: QueryClient } {
  const queryClient = options.queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const role = options.role === undefined ? 'ADMIN' : options.role
  const initialSession: InitialSession | null | undefined = options.restoreSession
    ? undefined
    : role === null
      ? null
      : { user: userFixture({ role }), accessToken: 'test-token' }
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  render(
    <AppProviders queryClient={queryClient} initialSession={initialSession}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { user, router, queryClient }
}
