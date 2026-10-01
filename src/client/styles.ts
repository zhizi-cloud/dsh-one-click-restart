/**
 * The plugin's stylesheet, injected once.
 *
 * Inline styles cannot express `:hover`, `:active`, `:focus-visible` or a
 * keyframe, and this build runs no CSS-modules pipeline — so the sheet is a
 * plain string installed into `<head>` on mount. Every colour comes from the
 * shell's own `--dsw-alias-*` variables, which is what keeps both surfaces
 * looking like they shipped with the application rather than beside it.
 */

const STYLE_ID = 'dsh-one-click-restart-styles'

const CSS = `
.dsh-ocr-seat {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.dsh-ocr-seat:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dsh-ocr-seat:active:not(:disabled) { transform: scale(0.94); }
.dsh-ocr-seat:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.dsh-ocr-seat:disabled { cursor: default; opacity: 0.55; }
.dsh-ocr-seat[data-phase='pending'] svg { animation: dsh-ocr-spin 900ms linear infinite; }
.dsh-ocr-seat[data-phase='failed'] { color: var(--dsw-alias-state-error-primary); }
@keyframes dsh-ocr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.dsh-ocr-panel { display: flex; flex-direction: column; gap: 4px; padding: 4px 2px 22px; max-width: 720px; }
.dsh-ocr-panel h3 { margin: 0; font-size: 14px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsh-ocr-subtitle { margin: 0 0 10px; font-size: 12px; color: var(--dsw-alias-label-secondary); line-height: 1.6; }
.dsh-ocr-section { margin: 12px 0 2px; font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.dsh-ocr-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 9px 0;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.dsh-ocr-row:first-of-type { border-top: none; }
.dsh-ocr-main { flex: 1; min-width: 0; }
.dsh-ocr-label { font-size: 13px; color: var(--dsw-alias-label-primary); }
.dsh-ocr-hint { margin-top: 3px; font-size: 11.5px; line-height: 1.55; color: var(--dsw-alias-label-secondary); }
.dsh-ocr-side { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.dsh-ocr-badge {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
}
.dsh-ocr-badge[data-state='on'] { color: var(--dsw-alias-state-success-primary); border-color: currentColor; }
.dsh-ocr-badge[data-state='off'] { color: var(--dsw-alias-state-idle-primary); }
.dsh-ocr-badge[data-state='error'] { color: var(--dsw-alias-state-error-primary); border-color: currentColor; }
.dsh-ocr-key {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
}
.dsh-ocr-key[data-recording='true'] {
  border-color: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-brand-primary);
}
.dsh-ocr-input {
  width: 80px;
  font-size: 12px;
  padding: 3px 7px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
}
.dsh-ocr-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  user-select: none;
}
.dsh-ocr-btn {
  font-size: 12.5px;
  padding: 5px 13px;
  border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
}
.dsh-ocr-btn:hover { background: var(--dsw-alias-bg-layer-2); }
.dsh-ocr-btn[data-variant='primary'] {
  background: var(--dsw-alias-brand-primary);
  border-color: transparent;
  color: #fff;
}
.dsh-ocr-btn[data-variant='danger'] { color: var(--dsw-alias-state-error-primary); }
.dsh-ocr-list { margin: 4px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.dsh-ocr-list li { font-size: 12px; color: var(--dsw-alias-label-secondary); display: flex; gap: 8px; align-items: baseline; }
.dsh-ocr-list code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  color: var(--dsw-alias-label-primary);
}
.dsh-ocr-note { font-size: 11.5px; color: var(--dsw-alias-label-secondary); }
.dsh-ocr-error { font-size: 11.5px; color: var(--dsw-alias-state-error-primary); }
.dsh-ocr-actions { display: flex; gap: 8px; margin-top: 14px; }
`

/** Install the stylesheet if it is not already present. */
export function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID) !== null) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = CSS
  document.head.appendChild(style)
}
