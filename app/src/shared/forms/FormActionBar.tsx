import { AnimatePresence, motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { softSpring } from '@/shared/motion/presets'

interface FormActionBarProps {
  dirty: boolean
  submitting: boolean
  onCancel: () => void
}

export function FormActionBar({ dirty, submitting, onCancel }: FormActionBarProps) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={softSpring}
      className="sticky bottom-0 z-10 -mx-1 flex items-center justify-between gap-3 border-t bg-background/90 px-1 py-3 backdrop-blur"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        <AnimatePresence initial={false}>
          {dirty ? (
            <motion.span
              key="unsaved"
              className="inline-flex items-center gap-1.5"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
              {t('form.unsaved')}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t('actions.cancel')}
        </Button>
        <Button type="submit" loading={submitting}>
          {t('actions.save')}
        </Button>
      </div>
    </motion.div>
  )
}
