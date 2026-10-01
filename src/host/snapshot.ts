/**
 * The continuously-updated "what was running" snapshot.
 *
 * This is the piece that makes recovery survive a *frozen* host. If the
 * snapshot were written at restart time, a host whose event loop is blocked
 * could never produce one — so instead the document is refreshed on a cadence
 * while everything is healthy, and the last good copy is what the watchdog
 * leaves behind for the next boot to replay.
 *
 * It is also written atomically, because the kill it exists to survive can
 * arrive mid-write.
 */
import type { PluginSettings } from './settings.ts'
import { readJson, writeJsonAtomic } from './store.ts'
import { snapshotPath } from './paths.ts'

/** The families of work this plugin knows how to resume. */
export type RecoveryKind = 'task-board' | 'goal' | 'job' | 'turn'

/** One resumable unit of work. */
export interface RecoveryItem {
  kind: RecoveryKind
  /** Stable identity: used for de-duplication and breaker accounting. */
  key: string
  /** Short human-readable label, shown in the settings page and the receipt. */
  label: string
  /** Kind-specific payload the recoverer needs to act. */
  data: Record<string, unknown>
  /** Consecutive failed recovery attempts (the breaker's input). */
  attempts: number
  lastAttemptAt?: number
  lastError?: string
}

/** A freshly probed item, before breaker state is merged in. */
export type RecoverySeed = Omit<RecoveryItem, 'attempts' | 'lastAttemptAt' | 'lastError'>

/** The persisted document. */
export interface PendingSnapshot {
  version: 1
  capturedAt: number
  /** Epoch ms of the request that led to the last restart, when known. */
  restartRequestedAt?: number
  items: RecoveryItem[]
}

const EMPTY: PendingSnapshot = { version: 1, capturedAt: 0, items: [] }

/** Read the snapshot, tolerating a missing or damaged document. */
export async function loadSnapshot(): Promise<PendingSnapshot> {
  const raw = await readJson<unknown>(snapshotPath())
  if (typeof raw !== 'object' || raw === null) return { ...EMPTY }
  const record = raw as Record<string, unknown>
  const items = Array.isArray(record.items) ? record.items.filter(isRecoveryItem) : []
  return {
    version: 1,
    capturedAt: typeof record.capturedAt === 'number' ? record.capturedAt : 0,
    ...(typeof record.restartRequestedAt === 'number' ? { restartRequestedAt: record.restartRequestedAt } : {}),
    items,
  }
}

/** Persist the snapshot atomically. */
export async function saveSnapshot(snapshot: PendingSnapshot): Promise<void> {
  await writeJsonAtomic(snapshotPath(), snapshot)
}

/** Forget everything: used once a recovery pass has settled. */
export async function clearSnapshot(): Promise<void> {
  await saveSnapshot({ version: 1, capturedAt: Date.now(), items: [] })
}

function isRecoveryItem(value: unknown): value is RecoveryItem {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (record.kind === 'task-board' || record.kind === 'goal' || record.kind === 'job' || record.kind === 'turn')
    && typeof record.key === 'string'
    && typeof record.label === 'string'
    && typeof record.data === 'object' && record.data !== null
    && typeof record.attempts === 'number'
}

/**
 * Merge freshly probed work with the breaker state already carried for it.
 *
 * A previously-failed item keeps its counter, so three restarts in a row
 * cannot resurrect a task that fails immediately every time. Work that has
 * since finished simply disappears: it is not in `seeds` any more.
 * @param seeds - what is running right now.
 * @param previous - the items the stored snapshot already knew about.
 * @returns the items to persist.
 */
export function mergeSeeds(seeds: readonly RecoverySeed[], previous: readonly RecoveryItem[]): RecoveryItem[] {
  const prior = new Map(previous.map(item => [item.key, item]))
  return seeds.map((seed) => {
    const before = prior.get(seed.key)
    if (before === undefined) return { ...seed, attempts: 0 }
    return {
      ...seed,
      attempts: before.attempts,
      ...(before.lastAttemptAt === undefined ? {} : { lastAttemptAt: before.lastAttemptAt }),
      ...(before.lastError === undefined ? {} : { lastError: before.lastError }),
    }
  })
}

/**
 * Add freshly probed work to the stored items without ever dropping one.
 *
 * Used until the boot recovery pass has settled. Outside that window plain
 * replacement is correct — a session that has not been opened yet legitimately
 * reports nothing. *Inside* the window that same emptiness would erase exactly
 * the items the recovery pass is waiting to replay, because recovery runs on a
 * timer and the user may not have opened the session yet.
 * @param seeds - what is running right now.
 * @param previous - the stored items.
 * @returns the union, with breaker state preserved.
 */
export function unionSeeds(seeds: readonly RecoverySeed[], previous: readonly RecoveryItem[]): RecoveryItem[] {
  const byKey = new Map<string, RecoveryItem>()
  for (const item of previous) byKey.set(item.key, item)
  for (const seed of seeds) {
    const before = byKey.get(seed.key)
    byKey.set(seed.key, before === undefined
      ? { ...seed, attempts: 0 }
      : {
          ...seed,
          attempts: before.attempts,
          ...(before.lastAttemptAt === undefined ? {} : { lastAttemptAt: before.lastAttemptAt }),
          ...(before.lastError === undefined ? {} : { lastError: before.lastError }),
        })
  }
  return [...byKey.values()]
}

/**
 * Drop items whose family the user has switched off.
 * @param items - every known item.
 * @param settings - current settings.
 * @returns only the items whose kind is still in scope.
 */
export function filterByScope(items: readonly RecoveryItem[], settings: PluginSettings): RecoveryItem[] {
  return items.filter((item) => {
    switch (item.kind) {
      case 'task-board': return settings.recovery.taskBoard
      case 'goal': return settings.recovery.goals
      case 'job': return settings.recovery.jobs
      case 'turn': return settings.recovery.sessionTurns
      default: return false
    }
  })
}
