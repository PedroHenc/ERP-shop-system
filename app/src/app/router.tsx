import type { RouteObject } from 'react-router'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ProfilePage } from '@/features/auth/pages/ProfilePage'
import { BrandListPage } from '@/features/brands/pages/BrandListPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { ProductFormPage } from '@/features/products/pages/ProductFormPage'
import { ProductListPage } from '@/features/products/pages/ProductListPage'
import { BatchProductPage } from '@/features/products/pages/BatchProductPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { ScanPage } from '@/features/scan/pages/ScanPage'
import { PosPage } from '@/features/sales/pages/PosPage'
import { SalesPage } from '@/features/sales/pages/SalesPage'
import { StoreSettingsPage } from '@/features/store/pages/StoreSettingsPage'
import { StockMovementsPage } from '@/features/stock/pages/StockMovementsPage'
import { SupplierFormPage } from '@/features/suppliers/pages/SupplierFormPage'
import { SupplierListPage } from '@/features/suppliers/pages/SupplierListPage'
import { UserFormPage } from '@/features/users/pages/UserFormPage'
import { UserListPage } from '@/features/users/pages/UserListPage'
import { NotFoundPage } from '@/shared/components/NotFoundPage'
import { RouteErrorPage } from '@/shared/components/RouteErrorPage'
import { AppLayout } from '@/shared/layout/AppLayout'
import { AuthRoot } from './auth/AuthRoot'
import { RequireAuth } from './auth/RequireAuth'
import { RequireRole } from './auth/RequireRole'
import { routeHandle } from './route-handle'

const h = (...crumbs: Parameters<typeof routeHandle>) => ({
  handle: routeHandle(...crumbs),
})
const home = { labelKey: 'nav.home' } as const

export const routes: RouteObject[] = [
  {
    element: <AuthRoot />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/login', element: <LoginPage /> },
      // Invite links: /join#<code>. The code stays in the fragment, which browsers never send to a server.
      { path: '/join', element: <LoginPage initialView="join" /> },
      // Opened on a phone from the "new product" QR code: /scan#<token>, no sign-in needed.
      { path: '/scan', element: <ScanPage /> },
      {
        path: '/',
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <DashboardPage />, ...h(home) },
          {
            path: 'profile',
            element: <ProfilePage />,
            ...h({ labelKey: 'breadcrumb.profile' }),
          },
          {
            path: 'store',
            ...h({ labelKey: 'breadcrumb.store' }),
            element: (
              <RequireRole permission="store.manage">
                <StoreSettingsPage />
              </RequireRole>
            ),
          },
          {
            path: 'products',
            ...h({ labelKey: 'nav.groups.catalog' }, { labelKey: 'nav.products' }),
            element: <ProductListPage />,
          },
          {
            path: 'products/new',
            ...h(
              { labelKey: 'nav.groups.catalog' },
              { labelKey: 'nav.products', to: '/products' },
              { labelKey: 'breadcrumb.new' },
            ),
            element: (
              <RequireRole permission="products.write">
                <ProductFormPage />
              </RequireRole>
            ),
          },
          {
            path: 'products/batch',
            ...h(
              { labelKey: 'nav.groups.catalog' },
              { labelKey: 'nav.products', to: '/products' },
              { labelKey: 'breadcrumb.batch' },
            ),
            element: (
              <RequireRole permission="products.write">
                <BatchProductPage />
              </RequireRole>
            ),
          },
          // Not guarded: users without products.write see the form read-only.
          {
            path: 'products/:id/edit',
            ...h(
              { labelKey: 'nav.groups.catalog' },
              { labelKey: 'nav.products', to: '/products' },
              { labelKey: 'breadcrumb.edit' },
            ),
            element: <ProductFormPage />,
          },
          {
            path: 'brands',
            ...h({ labelKey: 'nav.groups.catalog' }, { labelKey: 'nav.brands' }),
            element: <BrandListPage />,
          },
          {
            path: 'pos',
            ...h({ labelKey: 'nav.groups.general' }, { labelKey: 'nav.pos' }),
            element: (
              <RequireRole permission="sales.write">
                <PosPage />
              </RequireRole>
            ),
          },
          {
            path: 'sales',
            ...h({ labelKey: 'nav.groups.general' }, { labelKey: 'nav.sales' }),
            element: (
              <RequireRole permission="sales.write">
                <SalesPage />
              </RequireRole>
            ),
          },
          {
            path: 'reports',
            ...h({ labelKey: 'nav.groups.admin' }, { labelKey: 'nav.reports' }),
            element: (
              <RequireRole permission="reports.read">
                <ReportsPage />
              </RequireRole>
            ),
          },
          {
            path: 'stock',
            ...h({ labelKey: 'nav.groups.catalog' }, { labelKey: 'nav.stock' }),
            element: (
              <RequireRole permission="stock.move">
                <StockMovementsPage />
              </RequireRole>
            ),
          },
          {
            path: 'suppliers',
            ...h({ labelKey: 'nav.groups.purchasing' }, { labelKey: 'nav.suppliers' }),
            element: (
              <RequireRole permission="suppliers.read">
                <SupplierListPage />
              </RequireRole>
            ),
          },
          {
            path: 'suppliers/new',
            ...h(
              { labelKey: 'nav.groups.purchasing' },
              { labelKey: 'nav.suppliers', to: '/suppliers' },
              { labelKey: 'breadcrumb.new' },
            ),
            element: (
              <RequireRole permission="suppliers.write">
                <SupplierFormPage />
              </RequireRole>
            ),
          },
          {
            path: 'suppliers/:id/edit',
            ...h(
              { labelKey: 'nav.groups.purchasing' },
              { labelKey: 'nav.suppliers', to: '/suppliers' },
              { labelKey: 'breadcrumb.edit' },
            ),
            element: (
              <RequireRole permission="suppliers.write">
                <SupplierFormPage />
              </RequireRole>
            ),
          },
          {
            path: 'users',
            ...h({ labelKey: 'nav.groups.admin' }, { labelKey: 'nav.users' }),
            element: (
              <RequireRole permission="users.manage">
                <UserListPage />
              </RequireRole>
            ),
          },
          {
            path: 'users/new',
            ...h(
              { labelKey: 'nav.groups.admin' },
              { labelKey: 'nav.users', to: '/users' },
              { labelKey: 'breadcrumb.new' },
            ),
            element: (
              <RequireRole permission="users.manage">
                <UserFormPage />
              </RequireRole>
            ),
          },
          {
            path: 'users/:id/edit',
            ...h(
              { labelKey: 'nav.groups.admin' },
              { labelKey: 'nav.users', to: '/users' },
              { labelKey: 'breadcrumb.edit' },
            ),
            element: (
              <RequireRole permission="users.manage">
                <UserFormPage />
              </RequireRole>
            ),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]
