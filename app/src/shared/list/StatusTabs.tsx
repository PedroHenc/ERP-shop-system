import { motion } from 'motion/react'
import { useRef, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from 'cn'

interface StatusTabsProps {
  value: boolean | undefined
  onChange: (value: boolean | undefined) => void
  /** Total shown on the selected tab only, to avoid extra requests for the others. */
  count?: number
}

const TABS: { key: 'all' | 'active' | 'inactive'; value: boolean | undefined }[] = [
  { key: 'all', value: undefined },
  { key: 'active', value: true },
  { key: 'inactive', value: false },
]

export function StatusTabs({ value, onChange, count }: StatusTabsProps) {
  const { t } = useTranslation()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  // ARIA tabs pattern, automatic activation: arrows (wrapping), Home and End move focus and select.
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = tabRefs.current.findIndex((tab) => tab === event.target)
    if (current === -1) return
    const last = TABS.length - 1
    let next: number
    if (event.key === 'ArrowRight') next = current === last ? 0 : current + 1
    else if (event.key === 'ArrowLeft') next = current === 0 ? last : current - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else return
    event.preventDefault()
    tabRefs.current[next]?.focus()
    onChange(TABS[next].value)
  }

  return (
    <div
      role="tablist"
      aria-label={t('tabs.label')}
      onKeyDown={handleKeyDown}
      className="flex max-w-full gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {TABS.map((tab, index) => {
        const selected = tab.value === value
        return (
          <button
            key={tab.key}
            ref={(element) => {
              tabRefs.current[index] = element
            }}
            type="button"
            role="tab"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={cn(
              'relative inline-flex h-8 shrink-0 items-center gap-1.5 px-3 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t(`tabs.${tab.key}`)}
            {selected && count !== undefined ? (
              <span className="rounded-full bg-primary/10 px-1.5 text-xs text-primary tabular-nums">{count}</span>
            ) : null}
            {selected ? (
              <motion.span
                layoutId="status-tab"
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary"
                transition={{ duration: 0.18, ease: 'easeOut' }}
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
