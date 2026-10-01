# dsh-one-click-restart

One-click restart for DeepSeek Harness: a refresh seat at the right edge of the session header plus a system-wide hotkey that restarts the application **even when it has stopped responding**, then picks up the work it interrupted.

> 中文说明见 [README.zh.md](./README.zh.md)。

## What it solves

When DSH hangs you cannot click anything, cannot restart it, and have to remember what was running. This plugin addresses all three:

- **A clickable seat** — a refresh icon at the right-hand end of the header utilities row, immediately left of the sidebar toggle.
- **A trigger that survives the hang** — `Ctrl+Alt+R` is owned by a watchdog process that lives *outside* the DSH process tree, so it still fires when the host's event loop is blocked and the page is frozen.
- **No memory required** — the plugin continuously snapshots what is running and resumes the interrupted work on the next boot.

## Install

```bash
dsh plugin --profile <your profile> add dsh-one-click-restart
```

Or, from a checkout, install it as a local link:

```bash
dsh plugin --profile desktop add link:<absolute path to this directory>
```

Restart DSH once afterwards: the host half is loaded at boot. (The browser half only needs a page refresh.)

## Use

| Action | Effect |
|---|---|
| Click the header refresh icon | Asks the host to request a restart |
| Press `Ctrl+Alt+R` | The watchdog restarts directly — **no host involvement**, so it works while the host is frozen |
| Settings → Plugins → One-click restart | Rebind the hotkey, choose the recovery scope and breaker, inspect the recovery queue |

The restart is polite first: a normal exit is requested so session logs and the task-board ledger can flush, then the process is force-killed after the grace period (default 3 s) and relaunched.

## Hotkey conflicts

Many machines already have `Ctrl+Alt+R` taken by a resident application (Wallpaper Engine, NVIDIA, an input method). When that happens the settings page:

1. says so plainly, and
2. **lists the combinations that are actually free** — the watchdog probes each one and releases whatever it managed to claim, so probing never costs you a working hotkey;
3. adopting one is a single click, and pressing your own combination works too.

The plugin never silently switches to another key: that would leave you pressing a combination that does nothing.

## Recovery

Every few seconds the host atomically writes what is running to `~/.dsh/one-click-restart/pending.json`. **It is written continuously, not at restart time** — a host whose event loop is blocked cannot produce a snapshot at the moment it is needed.

On the next boot the snapshot is replayed:

| Kind | Mechanism | Reliability |
|---|---|---|
| Task-board cards | `POST /api/task-board/action` to run the card again | high |
| Sessions carrying a goal | rearm the goal | high |
| Background jobs / the interrupted turn | recorded and resumed on a best-effort basis | medium |

**Breaker**: an item that fails `maxAttempts` boots in a row (default 3) is dropped and reported, so a task that crashes the application on start cannot turn this plugin into a restart loop.

## Settings

- Hotkey (click, then press the new combination)
- Watchdog on/off, live status and pid
- Respond only while DSH is the foreground application
- Graceful-close wait, breaker threshold
- Recovery scope (task board / goals / jobs / sessions)
- Whether an interrupted session gets an automatic "continue"

## How it works

```
(1) client plugin (in the page)  — header seat, settings page, tooltip
        | click -> POST /api/one-click-restart/restart
        v
(2) host plugin (inside the dsh host process)
        | - continuous snapshot of running work
        | - starts and supervises the watchdog
        | - replays the snapshot on the next boot (with a breaker)
        v spawn (detached, outside the process tree)
(3) watchdog (system PowerShell, hidden window, separate process)
        | - RegisterHotKey for the system-wide hotkey
        | - foreground-window check
        | - polite close -> force kill -> relaunch
```

**Why three layers**: the watchdog must not be a child of the host (it would die in the very process-tree kill it performs) and must not depend on the Electron main process (Electron's own `globalShortcut` dies with it). Both triggers point at the same executor, so the two paths can never disagree.

## Zero runtime dependencies

- The watchdog runs on Windows PowerShell 5.1, which ships with Windows — PowerShell 7 is not required.
- The host half uses Node builtins only.
- The header glyph reuses the shell's own icon when it is exported and falls back to a bundled SVG when it is not.

## Data and uninstall

Everything lives in `~/.dsh/one-click-restart/`: `settings.json`, `pending.json`, `history.json`, `watchdog.json`, `watchdog-state.json`, `watchdog.log`, `watchdog-spawn.log`. Deleting that directory after uninstalling removes all state. If a watchdog process is still alive, drop the stop sentinel (or end that `powershell.exe`) first.

## Known limits

- The window disappears for 3–8 seconds while the app relaunches. That is a property of Electron reloading, not something a plugin can hide; what it *can* guarantee is that you do not have to do anything.
- **A session turn without a goal, and background jobs, are recorded but not replayed.** Both have reasons rather than being missing by omission:
  - *Session turns*: the `Agent` a host can see carries only an `id`, so the host cannot tell whether a session is mid-turn. Guessing wrong means typing a spurious "continue" into your conversation.
  - *Background jobs*: the `jobs` service exposes `JobView { id, kind, label, status, progress, detail, startedAt, output }` — **no field carries the original command**. What a replay would need lives in `JobSpec.run(job)`, which is a function and cannot be persisted. The only alternative is parsing session-log text, which is fragile; not implementing it beats silently running the wrong command.
- The interrupted turn is not guaranteed to continue with verbatim context.
- If the target hotkey is already owned by another application, the plugin does not silently switch to a different one — it reports the combinations that are actually free.

## License

MIT
