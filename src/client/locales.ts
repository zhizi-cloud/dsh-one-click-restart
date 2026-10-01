/**
 * Dictionaries for this plugin's two browser surfaces: the header seat and the
 * settings page.
 *
 * Keys are flat and prefixed by surface so the two never collide, and every
 * user-visible string lives here rather than inline — the tooltip text is part
 * of the requirement, so it must be reviewable in one place.
 */

/**
 * Every key this plugin translates.
 *
 * Extends the generic dictionary shape so a table can be handed to
 * `ctx.locale.register` without a cast, while still listing each key here as
 * the reviewable inventory of user-visible copy.
 */
export interface RestartLocale extends Record<string, string> {
  /** Accessible name and tooltip of the header seat. */
  'action.label': string
  /** Tooltip detail line. */
  'action.hint': string
  /** Tooltip text with the live hotkey interpolated as `{combo}`. */
  'action.hintWith': string
  /** Shown while a restart has been requested but the app has not gone down. */
  'action.pending': string
  /** Shown when the request could not be delivered. */
  'action.failed': string

  /** Settings page title. */
  'settings.title': string
  'settings.subtitle': string
  'settings.hotkey': string
  'settings.hotkeyHint': string
  'settings.hotkeyConflict': string
  'settings.hotkeyAlternatives': string
  'settings.hotkeyRecording': string
  'settings.watchdog': string
  'settings.watchdogRunning': string
  'settings.watchdogStopped': string
  'settings.watchdogPid': string
  'settings.enabled': string
  'settings.enabledHint': string
  'settings.foregroundOnly': string
  'settings.foregroundOnlyHint': string
  'settings.graceful': string
  'settings.gracefulHint': string
  'settings.maxAttempts': string
  'settings.maxAttemptsHint': string
  'settings.recovery': string
  'settings.recoveryHint': string
  'settings.recoveryTaskBoard': string
  'settings.recoveryGoals': string
  'settings.recoveryJobs': string
  'settings.recoveryTurns': string
  'settings.autoContinue': string
  'settings.autoContinueHint': string
  'settings.pending': string
  'settings.pendingEmpty': string
  'settings.pendingItem': string
  'settings.lastRecovery': string
  'settings.lastRecoveryNone': string
  'settings.recovered': string
  'settings.failed': string
  'settings.skipped': string
  'settings.givenUp': string
  'settings.restartNow': string
  'settings.stopWatchdog': string
  'settings.startWatchdog': string
  'settings.saved': string
  'settings.saveFailed': string
  'settings.unavailable': string
}

/** Simplified Chinese strings. */
export const zh: RestartLocale = {
  'action.label': '一键重启',
  'action.hint': '一键重启 (Ctrl+Alt+R)',
  'action.hintWith': '一键重启 ({combo})',
  'action.pending': '正在重启…',
  'action.failed': '重启请求未能送达',

  'settings.title': '一键重启',
  'settings.subtitle': '重启 DeepSeek Harness 并自动接续被中断的工作。',
  'settings.hotkey': '快捷键',
  'settings.hotkeyHint': '点击后按下新的组合键即可改键。看门狗会重新注册；若该组合已被其它软件占用，这里会显示冲突。',
  'settings.hotkeyConflict': '该组合键已被其它程序占用，请换一个。',
  'settings.hotkeyAlternatives': '以下组合当前可用，点击即可采用：',
  'settings.hotkeyRecording': '请按下新的组合键…',
  'settings.watchdog': '看门狗',
  'settings.watchdogRunning': '运行中',
  'settings.watchdogStopped': '未运行',
  'settings.watchdogPid': '进程号',
  'settings.enabled': '启用看门狗',
  'settings.enabledHint': '关闭后快捷键失效，只剩页面上的按钮。',
  'settings.foregroundOnly': '仅在 DSH 位于前台时响应',
  'settings.foregroundOnlyHint': '避免在其它软件里误触。',
  'settings.graceful': '优雅关闭等待（毫秒）',
  'settings.gracefulHint': '先请求正常退出，超时才强制结束。给得越足，会话日志越安全。',
  'settings.maxAttempts': '熔断阈值',
  'settings.maxAttemptsHint': '同一任务连续恢复失败达到该次数后放弃，避免陷入重启死循环。',
  'settings.recovery': '恢复范围',
  'settings.recoveryHint': '重启后自动接续哪些被中断的工作。',
  'settings.recoveryTaskBoard': '任务看板卡片',
  'settings.recoveryGoals': '目标（goal）会话',
  'settings.recoveryJobs': '后台任务',
  'settings.recoveryTurns': '会话中被中断的一轮',
  'settings.autoContinue': '自动补一句「继续」',
  'settings.autoContinueHint': '对中断的会话自动发送继续指令，包含你正在看的这个会话。',
  'settings.pending': '待恢复清单',
  'settings.pendingEmpty': '当前没有待恢复的工作。',
  'settings.pendingItem': '已尝试 {attempts} 次',
  'settings.lastRecovery': '上次恢复结果',
  'settings.lastRecoveryNone': '本次启动没有需要恢复的工作。',
  'settings.recovered': '已恢复',
  'settings.failed': '失败',
  'settings.skipped': '已跳过',
  'settings.givenUp': '已放弃',
  'settings.restartNow': '立即重启',
  'settings.stopWatchdog': '停止看门狗',
  'settings.startWatchdog': '启动看门狗',
  'settings.saved': '已保存',
  'settings.saveFailed': '保存失败',
  'settings.unavailable': '无法读取插件状态：宿主端路由未挂载。',
}

/** English strings. */
export const en: RestartLocale = {
  'action.label': 'Restart',
  'action.hint': 'One-click restart (Ctrl+Alt+R)',
  'action.hintWith': 'One-click restart ({combo})',
  'action.pending': 'Restarting…',
  'action.failed': 'The restart request could not be delivered',

  'settings.title': 'One-click restart',
  'settings.subtitle': 'Restart DeepSeek Harness and pick up the work it interrupted.',
  'settings.hotkey': 'Hotkey',
  'settings.hotkeyHint': 'Click, then press the new combination. The watchdog re-registers it; a combination another application owns is reported as a conflict here.',
  'settings.hotkeyConflict': 'Another application already owns that combination. Pick another.',
  'settings.hotkeyAlternatives': 'These are free right now — click to adopt one:',
  'settings.hotkeyRecording': 'Press the new combination…',
  'settings.watchdog': 'Watchdog',
  'settings.watchdogRunning': 'running',
  'settings.watchdogStopped': 'not running',
  'settings.watchdogPid': 'pid',
  'settings.enabled': 'Enable the watchdog',
  'settings.enabledHint': 'With this off the hotkey stops working and only the header button remains.',
  'settings.foregroundOnly': 'Only while DSH is in the foreground',
  'settings.foregroundOnlyHint': 'Keeps the hotkey from firing inside other applications.',
  'settings.graceful': 'Graceful close wait (ms)',
  'settings.gracefulHint': 'A normal exit is requested first and force-killed only after this. Longer is safer for session logs.',
  'settings.maxAttempts': 'Breaker threshold',
  'settings.maxAttemptsHint': 'One item is given up on after this many consecutive failed recoveries, so a crashing task cannot become a restart loop.',
  'settings.recovery': 'Recovery scope',
  'settings.recoveryHint': 'Which interrupted work is resumed automatically after a restart.',
  'settings.recoveryTaskBoard': 'Task-board cards',
  'settings.recoveryGoals': 'Sessions with a goal',
  'settings.recoveryJobs': 'Background jobs',
  'settings.recoveryTurns': 'The interrupted turn',
  'settings.autoContinue': 'Send an automatic "continue"',
  'settings.autoContinueHint': 'Posts a continue instruction to an interrupted session, including the one you are reading now.',
  'settings.pending': 'Queued for recovery',
  'settings.pendingEmpty': 'Nothing is queued for recovery.',
  'settings.pendingItem': 'tried {attempts}×',
  'settings.lastRecovery': 'Last recovery',
  'settings.lastRecoveryNone': 'This boot had nothing to recover.',
  'settings.recovered': 'recovered',
  'settings.failed': 'failed',
  'settings.skipped': 'skipped',
  'settings.givenUp': 'given up',
  'settings.restartNow': 'Restart now',
  'settings.stopWatchdog': 'Stop the watchdog',
  'settings.startWatchdog': 'Start the watchdog',
  'settings.saved': 'Saved',
  'settings.saveFailed': 'Could not save',
  'settings.unavailable': 'Plugin status is unavailable: the host routes are not mounted.',
}
