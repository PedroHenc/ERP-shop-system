import type { RouteObject } from 'react-router'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { BrandListPage } from '@/features/brands/pages/BrandListPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProductFormPage } from '@/features/products/pages/ProductFormPage'
import { ProductListPage } from '@/features/products/pages/ProductListPage'
import { SupplierFormPage } from '@/features/suppliers/pages/SupplierFormPage'
import { SupplierListPage } from '@/features/suppliers/pages/SupplierListPage'
import { NotFoundPage } from '@/shared/components/NotFoundPage'
import { RouteErrorPage } from '@/shared/components/RouteErrorPage'
import { AppLayout } from '@/shared/layout/AppLayout'
import { AuthRoot } from './auth/AuthRoot'
import { RequireAuth } from './auth/RequireAuth'

export const routes: RouteObject[] = [
  {
    element: <AuthRoot />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/',
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'products', element: <ProductListPage /> },
          { path: 'products/new', element: <ProductFormPage /> },
          { path: 'products/:id/edit', element: <ProductFormPage /> },
          { path: 'brands', element: <BrandListPage /> },
          { path: 'suppliers', element: <SupplierListPage /> },
          { path: 'suppliers/new', element: <SupplierFormPage /> },
          { path: 'suppliers/:id/edit', element: <SupplierFormPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
