import type { Permission } from '@/app/auth/permissions'

export interface NavItem {
  to: string
  labelKey: 'nav.home' | 'nav.pos' | 'nav.sales' | 'nav.products' | 'nav.suppliers' | 'nav.brands' | 'nav.stock' | 'nav.reports' | 'nav.users'
  /** Shown before the label (decorative: hidden from screen readers, the label names the page). */
  emoji: string
  /** Hidden from users without this permission. */
  permission?: Permission
}

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home', emoji: '🏠' },
  { to: '/pos', labelKey: 'nav.pos', emoji: '🛒', permission: 'sales.write' },
  { to: '/sales', labelKey: 'nav.sales', emoji: '🧾', permission: 'sales.write' },
  { to: '/products', labelKey: 'nav.products', emoji: '📦' },
  { to: '/brands', labelKey: 'nav.brands', emoji: '🏷️' },
  { to: '/stock', labelKey: 'nav.stock', emoji: '🔄', permission: 'stock.move' },
  { to: '/suppliers', labelKey: 'nav.suppliers', emoji: '🚚', permission: 'suppliers.read' },
  { to: '/reports', labelKey: 'nav.reports', emoji: '📈', permission: 'reports.read' },
  { to: '/users', labelKey: 'nav.users', emoji: '👥', permission: 'users.manage' },
]
