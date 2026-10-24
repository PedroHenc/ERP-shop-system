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
  group: 'general' | 'catalog' | 'purchasing' | 'admin'
  /** Hidden from users without this permission. */
  permission?: Permission
}

export const navGroups: readonly NavItem['group'][] = ['general', 'catalog', 'purchasing', 'admin']

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: RiHome4Line, group: 'general' },
  { to: '/products', labelKey: 'nav.products', icon: RiShoppingBag3Line, group: 'catalog' },
  { to: '/brands', labelKey: 'nav.brands', icon: RiPriceTag3Line, group: 'catalog' },
  {
    to: '/suppliers',
    labelKey: 'nav.suppliers',
    icon: RiTruckLine,
    group: 'purchasing',
    permission: 'suppliers.read',
  },
  { to: '/users', labelKey: 'nav.users', icon: RiTeamLine, group: 'admin', permission: 'users.manage' },
]
