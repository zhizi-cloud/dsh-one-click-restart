/**
 * The plugin's own settings page, mounted inside the Plugins settings section.
 *
 * It reads the watchdog's *reported* state rather than assuming a spawn
 * worked — that is the whole reason the status payload carries a pid, the
 * registration result and the raw error text.
 */
import { useCallback, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { controlWatchdog, fetchStatus, pushSettings, triggerRestart, type StatusPayload } from './api.ts'
import { zh } from './locales.ts'

/** Props the slot owner composes. */
export interface SettingsPanelProps {
  /**
   * The owner-supplied translator, when this page's owner provides one.
   *
   * Optional on purpose: only some slot owners inject `t`, and calling a
   * missing one throws `TypeError: l is not a function` — which is what took
   * the renderer down, and the application with it.
   */
  t?: (key: string, vars?: Record<string, string>) => string
}

/** How long the "saved" note stays up. */
const SAVED_VISIBLE_MS = 2200

/**
 * Resolve a translator that is always callable.
 * @param t - the owner's translator, when it supplied one.
 * @returns a function that never throws, falling back to the built-in table.
 */
function translator(t: SettingsPanelProps['t']): (key: string, vars?: Record<string, string>) => string {
  if (typeof t === 'function') return t
  return (key: string) => zh[key] ?? key
}

/** Render a stored hotkey the way the watchdog labels it. */
function formatHotkey(hotkey: { modifiers: string[]; key: string }): string {
  const names = hotkey.modifiers.map(modifier => (modifier === 'Control' ? 'Ctrl' : modifier))
  return [...names, hotkey.key.toUpperCase()].join(' + ')
}

/**
 * Turn a watchdog label such as `Ctrl+Alt+Shift+R` back into a hotkey, so an
 * offered alternative can be adopted with one click.
 * @param label - the label the watchdog reported.
 * @returns the shape the settings document stores.
 */
function parseHotkeyLabel(label: string): { modifiers: string[]; key: string } {
  const parts = label.split('+').map(part => part.trim()).filter(part => part !== '')
  const key = parts.length > 0 ? parts[parts.length - 1] : 'R'
  const modifiers = parts.slice(0, -1).map(part => (part === 'Ctrl' ? 'Control' : part))
  return { modifiers, key }
}

/**
 * Map a keyboard event to the watchdog's key vocabulary.
 *
 * `event.code` rather than `event.key`: the code names the physical key, so
 * the recorded combination does not change with the keyboard layout or with
 * Shift being held.
 * @param event - the keydown event.
 * @returns the key name, or undefined while only modifiers are down.
 */
function normalizeKey(event: KeyboardEvent): string | undefined {
  const code = event.code
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code
  switch (code) {
    case 'Space': return 'Space'
    case 'Escape': return 'Escape'
    case 'Tab': return 'Tab'
    case 'Enter': return 'Enter'
    case 'Home': return 'Home'
    case 'End': return 'End'
    case 'Insert': return 'Insert'
    case 'Delete': return 'Delete'
    default: return undefined
  }
}

/**
 * Render the settings page.
 * @param props - the slot's locale seat.
 * @returns the page element.
 */
export function SettingsPanel({ t: ownerTranslate }: SettingsPanelProps): ReactElement {
  // Shadow the prop with an always-callable translator, so every `t(...)` below
  // works whether or not the owner supplied one.
  const t = translator(ownerTranslate)
  const [status, setStatus] = useState<StatusPayload | undefined>(undefined)
  const [failure, setFailure] = useState<string | undefined>(undefined)
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [gracefulDraft, setGracefulDraft] = useState('')
  const [attemptsDraft, setAttemptsDraft] = useState('')

  useEffect(() => {
    let alive = true
    void fetchStatus().then(
      (next) => {
        if (!alive) return
        setStatus(next)
        setFailure(undefined)
      },
      (caught: unknown) => {
        if (alive) setFailure(caught instanceof Error ? caught.message : String(caught))
      },
    )
    return () => { alive = false }
  }, [])

  const patch = useCallback(async (change: Record<string, unknown>): Promise<void> => {
    setBusy(true)
    try {
      setStatus(await pushSettings(change))
      setFailure(undefined)
      setSaved(true)
      setTimeout(() => { setSaved(false) }, SAVED_VISIBLE_MS)
    } catch (caught) {
      setFailure(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setBusy(false)
    }
  }, [])

  // Hotkey capture. Runs in the capture phase so the shell's own shortcuts do
  // not swallow the combination the user is trying to record.
  useEffect(() => {
    if (!recording) return
    const onKeyDown = (event: KeyboardEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      if (event.code === 'Escape') {
        setRecording(false)
        return
      }
      const modifiers: string[] = []
      if (event.ctrlKey) modifiers.push('Control')
      if (event.altKey) modifiers.push('Alt')
      if (event.shiftKey) modifiers.push('Shift')
      if (event.metaKey) modifiers.push('Win')
      const key = normalizeKey(event)
      // Still holding only modifiers, or a bare key: keep listening.
      if (key === undefined || modifiers.length === 0) return
      setRecording(false)
      void patch({ hotkey: { modifiers, key } })
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => { window.removeEventListener('keydown', onKeyDown, true) }
  }, [recording, patch])

  const settings = status?.settings
  useEffect(() => {
    if (settings === undefined) return
    setGracefulDraft(String(settings.gracefulTimeoutMs))
    setAttemptsDraft(String(settings.maxAttempts))
  }, [settings?.gracefulTimeoutMs, settings?.maxAttempts])

  const title = <h3>{t('settings.title')}</h3>

  if (status === undefined) {
    return (
      <div className="dsh-ocr-panel">
        {title}
        {failure === undefined
          ? <p className="dsh-ocr-note">…</p>
          : (
            <>
              <p className="dsh-ocr-error">{t('settings.unavailable')}</p>
              <p className="dsh-ocr-note">{failure}</p>
            </>
          )}
      </div>
    )
  }

  const { watchdog, pending, lastRecovery } = status
  const current = status.settings

  return (
    <div className="dsh-ocr-panel">
      {title}
      <p className="dsh-ocr-subtitle">{t('settings.subtitle')}</p>

      <div className="dsh-ocr-row">
        <div className="dsh-ocr-main">
          <div className="dsh-ocr-label">{t('settings.watchdog')}</div>
          <div className="dsh-ocr-hint">
            {watchdog.running ? t('settings.watchdogRunning') : t('settings.watchdogStopped')}
            {watchdog.pid === undefined ? '' : ` · ${t('settings.watchdogPid')} ${watchdog.pid}`}
            {watchdog.restartCount === undefined ? '' : ` · ×${watchdog.restartCount}`}
          </div>
          {watchdog.hotkeyError == null || watchdog.hotkeyError === ''
            ? null
            : <div className="dsh-ocr-error">{t('settings.hotkeyConflict')} ({watchdog.hotkeyError})</div>}
          {watchdog.hotkeyRegistered !== true && (watchdog.hotkeyAlternatives?.length ?? 0) > 0
            ? (
              <div className="dsh-ocr-hint">
                {t('settings.hotkeyAlternatives')}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                  {(watchdog.hotkeyAlternatives ?? []).map(combo => (
                    <button
                      key={combo}
                      type="button"
                      className="dsh-ocr-key"
                      disabled={busy}
                      onClick={() => { void patch({ hotkey: parseHotkeyLabel(combo) }) }}
                    >
                      {combo}
                    </button>
                  ))}
                </div>
              </div>
            )
            : null}
        </div>
        <div className="dsh-ocr-side">
          <span className="dsh-ocr-badge" data-state={watchdog.running ? 'on' : 'off'}>
            {watchdog.hotkeyRegistered === true ? (watchdog.hotkey ?? formatHotkey(current.hotkey)) : '—'}
          </span>
        </div>
      </div>

      <div className="dsh-ocr-row">
        <div className="dsh-ocr-main">
          <div className="dsh-ocr-label">{t('settings.hotkey')}</div>
          <div className="dsh-ocr-hint">{recording ? t('settings.hotkeyRecording') : t('settings.hotkeyHint')}</div>
        </div>
        <div className="dsh-ocr-side">
          <button
            type="button"
            className="dsh-ocr-key"
            data-recording={recording ? 'true' : undefined}
            onClick={() => { setRecording(value => !value) }}
          >
            {recording ? '…' : formatHotkey(current.hotkey)}
          </button>
        </div>
      </div>

      <div className="dsh-ocr-row">
        <div className="dsh-ocr-main">
          <div className="dsh-ocr-label">{t('settings.enabled')}</div>
          <div className="dsh-ocr-hint">{t('settings.enabledHint')}</div>
        </div>
        <div className="dsh-ocr-side">
          <label className="dsh-ocr-check">
            <input
              type="checkbox"
              checked={current.enabled}
              disabled={busy}
              onChange={(event) => { void patch({ enabled: event.target.checked }) }}
            />
          </label>
        </div>
      </div>

      <div className="dsh-ocr-row">
        <div className="dsh-ocr-main">
          <div className="dsh-ocr-label">{t('settings.foregroundOnly')}</div>
          <div className="dsh-ocr-hint">{t('settings.foregroundOnlyHint')}</div>
        </div>
        <div className="dsh-ocr-side">
          <label className="dsh-ocr-check">
            <input
              type="checkbox"
              checked={current.onlyWhenForeground}
              disabled={busy}
              onChange={(event) => { void patch({ onlyWhenForeground: event.target.checked }) }}
            />
          </label>
        </div>
      </div>

      <div className="dsh-ocr-row">
        <div className="dsh-ocr-main">
          <div className="dsh-ocr-label">{t('settings.graceful')}</div>
          <div className="dsh-ocr-hint">{t('settings.gracefulHint')}</div>
        </div>
        <div className="dsh-ocr-side">
          <input
            className="dsh-ocr-input"
            type="number"
            min={500}
            max={30000}
            step={500}
            value={gracefulDraft}
            disabled={busy}
            onChange={(event) => { setGracefulDraft(event.target.value) }}
            onBlur={() => {
              const value = Number(gracefulDraft)
              if (Number.isFinite(value)) void patch({ gracefulTimeoutMs: value })
            }}
          />
        </div>
      </div>

      <div className="dsh-ocr-row">
        <div className="dsh-ocr-main">
          <div className="dsh-ocr-label">{t('settings.maxAttempts')}</div>
          <div className="dsh-ocr-hint">{t('settings.maxAttemptsHint')}</div>
        </div>
        <div className="dsh-ocr-side">
          <input
            className="dsh-ocr-input"
            type="number"
            min={1}
            max={10}
            step={1}
            value={attemptsDraft}
            disabled={busy}
            onChange={(event) => { setAttemptsDraft(event.target.value) }}
            onBlur={() => {
              const value = Number(attemptsDraft)
              if (Number.isFinite(value)) void patch({ maxAttempts: value })
            }}
          />
        </div>
      </div>

      <div className="dsh-ocr-section">{t('settings.recovery')}</div>
      <p className="dsh-ocr-subtitle">{t('settings.recoveryHint')}</p>

      {([
        ['taskBoard', 'settings.recoveryTaskBoard'],
        ['goals', 'settings.recoveryGoals'],
        ['jobs', 'settings.recoveryJobs'],
        ['sessionTurns', 'settings.recoveryTurns'],
      ] as const).map(([key, label]) => (
        <label className="dsh-ocr-check" key={key} style={{ padding: '5px 0' }}>
          <input
            type="checkbox"
            checked={current.recovery[key]}
            disabled={busy}
            onChange={(event) => { void patch({ recovery: { [key]: event.target.checked } }) }}
          />
          {t(label)}
        </label>
      ))}

      <label className="dsh-ocr-check" style={{ padding: '9px 0', borderTop: '1px solid var(--dsw-alias-border-l1)' }}>
        <input
          type="checkbox"
          checked={current.autoContinue}
          disabled={busy}
          onChange={(event) => { void patch({ autoContinue: event.target.checked }) }}
        />
        {t('settings.autoContinue')}
      </label>
      <div className="dsh-ocr-hint" style={{ marginTop: -4 }}>{t('settings.autoContinueHint')}</div>

      <div className="dsh-ocr-section">{t('settings.pending')}</div>
      {pending.items.length === 0
        ? <p className="dsh-ocr-note">{t('settings.pendingEmpty')}</p>
        : (
          <ul className="dsh-ocr-list">
            {pending.items.map(item => (
              <li key={item.key}>
                <code>{item.kind}</code>
                <span>{item.label}</span>
                {item.attempts > 0
                  ? <span>· {t('settings.pendingItem', { attempts: String(item.attempts) })}</span>
                  : null}
              </li>
            ))}
          </ul>
        )}

      <div className="dsh-ocr-section">{t('settings.lastRecovery')}</div>
      {lastRecovery === undefined
        ? <p className="dsh-ocr-note">{t('settings.lastRecoveryNone')}</p>
        : (
          <>
            <p className="dsh-ocr-note">
              {`${t('settings.recovered')} ${lastRecovery.recovered} · ${t('settings.failed')} ${lastRecovery.failed}`
                + ` · ${t('settings.skipped')} ${lastRecovery.skipped} · ${t('settings.givenUp')} ${lastRecovery.givenUp}`}
            </p>
            <ul className="dsh-ocr-list">
              {lastRecovery.outcomes.map(outcome => (
                <li key={outcome.key}>
                  <code>{outcome.status}</code>
                  <span>{outcome.label}</span>
                  {outcome.error === undefined ? null : <span className="dsh-ocr-error">· {outcome.error}</span>}
                </li>
              ))}
            </ul>
          </>
        )}

      {failure === undefined ? null : <p className="dsh-ocr-error">{failure}</p>}
      {saved ? <p className="dsh-ocr-note">{t('settings.saved')}</p> : null}

      <div className="dsh-ocr-actions">
        <button
          type="button"
          className="dsh-ocr-btn"
          data-variant="primary"
          disabled={busy}
          onClick={() => { void triggerRestart('settings') }}
        >
          {t('settings.restartNow')}
        </button>
        <button
          type="button"
          className="dsh-ocr-btn"
          disabled={busy}
          onClick={() => { void controlWatchdog(watchdog.running ? 'stop' : 'start').then(setStatus, () => {}) }}
        >
          {watchdog.running ? t('settings.stopWatchdog') : t('settings.startWatchdog')}
        </button>
      </div>
    </div>
  )
}
