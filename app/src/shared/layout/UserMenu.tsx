import { RiLogoutBoxRLine, RiStore2Line, RiUserLine } from '@remixicon/react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { useAuth } from '@/app/auth/AuthProvider'
import { useCan } from '@/app/auth/permissions'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserAvatar } from '@/shared/components/UserAvatar'

/** The signed-in user's avatar at the end of the top bar; opens profile and sign-out. */
export function UserMenu() {
  const { t } = useTranslation()
  const { t: ta } = useTranslation('auth')
  const { user, logout } = useAuth()
  const canManageStore = useCan('store.manage')
  if (user === null) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t('header.userMenu')}
          title={user.name}
          className="rounded-full outline-none transition-transform duration-200 hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:hover:scale-100"
        >
          <UserAvatar name={user.name} size="lg" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
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
        {canManageStore ? (
          <DropdownMenuItem asChild>
            <Link to="/store">
              <RiStore2Line />
              {t('breadcrumb.store')}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={() => void logout()}>
          <RiLogoutBoxRLine />
          {ta('menu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
