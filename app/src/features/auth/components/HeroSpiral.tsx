import { useEffect, useState, type RefObject } from 'react'

/** Bands that sweep over the hero between login views, drawn on top of each other in this order. */
export const SPIRAL_LAYERS = [
  'rgb(255 255 255 / 55%)',
  'color-mix(in oklab, var(--primary) 34%, #ffffff)',
  'color-mix(in oklab, var(--primary) 86%, #000000)',
]

interface Geometry {
  w: number
  h: number
  d: string
  stroke: number
}

/**
 * An Archimedean spiral sized to the hero and drawn from the outside in, with a stroke wide enough
 * that neighbouring turns overlap and cover the whole panel. Each layer animates `stroke-dashoffset`
 * (pathLength = 1): 1 hidden, 0 covering, -1 hidden again past the other end.
 */
function spiral(w: number, h: number): Geometry {
  const step = Math.max(48, Math.min(w, h) / 5)
  const radius = Math.hypot(w, h) / 2 + step / 2
  const turns = radius / step
  const n = Math.ceil(turns * 90)
  const points: string[] = []
  for (let i = 0; i <= n; i++) {
    const angle = (i / n) * turns * 2 * Math.PI
    const r = (step * angle) / (2 * Math.PI)
    points.push(`${(w / 2 + r * Math.cos(angle)).toFixed(1)} ${(h / 2 + r * Math.sin(angle)).toFixed(1)}`)
  }
  points.reverse()
  return { w, h, d: `M${points.join(' L')}`, stroke: step * 1.08 }
}

export function HeroSpiral({ host }: { host: RefObject<HTMLElement | null> }) {
  const [geometry, setGeometry] = useState<Geometry | null>(null)

  useEffect(() => {
    const el = host.current
    if (!el) return
    const measure = () => {
      const { offsetWidth: w, offsetHeight: h } = el
      if (w && h) setGeometry((g) => (g && g.w === w && g.h === h ? g : spiral(w, h)))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [host])

  if (!geometry) return null
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${geometry.w} ${geometry.h}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-[5] size-full"
    >
      {SPIRAL_LAYERS.map((color, i) => (
        <path
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed list, order is the identity
          key={i}
          data-layer={i}
          d={geometry.d}
          pathLength={1}
          fill="none"
          strokeWidth={geometry.stroke}
          strokeLinecap="round"
          strokeDasharray="1 1"
          strokeDashoffset={1}
          style={{ stroke: color }}
        />
      ))}
    </svg>
  )
}
