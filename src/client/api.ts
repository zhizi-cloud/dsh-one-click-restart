/**
 * The browser half's view of this plugin's host routes.
 *
 * Paths are DOCUMENT-RELATIVE on purpose: the page is served with
 * `<base href="./">`, so a root-absolute path escapes its entry directory in a
 * sub-path deployment.
 */
import type { StatusPayload } from '../host/routes.ts'

export type { StatusPayload }

/** Document-relative base of this plugin's route family. */
const BASE = 'api/one-click-restart'

/** One request must not hang the seat forever. */
const TIMEOUT_MS = 10_000

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, TIMEOUT_MS)
  try {
    const response = await fetch(`${BASE}/${path}`, {
      cache: 'no-store',
      ...init,
      signal: controller.signal,
    })
    const text = await response.text()
    if (!response.ok) {
      throw new Error(text.trim() === '' ? `HTTP ${response.status}` : text.slice(0, 300))
    }
    if (text.trim() === '') throw new Error('the host answered with an empty body')
    return JSON.parse(text) as T
  } finally {
    clearTimeout(timer)
  }
}

/** Read settings, watchdog state and the pending recovery list in one call. */
export async function fetchStatus(): Promise<StatusPayload> {
  return await request<StatusPayload>('status')
}

/** Persist a settings patch; the host re-arms the watchdog and answers with status. */
export async function pushSettings(patch: Record<string, unknown>): Promise<StatusPayload> {
  return await request<StatusPayload>('settings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(patch),
  })
}

/** Ask the watchdog to restart the application. */
export async function triggerRestart(reason: string): Promise<{ ok: boolean; error?: string }> {
  return await request<{ ok: boolean; error?: string }>('restart', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
}

/** Start or stop the watchdog explicitly. */
export async function controlWatchdog(action: 'start' | 'stop'): Promise<StatusPayload> {
  return await request<StatusPayload>('watchdog', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action }),
  })
}

/**
 * The public input face dsh hands to every session-scoped slot component.
 *
 * Declared locally rather than imported: the package that defines it is not
 * installable (its registry graph references unpublished internals), and this
 * plugin only ever calls two of its members.
 */
export interface InputActions {
  /** Replace the whole draft. */
  setDraft(text: string): void
  /** Enter submission (adjudication, claim transaction and default sink inside). */
  submit(): void
}

/** Report this session's run state — something the host cannot observe itself. */
export async function observeSession(input: { sessionId: string; working: boolean }): Promise<void> {
  await request<{ ok: boolean }>('observe', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
}

/**
 * Type "continue" into the session the last restart interrupted.
 *
 * Only the page can do this: it knows whether the user left the switch on, and
 * it is the only half that can write into the composer. It happens at most
 * once per session per host boot — a page refresh must not send a second
 * continue, while the next real restart must — which is why the guard is a
 * per-boot stamp rather than a plain "already done" flag.
 * @param sessionId - the session being resumed.
 * @param inputActions - that session's public input face.
 * @param storage - where the per-boot stamp lives (injectable for tests).
 * @returns whether a continue was actually sent.
 */
export async function continueIfInterrupted(
  sessionId: string,
  inputActions: InputActions,
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = globalThis.localStorage,
  delayMs = 5000,
): Promise<boolean> {
  const status = await fetchStatus()
  if (!status.settings.autoContinue) return false

  // Only act on a session this boot actually recovered.
  //
  // The host records EVERY live session as a recoverable turn — it cannot tell
  // "mid-turn" from "merely open" — so without this guard the composer would be
  // hijacked on every page load, overwriting whatever the user was typing and
  // submitting it. `resumedFromSnapshot` is the host's answer to "was there
  // real interrupted work at boot", and it is the only sound trigger.
  if (status.resumedFromSnapshot !== true) return false
  if (!status.pending.items.some(item => item.key === `turn:${sessionId}`)) return false

  const stampKey = `dsh-one-click-restart:continued:${sessionId}`
  const stamp = String(status.hostStartedAt)
  try {
    if (storage?.getItem(stampKey) === stamp) return false
  } catch {
    // Storage refused: continue once rather than never.
  }

  // Wait before typing. Even in the genuine case the page may still be
  // settling, and the composer may be focused with a draft the user started.
  await new Promise(resolve => setTimeout(resolve, delayMs))

  // Mark BEFORE sending: submitting can navigate or reload in ways that lose
  // the chance to write afterwards, and a missed continue is better than a
  // repeated one.
  try {
    storage?.setItem(stampKey, stamp)
  } catch {
    // Best effort.
  }

  inputActions.setDraft('继续')
  inputActions.submit()
  return true
}
