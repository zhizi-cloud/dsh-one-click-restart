/**
 * Ambient declaration for the one shell package the browser half reaches into.
 *
 * This package deliberately takes no dependency on the published
 * `@deepseek-ai/*` tree (its registry graph is incomplete and cannot be
 * installed). The primitives module *is* available at runtime, though: the
 * shell's own module loader resolves it for every client bundle. Declaring the
 * single export we consume keeps the compiler honest about that boundary.
 *
 * The export is typed as possibly absent on purpose: a future shell that stops
 * exporting the name must degrade to this plugin's inline glyph rather than
 * render nothing.
 */
declare module '@deepseek-ai/dsh-client-ui-primitives' {
  import type { ComponentType } from 'react'

  /** Shape of the shell's icon components. */
  export interface ShellIconProps {
    size?: number
    className?: string
  }

  /** The shell's outline refresh glyph, when this build exports one. */
  export const IconRefreshOutlineRegular: ComponentType<ShellIconProps> | undefined
}
