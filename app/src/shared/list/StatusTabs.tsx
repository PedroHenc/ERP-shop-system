import { motion } from 'motion/react'
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
  return (
    <div role="tablist" aria-label={t('tabs.label')} className="flex max-w-full gap-1 overflow-x-auto">
      {TABS.map((tab) => {
        const selected = tab.value === value
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={selected}
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
