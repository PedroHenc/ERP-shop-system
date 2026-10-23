import type { RouteObject } from 'react-router'
import { BrandListPage } from '@/features/brands/pages/BrandListPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProductFormPage } from '@/features/products/pages/ProductFormPage'
import { ProductListPage } from '@/features/products/pages/ProductListPage'
import { SupplierListPage } from '@/features/suppliers/pages/SupplierListPage'
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
      { path: 'products/new', element: <ProductFormPage /> },
      { path: 'products/:id/edit', element: <ProductFormPage /> },
      { path: 'brands', element: <BrandListPage /> },
      { path: 'suppliers', element: <SupplierListPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
