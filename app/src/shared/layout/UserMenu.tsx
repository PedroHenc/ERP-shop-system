import { RiExpandUpDownLine, RiLogoutBoxRLine, RiUserLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useAuth } from '@/app/auth/AuthProvider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { UserAvatar } from '@/shared/components/UserAvatar'

export function UserMenu() {
  const { t } = useTranslation()
  const { t: ta } = useTranslation('auth')
  const { user, logout } = useAuth()
  const { isMobile } = useSidebar()
  if (user === null) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" aria-label={t('header.userMenu')}>
              <UserAvatar name={user.name} />
              <span className="grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="text-muted-foreground truncate text-xs">{t(`roles.${user.role}`)}</span>
              </span>
              <RiExpandUpDownLine className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? 'top' : 'right'} align="end" className="min-w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
              <span className="text-foreground font-medium">{user.name}</span>
              <span className="text-muted-foreground text-xs">{user.email}</span>
              <span className="text-muted-foreground text-xs">{t(`roles.${user.role}`)}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile">
                <RiUserLine />
                {ta('menu.profile')}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void logout()}>
              <RiLogoutBoxRLine />
              {ta('menu.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
