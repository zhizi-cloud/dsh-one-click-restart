/**
 * The refresh glyph for the header seat.
 *
 * The shell ships its own `IconRefreshOutlineRegular`, and using it is what
 * makes the seat look like it belongs: same grid, same stroke weight, same
 * optical size as the utilities beside it. It is resolved defensively because
 * this package declares no dependency on the primitives build — if a future
 * shell stops exporting the name, the seat degrades to an equivalent inline
 * glyph instead of rendering an empty button.
 */
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import type { ReactElement } from 'react'

/** Shape of the shell's icon components. */
export interface GlyphProps {
  size?: number
}

const ShellRefresh = primitives.IconRefreshOutlineRegular

/**
 * Inline fallback: a ring arrow with the head at the upper left, drawn on the
 * same 24-unit grid as the shell's line icons.
 */
function InlineRefresh({ size = 16 }: GlyphProps): ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 12a9 9 0 1 0 9-9c-2.52 0-4.93 1-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

/** Render the shell's refresh glyph, or this plugin's equivalent. */
export function RefreshGlyph({ size = 16 }: GlyphProps): ReactElement {
  return ShellRefresh !== undefined ? <ShellRefresh size={size} /> : <InlineRefresh size={size} />
}
