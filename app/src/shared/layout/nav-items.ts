import { RiHome4Line, RiShoppingBag3Line, type RemixiconComponentType } from '@remixicon/react'

export interface NavItem {
  to: string
  labelKey: 'nav.home' | 'nav.products'
  icon: RemixiconComponentType
}

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: RiHome4Line },
  { to: '/products', labelKey: 'nav.products', icon: RiShoppingBag3Line },
]
