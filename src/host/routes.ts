/**
 * This plugin's own HTTP route family.
 *
 * The header button reaches the host through these routes. They answer with
 * the watchdog's *reported* state rather than this process's belief about it,
 * because a spawn that silently failed is exactly the thing the settings page
 * has to be able to show.
 *
 * Every route sits behind the loopback fence: restarting the application must
 * never be reachable from a LAN or tunnel origin.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { WebRoute } from '../types.ts'
import { isLoopbackRequest } from './loopback.ts'
import type { PluginSettings } from './settings.ts'

/** Route paths, all under `/api`. */
export const PATHS = {
  status: '/api/one-click-restart/status',
  settings: '/api/one-click-restart/settings',
  restart: '/api/one-click-restart/restart',
  watchdog: '/api/one-click-restart/watchdog',
  history: '/api/one-click-restart/history',
  /** The page reports what only the page can know: which session is working. */
  observe: '/api/one-click-restart/observe',
} as const

/** One recovery pass, flattened for the wire. */
export interface RecoverySummary {
  startedAt: number
  finishedAt: number
  recovered: number
  failed: number
  skipped: number
  givenUp: number
  outcomes: Array<{ kind: string; key: string; label: string; status: string; error?: string }>
}

/** Everything the settings page needs in one read. */
export interface StatusPayload {
  ok: true
  settings: PluginSettings
  watchdog: {
    running: boolean
    pid?: number
    hotkey?: string
    hotkeyRegistered?: boolean
    hotkeyError?: string | null
    /** Combinations the watchdog probed and found free, when the wanted one is taken. */
    hotkeyAlternatives?: string[]
    lastRestartAt?: string | null
    restartCount?: number
    phase?: string
  }
  pending: {
    capturedAt: number
    items: Array<{ kind: string; key: string; label: string; attempts: number; lastError?: string }>
  }
  lastRecovery?: RecoverySummary
  /** The loopback URL the host uses for its own calls, shown for diagnostics. */
  baseUrl?: string
  /**
   * Epoch ms of this host boot.
   *
   * The page compares a queued item's own timestamp against this to tell "left
   * over from the previous run" apart from "written by me just now" — which is
   * what stops an automatic continue from firing on every page load.
   */
  hostStartedAt: number
  /**
   * Whether this boot actually recovered interrupted work.
   *
   * This is the only sound trigger for an automatic continue. The host records
   * every live session as a recoverable turn — it cannot distinguish "mid-turn"
   * from "merely open" — so a queued item alone proves nothing, and acting on
   * one hijacked the composer on every page load, overwriting whatever the user
   * was typing.
   */
  resumedFromSnapshot: boolean
}

/** Route-family dependencies, injected by the plugin entry. */
export interface RouteDeps {
  /** Read the full current status. */
  status(): Promise<StatusPayload>
  /** Persist a settings patch, re-arm the watchdog, and answer with the result. */
  updateSettings(patch: unknown): Promise<StatusPayload>
  /** Trigger a restart through the watchdog. */
  restart(reason: string): Promise<{ ok: boolean; error?: string }>
  /** Explicitly start or stop the watchdog. */
  watchdog(action: 'start' | 'stop'): Promise<StatusPayload>
  /** Recent restart history, newest first. */
  history(): Promise<unknown>
  /** Record what the page observed about its own session. */
  observe(payload: unknown): Promise<{ ok: boolean }>
}

/** Largest request body accepted. */
const BODY_LIMIT = 64 * 1024

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text),
  })
  res.end(text)
}

/** Read a bounded JSON body; `undefined` for an empty one. */
async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buffer = chunk as Buffer
    size += buffer.length
    if (size > BODY_LIMIT) throw new Error('body-too-large')
    chunks.push(buffer)
  }
  if (size === 0) return undefined
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

/**
 * Build the route family.
 * @param deps - status/settings/restart/watchdog seams, injected by the entry.
 * @returns exact routes to register on `ctx.webServer`.
 */
export function makeRoutes(deps: RouteDeps): WebRoute[] {
  const guard = (req: IncomingMessage, res: ServerResponse): boolean => {
    if (isLoopbackRequest(req)) return true
    writeJson(res, 403, { ok: false, error: 'forbidden' })
    return false
  }

  const method = (req: IncomingMessage, res: ServerResponse, allowed: string): boolean => {
    if (req.method === allowed) return true
    writeJson(res, 405, { ok: false, error: 'method-not-allowed' })
    return false
  }

  const status: WebRoute = {
    kind: 'exact',
    path: PATHS.status,
    handler: async (req, res): Promise<void> => {
      if (!method(req, res, 'GET')) return
      if (!guard(req, res)) return
      writeJson(res, 200, await deps.status())
    },
  }

  const settings: WebRoute = {
    kind: 'exact',
    path: PATHS.settings,
    handler: async (req, res): Promise<void> => {
      if (req.method === 'GET') {
        if (!guard(req, res)) return
        writeJson(res, 200, await deps.status())
        return
      }
      if (!method(req, res, 'POST')) return
      if (!guard(req, res)) return
      try {
        writeJson(res, 200, await deps.updateSettings(await readJsonBody(req)))
      } catch (error) {
        writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }

  const restart: WebRoute = {
    kind: 'exact',
    path: PATHS.restart,
    handler: async (req, res): Promise<void> => {
      if (!method(req, res, 'POST')) return
      if (!guard(req, res)) return
      let reason = 'button'
      try {
        const body = await readJsonBody(req)
        if (typeof body === 'object' && body !== null) {
          const candidate = (body as { reason?: unknown }).reason
          if (typeof candidate === 'string' && candidate !== '') reason = candidate.slice(0, 200)
        }
      } catch {
        // An unreadable body still means "restart"; the reason is decoration.
      }
      writeJson(res, 200, await deps.restart(reason))
    },
  }

  const watchdog: WebRoute = {
    kind: 'exact',
    path: PATHS.watchdog,
    handler: async (req, res): Promise<void> => {
      if (!method(req, res, 'POST')) return
      if (!guard(req, res)) return
      try {
        const body = await readJsonBody(req)
        const action = typeof body === 'object' && body !== null
          ? (body as { action?: unknown }).action
          : undefined
        if (action !== 'start' && action !== 'stop') {
          writeJson(res, 400, { ok: false, error: 'invalid-action' })
          return
        }
        writeJson(res, 200, await deps.watchdog(action))
      } catch (error) {
        writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }

  const history: WebRoute = {
    kind: 'exact',
    path: PATHS.history,
    handler: async (req, res): Promise<void> => {
      if (!method(req, res, 'GET')) return
      if (!guard(req, res)) return
      writeJson(res, 200, await deps.history())
    },
  }

  const observe: WebRoute = {
    kind: 'exact',
    path: PATHS.observe,
    handler: async (req, res): Promise<void> => {
      if (!method(req, res, 'POST')) return
      if (!guard(req, res)) return
      try {
        writeJson(res, 200, await deps.observe(await readJsonBody(req)))
      } catch (error) {
        writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) })
      }
    },
  }

  return [status, settings, restart, watchdog, history, observe]
}
