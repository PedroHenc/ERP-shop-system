import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { softSpring } from '@/shared/motion/presets'

/** Active/inactive pill; when the status flips, the new pill pops in. */
export function StatusBadge({ active }: { active: boolean }) {
  const { t } = useTranslation()
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={String(active)}
        className="inline-flex"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={softSpring}
      >
        {active ? (
          <Badge variant="success">{t('status.active')}</Badge>
        ) : (
          <Badge variant="neutral">{t('status.inactive')}</Badge>
        )}
      </motion.span>
    </AnimatePresence>
  )
}
