/**
 * Small JSON persistence helpers.
 *
 * Everything this plugin persists uses {@link writeJsonAtomic}: the watchdog can
 * hard-kill the host at any moment (that is the whole point of the plugin), so
 * a torn write must be impossible rather than merely unlikely.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

/** Create a directory and any missing parents. */
export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true })
}

/**
 * Read and parse a JSON document; `undefined` when missing or unreadable.
 *
 * A leading BOM is stripped before parsing. Windows PowerShell's
 * `Set-Content -Encoding UTF8` writes one, and the watchdog is a PowerShell
 * script — necessarily so, because it must run without the user installing
 * anything — which reports itself through such a document. `JSON.parse`
 * rejects the BOM outright, so without this the state file is written
 * correctly and still reads as if it were missing entirely.
 */
export async function readJson<T>(path: string): Promise<T | undefined> {
  try {
    const text = await readFile(path, 'utf8')
    const body = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text
    return JSON.parse(body) as T
  } catch {
    return undefined
  }
}

/**
 * Write a JSON document atomically.
 *
 * The payload lands in a sibling temporary file first and is renamed over the
 * target afterwards, so an interrupted write leaves either the previous
 * document or the new one — never a half-written mixture.
 */
export async function writeJsonAtomic(path: string, value: unknown): Promise<void> {
  await ensureDir(dirname(path))
  const tmp = `${path}.tmp`
  await writeFile(tmp, JSON.stringify(value, null, 2), 'utf8')
  await rename(tmp, path)
}

/** Remove a file, tolerating its absence. */
export async function removeFile(path: string): Promise<void> {
  const { rm } = await import('node:fs/promises')
  try {
    await rm(path, { force: true })
  } catch {
    // Already gone.
  }
}
