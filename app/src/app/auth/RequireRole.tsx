import type { ReactNode } from 'react'
import { ForbiddenPage } from '@/shared/components/ForbiddenPage'
import { useCan, type Permission } from './permissions'

/** Renders the children only when the signed-in user has the permission. */
export function RequireRole({ permission, children }: { permission: Permission; children: ReactNode }) {
  const allowed = useCan(permission)
  return allowed ? children : <ForbiddenPage />
}
