import type { Permission } from '@/app/auth/permissions'

export interface NavItem {
  to: string
  labelKey: 'nav.home' | 'nav.pos' | 'nav.sales' | 'nav.products' | 'nav.suppliers' | 'nav.brands' | 'nav.stock' | 'nav.reports' | 'nav.users'
  /** Hidden from users without this permission. */
  permission?: Permission
}

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/pos', labelKey: 'nav.pos', permission: 'sales.write' },
  { to: '/sales', labelKey: 'nav.sales', permission: 'sales.write' },
  { to: '/products', labelKey: 'nav.products' },
  { to: '/brands', labelKey: 'nav.brands' },
  { to: '/stock', labelKey: 'nav.stock', permission: 'stock.move' },
  { to: '/suppliers', labelKey: 'nav.suppliers', permission: 'suppliers.read' },
  { to: '/reports', labelKey: 'nav.reports', permission: 'reports.read' },
  { to: '/users', labelKey: 'nav.users', permission: 'users.manage' },
]
