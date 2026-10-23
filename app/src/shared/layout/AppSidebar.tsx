import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router'
import { useAuth } from '@/app/auth/AuthProvider'
import { can } from '@/app/auth/permissions'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { navItems } from './nav-items'

function isActivePath(pathname: string, to: string): boolean {
  return to === '/' ? pathname === '/' : pathname === to || pathname.startsWith(to + '/')
}

export function AppSidebar() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { user } = useAuth()
  const visibleItems = navItems.filter((item) => !item.permission || can(user?.role, item.permission))
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <span className="px-2 py-1 text-sm font-semibold group-data-[collapsible=icon]:hidden">
          {t('appName')}
        </span>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <nav>
              <SidebarMenu>
                {visibleItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActivePath(pathname, item.to)}
                      tooltip={t(item.labelKey)}
                    >
                      <Link to={item.to}>
                        <item.icon />
                        <span>{t(item.labelKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </nav>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
