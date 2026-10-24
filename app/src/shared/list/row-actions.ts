/**
 * Hides a row's "⋯" menu until the row is hovered, on hover-capable devices only: touch tablets
 * (no hover) always show it. Keyboard focus and an open menu keep it visible.
 */
export const HOVER_REVEAL_ACTIONS =
  '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/row:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100'
