import { RiArrowDownLine, RiArrowUpDownLine, RiArrowUpLine } from '@remixicon/react'
import type { HeaderContext, RowData } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import type { ListTableFeatures } from './list-table-features'


interface SortableHeaderProps<TData extends RowData> {
  context: HeaderContext<ListTableFeatures, TData, unknown>
  label: string
}

export function SortableHeader<TData extends RowData>({ context, label }: SortableHeaderProps<TData>) {
  const sorted = context.column.getIsSorted()
  const Icon = sorted === 'asc' ? RiArrowUpLine : sorted === 'desc' ? RiArrowDownLine : RiArrowUpDownLine
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2.5 text-xs font-medium text-muted-foreground"
      onClick={(event) => {
        event.stopPropagation()
        context.column.toggleSorting()
      }}
    >
      {label}
      <Icon className={sorted ? undefined : 'text-muted-foreground'} />
    </Button>
  )
}
