import type { RouteObject } from 'react-router'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProductListPage } from '@/features/products/pages/ProductListPage'
import { NotFoundPage } from '@/shared/components/NotFoundPage'
import { RouteErrorPage } from '@/shared/components/RouteErrorPage'
import { AppLayout } from '@/shared/layout/AppLayout'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'products', element: <ProductListPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
