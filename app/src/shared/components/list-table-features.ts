import { rowPaginationFeature, rowSortingFeature, tableFeatures } from '@tanstack/react-table'

/** Feature set shared by the server-sorted, server-paginated list tables. */
export const listTableFeatures = tableFeatures({ rowPaginationFeature, rowSortingFeature })
export type ListTableFeatures = typeof listTableFeatures
