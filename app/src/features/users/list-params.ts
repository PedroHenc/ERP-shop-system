import { ROLES } from '@/app/auth/types'
import { PAGE_SIZES, createListParams } from '@/shared/list/list-params'

export { PAGE_SIZES }

export const USER_SORT_FIELDS = ['name', 'email', 'role', 'active', 'lastLoginAt'] as const

const base = createListParams({
  sortFields: USER_SORT_FIELDS,
  defaultSort: 'name',
  filters: { search: 'text', role: 'text', active: 'boolean' },
})

export const userListParams: typeof base = {
  ...base,
  // The role filter only accepts known roles; anything else in the URL is ignored.
  parse(search) {
    const params = base.parse(search)
    if (params.role === undefined || ROLES.some((role) => role === params.role)) return params
    const { role: _ignored, ...rest } = params
    return rest
  },
}

export type UserListParams = typeof userListParams.defaults
export type UserSortField = UserListParams['sortBy']

/** Filters living inside the Filters popover (everything except the search and the status tabs). */
export function secondaryFilterCount(params: UserListParams): number {
  return [params.role].filter((value) => value !== undefined && value !== '').length
}
