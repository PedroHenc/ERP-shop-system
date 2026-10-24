import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/router'

type TestRouter = ReturnType<typeof createMemoryRouter>

export function renderRoute(
  path: string,
  options: { queryClient?: QueryClient } = {},
): { user: UserEvent; router: TestRouter } {
  const queryClient = options.queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { user, router }
}
