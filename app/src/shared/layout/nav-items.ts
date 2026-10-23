import {
  RiHome4Line,
  RiPriceTag3Line,
  RiShoppingBag3Line,
  RiTeamLine,
  RiTruckLine,
  type RemixiconComponentType,
} from '@remixicon/react'
import type { Permission } from '@/app/auth/permissions'

export interface NavItem {
  to: string
  labelKey: 'nav.home' | 'nav.products' | 'nav.suppliers' | 'nav.brands' | 'nav.users'
  icon: RemixiconComponentType
  /** Hidden from users without this permission. */
  permission?: Permission
}

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: RiHome4Line },
  { to: '/products', labelKey: 'nav.products', icon: RiShoppingBag3Line },
  { to: '/suppliers', labelKey: 'nav.suppliers', icon: RiTruckLine, permission: 'suppliers.read' },
  { to: '/brands', labelKey: 'nav.brands', icon: RiPriceTag3Line },
  { to: '/users', labelKey: 'nav.users', icon: RiTeamLine, permission: 'users.manage' },
]
