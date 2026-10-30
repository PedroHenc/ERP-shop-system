import { RiAddLine, RiCloseLine, RiShoppingBasket2Line, RiSubtractLine } from '@remixicon/react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCurrency } from '@/app/currency-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useFormatQuantity } from '@/features/stock/format'
import { cn } from '@/lib/utils'
import { softSpring } from '@/shared/motion/presets'
import { type CartLine, lineProblem, lineTotal, parseAmount } from '../cart'

/** The quantity box: free typing (a comma works), committed as a number while valid. */
function QuantityInput({ line, onChange }: { line: CartLine; onChange: (quantity: number) => void }) {
  const { t, i18n } = useTranslation('sales')
  const [text, setText] = useState<string | null>(null)
  const shown = text ?? new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 3, useGrouping: false }).format(line.quantity)
  return (
    <Input
      inputMode="decimal"
      aria-label={t('cart.quantity', { name: line.product.name })}
      className="h-8 w-16 rounded-full px-2 text-center tabular-nums"
      value={shown}
      onChange={(event) => {
        setText(event.target.value)
        const value = parseAmount(event.target.value)
        if (!Number.isNaN(value)) onChange(value)
      }}
      onBlur={() => setText(null)}
      onFocus={(event) => event.target.select()}
    />
  )
}

interface CartLinesProps {
  lines: CartLine[]
  onQuantity: (productId: number, quantity: number) => void
  onRemove: (productId: number) => void
}

/** The lines of the sale: name and price, a stepper, the line total, and what is wrong with it, if anything. */
export function CartLines({ lines, onQuantity, onRemove }: CartLinesProps) {
  const { t } = useTranslation('sales')
  const { formatMoney } = useCurrency()
  const format = useFormatQuantity()

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
          <RiShoppingBasket2Line className="size-6" aria-hidden="true" />
        </span>
        <p className="font-bold">{t('cart.empty')}</p>
        <p className="text-muted-foreground text-sm">{t('cart.emptyHint')}</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-1" aria-label={t('cart.title')}>
      <AnimatePresence initial={false}>
        {lines.map((line) => {
          const problem = lineProblem(line)
          return (
            <motion.li
              key={line.product.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={softSpring}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 rounded-2xl px-3 py-3"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-bold">{line.product.name}</span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {formatMoney(line.product.price)} × {format(line.quantity, line.product.unitOfMeasure)}
                </span>
              </span>
              <span className="font-extrabold tabular-nums">{formatMoney(lineTotal(line))}</span>
              <span className="col-span-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-full"
                    aria-label={t('cart.decrease', { name: line.product.name })}
                    disabled={line.quantity <= 1}
                    onClick={() => onQuantity(line.product.id, line.quantity - 1)}
                  >
                    <RiSubtractLine />
                  </Button>
                  <QuantityInput line={line} onChange={(quantity) => onQuantity(line.product.id, quantity)} />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="rounded-full"
                    aria-label={t('cart.increase', { name: line.product.name })}
                    onClick={() => onQuantity(line.product.id, line.quantity + 1)}
                  >
                    <RiAddLine />
                  </Button>
                </span>
                {problem ? (
                  <span role="status" className={cn('text-destructive text-xs font-semibold')}>
                    {t(`cart.problems.${problem}`, { value: format(line.product.stockQuantity, line.product.unitOfMeasure) })}
                  </span>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground hover:text-destructive ml-auto rounded-full"
                  aria-label={t('cart.remove', { name: line.product.name })}
                  onClick={() => onRemove(line.product.id)}
                >
                  <RiCloseLine />
                </Button>
              </span>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}
