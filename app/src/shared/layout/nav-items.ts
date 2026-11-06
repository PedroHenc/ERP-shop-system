import {
  RiArrowLeftRightLine,
  RiBox3Line,
  RiHome5Line,
  RiInboxArchiveLine,
  RiLineChartLine,
  RiPriceTag3Line,
  RiReceiptLine,
  RiShoppingCart2Line,
  RiTeamLine,
  type RemixiconComponentType,
} from '@remixicon/react'
import type { Permission } from '@/app/auth/permissions'

export interface NavItem {
  to: string
  labelKey: 'nav.home' | 'nav.pos' | 'nav.sales' | 'nav.products' | 'nav.suppliers' | 'nav.purchases' | 'nav.brands' | 'nav.stock' | 'nav.reports' | 'nav.users'
  /** Shown before the label (decorative: hidden from screen readers, the label names the page). */
  emoji: string
  /** The same, as a line icon, for those who prefer icons to emojis (Preferences). */
  icon: RemixiconComponentType
  /** Hidden from users without this permission. */
  permission?: Permission
  /** Other pages under this tab (e.g. suppliers under purchases), which also mark it current. */
  also?: string[]
}

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home', emoji: '🏠', icon: RiHome5Line },
  { to: '/pos', labelKey: 'nav.pos', emoji: '🛒', icon: RiShoppingCart2Line, permission: 'sales.write' },
  { to: '/sales', labelKey: 'nav.sales', emoji: '🧾', icon: RiReceiptLine, permission: 'sales.write' },
  { to: '/products', labelKey: 'nav.products', emoji: '📦', icon: RiBox3Line },
  { to: '/brands', labelKey: 'nav.brands', emoji: '🏷️', icon: RiPriceTag3Line },
  { to: '/stock', labelKey: 'nav.stock', emoji: '🔄', icon: RiArrowLeftRightLine, permission: 'stock.move' },
  // Suppliers live under purchases (a button on that page), which keeps the bar at nine tabs.
  { to: '/purchases', labelKey: 'nav.purchases', emoji: '📥', icon: RiInboxArchiveLine, permission: 'purchases.read', also: ['/suppliers'] },
  { to: '/reports', labelKey: 'nav.reports', emoji: '📈', icon: RiLineChartLine, permission: 'reports.read' },
  { to: '/users', labelKey: 'nav.users', emoji: '👥', icon: RiTeamLine, permission: 'users.manage' },
]
