import * as React from "react"

const COMPACT_BREAKPOINT = 640
const COMPACT_QUERY = `(max-width: ${COMPACT_BREAKPOINT - 1}px)`

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(COMPACT_QUERY)
  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}

// Read synchronously on every render, so phones never paint one frame of the table layout.
const getSnapshot = () => window.matchMedia(COMPACT_QUERY).matches
const getServerSnapshot = () => false

export function useIsCompact() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
