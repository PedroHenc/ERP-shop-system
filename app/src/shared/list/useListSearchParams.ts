import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import type { FilterKind, ListDefinition, ListParams } from './list-params'

export function useListSearchParams<S extends string, F extends Record<string, FilterKind>>(
  list: ListDefinition<S, F>,
) {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = useMemo(() => list.parse(searchParams), [list, searchParams])

  const update = useCallback(
    (changes: Partial<ListParams<S, F>>, replace = false) =>
      setSearchParams(list.toSearchParams({ ...params, ...changes }), { replace }),
    [list, params, setSearchParams],
  )
  // Any filter change goes back to the first page.
  const updateFilters = (changes: Partial<ListParams<S, F>>) => update({ ...changes, page: 0 })
  // Typed text commits replace the entry so Back doesn't step through every typed prefix.
  const updateTextFilter = (changes: Partial<ListParams<S, F>>) => update({ ...changes, page: 0 }, true)
  const clearFilters = () =>
    setSearchParams(
      list.toSearchParams({ ...list.defaults, size: params.size, sortBy: params.sortBy, direction: params.direction }),
    )

  return { params, update, updateFilters, updateTextFilter, clearFilters }
}
