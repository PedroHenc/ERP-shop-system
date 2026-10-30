import { type KeyboardEvent, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@/app/currency-provider'
import { useElementWidth } from '@/hooks/use-element-width'
import { cn } from '@/lib/utils'
import { type FlowPoint, niceMax, parseDay } from '../period'

const HEIGHT = 240
const AXIS_LEFT = 64
const AXIS_BOTTOM = 26
const TOP = 8
const MAX_BAR = 24
const RADIUS = 4

/** A column from the zero line, square at the baseline and rounded (4px) at its data end. */
function column(x: number, width: number, baseline: number, length: number, up: boolean): string {
  if (length <= 0) return ''
  const r = Math.min(RADIUS, width / 2, length)
  const end = up ? baseline - length : baseline + length
  const dir = up ? 1 : -1
  return [
    `M${x},${baseline}`,
    `V${end + dir * r}`,
    `Q${x},${end} ${x + r},${end}`,
    `H${x + width - r}`,
    `Q${x + width},${end} ${x + width},${end + dir * r}`,
    `V${baseline}`,
    'Z',
  ].join(' ')
}

interface FlowChartProps {
  points: FlowPoint[]
  /** True while a new period loads: the previous render stays, dimmed. */
  refreshing?: boolean
}

/**
 * Value in (up, blue) and out (down, orange) per day or week, mirrored on one zero line so direction
 * also tells them apart. Hover or arrow keys show a point's values; the table below holds every value.
 */
export function FlowChart({ points, refreshing = false }: FlowChartProps) {
  const { t, i18n } = useTranslation('reports')
  const { formatMoney, currency } = useCurrency()
  const [ref, width] = useElementWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const tableId = useId()

  const compact = useMemo(
    () => new Intl.NumberFormat(i18n.language, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }),
    [i18n.language, currency],
  )
  const dayFormat = useMemo(() => new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }), [i18n.language])
  const weekly = points.length > 0 && points[0].start !== points[0].end
  const label = (point: FlowPoint) =>
    weekly
      ? t('chart.week', { start: dayFormat.format(parseDay(point.start)), end: dayFormat.format(parseDay(point.end)) })
      : dayFormat.format(parseDay(point.start))

  const max = niceMax(Math.max(0, ...points.map((p) => Math.max(p.valueIn, p.valueOut))))
  const plotWidth = Math.max(0, width - AXIS_LEFT)
  const plotHeight = HEIGHT - TOP - AXIS_BOTTOM
  const baseline = TOP + plotHeight / 2
  const half = plotHeight / 2
  const slot = points.length > 0 ? plotWidth / points.length : 0
  const barWidth = Math.max(2, Math.min(MAX_BAR, slot * 0.62))
  const scale = (value: number) => (value / max) * half
  // One date label per ~80px (at most six), whatever the number of points, so they never collide.
  const labels = Math.max(2, Math.min(6, Math.floor(plotWidth / 80)))
  const every = Math.max(1, Math.ceil(points.length / labels))
  const ticks = [max, max / 2, 0, -max / 2, -max]

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (points.length === 0) return
    const last = points.length - 1
    let next: number | null = null
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
  const tooltipLeft = active !== null ? AXIS_LEFT + slot * active + slot / 2 : 0

  return (
    <div className="flex flex-col gap-3">
      <ul className="text-muted-foreground flex flex-wrap gap-x-5 gap-y-1 text-[13px]" aria-label={t('chart.legend')}>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="bg-flow-in size-2.5 rounded-[3px]" />
          {t('chart.in')}
        </li>
        <li className="flex items-center gap-2">
          <span aria-hidden="true" className="bg-flow-out size-2.5 rounded-[3px]" />
          {t('chart.out')}
        </li>
      </ul>
      <div ref={ref} className={cn('relative transition-opacity duration-300', refreshing && 'opacity-60')}>
        {width > 0 ? (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: the chart is explored with the arrow keys
            tabIndex={0}
            aria-label={t('chart.description')}
            aria-describedby={tableId}
            className="block rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onKeyDown={handleKeyDown}
            onBlur={() => setActive(null)}
            onPointerLeave={() => setActive(null)}
          >
            {ticks.map((tick) => {
              const y = baseline - scale(tick)
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
                    {tick === 0 ? '0' : compact.format(Math.abs(tick))}
                  </text>
                </g>
              )
            })}
            {/* Date labels sit outside the columns' groups, so hovering never dims them. */}
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
            {points.map((point, index) => {
              const x = AXIS_LEFT + slot * index + (slot - barWidth) / 2
              const dimmed = active !== null && active !== index
              return (
                <g key={point.start} className={cn('transition-opacity duration-150', dimmed && 'opacity-40')}>
                  <path d={column(x, barWidth, baseline - 1, scale(point.valueIn) - 1, true)} className="fill-flow-in" />
                  <path d={column(x, barWidth, baseline + 1, scale(point.valueOut) - 1, false)} className="fill-flow-out" />
                  {/* The whole slot is the hover target, not just the painted column. */}
                  <rect
                    x={AXIS_LEFT + slot * index}
                    y={TOP}
                    width={slot}
                    height={plotHeight}
                    fill="transparent"
                    onPointerEnter={() => setActive(index)}
                  />
                </g>
              )
            })}
          </svg>
        ) : (
          <div style={{ height: HEIGHT }} />
        )}
        {shown ? (
          <div
            role="status"
            className="bg-popover text-popover-foreground pointer-events-none absolute top-2 z-10 flex min-w-40 -translate-x-1/2 flex-col gap-1.5 rounded-2xl px-3.5 py-2.5 text-[13px] shadow-lg"
            style={{ left: Math.min(Math.max(tooltipLeft, 90), Math.max(90, width - 90)) }}
          >
            <span className="text-muted-foreground font-medium">{label(shown)}</span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="bg-flow-in h-0.5 w-3 rounded-full" />
              <span className="font-extrabold tabular-nums">{formatMoney(shown.valueIn)}</span>
              <span className="text-muted-foreground">{t('chart.in')}</span>
            </span>
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className="bg-flow-out h-0.5 w-3 rounded-full" />
              <span className="font-extrabold tabular-nums">{formatMoney(shown.valueOut)}</span>
              <span className="text-muted-foreground">{t('chart.out')}</span>
            </span>
          </div>
        ) : null}
      </div>
      <details className="group text-sm">
        <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer text-[13px] font-semibold">
          {t('chart.table')}
        </summary>
        <div className="mt-2 max-h-72 overflow-y-auto">
          <table id={tableId} className="w-full text-[13px] tabular-nums">
            <thead>
              <tr className="text-muted-foreground text-left text-xs">
                <th className="py-1.5 font-medium">{weekly ? t('chart.weekColumn') : t('chart.dayColumn')}</th>
                <th className="py-1.5 text-right font-medium">{t('chart.in')}</th>
                <th className="py-1.5 text-right font-medium">{t('chart.out')}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.start} className="border-t">
                  <td className="py-1.5">{label(point)}</td>
                  <td className="py-1.5 text-right">{formatMoney(point.valueIn)}</td>
                  <td className="py-1.5 text-right">{formatMoney(point.valueOut)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
