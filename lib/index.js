// src/host/paths.ts
import { homedir } from "node:os";
import { join } from "node:path";
function dshHome() {
  const fromEnv = process.env.DSH_HOME;
  if (typeof fromEnv === "string" && fromEnv.trim() !== "") return fromEnv;
  return join(homedir(), ".dsh");
}
function dataDir() {
  return join(dshHome(), "one-click-restart");
}
function settingsPath() {
  return join(dataDir(), "settings.json");
}
function snapshotPath() {
  return join(dataDir(), "pending.json");
}
function historyPath() {
  return join(dataDir(), "history.json");
}
function watchdogConfigPath() {
  return join(dataDir(), "watchdog.json");
}
function watchdogStatePath() {
  return join(dataDir(), "watchdog-state.json");
}
function requestPath() {
  return join(dataDir(), "restart-request.json");
}
function stopPath() {
  return join(dataDir(), "watchdog-stop");
}
function watchdogLogPath() {
  return join(dataDir(), "watchdog.log");
}
function watchdogScriptPath(packageRoot2) {
  return join(packageRoot2, "watchdog", "watchdog.ps1");
}
function watchdogLauncherPath(packageRoot2) {
  return join(packageRoot2, "watchdog", "watchdog-launch.ps1");
}

// src/host/http.ts
function sameOriginHeaders(base) {
  return {
    accept: "application/json",
    origin: base,
    "sec-fetch-site": "same-origin",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty"
  };
}

// src/host/probe.ts
function selfBaseUrl() {
  const raw = process.env.DSH_WEB_URL;
  if (typeof raw !== "string" || raw.trim() === "") return void 0;
  return raw.trim().replace(/\/+$/, "");
}
var PROBE_TIMEOUT_MS = 4e3;
var TASK_BOARD_STATE = "/api/task-board/state";
async function probeTaskBoard() {
  const base = selfBaseUrl();
  if (base === void 0) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, PROBE_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${TASK_BOARD_STATE}`, {
      headers: sameOriginHeaders(base),
      cache: "no-store",
      signal: controller.signal
    });
    if (!response.ok) return [];
    const snapshot = await response.json();
    if (!Array.isArray(snapshot.tasks)) return [];
    const seeds = [];
    for (const entry of snapshot.tasks) {
      if (typeof entry !== "object" || entry === null) continue;
      const task = entry;
      if (task.status !== "running") continue;
      if (typeof task.id !== "string" || task.id === "") continue;
      seeds.push({
        kind: "task-board",
        key: `task-board:${task.id}`,
        label: typeof task.title === "string" && task.title !== "" ? task.title : task.id,
        data: { taskId: task.id }
      });
    }
    return seeds;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}
function probeGoals(ctx) {
  const agents = ctx.get("agents");
  const goals = ctx.get("goals");
  if (agents === void 0 || goals === void 0) return [];
  const seeds = [];
  for (const agent of agents.list()) {
    let goal;
    try {
      goal = goals.get(agent);
    } catch {
      continue;
    }
    if (goal === void 0) continue;
    if (goal.phase !== "active") continue;
    seeds.push({
      kind: "goal",
      key: `goal:${agent.id}`,
      label: goal.objective !== "" ? goal.objective : agent.id,
      // The reference is what the resume call needs; the objective is only for
      // the settings page to render.
      data: { sessionId: agent.id, goalId: goal.id, revision: goal.revision }
    });
  }
  return seeds;
}
var TURN_SCAN_WINDOW = 2e3;
function hasOpenTurn(session) {
  const end = typeof session.seq === "number" ? session.seq : 0;
  const from = Math.max(0, end - TURN_SCAN_WINDOW);
  let events;
  try {
    events = session.snapshotEvents(from);
  } catch {
    return false;
  }
  for (let i = events.length - 1; i >= 0; i--) {
    const type = events[i]?.type;
    if (type === "turn/end") return false;
    if (type === "turn/start") return true;
  }
  return false;
}
function probeSessions(ctx) {
  const sessions = ctx.get("sessions");
  if (sessions === void 0) return [];
  const seeds = [];
  for (const session of sessions.list()) {
    if (!hasOpenTurn(session)) continue;
    seeds.push({
      kind: "turn",
      key: `turn:${session.id}`,
      label: session.id,
      data: { sessionId: session.id }
    });
  }
  return seeds;
}
async function probeAll(ctx) {
  const board = await probeTaskBoard();
  return [...board, ...probeGoals(ctx), ...probeSessions(ctx)];
}

// src/host/recover.ts
var RECOVER_TIMEOUT_MS = 15e3;
var AGENT_WAIT_MS = 45e3;
async function recoverTaskBoard(item) {
  const base = selfBaseUrl();
  if (base === void 0) {
    throw new Error("DSH_WEB_URL is unavailable, so the task board cannot be reached");
  }
  const taskId = typeof item.data.taskId === "string" ? item.data.taskId : "";
  if (taskId === "") throw new Error("snapshot item carries no taskId");
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, RECOVER_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}/api/task-board/action`, {
      method: "POST",
      headers: { ...sameOriginHeaders(base), "content-type": "application/json" },
      body: JSON.stringify({
        requestId: `one-click-restart-${Date.now().toString(36)}-${taskId}`.slice(0, 200),
        action: { kind: "run", taskId },
        initiator: "dsh-one-click-restart"
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`task board answered HTTP ${response.status}${detail === "" ? "" : `: ${detail.slice(0, 200)}`}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
async function waitForAgent(agents, sessionId, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (; ; ) {
    let agent;
    try {
      agent = agents.get(sessionId);
    } catch {
      agent = void 0;
    }
    if (agent !== void 0) return agent;
    if (Date.now() >= deadline) return void 0;
    await new Promise((resolve) => setTimeout(resolve, 1e3));
  }
}
async function recoverGoal(ctx, item) {
  const agents = ctx.get("agents");
  const goals = ctx.get("goals");
  if (agents === void 0 || goals === void 0) {
    throw new Error("this deployment serves no goals service");
  }
  const sessionId = typeof item.data.sessionId === "string" ? item.data.sessionId : "";
  if (sessionId === "") throw new Error("snapshot item carries no sessionId");
  const agent = await waitForAgent(agents, sessionId, AGENT_WAIT_MS);
  if (agent === void 0) {
    throw new Error(`session ${sessionId} has no live agent`);
  }
  let goalId = typeof item.data.goalId === "string" ? item.data.goalId : "";
  let revision = typeof item.data.revision === "number" ? item.data.revision : void 0;
  if (goalId === "" || revision === void 0) {
    const current = goals.get(agent);
    if (current === void 0) throw new Error("this session carries no goal to resume");
    goalId = current.id;
    revision = current.revision;
  }
  goals.resume(agent, { id: goalId, revision });
}
async function runRecovery(ctx, items, settings) {
  const startedAt = Date.now();
  const outcomes = [];
  const remaining = [];
  for (const item of items) {
    let failure;
    let skipped = false;
    try {
      switch (item.kind) {
        case "task-board":
          await recoverTaskBoard(item);
          break;
        case "goal":
          await recoverGoal(ctx, item);
          break;
        case "turn":
          outcomes.push({ kind: item.kind, key: item.key, label: item.label, status: "skipped" });
          remaining.push(item);
          continue;
        default:
          skipped = true;
      }
    } catch (caught) {
      failure = caught instanceof Error ? caught.message : String(caught);
    }
    if (skipped) {
      outcomes.push({ kind: item.kind, key: item.key, label: item.label, status: "skipped" });
      continue;
    }
    if (failure === void 0) {
      outcomes.push({ kind: item.kind, key: item.key, label: item.label, status: "recovered" });
      continue;
    }
    const attempts = item.attempts + 1;
    if (attempts >= settings.maxAttempts) {
      outcomes.push({ kind: item.kind, key: item.key, label: item.label, status: "given-up", error: failure });
      continue;
    }
    outcomes.push({ kind: item.kind, key: item.key, label: item.label, status: "failed", error: failure });
    remaining.push({ ...item, attempts, lastAttemptAt: Date.now(), lastError: failure });
  }
  const countOf = (status) => outcomes.filter((outcome) => outcome.status === status).length;
  return {
    startedAt,
    finishedAt: Date.now(),
    attempted: outcomes.length,
    recovered: countOf("recovered"),
    failed: countOf("failed"),
    skipped: countOf("skipped"),
    givenUp: countOf("given-up"),
    outcomes,
    remaining
  };
}

// src/host/loopback.ts
function isIPv4Loopback(v4) {
  const parts = v4.split(".");
  return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
function isLoopbackAddress(address) {
  if (address === void 0) return false;
  const normalized = address.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("::ffff:")) return isIPv4Loopback(normalized.slice(7));
  return isIPv4Loopback(normalized);
}
function isLoopbackHostname(hostname) {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  return isIPv4Loopback(hostname);
}
function isLoopbackRequest(request) {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false;
  const host = request.headers.host;
  if (typeof host !== "string") return false;
  let hostUrl;
  try {
    hostUrl = new URL(`http://${host}`);
  } catch {
    return false;
  }
  if (!isLoopbackHostname(hostUrl.hostname)) return false;
  if (request.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = request.headers.origin;
  if (origin === void 0) return true;
  try {
    return new URL(origin).host === hostUrl.host;
  } catch {
    return false;
  }
}

// src/host/routes.ts
var PATHS = {
  status: "/api/one-click-restart/status",
  settings: "/api/one-click-restart/settings",
  restart: "/api/one-click-restart/restart",
  watchdog: "/api/one-click-restart/watchdog",
  history: "/api/one-click-restart/history",
  /** The page reports what only the page can know: which session is working. */
  observe: "/api/one-click-restart/observe"
};
var BODY_LIMIT = 64 * 1024;
function writeJson(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(text)
  });
  res.end(text);
}
async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk;
    size += buffer.length;
    if (size > BODY_LIMIT) throw new Error("body-too-large");
    chunks.push(buffer);
  }
  if (size === 0) return void 0;
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
function makeRoutes(deps) {
  const guard = (req, res) => {
    if (isLoopbackRequest(req)) return true;
    writeJson(res, 403, { ok: false, error: "forbidden" });
    return false;
  };
  const method = (req, res, allowed) => {
    if (req.method === allowed) return true;
    writeJson(res, 405, { ok: false, error: "method-not-allowed" });
    return false;
  };
  const status = {
    kind: "exact",
    path: PATHS.status,
    handler: async (req, res) => {
      if (!method(req, res, "GET")) return;
      if (!guard(req, res)) return;
      writeJson(res, 200, await deps.status());
    }
  };
  const settings = {
    kind: "exact",
    path: PATHS.settings,
    handler: async (req, res) => {
      if (req.method === "GET") {
        if (!guard(req, res)) return;
        writeJson(res, 200, await deps.status());
        return;
      }
      if (!method(req, res, "POST")) return;
      if (!guard(req, res)) return;
      try {
        writeJson(res, 200, await deps.updateSettings(await readJsonBody(req)));
      } catch (error) {
        writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  };
  const restart = {
    kind: "exact",
    path: PATHS.restart,
    handler: async (req, res) => {
      if (!method(req, res, "POST")) return;
      if (!guard(req, res)) return;
      let reason = "button";
      try {
        const body = await readJsonBody(req);
        if (typeof body === "object" && body !== null) {
          const candidate = body.reason;
          if (typeof candidate === "string" && candidate !== "") reason = candidate.slice(0, 200);
        }
      } catch {
      }
      writeJson(res, 200, await deps.restart(reason));
    }
  };
  const watchdog = {
    kind: "exact",
    path: PATHS.watchdog,
    handler: async (req, res) => {
      if (!method(req, res, "POST")) return;
      if (!guard(req, res)) return;
      try {
        const body = await readJsonBody(req);
        const action = typeof body === "object" && body !== null ? body.action : void 0;
        if (action !== "start" && action !== "stop") {
          writeJson(res, 400, { ok: false, error: "invalid-action" });
          return;
        }
        writeJson(res, 200, await deps.watchdog(action));
      } catch (error) {
        writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  };
  const history = {
    kind: "exact",
    path: PATHS.history,
    handler: async (req, res) => {
      if (!method(req, res, "GET")) return;
      if (!guard(req, res)) return;
      writeJson(res, 200, await deps.history());
    }
  };
  const observe = {
    kind: "exact",
    path: PATHS.observe,
    handler: async (req, res) => {
      if (!method(req, res, "POST")) return;
      if (!guard(req, res)) return;
      try {
        writeJson(res, 200, await deps.observe(await readJsonBody(req)));
      } catch (error) {
        writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
  };
  return [status, settings, restart, watchdog, history, observe];
}

// src/host/store.ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}
async function readJson(path) {
  try {
    const text = await readFile(path, "utf8");
    const body = text.charCodeAt(0) === 65279 ? text.slice(1) : text;
    return JSON.parse(body);
  } catch {
    return void 0;
  }
}
async function writeJsonAtomic(path, value) {
  await ensureDir(dirname(path));
  const tmp = `${path}.tmp`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await rename(tmp, path);
}
async function removeFile(path) {
  const { rm } = await import("node:fs/promises");
  try {
    await rm(path, { force: true });
  } catch {
  }
}

// src/host/settings.ts
var DEFAULT_SETTINGS = {
  enabled: true,
  hotkey: { modifiers: ["Control", "Alt"], key: "R" },
  gracefulTimeoutMs: 3e3,
  recovery: { taskBoard: true, goals: true, jobs: true, sessionTurns: true },
  autoContinue: true,
  maxAttempts: 3,
  onlyWhenForeground: true,
  logRetention: 20
};
function bool(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}
function clampInt(value, min, max, fallback) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}
function normalizeSettings(raw) {
  const input = asRecord(raw);
  const hotkey = asRecord(input.hotkey);
  const recovery = asRecord(input.recovery);
  const modifiers = Array.isArray(hotkey.modifiers) ? hotkey.modifiers.filter((m) => typeof m === "string") : [];
  const key = typeof hotkey.key === "string" && hotkey.key.trim() !== "" ? hotkey.key.trim() : DEFAULT_SETTINGS.hotkey.key;
  return {
    enabled: bool(input.enabled, DEFAULT_SETTINGS.enabled),
    hotkey: {
      modifiers: modifiers.length > 0 ? modifiers : [...DEFAULT_SETTINGS.hotkey.modifiers],
      key
    },
    gracefulTimeoutMs: clampInt(input.gracefulTimeoutMs, 500, 3e4, DEFAULT_SETTINGS.gracefulTimeoutMs),
    recovery: {
      taskBoard: bool(recovery.taskBoard, DEFAULT_SETTINGS.recovery.taskBoard),
      goals: bool(recovery.goals, DEFAULT_SETTINGS.recovery.goals),
      jobs: bool(recovery.jobs, DEFAULT_SETTINGS.recovery.jobs),
      sessionTurns: bool(recovery.sessionTurns, DEFAULT_SETTINGS.recovery.sessionTurns)
    },
    autoContinue: bool(input.autoContinue, DEFAULT_SETTINGS.autoContinue),
    maxAttempts: clampInt(input.maxAttempts, 1, 10, DEFAULT_SETTINGS.maxAttempts),
    onlyWhenForeground: bool(input.onlyWhenForeground, DEFAULT_SETTINGS.onlyWhenForeground),
    logRetention: clampInt(input.logRetention, 1, 200, DEFAULT_SETTINGS.logRetention)
  };
}
async function loadSettings() {
  return normalizeSettings(await readJson(settingsPath()));
}
async function saveSettings(settings) {
  await writeJsonAtomic(settingsPath(), settings);
}
function patchSettings(current, patch) {
  const input = asRecord(patch);
  const merged = asRecord(current);
  for (const [key, value] of Object.entries(input)) {
    if ((key === "hotkey" || key === "recovery") && typeof value === "object" && value !== null) {
      merged[key] = { ...asRecord(merged[key]), ...asRecord(value) };
    } else {
      merged[key] = value;
    }
  }
  return normalizeSettings(merged);
}

// src/host/snapshot.ts
var EMPTY = { version: 1, capturedAt: 0, items: [] };
async function loadSnapshot() {
  const raw = await readJson(snapshotPath());
  if (typeof raw !== "object" || raw === null) return { ...EMPTY };
  const record = raw;
  const items = Array.isArray(record.items) ? record.items.filter(isRecoveryItem) : [];
  return {
    version: 1,
    capturedAt: typeof record.capturedAt === "number" ? record.capturedAt : 0,
    ...typeof record.restartRequestedAt === "number" ? { restartRequestedAt: record.restartRequestedAt } : {},
    items
  };
}
async function saveSnapshot(snapshot) {
  await writeJsonAtomic(snapshotPath(), snapshot);
}
function isRecoveryItem(value) {
  if (typeof value !== "object" || value === null) return false;
  const record = value;
  return (record.kind === "task-board" || record.kind === "goal" || record.kind === "job" || record.kind === "turn") && typeof record.key === "string" && typeof record.label === "string" && typeof record.data === "object" && record.data !== null && typeof record.attempts === "number";
}
function mergeSeeds(seeds, previous) {
  const prior = new Map(previous.map((item) => [item.key, item]));
  return seeds.map((seed) => {
    const before = prior.get(seed.key);
    if (before === void 0) return { ...seed, attempts: 0 };
    return {
      ...seed,
      attempts: before.attempts,
      ...before.lastAttemptAt === void 0 ? {} : { lastAttemptAt: before.lastAttemptAt },
      ...before.lastError === void 0 ? {} : { lastError: before.lastError }
    };
  });
}
function unionSeeds(seeds, previous) {
  const byKey = /* @__PURE__ */ new Map();
  for (const item of previous) byKey.set(item.key, item);
  for (const seed of seeds) {
    const before = byKey.get(seed.key);
    byKey.set(seed.key, before === void 0 ? { ...seed, attempts: 0 } : {
      ...seed,
      attempts: before.attempts,
      ...before.lastAttemptAt === void 0 ? {} : { lastAttemptAt: before.lastAttemptAt },
      ...before.lastError === void 0 ? {} : { lastError: before.lastError }
    });
  }
  return [...byKey.values()];
}
function filterByScope(items, settings) {
  return items.filter((item) => {
    switch (item.kind) {
      case "task-board":
        return settings.recovery.taskBoard;
      case "goal":
        return settings.recovery.goals;
      case "job":
        return settings.recovery.jobs;
      case "turn":
        return settings.recovery.sessionTurns;
      default:
        return false;
    }
  });
}

// src/host/watchdog.ts
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, openSync } from "node:fs";
import { dirname as dirname2, join as join2 } from "node:path";
import { fileURLToPath } from "node:url";
var here = dirname2(fileURLToPath(import.meta.url));
var packageRoot = dirname2(here);
function resolveShell() {
  const root = process.env.SystemRoot ?? process.env.windir;
  if (typeof root === "string" && root !== "") {
    const absolute = join2(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    if (existsSync(absolute)) return absolute;
  }
  return "powershell.exe";
}
function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
function noteSpawn(message) {
  try {
    appendFileSync(join2(dataDir(), "watchdog-spawn.log"), `[${(/* @__PURE__ */ new Date()).toISOString()}] ${message}
`, "utf8");
  } catch {
  }
}
async function readWatchdogState() {
  return await readJson(watchdogStatePath());
}
function hotkeyLabel(settings) {
  const names = settings.hotkey.modifiers.map((modifier) => modifier === "Control" ? "Ctrl" : modifier);
  return [...names, settings.hotkey.key.toUpperCase()].join("+");
}
async function isWatchdogRunning() {
  const state = await readWatchdogState();
  if (state === void 0 || typeof state.pid !== "number") return false;
  if (state.phase === "stopped") return false;
  return isAlive(state.pid);
}
async function stopWatchdog() {
  await writeJsonAtomic(stopPath(), { at: Date.now() });
}
async function ensureWatchdog(settings) {
  if (!settings.enabled) {
    if (await isWatchdogRunning()) await stopWatchdog();
    return { started: false, reason: "disabled" };
  }
  const wanted = hotkeyLabel(settings);
  const existing = await readWatchdogState();
  if (await isWatchdogRunning()) {
    if (existing?.hotkey === wanted) return { started: false, reason: "already-running" };
    await stopWatchdog();
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  return await startWatchdog(settings);
}
async function startWatchdog(settings) {
  const script = watchdogScriptPath(packageRoot);
  if (!existsSync(script)) {
    noteSpawn(`script missing at ${script}`);
    return { started: false, reason: "script-missing" };
  }
  const configPath = watchdogConfigPath();
  await writeJsonAtomic(configPath, {
    dsExePath: process.execPath,
    hotkey: { modifiers: settings.hotkey.modifiers, key: settings.hotkey.key },
    statePath: watchdogStatePath(),
    requestPath: requestPath(),
    stopPath: stopPath(),
    logPath: watchdogLogPath(),
    gracefulTimeoutMs: settings.gracefulTimeoutMs,
    onlyWhenForeground: settings.onlyWhenForeground
  });
  await removeFile(stopPath());
  const shell = resolveShell();
  const launcher = watchdogLauncherPath(packageRoot);
  if (!existsSync(launcher)) {
    noteSpawn(`launcher missing at ${launcher}`);
    return { started: false, reason: "script-missing" };
  }
  let stdio = "ignore";
  try {
    const fd = openSync(join2(dataDir(), "watchdog-spawn.log"), "a");
    stdio = ["ignore", fd, fd];
  } catch {
    stdio = "ignore";
  }
  noteSpawn(`launching ${shell} -File "${launcher}" for "${script}"`);
  let child;
  try {
    child = spawn(shell, [
      "-NoProfile",
      "-NonInteractive",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      launcher,
      "-WatchdogPath",
      script,
      "-ConfigPath",
      configPath,
      "-StopPath",
      stopPath()
    ], {
      // Deliberately NOT detached. On Windows that flag means
      // DETACHED_PROCESS, and a PowerShell without a console exits 0
      // immediately having written nothing — verified against six spawn
      // variants, where every detached one failed and every other one worked.
      // What makes the watchdog independent is the launcher's Start-Process.
      windowsHide: true,
      stdio
    });
  } catch (error) {
    noteSpawn(`spawn threw: ${error instanceof Error ? error.message : String(error)}`);
    return { started: false, reason: "did-not-report" };
  }
  child.on("error", (error) => {
    noteSpawn(`spawn error event: ${error.message} (code ${error.code ?? "n/a"})`);
  });
  await new Promise((resolve) => {
    const done = () => {
      resolve();
    };
    child.once("exit", done);
    child.once("error", done);
    setTimeout(done, 5e3);
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const state = await readWatchdogState();
  if (state !== void 0 && typeof state.pid === "number" && isAlive(state.pid)) {
    noteSpawn(`watchdog reported pid ${state.pid}`);
    return { started: true };
  }
  noteSpawn(`watchdog did not report; child pid was ${child.pid ?? "n/a"}`);
  return { started: false, reason: "did-not-report" };
}
async function requestRestart(reason) {
  await writeJsonAtomic(requestPath(), { reason, at: Date.now() });
}

// src/index.ts
var name = "dsh-one-click-restart";
var inject = ["webServer"];
var PROBE_INTERVAL_MS = 5e3;
var RECOVERY_DELAY_MS = 8e3;
var HISTORY_LIMIT_HARD = 200;
function summarize(report) {
  return {
    startedAt: report.startedAt,
    finishedAt: report.finishedAt,
    recovered: report.recovered,
    failed: report.failed,
    skipped: report.skipped,
    givenUp: report.givenUp,
    outcomes: report.outcomes.map((outcome) => ({
      kind: outcome.kind,
      key: outcome.key,
      label: outcome.label,
      status: outcome.status,
      ...outcome.error === void 0 ? {} : { error: outcome.error }
    }))
  };
}
function apply(ctx) {
  const hostStartedAt = Date.now();
  let settings = { ...DEFAULT_SETTINGS };
  let lastRecovery;
  let recovering = false;
  let recoverySettled = false;
  let resumedFromSnapshot = false;
  const ready = (async () => {
    settings = await loadSettings();
  })();
  const buildStatus = async () => {
    await ready;
    const state = await readWatchdogState();
    const running = await isWatchdogRunning();
    const snapshot = await loadSnapshot();
    const base = selfBaseUrl();
    return {
      ok: true,
      settings,
      watchdog: {
        running,
        ...state?.pid === void 0 ? {} : { pid: state.pid },
        ...state?.hotkey === void 0 ? {} : { hotkey: state.hotkey },
        ...state?.hotkeyRegistered === void 0 ? {} : { hotkeyRegistered: state.hotkeyRegistered },
        hotkeyError: state?.hotkeyError ?? null,
        ...state?.hotkeyAlternatives === void 0 ? {} : { hotkeyAlternatives: state.hotkeyAlternatives },
        lastRestartAt: state?.lastRestartAt ?? null,
        ...state?.restartCount === void 0 ? {} : { restartCount: state.restartCount },
        ...state?.phase === void 0 ? {} : { phase: state.phase }
      },
      pending: {
        capturedAt: snapshot.capturedAt,
        items: snapshot.items.map((item) => ({
          kind: item.kind,
          key: item.key,
          label: item.label,
          attempts: item.attempts,
          ...item.lastError === void 0 ? {} : { lastError: item.lastError }
        }))
      },
      ...lastRecovery === void 0 ? {} : { lastRecovery: summarize(lastRecovery) },
      ...base === void 0 ? {} : { baseUrl: base },
      hostStartedAt,
      resumedFromSnapshot
    };
  };
  const tick = async () => {
    await ready;
    if (recovering) return;
    try {
      const seeds = await probeAll(ctx);
      const previous = await loadSnapshot();
      const combined = recoverySettled ? mergeSeeds(seeds, previous.items) : unionSeeds(seeds, previous.items);
      const merged = [...combined];
      for (const item of previous.items) {
        if (item.kind === "turn" && !merged.some((entry) => entry.key === item.key)) merged.push(item);
      }
      const items = filterByScope(merged, settings);
      await saveSnapshot({
        version: 1,
        capturedAt: Date.now(),
        ...previous.restartRequestedAt === void 0 ? {} : { restartRequestedAt: previous.restartRequestedAt },
        items
      });
    } catch {
    }
  };
  ctx.effect(() => {
    void tick();
    const timer = setInterval(() => {
      void tick();
    }, PROBE_INTERVAL_MS);
    return () => {
      clearInterval(timer);
    };
  }, "one-click-restart: snapshot cadence");
  const appendHistory = async (report) => {
    const existing = await readJson(historyPath());
    const list = Array.isArray(existing) ? existing : [];
    const limit = Math.min(HISTORY_LIMIT_HARD, Math.max(1, settings.logRetention));
    await writeJsonAtomic(historyPath(), [report, ...list].slice(0, limit));
  };
  const recoverOnBoot = async () => {
    await ready;
    const snapshot = await loadSnapshot();
    resumedFromSnapshot = snapshot.items.length > 0;
    if (snapshot.items.length > 0) {
      recovering = true;
      try {
        const report = await runRecovery(ctx, filterByScope(snapshot.items, settings), settings);
        lastRecovery = report;
        await saveSnapshot({ version: 1, capturedAt: Date.now(), items: report.remaining });
        await appendHistory(report);
      } catch {
      } finally {
        recovering = false;
      }
    }
    recoverySettled = true;
  };
  ctx.effect(() => {
    const timer = setTimeout(() => {
      void recoverOnBoot();
    }, RECOVERY_DELAY_MS);
    return () => {
      clearTimeout(timer);
    };
  }, "one-click-restart: boot recovery");
  const bootstrapWatchdog = async () => {
    await ready;
    try {
      await ensureWatchdog(settings);
    } catch {
    }
  };
  void bootstrapWatchdog();
  const deps = {
    status: buildStatus,
    updateSettings: async (patch) => {
      await ready;
      settings = patchSettings(settings, patch);
      await saveSettings(settings);
      await ensureWatchdog(settings);
      return await buildStatus();
    },
    restart: async (reason) => {
      await ready;
      try {
        if (!await isWatchdogRunning()) {
          const started = await startWatchdog(settings);
          if (!started.started) return { ok: false, error: started.reason ?? "watchdog-unavailable" };
        }
        await requestRestart(reason);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    },
    watchdog: async (action) => {
      await ready;
      if (action === "stop") await stopWatchdog();
      else await startWatchdog(settings);
      return await buildStatus();
    },
    history: async () => {
      const existing = await readJson(historyPath());
      return Array.isArray(existing) ? existing : [];
    },
    observe: async (payload) => {
      await ready;
      const input = typeof payload === "object" && payload !== null ? payload : {};
      const sessionId = typeof input.sessionId === "string" ? input.sessionId : "";
      if (sessionId === "") return { ok: false };
      const working = input.working === true;
      const key = `turn:${sessionId}`;
      const snapshot = await loadSnapshot();
      const others = snapshot.items.filter((item) => item.key !== key);
      const items = working ? [...others, {
        kind: "turn",
        key,
        label: typeof input.title === "string" && input.title !== "" ? input.title : sessionId,
        data: { sessionId, recordedAt: Date.now() },
        attempts: 0
      }] : others;
      await saveSnapshot({
        version: 1,
        capturedAt: Date.now(),
        ...snapshot.restartRequestedAt === void 0 ? {} : { restartRequestedAt: snapshot.restartRequestedAt },
        items
      });
      return { ok: true };
    }
  };
  ctx.effect(() => {
    const disposers = makeRoutes(deps).map((route) => ctx.webServer.register(route));
    return () => {
      for (const dispose of disposers) dispose();
    };
  }, "one-click-restart: routes");
}
export {
  apply,
  inject,
  name
};
