/**
 * The header seat.
 *
 * Two jobs live here, and both belong to a *session-scoped* seat:
 *
 *  1. the restart trigger. Clicking asks the host to restart, and the host
 *     drops a request file the watchdog consumes. That indirection is
 *     deliberate: the seat is a convenience, while the hotkey — which never
 *     touches the host — is the path that still works when the host is the
 *     thing that hung.
 *
 *  2. the automatic continue, for a session the restart interrupted.
 *
 * Two things this component must NOT assume, both learned the hard way:
 *
 *  - that the owner injects `t`. Only some slot owners do; the session-header
 *    utilities row does not. Calling a missing `t` threw
 *    `TypeError: l is not a function`, recorded as `slot entry crashed in
 *    'conversation.session.header.utilities'`, and that crashed the renderer —
 *    taking the whole application down with it.
 *  - that the session-status hook is safe to call. It has no published type, so
 *    an earlier version's guarded call was still a conditionally-called hook
 *    and crashed the renderer outright. The host decides what to continue; this
 *    component only carries it out.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { continueIfInterrupted, fetchStatus, triggerRestart, type InputActions } from './api.ts'
import { RefreshGlyph } from './glyph.tsx'
import { zh } from './locales.ts'

/** Visual state of the seat. */
type Phase = 'idle' | 'pending' | 'failed'

/** How long a failure stays visible before the seat goes quiet again. */
const FAILURE_VISIBLE_MS = 4000

/** Props the slot owner composes: locale plus the session-scoped seats. */
export interface RestartButtonProps {
  /**
   * The owner-supplied translator, when this seat's owner provides one.
   *
   * Optional on purpose — see the module note.
   */
  t?: (key: string, vars?: Record<string, string>) => string
  /** The session this header belongs to, when one is selected. */
  sessionId?: string
  /** The public input face; the only sanctioned way to fill the composer. */
  inputActions?: InputActions
}

/**
 * Resolve a translator that is always callable.
 * @param t - the owner's translator, when it supplied one.
 * @returns a function that never throws, falling back to the built-in table.
 */
function translator(t: RestartButtonProps['t']): (key: string, vars?: Record<string, string>) => string {
  if (typeof t === 'function') return t
  return (key: string) => zh[key] ?? key
}

/**
 * Render a hotkey the way the watchdog labels it.
 * @param hotkey - the stored combination.
 * @returns e.g. `Ctrl+Alt+Shift+R`, or undefined when there is none.
 */
function formatCombo(hotkey: { modifiers: string[]; key: string } | undefined): string | undefined {
  if (hotkey === undefined || !Array.isArray(hotkey.modifiers)) return undefined
  const names = hotkey.modifiers.map(modifier => (modifier === 'Control' ? 'Ctrl' : modifier))
  return [...names, String(hotkey.key).toUpperCase()].join('+')
}

/**
 * Render the header trigger.
 * @param props - the slot's locale seat and session seats.
 * @returns the trigger element.
 */
export function RestartButton({ t, sessionId, inputActions }: RestartButtonProps): ReactElement {
  /**
   * The translator, read through a ref.
   *
   * An owner may hand out a fresh function identity on every render, and a
   * memo/callback chain keyed on it would then rebuild `refreshHint` every
   * render — re-running the effect that fetches the status and turning a
   * tooltip into a request storm. Reading through a ref keeps the callbacks
   * stable while still using the newest translator.
   */
  const trRef = useRef(translator(t))
  trRef.current = translator(t)
  const tr = trRef.current

  const [phase, setPhase] = useState<Phase>('idle')
  const [hint, setHint] = useState<string | undefined>(undefined)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const continued = useRef(false)
  const hasSession = typeof sessionId === 'string' && sessionId !== ''

  /**
   * Read the hotkey the plugin is actually using right now.
   *
   * The tooltip has to name the *current* combination, not the default one: a
   * user who rebound the hotkey — which this machine requires, since
   * `Ctrl+Alt+R` is owned by another application — would otherwise be told to
   * press a key that does nothing. Refreshed on hover, so a rebind shows up
   * without a page reload.
   */
  const refreshHint = useCallback((): void => {
    void fetchStatus().then(
      (status) => {
        const combo = formatCombo(status.settings.hotkey)
        setHint(combo === undefined ? undefined : trRef.current('action.hintWith', { combo }))
      },
      () => {
        // Keep whatever is already shown; a stale hint beats none.
      },
    )
  }, [])

  useEffect(() => { refreshHint() }, [refreshHint])

  // Continue the interrupted session — at most once per session per host boot,
  // and only when the user left the switch on.
  useEffect(() => {
    if (!hasSession || inputActions === undefined || continued.current) return
    continued.current = true
    void continueIfInterrupted(sessionId, inputActions).catch(() => {})
  }, [hasSession, sessionId, inputActions])

  useEffect(() => () => {
    if (resetTimer.current !== undefined) clearTimeout(resetTimer.current)
  }, [])

  const onClick = useCallback((): void => {
    if (phase === 'pending') return
    setPhase('pending')
    const fail = (): void => {
      setPhase('failed')
      if (resetTimer.current !== undefined) clearTimeout(resetTimer.current)
      resetTimer.current = setTimeout(() => { setPhase('idle') }, FAILURE_VISIBLE_MS)
    }
    // Success needs no reset: the process is about to be replaced.
    void triggerRestart('button').then((result) => {
      if (!result.ok) fail()
    }, fail)
  }, [phase])

  const label = phase === 'pending'
    ? tr('action.pending')
    : phase === 'failed'
      ? tr('action.failed')
      : tr('action.label')

  return (
    <button
      type="button"
      className="dsh-ocr-seat"
      data-phase={phase}
      data-dsh-plugin="one-click-restart"
      onClick={onClick}
      onMouseEnter={refreshHint}
      disabled={phase === 'pending'}
      aria-label={hint ?? label}
      title={hint ?? tr('action.hint')}
    >
      <RefreshGlyph size={16} />
    </button>
  )
}
