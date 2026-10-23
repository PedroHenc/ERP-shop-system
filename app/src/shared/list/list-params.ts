export const PAGE_SIZES = [10, 20, 50, 100] as const

export type FilterKind = 'text' | 'boolean' | 'id'

export interface ListConfig<S extends string, F extends Record<string, FilterKind>> {
  sortFields: readonly S[]
  defaultSort: S
  filters: F
}

export type ListParams<S extends string, F extends Record<string, FilterKind>> = {
  page: number
  size: number
  sortBy: S
  direction: 'ASC' | 'DESC'
} & {
  [K in keyof F]?: F[K] extends 'text' ? string : F[K] extends 'boolean' ? boolean : number
}

export interface ListDefinition<S extends string, F extends Record<string, FilterKind>> {
  defaults: ListParams<S, F>
  parse(search: URLSearchParams): ListParams<S, F>
  toSearchParams(params: ListParams<S, F>): URLSearchParams
  hasActiveFilters(params: ListParams<S, F>): boolean
}

const MAX_PAGE = 2147483647 // the API binds page as a Java Integer

function parseNonNegativeInt(value: string | null): number | undefined {
  if (value === null || !/^\d+$/.test(value)) return undefined
  return Number(value)
}

function parseFilter(kind: FilterKind, raw: string | null): string | number | boolean | undefined {
  switch (kind) {
    case 'text':
      return raw === null || raw === '' ? undefined : raw
    case 'boolean':
      return raw === 'true' ? true : raw === 'false' ? false : undefined
    case 'id': {
      const id = parseNonNegativeInt(raw)
      return id !== undefined && Number.isSafeInteger(id) && id >= 1 ? id : undefined
    }
  }
}

export function createListParams<S extends string, const F extends Record<string, FilterKind>>(
  config: ListConfig<S, F>,
): ListDefinition<S, F> {
  const filterNames = Object.keys(config.filters)

  // The mapped filter type cannot be indexed generically, so filters are handled
  // through this loosely-typed view; the public signatures stay fully typed.
  const filterView = (params: ListParams<S, F>): Record<string, string | number | boolean | undefined> => params

  const defaults: ListParams<S, F> = { page: 0, size: 20, sortBy: config.defaultSort, direction: 'ASC' } as ListParams<S, F>

  function parse(search: URLSearchParams): ListParams<S, F> {
    const rawPage = parseNonNegativeInt(search.get('page'))
    const page = rawPage !== undefined && rawPage <= MAX_PAGE ? rawPage : defaults.page
    const rawSize = parseNonNegativeInt(search.get('size'))
    const size = PAGE_SIZES.find((s) => s === rawSize) ?? defaults.size
    const rawSort = search.get('sortBy')
    const sortBy = config.sortFields.find((f) => f === rawSort) ?? defaults.sortBy
    const rawDirection = search.get('direction')
    const direction = rawDirection === 'ASC' || rawDirection === 'DESC' ? rawDirection : defaults.direction

    const result: Record<string, string | number | boolean | undefined> = { page, size, sortBy, direction }
    for (const name of filterNames) {
      const value = parseFilter(config.filters[name], search.get(name))
      if (value !== undefined) result[name] = value
    }
    return result as ListParams<S, F>
  }

  function toSearchParams(params: ListParams<S, F>): URLSearchParams {
    const search = new URLSearchParams()
    if (params.page !== defaults.page) search.set('page', String(params.page))
    if (params.size !== defaults.size) search.set('size', String(params.size))
    if (params.sortBy !== defaults.sortBy) search.set('sortBy', params.sortBy)
    if (params.direction !== defaults.direction) search.set('direction', params.direction)
    const view = filterView(params)
    for (const name of filterNames) {
      const value = view[name]
      if (config.filters[name] === 'text' ? value : value !== undefined) search.set(name, String(value))
    }
    return search
  }

  function hasActiveFilters(params: ListParams<S, F>): boolean {
    const view = filterView(params)
    return filterNames.some((name) => (config.filters[name] === 'text' ? Boolean(view[name]) : view[name] !== undefined))
  }

  return { defaults, parse, toSearchParams, hasActiveFilters }
}
