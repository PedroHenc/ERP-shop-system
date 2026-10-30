import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion } from 'motion/react'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const

interface StockHealthCardProps {
  activeProducts: number
  lowStock: number
  outOfStock: number
}

/**
 * Share of the active catalog that is in stock above its minimum, as a ring, plus the split between
 * healthy, low and out-of-stock products. Shows percentages only: the counts are on the KPI cards.
 */
export function StockHealthCard({ activeProducts, lowStock, outOfStock }: StockHealthCardProps) {
  const { t, i18n } = useTranslation()
  const reducedMotion = useReducedMotion()
  const percent = useMemo(
    () => new Intl.NumberFormat(i18n.language, { style: 'percent', maximumFractionDigits: 1 }),
    [i18n.language],
  )
  const share = (n: number) => (activeProducts > 0 ? n / activeProducts : 0)
  const healthy = Math.max(activeProducts - lowStock - outOfStock, 0)
  const rows = [
    { key: 'healthy', label: t('home.health.healthy'), value: share(healthy), bar: 'bg-primary' },
    { key: 'low', label: t('home.health.low'), value: share(lowStock), bar: 'bg-warning' },
    { key: 'out', label: t('home.health.out'), value: share(outOfStock), bar: 'bg-destructive' },
  ]
  const needs = lowStock + outOfStock
  const note =
    activeProducts === 0
      ? t('home.health.noProducts')
      : needs === 0
        ? t('home.health.allHealthy')
        : t('home.health.needsRestock', { count: needs })

  // The ring fill is a motion value inside the conic-gradient, so it sweeps instead of jumping.
  const fill = useMotionValue(0)
  const target = share(healthy) * 100
  useEffect(() => {
    if (reducedMotion) {
      fill.set(target)
      return
    }
    const controls = animate(fill, target, { duration: 1, ease: EASE_OUT })
    return () => controls.stop()
  }, [fill, target, reducedMotion])
  const ring = useMotionTemplate`conic-gradient(var(--primary) ${fill}%, var(--muted) 0)`

  return (
    <section
      aria-labelledby="stock-health-title"
      className="bg-card flex flex-col gap-5 rounded-xl p-6 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-1">
        <h2 id="stock-health-title" className="text-lg font-extrabold">
          {t('home.health.title')}
        </h2>
        <p className="text-muted-foreground text-[13px]">{t('home.health.subtitle')}</p>
      </div>
      <div className="flex items-center gap-5">
        <motion.div
          role="img"
          aria-label={t('home.health.ringLabel', { percent: percent.format(share(healthy)) })}
          className="grid size-[132px] shrink-0 place-items-center rounded-full"
          style={{ background: ring }}
        >
          <div className="bg-card flex size-[100px] flex-col items-center justify-center rounded-full">
            <span className="text-[28px] leading-tight font-extrabold tracking-[-0.02em] tabular-nums">
              {percent.format(share(healthy))}
            </span>
            <span className="text-muted-foreground text-[11px]">{t('home.health.ringCaption')}</span>
          </div>
        </motion.div>
        <p className="text-foreground/80 text-[13px] text-pretty">{note}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.key} className="flex flex-col gap-1.5">
            <span className="flex justify-between text-[13px]">
              <span>{row.label}</span>
              <span className="font-semibold tabular-nums">{percent.format(row.value)}</span>
            </span>
            <span className="bg-muted block h-2 overflow-hidden rounded-full">
              <motion.span
                className={`block h-full rounded-full ${row.bar}`}
                initial={{ width: 0 }}
                animate={{ width: `${row.value * 100}%` }}
                transition={{ duration: 0.9, ease: EASE_OUT }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
