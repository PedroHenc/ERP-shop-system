import { RiStore2Line } from '@remixicon/react'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/app/auth/AuthProvider'
import { can } from '@/app/auth/permissions'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { pillSpring } from '@/shared/motion/presets'
import { navGroups, navItems } from './nav-items'
import { UserMenu } from './UserMenu'

function isActivePath(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(`${to}/`)
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const visibleItems = navItems.filter((item) => !item.permission || can(user?.role, item.permission))
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-1">
          <span className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-full">
            <RiStore2Line className="size-5 text-white" />
          </span>
          <span className="text-[15px] font-extrabold tracking-[-0.01em] group-data-[collapsible=icon]:hidden">
            {t('appName')}
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={t('nav.label')}>
          {navGroups.map((group) => {
            const items = visibleItems.filter((item) => item.group === group)
            if (items.length === 0) return null
            return (
              <SidebarGroup key={group}>
                <SidebarGroupLabel>{t(`nav.groups.${group}`)}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => {
                      const active = isActivePath(pathname, item.to)
                      return (
                        <SidebarMenuItem key={item.to}>
                          <SidebarMenuButton
                            asChild
                            isActive={active}
                            tooltip={t(item.labelKey)}
                            className="relative isolate rounded-full font-semibold data-active:bg-transparent data-active:text-sidebar data-active:hover:bg-transparent data-active:hover:text-sidebar"
                          >
                            <Link to={item.to}>
                              {active && (
                                <motion.span
                                  layoutId="sidebar-active"
                                  aria-hidden="true"
                                  className="bg-sidebar-foreground absolute inset-0 -z-10 rounded-full"
                                  transition={pillSpring}
                                />
                              )}
                              <item.icon className="transition-transform duration-200 group-hover/menu-item:scale-110 motion-reduce:group-hover/menu-item:scale-100" />
                              <span>{t(item.labelKey)}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )
          })}
        </nav>
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
