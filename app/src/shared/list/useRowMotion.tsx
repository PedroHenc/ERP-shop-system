import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { LAYOUT_ANIMATION_LIMIT, softSpring } from '@/shared/motion/presets'

/** Row-class names a table row needs for the hover highlight: a positioning context, no own hover background. */
export const ROW_MOTION_CLASSES = 'relative hover:bg-transparent'

/**
 * Motion for list table rows:
 * - the first batch of data fades in staggered (20ms per row, up to 200ms; no stagger under reduced motion);
 * - afterwards, rows that arrive (new page, new filter) fade in quickly, and rows that stay move to their
 *   new place when the order changes (skipped above LAYOUT_ANIMATION_LIMIT rows);
 * - a highlight slides between rows under the pointer.
 * `scope` keeps highlights of different tables apart. Put `bodyProps` on the TableBody, `rowProps` on each
 * motion row (with ROW_MOTION_CLASSES), `highlight(id)` inside the row's first cell, and `isolate` on the Table.
 */
export function useRowMotion(scope: string, hasRows: boolean, rowCount: number) {
  const reducedMotion = useReducedMotion()
  // Flips once the first batch finished entering (an animation callback, so no effect or ref read in render).
  const [firstBatchShown, setFirstBatchShown] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const firstLoad = !firstBatchShown
  const layout = rowCount <= LAYOUT_ANIMATION_LIMIT ? ('position' as const) : false

  return {
    bodyProps: { onMouseLeave: () => setHovered(null) },
    rowProps: (index: number, id: string) => ({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: firstLoad
        ? { duration: 0.18, delay: reducedMotion ? 0 : Math.min(index * 0.02, 0.2) }
        : { duration: 0.15, layout: softSpring },
      layout,
      onMouseEnter: () => setHovered(id),
      onAnimationComplete: firstLoad && hasRows ? () => setFirstBatchShown(true) : undefined,
    }),
    highlight: (id: string) =>
      hovered === id ? (
        <motion.span
          layoutId={`${scope}-row-highlight`}
          transition={softSpring}
          aria-hidden="true"
          data-testid="row-highlight"
          className="pointer-events-none absolute inset-0 -z-10 bg-muted/60"
        />
      ) : null,
  }
}
