import {
  RiHome4Line,
  RiPriceTag3Line,
  RiShoppingBag3Line,
  RiTruckLine,
  type RemixiconComponentType,
} from '@remixicon/react'

export interface NavItem {
  to: string
  labelKey: 'nav.home' | 'nav.products' | 'nav.suppliers' | 'nav.brands'
  icon: RemixiconComponentType
}

export const navItems: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: RiHome4Line },
  { to: '/products', labelKey: 'nav.products', icon: RiShoppingBag3Line },
  { to: '/suppliers', labelKey: 'nav.suppliers', icon: RiTruckLine },
  { to: '/brands', labelKey: 'nav.brands', icon: RiPriceTag3Line },
]
