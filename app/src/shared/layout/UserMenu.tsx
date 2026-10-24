import { RiExpandUpDownLine, RiLogoutBoxRLine, RiSettings3Line, RiUserLine } from '@remixicon/react'
import { useState } from 'react'
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { PreferencesPanel } from './PreferencesMenu'

export function UserMenu() {
  const { t } = useTranslation()
  const { t: ta } = useTranslation('auth')
  const { user, logout } = useAuth()
  const { isMobile } = useSidebar()
  const [preferencesOpen, setPreferencesOpen] = useState(false)
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
            {isMobile && (
              <DropdownMenuItem onSelect={() => setPreferencesOpen(true)}>
                <RiSettings3Line />
                {t('header.preferences')}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => void logout()}>
              <RiLogoutBoxRLine />
              {ta('menu.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Sheet open={preferencesOpen} onOpenChange={setPreferencesOpen}>
          <SheetContent side="bottom">
            <SheetHeader>
              <SheetTitle>{t('header.preferences')}</SheetTitle>
              <SheetDescription className="sr-only">{t('header.preferences')}</SheetDescription>
            </SheetHeader>
            <div className="overflow-y-auto px-4 pb-4">
              <PreferencesPanel />
            </div>
          </SheetContent>
        </Sheet>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
