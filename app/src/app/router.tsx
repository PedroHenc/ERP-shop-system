import type { RouteObject } from 'react-router'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { NotFoundPage } from '@/shared/components/NotFoundPage'
import { RouteErrorPage } from '@/shared/components/RouteErrorPage'
import { AppLayout } from '@/shared/layout/AppLayout'

// Placeholder until Task 10 provides the products list page.
const productsElement = <div data-testid="products-placeholder" />

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'products', element: productsElement },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
