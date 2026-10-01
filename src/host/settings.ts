/**
 * User-facing plugin settings.
 *
 * These live in this plugin's own JSON document rather than in the dsh
 * settings domain: the domain requires the plugin's namespace to be exposed by
 * the host configuration page, which not every dsh build does, and a watchdog
 * that cannot be configured is worse than one with its own file.
 */
import { readJson, writeJsonAtomic } from './store.ts'
import { settingsPath } from './paths.ts'

/** One key combination, in the vocabulary the watchdog understands. */
export interface Hotkey {
  /** Any of `Control`, `Alt`, `Shift`, `Win`. */
  modifiers: string[]
  /** A single letter/digit, `F1`..`F24`, or a named key such as `Space`. */
  key: string
}

/** Which families of interrupted work are resumed after a restart. */
export interface RecoveryScope {
  /** Task-board cards that were running or queued. */
  taskBoard: boolean
  /** Sessions carrying a live goal. */
  goals: boolean
  /** Background jobs owned by a session. */
  jobs: boolean
  /** The session turn that was in flight. */
  sessionTurns: boolean
}

/** The complete settings document. */
export interface PluginSettings {
  /** Master switch: when false no watchdog is spawned at all. */
  enabled: boolean
  hotkey: Hotkey
  /** How long a polite close is waited for before force-killing. */
  gracefulTimeoutMs: number
  recovery: RecoveryScope
  /** Whether an interrupted session turn gets an automatic "continue". */
  autoContinue: boolean
  /** Consecutive failures after which one item is given up on. */
  maxAttempts: number
  /** Only react to the hotkey while the app is the foreground application. */
  onlyWhenForeground: boolean
  /** How many restart history entries to keep. */
  logRetention: number
}

/** The values used when nothing has been stored yet. */
export const DEFAULT_SETTINGS: PluginSettings = {
  enabled: true,
  hotkey: { modifiers: ['Control', 'Alt'], key: 'R' },
  gracefulTimeoutMs: 3000,
  recovery: { taskBoard: true, goals: true, jobs: true, sessionTurns: true },
  autoContinue: true,
  maxAttempts: 3,
  onlyWhenForeground: true,
  logRetention: 20,
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return Math.min(max, Math.max(min, Math.round(value)))
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

/**
 * Coerce a stored (possibly partial, possibly hand-edited) document into a
 * complete, in-range settings object.
 * @param raw - whatever was on disk.
 * @returns settings that are always safe to act on.
 */
export function normalizeSettings(raw: unknown): PluginSettings {
  const input = asRecord(raw)
  const hotkey = asRecord(input.hotkey)
  const recovery = asRecord(input.recovery)

  const modifiers = Array.isArray(hotkey.modifiers)
    ? hotkey.modifiers.filter((m): m is string => typeof m === 'string')
    : []
  const key = typeof hotkey.key === 'string' && hotkey.key.trim() !== ''
    ? hotkey.key.trim()
    : DEFAULT_SETTINGS.hotkey.key

  return {
    enabled: bool(input.enabled, DEFAULT_SETTINGS.enabled),
    hotkey: {
      modifiers: modifiers.length > 0 ? modifiers : [...DEFAULT_SETTINGS.hotkey.modifiers],
      key,
    },
    gracefulTimeoutMs: clampInt(input.gracefulTimeoutMs, 500, 30_000, DEFAULT_SETTINGS.gracefulTimeoutMs),
    recovery: {
      taskBoard: bool(recovery.taskBoard, DEFAULT_SETTINGS.recovery.taskBoard),
      goals: bool(recovery.goals, DEFAULT_SETTINGS.recovery.goals),
      jobs: bool(recovery.jobs, DEFAULT_SETTINGS.recovery.jobs),
      sessionTurns: bool(recovery.sessionTurns, DEFAULT_SETTINGS.recovery.sessionTurns),
    },
    autoContinue: bool(input.autoContinue, DEFAULT_SETTINGS.autoContinue),
    maxAttempts: clampInt(input.maxAttempts, 1, 10, DEFAULT_SETTINGS.maxAttempts),
    onlyWhenForeground: bool(input.onlyWhenForeground, DEFAULT_SETTINGS.onlyWhenForeground),
    logRetention: clampInt(input.logRetention, 1, 200, DEFAULT_SETTINGS.logRetention),
  }
}

/** Read the settings document, falling back to the defaults. */
export async function loadSettings(): Promise<PluginSettings> {
  return normalizeSettings(await readJson<unknown>(settingsPath()))
}

/** Persist a settings document atomically. */
export async function saveSettings(settings: PluginSettings): Promise<void> {
  await writeJsonAtomic(settingsPath(), settings)
}

/**
 * Apply a partial patch over current settings.
 *
 * The two nested objects are merged member-wise: the settings page sends only
 * what the user toggled, and a shallow spread would wipe every sibling key
 * back to its default.
 * @param current - settings in force.
 * @param patch - whatever the page sent.
 * @returns a complete, in-range settings object.
 */
export function patchSettings(current: PluginSettings, patch: unknown): PluginSettings {
  const input = asRecord(patch)
  const merged = asRecord(current)
  for (const [key, value] of Object.entries(input)) {
    if ((key === 'hotkey' || key === 'recovery') && typeof value === 'object' && value !== null) {
      merged[key] = { ...asRecord(merged[key]), ...asRecord(value) }
    } else {
      merged[key] = value
    }
  }
  return normalizeSettings(merged)
}
