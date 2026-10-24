import * as React from "react"

const COMPACT_BREAKPOINT = 640
const COMPACT_QUERY = `(max-width: ${COMPACT_BREAKPOINT - 1}px)`

export function useIsCompact() {
  // Read the query on the first render so phones never paint one frame of the table layout.
  const [isCompact, setIsCompact] = React.useState(
    () => typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches
  )

  React.useEffect(() => {
    const mql = window.matchMedia(COMPACT_QUERY)
    const onChange = () => setIsCompact(mql.matches)
    mql.addEventListener("change", onChange)
    setIsCompact(mql.matches)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isCompact
}
