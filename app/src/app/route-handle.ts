import type { ParseKeys } from 'i18next'

export interface Crumb {
  labelKey: ParseKeys<'common'>
  to?: string
}

export interface RouteHandle {
  crumbs: Crumb[]
}

export function routeHandle(...crumbs: Crumb[]): RouteHandle {
  return { crumbs }
}

export function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null && 'crumbs' in value && Array.isArray(value.crumbs)
}
