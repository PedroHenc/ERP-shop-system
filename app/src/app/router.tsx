import type { RouteObject } from 'react-router'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ProfilePage } from '@/features/auth/pages/ProfilePage'
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
import { RequireRole } from './auth/RequireRole'

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
          { path: 'profile', element: <ProfilePage /> },
          { path: 'products', element: <ProductListPage /> },
          {
            path: 'products/new',
            element: (
              <RequireRole permission="products.write">
                <ProductFormPage />
              </RequireRole>
            ),
          },
          // Not guarded: users without products.write see the form read-only.
          { path: 'products/:id/edit', element: <ProductFormPage /> },
          { path: 'brands', element: <BrandListPage /> },
          {
            path: 'suppliers',
            element: (
              <RequireRole permission="suppliers.read">
                <SupplierListPage />
              </RequireRole>
            ),
          },
          {
            path: 'suppliers/new',
            element: (
              <RequireRole permission="suppliers.write">
                <SupplierFormPage />
              </RequireRole>
            ),
          },
          {
            path: 'suppliers/:id/edit',
            element: (
              <RequireRole permission="suppliers.write">
                <SupplierFormPage />
              </RequireRole>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
