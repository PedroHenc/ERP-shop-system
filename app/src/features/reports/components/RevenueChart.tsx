import { type KeyboardEvent, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@/app/currency-provider'
import { useElementWidth } from '@/hooks/use-element-width'
import { cn } from '@/lib/utils'
import { niceMax, parseDay } from '../period'
import { column } from './FlowChart'

export interface RevenuePoint {
  /** First and last day of the bucket (the same for daily points), YYYY-MM-DD. */
  start: string
  end: string
  sales: number
  revenue: number
}

const HEIGHT = 220
const AXIS_LEFT = 64
const AXIS_BOTTOM = 26
const TOP = 10
const MAX_BAR = 24

/** Revenue per day (or week) as accent columns; one series, so the panel title names it and there is no legend. */
export function RevenueChart({ points }: { points: RevenuePoint[] }) {
  const { t, i18n } = useTranslation('reports')
  const { t: ts } = useTranslation('sales')
  const { formatMoney, currency } = useCurrency()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const tableId = useId()
  const compact = useMemo(
    () => new Intl.NumberFormat(i18n.language, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 2 }),
    [i18n.language, currency],
  )
  const dayFormat = useMemo(() => new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }), [i18n.language])
  const weekly = points.length > 0 && points[0].start !== points[0].end
  const label = (p: RevenuePoint) =>
    weekly
      ? t('chart.week', { start: dayFormat.format(parseDay(p.start)), end: dayFormat.format(parseDay(p.end)) })
      : dayFormat.format(parseDay(p.start))

  const max = niceMax(Math.max(0, ...points.map((p) => p.revenue)))
  const plotWidth = Math.max(0, width - AXIS_LEFT)
  const plotHeight = HEIGHT - TOP - AXIS_BOTTOM
  const baseline = TOP + plotHeight
  const slot = points.length > 0 ? plotWidth / points.length : 0
  const barWidth = Math.max(2, Math.min(MAX_BAR, slot * 0.62))
  const labels = Math.max(2, Math.min(6, Math.floor(plotWidth / 80)))
  const every = Math.max(1, Math.ceil(points.length / labels))
  const ticks = [max, max / 2, 0]

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (points.length === 0) return
    const last = points.length - 1
    let next: number | null
    if (event.key === 'ArrowRight') next = active === null ? 0 : Math.min(last, active + 1)
    else if (event.key === 'ArrowLeft') next = active === null ? last : Math.max(0, active - 1)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else if (event.key === 'Escape') next = null
    else return
    event.preventDefault()
    setActive(next)
  }

  const shown = active !== null ? points[active] : null

  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="relative">
        {width > 0 ? (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: the chart is explored with the arrow keys
            tabIndex={0}
            aria-label={t('sales.chartDescription')}
            aria-describedby={tableId}
            className="block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onKeyDown={handleKeyDown}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
          >
            {ticks.map((tick) => {
              const y = baseline - (tick / max) * plotHeight
              return (
                <g key={tick}>
                  <line
                    x1={AXIS_LEFT}
                    x2={width}
                    y1={y}
                    y2={y}
                    className={tick === 0 ? 'stroke-foreground/35' : 'stroke-border'}
                    strokeWidth={1}
                    shapeRendering="crispEdges"
                  />
                  <text x={AXIS_LEFT - 10} y={y} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
                    {tick === 0 ? '0' : compact.format(tick)}
                  </text>
                </g>
              )
            })}
            {points.map((point, index) =>
              index % every === 0 ? (
                <text
                  key={point.start}
                  x={AXIS_LEFT + slot * index + slot / 2}
                  y={HEIGHT - 6}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {dayFormat.format(parseDay(point.start))}
                </text>
              ) : null,
            )}
            {points.map((point, index) => (
              <g key={point.start} className={cn('transition-opacity duration-150', active !== null && active !== index && 'opacity-40')}>
                <path
                  d={column(AXIS_LEFT + slot * index + (slot - barWidth) / 2, barWidth, baseline - 1, (point.revenue / max) * plotHeight - 1, true)}
                  className="fill-primary"
                />
                <rect
                  x={AXIS_LEFT + slot * index}
                  y={TOP}
                  width={slot}
                  height={plotHeight}
                  fill="transparent"
                  onPointerEnter={() => setActive(index)}
                />
              </g>
            ))}
          </svg>
        ) : (
          <div style={{ height: HEIGHT }} />
        )}
        {shown && active !== null ? (
          <div
            role="status"
            className="bg-popover text-popover-foreground pointer-events-none absolute top-2 z-10 flex min-w-36 -translate-x-1/2 flex-col gap-1 rounded-2xl px-3.5 py-2.5 text-[13px] shadow-lg"
            style={{ left: Math.min(Math.max(AXIS_LEFT + slot * active + slot / 2, 80), Math.max(80, width - 80)) }}
          >
            <span className="text-muted-foreground font-medium">{label(shown)}</span>
            <span className="font-extrabold tabular-nums">{formatMoney(shown.revenue)}</span>
            <span className="text-muted-foreground">{ts('history.revenueHint', { count: shown.sales })}</span>
          </div>
        ) : null}
      </div>
      <details className="text-sm">
        <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer text-[13px] font-semibold">
          {t('chart.table')}
        </summary>
        <div className="mt-2 max-h-72 overflow-y-auto">
          <table id={tableId} className="w-full text-[13px] tabular-nums">
            <thead>
              <tr className="text-muted-foreground text-left text-xs">
                <th className="py-1.5 font-medium">{weekly ? t('chart.weekColumn') : t('chart.dayColumn')}</th>
                <th className="py-1.5 pl-3 text-right font-medium">{t('sales.salesColumn')}</th>
                <th className="py-1.5 pl-3 text-right font-medium">{t('sales.revenueColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.start} className="border-t">
                  <td className="py-1.5">{label(point)}</td>
                  <td className="py-1.5 pl-3 text-right">{point.sales}</td>
                  <td className="py-1.5 pl-3 text-right">{formatMoney(point.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
