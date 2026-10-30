import type { Permission } from '@/app/auth/permissions'

export interface NavItem {
  to: string
  labelKey: 'nav.home' | 'nav.products' | 'nav.suppliers' | 'nav.brands' | 'nav.stock' | 'nav.reports' | 'nav.users'
  /** Hidden from users without this permission. */
  permission?: Permission
}

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home' },
  { to: '/products', labelKey: 'nav.products' },
  { to: '/brands', labelKey: 'nav.brands' },
  { to: '/stock', labelKey: 'nav.stock', permission: 'stock.move' },
  { to: '/suppliers', labelKey: 'nav.suppliers', permission: 'suppliers.read' },
  { to: '/reports', labelKey: 'nav.reports', permission: 'reports.read' },
  { to: '/users', labelKey: 'nav.users', permission: 'users.manage' },
]
