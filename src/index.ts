/**
 * dsh-one-click-restart — host half.
 *
 * Owns three things and delegates the fourth:
 *
 *  - a continuously-refreshed snapshot of what is running, so a restart that
 *    arrives without warning still has something to resume;
 *  - the watchdog process — started, supervised, and retired from here;
 *  - replaying that snapshot on the next boot, under a breaker;
 *  - the header button's requests, on this plugin's own route family.
 *
 * The split matters. This half runs *inside* the thing that hangs, so nothing
 * that must survive a hang is implemented here: the hotkey and the restart
 * itself belong to the watchdog, and the snapshot is written while things are
 * healthy rather than at the moment they stop being healthy.
 */
import { historyPath } from './host/paths.ts'
import { probeAll, selfBaseUrl } from './host/probe.ts'
import { runRecovery, type RecoveryReport } from './host/recover.ts'
import { makeRoutes, type RecoverySummary, type RouteDeps, type StatusPayload } from './host/routes.ts'
import { DEFAULT_SETTINGS, loadSettings, patchSettings, saveSettings, type PluginSettings } from './host/settings.ts'
import { filterByScope, loadSnapshot, mergeSeeds, saveSnapshot, unionSeeds } from './host/snapshot.ts'
import { readJson, writeJsonAtomic } from './host/store.ts'
import { ensureWatchdog, isWatchdogRunning, readWatchdogState, requestRestart, startWatchdog, stopWatchdog } from './host/watchdog.ts'
import type { HostContext } from './types.ts'

/** Cordis plugin name. */
export const name = 'dsh-one-click-restart'

/** Services required by this plugin. */
export const inject = ['webServer']

/** How often the running-work snapshot is refreshed. */
const PROBE_INTERVAL_MS = 5000

/**
 * How long after boot recovery runs.
 *
 * The task board performs its own boot recovery — settling the runs the
 * restart killed — and racing it would queue a run for a card that is still
 * being reconciled.
 */
const RECOVERY_DELAY_MS = 8000

/** Hard ceiling on retained recovery reports, whatever the user configured. */
const HISTORY_LIMIT_HARD = 200

/** Flatten a recovery report for the wire. */
function summarize(report: RecoveryReport): RecoverySummary {
  return {
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    recovered: report.recovered,
    failed: report.failed,
    skipped: report.skipped,
    givenUp: report.givenUp,
    outcomes: report.outcomes.map(outcome => ({
      kind: outcome.kind,
      key: outcome.key,
      label: outcome.label,
      status: outcome.status,
      ...(outcome.error === undefined ? {} : { error: outcome.error }),
    })),
  }
}

/**
 * Mount the plugin.
 * @param ctx - host plugin context carrying the web server.
 */
export function apply(ctx: HostContext): void {
  /** Epoch ms of this boot; the page uses it to tell old records from new ones. */
  const hostStartedAt = Date.now()
  let settings: PluginSettings = { ...DEFAULT_SETTINGS }
  let lastRecovery: RecoveryReport | undefined
  let recovering = false
  /**
   * Set once the boot recovery pass has settled. Until then the snapshot is
   * only ever added to, never replaced: a session the user has not opened yet
   * has no live agent and would otherwise report nothing, erasing the very
   * items the recovery pass is waiting to replay.
   */
  let recoverySettled = false
  /** Set by the boot pass: did this start actually have work to recover? */
  let resumedFromSnapshot = false

  /** Resolves once persisted settings are in memory. */
  const ready = (async (): Promise<void> => {
    settings = await loadSettings()
  })()

  // ----------------------------------------------------------- status ----
  const buildStatus = async (): Promise<StatusPayload> => {
    await ready
    const state = await readWatchdogState()
    const running = await isWatchdogRunning()
    const snapshot = await loadSnapshot()
    const base = selfBaseUrl()
    return {
      ok: true,
      settings,
      watchdog: {
        running,
        ...(state?.pid === undefined ? {} : { pid: state.pid }),
        ...(state?.hotkey === undefined ? {} : { hotkey: state.hotkey }),
        ...(state?.hotkeyRegistered === undefined ? {} : { hotkeyRegistered: state.hotkeyRegistered }),
        hotkeyError: state?.hotkeyError ?? null,
        ...(state?.hotkeyAlternatives === undefined ? {} : { hotkeyAlternatives: state.hotkeyAlternatives }),
        lastRestartAt: state?.lastRestartAt ?? null,
        ...(state?.restartCount === undefined ? {} : { restartCount: state.restartCount }),
        ...(state?.phase === undefined ? {} : { phase: state.phase }),
      },
      pending: {
        capturedAt: snapshot.capturedAt,
        items: snapshot.items.map(item => ({
          kind: item.kind,
          key: item.key,
          label: item.label,
          attempts: item.attempts,
          ...(item.lastError === undefined ? {} : { lastError: item.lastError }),
        })),
      },
      ...(lastRecovery === undefined ? {} : { lastRecovery: summarize(lastRecovery) }),
      ...(base === undefined ? {} : { baseUrl: base }),
      hostStartedAt,
      resumedFromSnapshot,
    }
  }

  // --------------------------------------------------------- snapshot ----
  const tick = async (): Promise<void> => {
    await ready
    if (recovering) return
    try {
      const seeds = await probeAll(ctx)
      const previous = await loadSnapshot()
      // Replacement before the pass has settled would delete work that is
      // merely invisible right now (its session has no live agent yet), so the
      // snapshot is only added to during that window.
      const combined = recoverySettled
        ? mergeSeeds(seeds, previous.items)
        : unionSeeds(seeds, previous.items)
      // Client-reported session activity cannot be probed by the host, so it
      // survives a replacement pass untouched instead of being deleted on the
      // very next tick.
      const merged = [...combined]
      for (const item of previous.items) {
        if (item.kind === 'turn' && !merged.some(entry => entry.key === item.key)) merged.push(item)
      }
      const items = filterByScope(merged, settings)
      await saveSnapshot({
        version: 1,
        capturedAt: Date.now(),
        ...(previous.restartRequestedAt === undefined ? {} : { restartRequestedAt: previous.restartRequestedAt }),
        items,
      })
    } catch {
      // A probe that throws must not stop the cadence: an empty snapshot is
      // recoverable, a dead cadence is not.
    }
  }

  ctx.effect(() => {
    void tick()
    const timer = setInterval(() => { void tick() }, PROBE_INTERVAL_MS)
    return () => { clearInterval(timer) }
  }, 'one-click-restart: snapshot cadence')

  // --------------------------------------------------------- recovery ----
  const appendHistory = async (report: RecoveryReport): Promise<void> => {
    const existing = await readJson<RecoveryReport[]>(historyPath())
    const list = Array.isArray(existing) ? existing : []
    const limit = Math.min(HISTORY_LIMIT_HARD, Math.max(1, settings.logRetention))
    await writeJsonAtomic(historyPath(), [report, ...list].slice(0, limit))
  }

  const recoverOnBoot = async (): Promise<void> => {
    await ready
    const snapshot = await loadSnapshot()
    // Whether this boot actually had interrupted work. The page needs it to
    // decide whether an automatic continue is warranted: a queued item alone
    // proves nothing, because the host queues every live session — it cannot
    // tell "mid-turn" from "merely open".
    resumedFromSnapshot = snapshot.items.length > 0
    if (snapshot.items.length > 0) {
      recovering = true
      try {
        const report = await runRecovery(ctx, filterByScope(snapshot.items, settings), settings)
        lastRecovery = report
        // Items the breaker has not yet given up on stay queued for a later boot.
        await saveSnapshot({ version: 1, capturedAt: Date.now(), items: report.remaining })
        await appendHistory(report)
      } catch {
        // Leave the snapshot untouched: a later boot may do better than this one.
      } finally {
        recovering = false
      }
    }
    // From here on the snapshot tracks reality again, replacement included.
    recoverySettled = true
  }

  ctx.effect(() => {
    const timer = setTimeout(() => { void recoverOnBoot() }, RECOVERY_DELAY_MS)
    return () => { clearTimeout(timer) }
  }, 'one-click-restart: boot recovery')

  // ---------------------------------------------------------- watchdog ----
  const bootstrapWatchdog = async (): Promise<void> => {
    await ready
    try {
      await ensureWatchdog(settings)
    } catch {
      // Nothing to do here: the settings page reads the watchdog's own state
      // file, so a failed start is visible rather than silently assumed away.
    }
  }

  void bootstrapWatchdog()

  // ------------------------------------------------------------ routes ----
  const deps: RouteDeps = {
    status: buildStatus,
    updateSettings: async (patch) => {
      await ready
      settings = patchSettings(settings, patch)
      await saveSettings(settings)
      await ensureWatchdog(settings)
      return await buildStatus()
    },
    restart: async (reason) => {
      await ready
      try {
        if (!(await isWatchdogRunning())) {
          const started = await startWatchdog(settings)
          if (!started.started) return { ok: false, error: started.reason ?? 'watchdog-unavailable' }
        }
        await requestRestart(reason)
        return { ok: true }
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
    },
    watchdog: async (action) => {
      await ready
      if (action === 'stop') await stopWatchdog()
      else await startWatchdog(settings)
      return await buildStatus()
    },
    history: async () => {
      const existing = await readJson<RecoveryReport[]>(historyPath())
      return Array.isArray(existing) ? existing : []
    },
    observe: async (payload) => {
      await ready
      const input = typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : {}
      const sessionId = typeof input.sessionId === 'string' ? input.sessionId : ''
      if (sessionId === '') return { ok: false }
      const working = input.working === true
      const key = `turn:${sessionId}`
      const snapshot = await loadSnapshot()
      const others = snapshot.items.filter(item => item.key !== key)
      // `working: false` removes the record rather than storing a falsy one:
      // the page is the only source for this, and "not working now" has to be
      // able to clear what an earlier page load reported.
      const items = working
        ? [...others, {
            kind: 'turn' as const,
            key,
            label: typeof input.title === 'string' && input.title !== '' ? input.title : sessionId,
            data: { sessionId, recordedAt: Date.now() },
            attempts: 0,
          }]
        : others
      await saveSnapshot({
        version: 1,
        capturedAt: Date.now(),
        ...(snapshot.restartRequestedAt === undefined ? {} : { restartRequestedAt: snapshot.restartRequestedAt }),
        items,
      })
      return { ok: true }
    },
  }

  ctx.effect(() => {
    const disposers = makeRoutes(deps).map(route => ctx.webServer.register(route))
    return () => { for (const dispose of disposers) dispose() }
  }, 'one-click-restart: routes')
}
