import { useTranslation } from 'react-i18next'
import { SegmentedControl } from '@/shared/components/SegmentedControl'

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

/** All / Active / Inactive filter of the list pages, as the design's pill switch. */
export function StatusTabs({ value, onChange, count }: StatusTabsProps) {
  const { t } = useTranslation()
  return (
    <SegmentedControl
      label={t('tabs.label')}
      value={value}
      onChange={onChange}
      options={TABS.map((tab) => ({ value: tab.value, label: t(`tabs.${tab.key}`), badge: count }))}
    />
  )
}
