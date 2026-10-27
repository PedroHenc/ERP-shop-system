import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import type { User } from '@/features/users/types'
import { StatusBadge } from '@/shared/components/StatusBadge'
import { useRowMotion } from '@/shared/list/useRowMotion'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { type UserActions, UserRowActions } from './UserTable'
import { placeholderKeys } from '@/shared/list/placeholder-keys'

interface UserCardListProps extends UserActions {
  users: User[]
  /** True on the first load, before any data exists. */
  loading: boolean
}

const SKELETON_CARDS = 6

/** Compact (phone) rendering of the user list: avatar, name, e-mail, role and status on each card. */
export function UserCardList({ users, loading, onDeactivate, onActivate }: UserCardListProps) {
  const cards = useRowMotion('users-cards', !loading && users.length > 0, users.length)
  const { t: tc } = useTranslation()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex flex-col divide-y" aria-hidden="true">
        {placeholderKeys(SKELETON_CARDS).map((key) => (
          <div key={key} className="flex items-center gap-3 p-4">
            <Skeleton className="size-8 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ul className="flex flex-col divide-y">
      {users.map((user, index) => (
        <motion.li
          {...cards.rowProps(index, String(user.id))}
          key={user.id}
          className="flex cursor-pointer flex-col gap-2 p-4 transition-colors hover:bg-muted/40"
          onClick={() => void navigate(`/users/${user.id}/edit`)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar name={user.name} />
              <div className="flex min-w-0 flex-col">
                <Link
                  to={`/users/${user.id}/edit`}
                  className="truncate font-medium hover:underline"
                  onClick={(event) => event.stopPropagation()}
                >
                  {user.name}
                </Link>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
            <UserRowActions user={user} onDeactivate={onDeactivate} onActivate={onActivate} />
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{tc(`roles.${user.role}`)}</span>
            <StatusBadge active={user.active} />
          </div>
        </motion.li>
      ))}
    </ul>
  )
}
