import * as React from "react"
import { useReducedMotion } from "motion/react"

interface CountUpOptions {
  durationMs?: number
  enabled?: boolean
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export function useCountUp(
  value: number,
  { durationMs = 600, enabled = true }: CountUpOptions = {},
) {
  const reducedMotion = useReducedMotion()
  const animate = enabled && !reducedMotion
  const [current, setCurrent] = React.useState(0)

  React.useEffect(() => {
    if (!animate) return
    let frame = 0
    let start: number | undefined
    const tick = (now: number) => {
      start ??= now
      const progress = Math.min((now - start) / durationMs, 1)
      setCurrent(value * easeOutCubic(progress))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    setCurrent(0)
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [animate, value, durationMs])

  return animate ? current : value
}
