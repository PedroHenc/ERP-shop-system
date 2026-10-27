import { useEffect, useEffectEvent, useRef, useState } from 'react'

const DEBOUNCE_MS = 300

/** Text value committed to the URL after a pause; follows external URL changes (e.g. Clear filters). */
export function useDebouncedText(
  external: string | undefined,
  commit: (value: string | undefined) => void,
): [string, (value: string) => void] {
  const [local, setLocal] = useState(external ?? '')
  const committed = useRef(external ?? '')
  const onCommit = useEffectEvent(commit)

  useEffect(() => {
    const next = external ?? ''
    if (next !== committed.current) {
      committed.current = next
      setLocal(next)
    }
  }, [external])

  useEffect(() => {
    if (local === committed.current) return
    const timer = setTimeout(() => {
      committed.current = local
      onCommit(local === '' ? undefined : local)
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [local])

  return [local, setLocal]
}
