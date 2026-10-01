/**
 * Start, supervise and retire the watchdog process.
 *
 * The watchdog is deliberately launched *outside* the application's process
 * tree: it has to outlive the hang it fixes, and it must not be caught by the
 * kill it performs. That has two consequences this module is built around:
 *
 *  - it is spawned detached with its own stdio, so the host can exit without
 *    taking it down;
 *  - the host never assumes a spawn succeeded. The watchdog reports itself
 *    through its state file, and the settings page reads that file rather than
 *    trusting this module's optimism.
 *
 * A third consequence is less obvious and cost a debugging round: swallowing
 * the child's stdio makes "PowerShell refused to run the script" and "the
 * script ran and exited immediately" look identical from here. The child's
 * output is therefore captured to a file that survives the failure.
 */
import { spawn } from 'node:child_process'
import type { StdioOptions } from 'node:child_process'
import { appendFileSync, existsSync, openSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  dataDir,
  requestPath,
  stopPath,
  watchdogConfigPath,
  watchdogLauncherPath,
  watchdogLogPath,
  watchdogScriptPath,
  watchdogStatePath,
} from './paths.ts'
import type { PluginSettings } from './settings.ts'
import { readJson, removeFile, writeJsonAtomic } from './store.ts'

/** State the watchdog writes back for the settings page to read. */
export interface WatchdogState {
  pid?: number
  startedAt?: string
  updatedAt?: string
  appName?: string
  dsExePath?: string
  hotkeyRegistered?: boolean
  hotkeyError?: string | null
  hotkey?: string
  /**
   * Combinations the watchdog probed and found free, offered when the wanted
   * one is already owned by another application. Purely advisory: the watchdog
   * never claims one on its own, because a silent switch would leave the user
   * pressing a key that does nothing.
   */
  hotkeyAlternatives?: string[]
  lastRestartAt?: string | null
  restartCount?: number
  phase?: string
  reason?: string | null
  error?: string | null
}

/** What a start attempt produced. */
export interface WatchdogStartResult {
  started: boolean
  /** Why it did not start, when it did not. */
  reason?: 'disabled' | 'already-running' | 'script-missing' | 'did-not-report'
}

const here = dirname(fileURLToPath(import.meta.url))
/** Package root: the bundle sits in `<root>/lib/`, the script in `<root>/watchdog/`. */
export const packageRoot = dirname(here)

/**
 * Resolve Windows PowerShell, which ships with every supported Windows.
 *
 * Absolute first: the host process's `PATH` is not guaranteed to include the
 * system directory, and a spawn that fails with ENOENT is indistinguishable
 * from a watchdog that started and immediately died. `pwsh` (PowerShell 7) is
 * deliberately not preferred — it is not guaranteed to be installed, and this
 * plugin must not require the user to install anything.
 */
function resolveShell(): string {
  const root = process.env.SystemRoot ?? process.env.windir
  if (typeof root === 'string' && root !== '') {
    const absolute = join(root, 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    if (existsSync(absolute)) return absolute
  }
  return 'powershell.exe'
}

/** Whether a process id is currently alive. */
function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

/** Best-effort append to the spawn diagnostic file. */
function noteSpawn(message: string): void {
  try {
    appendFileSync(join(dataDir(), 'watchdog-spawn.log'), `[${new Date().toISOString()}] ${message}\n`, 'utf8')
  } catch {
    // Diagnostics must never be the reason a restart cannot happen.
  }
}

/** Read what the watchdog last reported about itself. */
export async function readWatchdogState(): Promise<WatchdogState | undefined> {
  return await readJson<WatchdogState>(watchdogStatePath())
}

/** The hotkey label both halves agree on, e.g. `Ctrl+Alt+R`. */
export function hotkeyLabel(settings: PluginSettings): string {
  const names = settings.hotkey.modifiers.map(modifier => (modifier === 'Control' ? 'Ctrl' : modifier))
  return [...names, settings.hotkey.key.toUpperCase()].join('+')
}

/** Whether a live watchdog is supervising the application right now. */
export async function isWatchdogRunning(): Promise<boolean> {
  const state = await readWatchdogState()
  if (state === undefined || typeof state.pid !== 'number') return false
  if (state.phase === 'stopped') return false
  return isAlive(state.pid)
}

/** Ask a running watchdog to exit, without waiting for it to do so. */
export async function stopWatchdog(): Promise<void> {
  await writeJsonAtomic(stopPath(), { at: Date.now() })
}

/**
 * Make sure exactly one watchdog is running with the current settings.
 *
 * An already-running watchdog is reused when it already holds the wanted
 * hotkey; otherwise it is retired first, because a stale registration would
 * keep the old combination alive while the new one silently failed.
 * @param settings - current plugin settings.
 * @returns what happened.
 */
export async function ensureWatchdog(settings: PluginSettings): Promise<WatchdogStartResult> {
  if (!settings.enabled) {
    if (await isWatchdogRunning()) await stopWatchdog()
    return { started: false, reason: 'disabled' }
  }

  const wanted = hotkeyLabel(settings)
  const existing = await readWatchdogState()
  if (await isWatchdogRunning()) {
    if (existing?.hotkey === wanted) return { started: false, reason: 'already-running' }
    await stopWatchdog()
    // Give it a moment to release the registration before re-arming.
    await new Promise(resolve => setTimeout(resolve, 700))
  }

  return await startWatchdog(settings)
}

/**
 * Spawn the watchdog process.
 * @param settings - current plugin settings.
 * @returns whether it came up and reported itself.
 */
export async function startWatchdog(settings: PluginSettings): Promise<WatchdogStartResult> {
  const script = watchdogScriptPath(packageRoot)
  if (!existsSync(script)) {
    noteSpawn(`script missing at ${script}`)
    return { started: false, reason: 'script-missing' }
  }

  const configPath = watchdogConfigPath()
  await writeJsonAtomic(configPath, {
    dsExePath: process.execPath,
    hotkey: { modifiers: settings.hotkey.modifiers, key: settings.hotkey.key },
    statePath: watchdogStatePath(),
    requestPath: requestPath(),
    stopPath: stopPath(),
    logPath: watchdogLogPath(),
    gracefulTimeoutMs: settings.gracefulTimeoutMs,
    onlyWhenForeground: settings.onlyWhenForeground,
  })
  await removeFile(stopPath())

  const shell = resolveShell()
  const launcher = watchdogLauncherPath(packageRoot)
  if (!existsSync(launcher)) {
    noteSpawn(`launcher missing at ${launcher}`)
    return { started: false, reason: 'script-missing' }
  }

  // Capture the launcher's own output: without it, a policy refusal and an
  // immediate exit are the same observation from this side.
  let stdio: StdioOptions = 'ignore'
  try {
    const fd = openSync(join(dataDir(), 'watchdog-spawn.log'), 'a')
    stdio = ['ignore', fd, fd]
  } catch {
    stdio = 'ignore'
  }

  noteSpawn(`launching ${shell} -File "${launcher}" for "${script}"`)

  let child: ReturnType<typeof spawn>
  try {
    child = spawn(shell, [
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', launcher,
      '-WatchdogPath', script,
      '-ConfigPath', configPath,
      '-StopPath', stopPath(),
    ], {
      // Deliberately NOT detached. On Windows that flag means
      // DETACHED_PROCESS, and a PowerShell without a console exits 0
      // immediately having written nothing — verified against six spawn
      // variants, where every detached one failed and every other one worked.
      // What makes the watchdog independent is the launcher's Start-Process.
      windowsHide: true,
      stdio,
    })
  } catch (error) {
    noteSpawn(`spawn threw: ${error instanceof Error ? error.message : String(error)}`)
    return { started: false, reason: 'did-not-report' }
  }

  child.on('error', (error: Error) => {
    noteSpawn(`spawn error event: ${error.message} (code ${(error as NodeJS.ErrnoException).code ?? 'n/a'})`)
  })

  // The launcher is short-lived by design: its exit is the moment the watchdog
  // has been handed to Windows. Waiting for it removes the race where the host
  // looks for the state file before the watchdog was ever started.
  await new Promise<void>((resolve) => {
    const done = (): void => { resolve() }
    child.once('exit', done)
    child.once('error', done)
    setTimeout(done, 5000)
  })

  // The watchdog writes its pid once it is up. Believe the file, not the spawn.
  await new Promise(resolve => setTimeout(resolve, 1500))
  const state = await readWatchdogState()
  if (state !== undefined && typeof state.pid === 'number' && isAlive(state.pid)) {
    noteSpawn(`watchdog reported pid ${state.pid}`)
    return { started: true }
  }
  noteSpawn(`watchdog did not report; child pid was ${child.pid ?? 'n/a'}`)
  return { started: false, reason: 'did-not-report' }
}

/**
 * Drop a restart request for the watchdog to consume.
 *
 * The header button takes this path, which is exactly why a frozen host makes
 * the button useless while leaving the hotkey working: this call needs the
 * host's event loop to be alive.
 * @param reason - recorded in the watchdog log and the restart history.
 */
export async function requestRestart(reason: string): Promise<void> {
  await writeJsonAtomic(requestPath(), { reason, at: Date.now() })
}
