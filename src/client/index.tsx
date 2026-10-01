/**
 * dsh-one-click-restart — browser half.
 *
 * Registers two seats:
 *
 *  - the header trigger, ordered to the right-hand end of the session
 *    utilities row (the shipped occupants sit at -10, -5 and 0), which puts it
 *    immediately left of the sidebar toggle;
 *  - the plugin's own page inside the Plugins settings section.
 *
 * Export discipline: this surface carries only what cordis loading needs.
 */
import type { ClientContext } from '../types.ts'
import { en, zh } from './locales.ts'
import { RestartButton } from './RestartButton.tsx'
import { SettingsPanel } from './SettingsPanel.tsx'
import { ensureStyles } from './styles.ts'

/** Dictionary namespace owned by this plugin. */
const NS = 'one-click-restart'

/** Services required by this plugin. */
export const inject = ['slots', 'locale']

/** Occupant id inside the session header's utilities row. */
const SEAT_ID = 'one-click-restart'

/** Occupant id inside the Plugins settings section. */
const SETTINGS_ID = 'one-click-restart'

/**
 * Register this plugin's browser surfaces.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ensureStyles()

  ctx.effect(() => {
    try {
      return ctx.locale.register(NS, { zh, en })
    } catch {
      return () => {}
    }
  }, 'one-click-restart: dictionaries')

  // `slots.inject` waits for the owner to declare the hole, so the seat mounts
  // whichever plugin contributes the header's utility row.
  ctx.slots.inject('conversation.session.header.utilities', () => {
    try {
      return ctx.slots.register(
        { name: 'conversation.session.header.utilities', id: SEAT_ID, order: 100, locale: NS },
        RestartButton,
      )
    } catch {
      return () => {}
    }
  })

  // The tab needs an explicit `label`. The owner projects it as the tab's
  // visible text, and registering without one yields a tab that exists but
  // cannot be read — indistinguishable from the page being missing. A thunk is
  // used so the text follows the active locale.
  ctx.slots.inject('settings.plugins.tab', () => {
    try {
      return ctx.slots.register(
        {
          name: 'settings.plugins.tab',
          id: SETTINGS_ID,
          order: 40,
          locale: NS,
          label: () => ctx.locale.bind(NS)('settings.title'),
        },
        SettingsPanel,
      )
    } catch {
      return () => {}
    }
  })
}
