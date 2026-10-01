/**
 * Every path this plugin owns.
 *
 * All state lives under one directory so uninstalling is a single delete, and
 * so the watchdog (a separate process with no knowledge of dsh) can be handed
 * plain absolute paths in its config file.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'

/** The dsh home directory, honouring `DSH_HOME` exactly like the host does. */
export function dshHome(): string {
  const fromEnv = process.env.DSH_HOME
  if (typeof fromEnv === 'string' && fromEnv.trim() !== '') return fromEnv
  return join(homedir(), '.dsh')
}

/** Directory holding all of this plugin's state. */
export function dataDir(): string {
  return join(dshHome(), 'one-click-restart')
}

/** User-facing plugin settings (hotkey, recovery scope, breaker). */
export function settingsPath(): string {
  return join(dataDir(), 'settings.json')
}

/** The continuously-updated "what was running" snapshot. */
export function snapshotPath(): string {
  return join(dataDir(), 'pending.json')
}

/** Append-only-ish restart history (trimmed to `logRetention`). */
export function historyPath(): string {
  return join(dataDir(), 'history.json')
}

/** Config handed to the watchdog process at spawn time. */
export function watchdogConfigPath(): string {
  return join(dataDir(), 'watchdog.json')
}

/** State the watchdog writes back (pid, hotkey registration result). */
export function watchdogStatePath(): string {
  return join(dataDir(), 'watchdog-state.json')
}

/** A restart request dropped by the header button; the watchdog consumes it. */
export function requestPath(): string {
  return join(dataDir(), 'restart-request.json')
}

/** Sentinel whose appearance asks a running watchdog to exit. */
export function stopPath(): string {
  return join(dataDir(), 'watchdog-stop')
}

/** Watchdog log file. */
export function watchdogLogPath(): string {
  return join(dataDir(), 'watchdog.log')
}

/** Absolute path of the watchdog script shipped inside this package. */
export function watchdogScriptPath(packageRoot: string): string {
  return join(packageRoot, 'watchdog', 'watchdog.ps1')
}

/**
 * Absolute path of the short-lived launcher that starts the watchdog.
 *
 * The watchdog cannot be spawned directly. With `detached: true` Node sets
 * DETACHED_PROCESS and PowerShell comes up with no console at all: it exits 0
 * immediately and writes nothing, which is indistinguishable from a failed
 * spawn. Without the flag the child shares the host's console and can be taken
 * down with it — including by the very kill the watchdog performs, which would
 * leave the application down for good.
 *
 * The launcher hands the watchdog to Start-Process, which produces a process
 * of its own, and then exits.
 */
export function watchdogLauncherPath(packageRoot: string): string {
  return join(packageRoot, 'watchdog', 'watchdog-launch.ps1')
}
