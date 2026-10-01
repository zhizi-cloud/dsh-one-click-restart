window.__ModuleLoader__.load({
	id: "dsh-one-click-restart",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		"use strict";
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __export = (target, all) => {
		  for (var name in all)
		    __defProp(target, name, { get: all[name], enumerable: true });
		};
		var __copyProps = (to, from, except, desc) => {
		  if (from && typeof from === "object" || typeof from === "function") {
		    for (let key of __getOwnPropNames(from))
		      if (!__hasOwnProp.call(to, key) && key !== except)
		        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
		  }
		  return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
		  // If the importer is in node compatibility mode or this is not an ESM
		  // file that has been converted to a CommonJS file using a Babel-
		  // compatible transform (i.e. "__esModule" has not been set), then set
		  // "default" to the CommonJS "module.exports" for node compatibility.
		  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
		  mod
		));
		var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

		// src/client/index.tsx
		var index_exports = {};
		__export(index_exports, {
		  apply: () => apply,
		  inject: () => inject
		});
		module.exports = __toCommonJS(index_exports);

		// src/client/locales.ts
		var zh = {
		  "action.label": "\u4E00\u952E\u91CD\u542F",
		  "action.hint": "\u4E00\u952E\u91CD\u542F (Ctrl+Alt+R)",
		  "action.hintWith": "\u4E00\u952E\u91CD\u542F ({combo})",
		  "action.pending": "\u6B63\u5728\u91CD\u542F\u2026",
		  "action.failed": "\u91CD\u542F\u8BF7\u6C42\u672A\u80FD\u9001\u8FBE",
		  "settings.title": "\u4E00\u952E\u91CD\u542F",
		  "settings.subtitle": "\u91CD\u542F DeepSeek Harness \u5E76\u81EA\u52A8\u63A5\u7EED\u88AB\u4E2D\u65AD\u7684\u5DE5\u4F5C\u3002",
		  "settings.hotkey": "\u5FEB\u6377\u952E",
		  "settings.hotkeyHint": "\u70B9\u51FB\u540E\u6309\u4E0B\u65B0\u7684\u7EC4\u5408\u952E\u5373\u53EF\u6539\u952E\u3002\u770B\u95E8\u72D7\u4F1A\u91CD\u65B0\u6CE8\u518C\uFF1B\u82E5\u8BE5\u7EC4\u5408\u5DF2\u88AB\u5176\u5B83\u8F6F\u4EF6\u5360\u7528\uFF0C\u8FD9\u91CC\u4F1A\u663E\u793A\u51B2\u7A81\u3002",
		  "settings.hotkeyConflict": "\u8BE5\u7EC4\u5408\u952E\u5DF2\u88AB\u5176\u5B83\u7A0B\u5E8F\u5360\u7528\uFF0C\u8BF7\u6362\u4E00\u4E2A\u3002",
		  "settings.hotkeyAlternatives": "\u4EE5\u4E0B\u7EC4\u5408\u5F53\u524D\u53EF\u7528\uFF0C\u70B9\u51FB\u5373\u53EF\u91C7\u7528\uFF1A",
		  "settings.hotkeyRecording": "\u8BF7\u6309\u4E0B\u65B0\u7684\u7EC4\u5408\u952E\u2026",
		  "settings.watchdog": "\u770B\u95E8\u72D7",
		  "settings.watchdogRunning": "\u8FD0\u884C\u4E2D",
		  "settings.watchdogStopped": "\u672A\u8FD0\u884C",
		  "settings.watchdogPid": "\u8FDB\u7A0B\u53F7",
		  "settings.enabled": "\u542F\u7528\u770B\u95E8\u72D7",
		  "settings.enabledHint": "\u5173\u95ED\u540E\u5FEB\u6377\u952E\u5931\u6548\uFF0C\u53EA\u5269\u9875\u9762\u4E0A\u7684\u6309\u94AE\u3002",
		  "settings.foregroundOnly": "\u4EC5\u5728 DSH \u4F4D\u4E8E\u524D\u53F0\u65F6\u54CD\u5E94",
		  "settings.foregroundOnlyHint": "\u907F\u514D\u5728\u5176\u5B83\u8F6F\u4EF6\u91CC\u8BEF\u89E6\u3002",
		  "settings.graceful": "\u4F18\u96C5\u5173\u95ED\u7B49\u5F85\uFF08\u6BEB\u79D2\uFF09",
		  "settings.gracefulHint": "\u5148\u8BF7\u6C42\u6B63\u5E38\u9000\u51FA\uFF0C\u8D85\u65F6\u624D\u5F3A\u5236\u7ED3\u675F\u3002\u7ED9\u5F97\u8D8A\u8DB3\uFF0C\u4F1A\u8BDD\u65E5\u5FD7\u8D8A\u5B89\u5168\u3002",
		  "settings.maxAttempts": "\u7194\u65AD\u9608\u503C",
		  "settings.maxAttemptsHint": "\u540C\u4E00\u4EFB\u52A1\u8FDE\u7EED\u6062\u590D\u5931\u8D25\u8FBE\u5230\u8BE5\u6B21\u6570\u540E\u653E\u5F03\uFF0C\u907F\u514D\u9677\u5165\u91CD\u542F\u6B7B\u5FAA\u73AF\u3002",
		  "settings.recovery": "\u6062\u590D\u8303\u56F4",
		  "settings.recoveryHint": "\u91CD\u542F\u540E\u81EA\u52A8\u63A5\u7EED\u54EA\u4E9B\u88AB\u4E2D\u65AD\u7684\u5DE5\u4F5C\u3002",
		  "settings.recoveryTaskBoard": "\u4EFB\u52A1\u770B\u677F\u5361\u7247",
		  "settings.recoveryGoals": "\u76EE\u6807\uFF08goal\uFF09\u4F1A\u8BDD",
		  "settings.recoveryJobs": "\u540E\u53F0\u4EFB\u52A1",
		  "settings.recoveryTurns": "\u4F1A\u8BDD\u4E2D\u88AB\u4E2D\u65AD\u7684\u4E00\u8F6E",
		  "settings.autoContinue": "\u81EA\u52A8\u8865\u4E00\u53E5\u300C\u7EE7\u7EED\u300D",
		  "settings.autoContinueHint": "\u5BF9\u4E2D\u65AD\u7684\u4F1A\u8BDD\u81EA\u52A8\u53D1\u9001\u7EE7\u7EED\u6307\u4EE4\uFF0C\u5305\u542B\u4F60\u6B63\u5728\u770B\u7684\u8FD9\u4E2A\u4F1A\u8BDD\u3002",
		  "settings.pending": "\u5F85\u6062\u590D\u6E05\u5355",
		  "settings.pendingEmpty": "\u5F53\u524D\u6CA1\u6709\u5F85\u6062\u590D\u7684\u5DE5\u4F5C\u3002",
		  "settings.pendingItem": "\u5DF2\u5C1D\u8BD5 {attempts} \u6B21",
		  "settings.lastRecovery": "\u4E0A\u6B21\u6062\u590D\u7ED3\u679C",
		  "settings.lastRecoveryNone": "\u672C\u6B21\u542F\u52A8\u6CA1\u6709\u9700\u8981\u6062\u590D\u7684\u5DE5\u4F5C\u3002",
		  "settings.recovered": "\u5DF2\u6062\u590D",
		  "settings.failed": "\u5931\u8D25",
		  "settings.skipped": "\u5DF2\u8DF3\u8FC7",
		  "settings.givenUp": "\u5DF2\u653E\u5F03",
		  "settings.restartNow": "\u7ACB\u5373\u91CD\u542F",
		  "settings.stopWatchdog": "\u505C\u6B62\u770B\u95E8\u72D7",
		  "settings.startWatchdog": "\u542F\u52A8\u770B\u95E8\u72D7",
		  "settings.saved": "\u5DF2\u4FDD\u5B58",
		  "settings.saveFailed": "\u4FDD\u5B58\u5931\u8D25",
		  "settings.unavailable": "\u65E0\u6CD5\u8BFB\u53D6\u63D2\u4EF6\u72B6\u6001\uFF1A\u5BBF\u4E3B\u7AEF\u8DEF\u7531\u672A\u6302\u8F7D\u3002"
		};
		var en = {
		  "action.label": "Restart",
		  "action.hint": "One-click restart (Ctrl+Alt+R)",
		  "action.hintWith": "One-click restart ({combo})",
		  "action.pending": "Restarting\u2026",
		  "action.failed": "The restart request could not be delivered",
		  "settings.title": "One-click restart",
		  "settings.subtitle": "Restart DeepSeek Harness and pick up the work it interrupted.",
		  "settings.hotkey": "Hotkey",
		  "settings.hotkeyHint": "Click, then press the new combination. The watchdog re-registers it; a combination another application owns is reported as a conflict here.",
		  "settings.hotkeyConflict": "Another application already owns that combination. Pick another.",
		  "settings.hotkeyAlternatives": "These are free right now \u2014 click to adopt one:",
		  "settings.hotkeyRecording": "Press the new combination\u2026",
		  "settings.watchdog": "Watchdog",
		  "settings.watchdogRunning": "running",
		  "settings.watchdogStopped": "not running",
		  "settings.watchdogPid": "pid",
		  "settings.enabled": "Enable the watchdog",
		  "settings.enabledHint": "With this off the hotkey stops working and only the header button remains.",
		  "settings.foregroundOnly": "Only while DSH is in the foreground",
		  "settings.foregroundOnlyHint": "Keeps the hotkey from firing inside other applications.",
		  "settings.graceful": "Graceful close wait (ms)",
		  "settings.gracefulHint": "A normal exit is requested first and force-killed only after this. Longer is safer for session logs.",
		  "settings.maxAttempts": "Breaker threshold",
		  "settings.maxAttemptsHint": "One item is given up on after this many consecutive failed recoveries, so a crashing task cannot become a restart loop.",
		  "settings.recovery": "Recovery scope",
		  "settings.recoveryHint": "Which interrupted work is resumed automatically after a restart.",
		  "settings.recoveryTaskBoard": "Task-board cards",
		  "settings.recoveryGoals": "Sessions with a goal",
		  "settings.recoveryJobs": "Background jobs",
		  "settings.recoveryTurns": "The interrupted turn",
		  "settings.autoContinue": 'Send an automatic "continue"',
		  "settings.autoContinueHint": "Posts a continue instruction to an interrupted session, including the one you are reading now.",
		  "settings.pending": "Queued for recovery",
		  "settings.pendingEmpty": "Nothing is queued for recovery.",
		  "settings.pendingItem": "tried {attempts}\xD7",
		  "settings.lastRecovery": "Last recovery",
		  "settings.lastRecoveryNone": "This boot had nothing to recover.",
		  "settings.recovered": "recovered",
		  "settings.failed": "failed",
		  "settings.skipped": "skipped",
		  "settings.givenUp": "given up",
		  "settings.restartNow": "Restart now",
		  "settings.stopWatchdog": "Stop the watchdog",
		  "settings.startWatchdog": "Start the watchdog",
		  "settings.saved": "Saved",
		  "settings.saveFailed": "Could not save",
		  "settings.unavailable": "Plugin status is unavailable: the host routes are not mounted."
		};

		// src/client/RestartButton.tsx
		var import_react = require("react");

		// src/client/api.ts
		var BASE = "api/one-click-restart";
		var TIMEOUT_MS = 1e4;
		async function request(path, init) {
		  const controller = new AbortController();
		  const timer = setTimeout(() => {
		    controller.abort();
		  }, TIMEOUT_MS);
		  try {
		    const response = await fetch(`${BASE}/${path}`, {
		      cache: "no-store",
		      ...init,
		      signal: controller.signal
		    });
		    const text = await response.text();
		    if (!response.ok) {
		      throw new Error(text.trim() === "" ? `HTTP ${response.status}` : text.slice(0, 300));
		    }
		    if (text.trim() === "") throw new Error("the host answered with an empty body");
		    return JSON.parse(text);
		  } finally {
		    clearTimeout(timer);
		  }
		}
		async function fetchStatus() {
		  return await request("status");
		}
		async function pushSettings(patch) {
		  return await request("settings", {
		    method: "POST",
		    headers: { "content-type": "application/json" },
		    body: JSON.stringify(patch)
		  });
		}
		async function triggerRestart(reason) {
		  return await request("restart", {
		    method: "POST",
		    headers: { "content-type": "application/json" },
		    body: JSON.stringify({ reason })
		  });
		}
		async function controlWatchdog(action) {
		  return await request("watchdog", {
		    method: "POST",
		    headers: { "content-type": "application/json" },
		    body: JSON.stringify({ action })
		  });
		}
		async function continueIfInterrupted(sessionId, inputActions, storage = globalThis.localStorage, delayMs = 5e3) {
		  const status = await fetchStatus();
		  if (!status.settings.autoContinue) return false;
		  if (status.resumedFromSnapshot !== true) return false;
		  if (!status.pending.items.some((item) => item.key === `turn:${sessionId}`)) return false;
		  const stampKey = `dsh-one-click-restart:continued:${sessionId}`;
		  const stamp = String(status.hostStartedAt);
		  try {
		    if (storage?.getItem(stampKey) === stamp) return false;
		  } catch {
		  }
		  await new Promise((resolve) => setTimeout(resolve, delayMs));
		  try {
		    storage?.setItem(stampKey, stamp);
		  } catch {
		  }
		  inputActions.setDraft("\u7EE7\u7EED");
		  inputActions.submit();
		  return true;
		}

		// src/client/glyph.tsx
		var primitives = __toESM(require("@deepseek-ai/dsh-client-ui-primitives"), 1);
		var import_jsx_runtime = require("react/jsx-runtime");
		var ShellRefresh = primitives.IconRefreshOutlineRegular;
		function InlineRefresh({ size = 16 }) {
		  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
		    "svg",
		    {
		      width: size,
		      height: size,
		      viewBox: "0 0 24 24",
		      fill: "none",
		      stroke: "currentColor",
		      strokeWidth: 1.8,
		      strokeLinecap: "round",
		      strokeLinejoin: "round",
		      "aria-hidden": "true",
		      focusable: "false",
		      children: [
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 12a9 9 0 1 0 9-9c-2.52 0-4.93 1-6.74 2.74L3 8" }),
		        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M3 3v5h5" })
		      ]
		    }
		  );
		}
		function RefreshGlyph({ size = 16 }) {
		  return ShellRefresh !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShellRefresh, { size }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(InlineRefresh, { size });
		}

		// src/client/RestartButton.tsx
		var import_jsx_runtime2 = require("react/jsx-runtime");
		var FAILURE_VISIBLE_MS = 4e3;
		function translator(t) {
		  if (typeof t === "function") return t;
		  return (key) => zh[key] ?? key;
		}
		function formatCombo(hotkey) {
		  if (hotkey === void 0 || !Array.isArray(hotkey.modifiers)) return void 0;
		  const names = hotkey.modifiers.map((modifier) => modifier === "Control" ? "Ctrl" : modifier);
		  return [...names, String(hotkey.key).toUpperCase()].join("+");
		}
		function RestartButton({ t, sessionId, inputActions }) {
		  const trRef = (0, import_react.useRef)(translator(t));
		  trRef.current = translator(t);
		  const tr = trRef.current;
		  const [phase, setPhase] = (0, import_react.useState)("idle");
		  const [hint, setHint] = (0, import_react.useState)(void 0);
		  const resetTimer = (0, import_react.useRef)(void 0);
		  const continued = (0, import_react.useRef)(false);
		  const hasSession = typeof sessionId === "string" && sessionId !== "";
		  const refreshHint = (0, import_react.useCallback)(() => {
		    void fetchStatus().then(
		      (status) => {
		        const combo = formatCombo(status.settings.hotkey);
		        setHint(combo === void 0 ? void 0 : trRef.current("action.hintWith", { combo }));
		      },
		      () => {
		      }
		    );
		  }, []);
		  (0, import_react.useEffect)(() => {
		    refreshHint();
		  }, [refreshHint]);
		  (0, import_react.useEffect)(() => {
		    if (!hasSession || inputActions === void 0 || continued.current) return;
		    continued.current = true;
		    void continueIfInterrupted(sessionId, inputActions).catch(() => {
		    });
		  }, [hasSession, sessionId, inputActions]);
		  (0, import_react.useEffect)(() => () => {
		    if (resetTimer.current !== void 0) clearTimeout(resetTimer.current);
		  }, []);
		  const onClick = (0, import_react.useCallback)(() => {
		    if (phase === "pending") return;
		    setPhase("pending");
		    const fail = () => {
		      setPhase("failed");
		      if (resetTimer.current !== void 0) clearTimeout(resetTimer.current);
		      resetTimer.current = setTimeout(() => {
		        setPhase("idle");
		      }, FAILURE_VISIBLE_MS);
		    };
		    void triggerRestart("button").then((result) => {
		      if (!result.ok) fail();
		    }, fail);
		  }, [phase]);
		  const label = phase === "pending" ? tr("action.pending") : phase === "failed" ? tr("action.failed") : tr("action.label");
		  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
		    "button",
		    {
		      type: "button",
		      className: "dsh-ocr-seat",
		      "data-phase": phase,
		      "data-dsh-plugin": "one-click-restart",
		      onClick,
		      onMouseEnter: refreshHint,
		      disabled: phase === "pending",
		      "aria-label": hint ?? label,
		      title: hint ?? tr("action.hint"),
		      children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(RefreshGlyph, { size: 16 })
		    }
		  );
		}

		// src/client/SettingsPanel.tsx
		var import_react2 = require("react");
		var import_jsx_runtime3 = require("react/jsx-runtime");
		var SAVED_VISIBLE_MS = 2200;
		function translator2(t) {
		  if (typeof t === "function") return t;
		  return (key) => zh[key] ?? key;
		}
		function formatHotkey(hotkey) {
		  const names = hotkey.modifiers.map((modifier) => modifier === "Control" ? "Ctrl" : modifier);
		  return [...names, hotkey.key.toUpperCase()].join(" + ");
		}
		function parseHotkeyLabel(label) {
		  const parts = label.split("+").map((part) => part.trim()).filter((part) => part !== "");
		  const key = parts.length > 0 ? parts[parts.length - 1] : "R";
		  const modifiers = parts.slice(0, -1).map((part) => part === "Ctrl" ? "Control" : part);
		  return { modifiers, key };
		}
		function normalizeKey(event) {
		  const code = event.code;
		  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
		  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
		  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(code)) return code;
		  switch (code) {
		    case "Space":
		      return "Space";
		    case "Escape":
		      return "Escape";
		    case "Tab":
		      return "Tab";
		    case "Enter":
		      return "Enter";
		    case "Home":
		      return "Home";
		    case "End":
		      return "End";
		    case "Insert":
		      return "Insert";
		    case "Delete":
		      return "Delete";
		    default:
		      return void 0;
		  }
		}
		function SettingsPanel({ t: ownerTranslate }) {
		  const t = translator2(ownerTranslate);
		  const [status, setStatus] = (0, import_react2.useState)(void 0);
		  const [failure, setFailure] = (0, import_react2.useState)(void 0);
		  const [recording, setRecording] = (0, import_react2.useState)(false);
		  const [busy, setBusy] = (0, import_react2.useState)(false);
		  const [saved, setSaved] = (0, import_react2.useState)(false);
		  const [gracefulDraft, setGracefulDraft] = (0, import_react2.useState)("");
		  const [attemptsDraft, setAttemptsDraft] = (0, import_react2.useState)("");
		  (0, import_react2.useEffect)(() => {
		    let alive = true;
		    void fetchStatus().then(
		      (next) => {
		        if (!alive) return;
		        setStatus(next);
		        setFailure(void 0);
		      },
		      (caught) => {
		        if (alive) setFailure(caught instanceof Error ? caught.message : String(caught));
		      }
		    );
		    return () => {
		      alive = false;
		    };
		  }, []);
		  const patch = (0, import_react2.useCallback)(async (change) => {
		    setBusy(true);
		    try {
		      setStatus(await pushSettings(change));
		      setFailure(void 0);
		      setSaved(true);
		      setTimeout(() => {
		        setSaved(false);
		      }, SAVED_VISIBLE_MS);
		    } catch (caught) {
		      setFailure(caught instanceof Error ? caught.message : String(caught));
		    } finally {
		      setBusy(false);
		    }
		  }, []);
		  (0, import_react2.useEffect)(() => {
		    if (!recording) return;
		    const onKeyDown = (event) => {
		      event.preventDefault();
		      event.stopPropagation();
		      if (event.code === "Escape") {
		        setRecording(false);
		        return;
		      }
		      const modifiers = [];
		      if (event.ctrlKey) modifiers.push("Control");
		      if (event.altKey) modifiers.push("Alt");
		      if (event.shiftKey) modifiers.push("Shift");
		      if (event.metaKey) modifiers.push("Win");
		      const key = normalizeKey(event);
		      if (key === void 0 || modifiers.length === 0) return;
		      setRecording(false);
		      void patch({ hotkey: { modifiers, key } });
		    };
		    window.addEventListener("keydown", onKeyDown, true);
		    return () => {
		      window.removeEventListener("keydown", onKeyDown, true);
		    };
		  }, [recording, patch]);
		  const settings = status?.settings;
		  (0, import_react2.useEffect)(() => {
		    if (settings === void 0) return;
		    setGracefulDraft(String(settings.gracefulTimeoutMs));
		    setAttemptsDraft(String(settings.maxAttempts));
		  }, [settings?.gracefulTimeoutMs, settings?.maxAttempts]);
		  const title = /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { children: t("settings.title") });
		  if (status === void 0) {
		    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-panel", children: [
		      title,
		      failure === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsh-ocr-note", children: "\u2026" }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsh-ocr-error", children: t("settings.unavailable") }),
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsh-ocr-note", children: failure })
		      ] })
		    ] });
		  }
		  const { watchdog, pending, lastRecovery } = status;
		  const current = status.settings;
		  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-panel", children: [
		    title,
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsh-ocr-subtitle", children: t("settings.subtitle") }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-row", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-main", children: [
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-label", children: t("settings.watchdog") }),
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-hint", children: [
		          watchdog.running ? t("settings.watchdogRunning") : t("settings.watchdogStopped"),
		          watchdog.pid === void 0 ? "" : ` \xB7 ${t("settings.watchdogPid")} ${watchdog.pid}`,
		          watchdog.restartCount === void 0 ? "" : ` \xB7 \xD7${watchdog.restartCount}`
		        ] }),
		        watchdog.hotkeyError == null || watchdog.hotkeyError === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-error", children: [
		          t("settings.hotkeyConflict"),
		          " (",
		          watchdog.hotkeyError,
		          ")"
		        ] }),
		        watchdog.hotkeyRegistered !== true && (watchdog.hotkeyAlternatives?.length ?? 0) > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-hint", children: [
		          t("settings.hotkeyAlternatives"),
		          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 5 }, children: (watchdog.hotkeyAlternatives ?? []).map((combo) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
		            "button",
		            {
		              type: "button",
		              className: "dsh-ocr-key",
		              disabled: busy,
		              onClick: () => {
		                void patch({ hotkey: parseHotkeyLabel(combo) });
		              },
		              children: combo
		            },
		            combo
		          )) })
		        ] }) : null
		      ] }),
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-side", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "dsh-ocr-badge", "data-state": watchdog.running ? "on" : "off", children: watchdog.hotkeyRegistered === true ? watchdog.hotkey ?? formatHotkey(current.hotkey) : "\u2014" }) })
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-row", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-main", children: [
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-label", children: t("settings.hotkey") }),
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-hint", children: recording ? t("settings.hotkeyRecording") : t("settings.hotkeyHint") })
		      ] }),
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-side", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
		        "button",
		        {
		          type: "button",
		          className: "dsh-ocr-key",
		          "data-recording": recording ? "true" : void 0,
		          onClick: () => {
		            setRecording((value) => !value);
		          },
		          children: recording ? "\u2026" : formatHotkey(current.hotkey)
		        }
		      ) })
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-row", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-main", children: [
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-label", children: t("settings.enabled") }),
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-hint", children: t("settings.enabledHint") })
		      ] }),
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-side", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: "dsh-ocr-check", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
		        "input",
		        {
		          type: "checkbox",
		          checked: current.enabled,
		          disabled: busy,
		          onChange: (event) => {
		            void patch({ enabled: event.target.checked });
		          }
		        }
		      ) }) })
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-row", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-main", children: [
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-label", children: t("settings.foregroundOnly") }),
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-hint", children: t("settings.foregroundOnlyHint") })
		      ] }),
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-side", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { className: "dsh-ocr-check", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
		        "input",
		        {
		          type: "checkbox",
		          checked: current.onlyWhenForeground,
		          disabled: busy,
		          onChange: (event) => {
		            void patch({ onlyWhenForeground: event.target.checked });
		          }
		        }
		      ) }) })
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-row", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-main", children: [
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-label", children: t("settings.graceful") }),
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-hint", children: t("settings.gracefulHint") })
		      ] }),
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-side", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
		        "input",
		        {
		          className: "dsh-ocr-input",
		          type: "number",
		          min: 500,
		          max: 3e4,
		          step: 500,
		          value: gracefulDraft,
		          disabled: busy,
		          onChange: (event) => {
		            setGracefulDraft(event.target.value);
		          },
		          onBlur: () => {
		            const value = Number(gracefulDraft);
		            if (Number.isFinite(value)) void patch({ gracefulTimeoutMs: value });
		          }
		        }
		      ) })
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-row", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-main", children: [
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-label", children: t("settings.maxAttempts") }),
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-hint", children: t("settings.maxAttemptsHint") })
		      ] }),
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-side", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
		        "input",
		        {
		          className: "dsh-ocr-input",
		          type: "number",
		          min: 1,
		          max: 10,
		          step: 1,
		          value: attemptsDraft,
		          disabled: busy,
		          onChange: (event) => {
		            setAttemptsDraft(event.target.value);
		          },
		          onBlur: () => {
		            const value = Number(attemptsDraft);
		            if (Number.isFinite(value)) void patch({ maxAttempts: value });
		          }
		        }
		      ) })
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-section", children: t("settings.recovery") }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsh-ocr-subtitle", children: t("settings.recoveryHint") }),
		    [
		      ["taskBoard", "settings.recoveryTaskBoard"],
		      ["goals", "settings.recoveryGoals"],
		      ["jobs", "settings.recoveryJobs"],
		      ["sessionTurns", "settings.recoveryTurns"]
		    ].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "dsh-ocr-check", style: { padding: "5px 0" }, children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
		        "input",
		        {
		          type: "checkbox",
		          checked: current.recovery[key],
		          disabled: busy,
		          onChange: (event) => {
		            void patch({ recovery: { [key]: event.target.checked } });
		          }
		        }
		      ),
		      t(label)
		    ] }, key)),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "dsh-ocr-check", style: { padding: "9px 0", borderTop: "1px solid var(--dsw-alias-border-l1)" }, children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
		        "input",
		        {
		          type: "checkbox",
		          checked: current.autoContinue,
		          disabled: busy,
		          onChange: (event) => {
		            void patch({ autoContinue: event.target.checked });
		          }
		        }
		      ),
		      t("settings.autoContinue")
		    ] }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-hint", style: { marginTop: -4 }, children: t("settings.autoContinueHint") }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-section", children: t("settings.pending") }),
		    pending.items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsh-ocr-note", children: t("settings.pendingEmpty") }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { className: "dsh-ocr-list", children: pending.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("li", { children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { children: item.kind }),
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: item.label }),
		      item.attempts > 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
		        "\xB7 ",
		        t("settings.pendingItem", { attempts: String(item.attempts) })
		      ] }) : null
		    ] }, item.key)) }),
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "dsh-ocr-section", children: t("settings.lastRecovery") }),
		    lastRecovery === void 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsh-ocr-note", children: t("settings.lastRecoveryNone") }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsh-ocr-note", children: `${t("settings.recovered")} ${lastRecovery.recovered} \xB7 ${t("settings.failed")} ${lastRecovery.failed} \xB7 ${t("settings.skipped")} ${lastRecovery.skipped} \xB7 ${t("settings.givenUp")} ${lastRecovery.givenUp}` }),
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("ul", { className: "dsh-ocr-list", children: lastRecovery.outcomes.map((outcome) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("li", { children: [
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("code", { children: outcome.status }),
		        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: outcome.label }),
		        outcome.error === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "dsh-ocr-error", children: [
		          "\xB7 ",
		          outcome.error
		        ] })
		      ] }, outcome.key)) })
		    ] }),
		    failure === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsh-ocr-error", children: failure }),
		    saved ? /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "dsh-ocr-note", children: t("settings.saved") }) : null,
		    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "dsh-ocr-actions", children: [
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
		        "button",
		        {
		          type: "button",
		          className: "dsh-ocr-btn",
		          "data-variant": "primary",
		          disabled: busy,
		          onClick: () => {
		            void triggerRestart("settings");
		          },
		          children: t("settings.restartNow")
		        }
		      ),
		      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
		        "button",
		        {
		          type: "button",
		          className: "dsh-ocr-btn",
		          disabled: busy,
		          onClick: () => {
		            void controlWatchdog(watchdog.running ? "stop" : "start").then(setStatus, () => {
		            });
		          },
		          children: watchdog.running ? t("settings.stopWatchdog") : t("settings.startWatchdog")
		        }
		      )
		    ] })
		  ] });
		}

		// src/client/styles.ts
		var STYLE_ID = "dsh-one-click-restart-styles";
		var CSS = `
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
		`;
		function ensureStyles() {
		  if (typeof document === "undefined") return;
		  if (document.getElementById(STYLE_ID) !== null) return;
		  const style = document.createElement("style");
		  style.id = STYLE_ID;
		  style.textContent = CSS;
		  document.head.appendChild(style);
		}

		// src/client/index.tsx
		var NS = "one-click-restart";
		var inject = ["slots", "locale"];
		var SEAT_ID = "one-click-restart";
		var SETTINGS_ID = "one-click-restart";
		function apply(ctx) {
		  ensureStyles();
		  ctx.effect(() => {
		    try {
		      return ctx.locale.register(NS, { zh, en });
		    } catch {
		      return () => {
		      };
		    }
		  }, "one-click-restart: dictionaries");
		  ctx.slots.inject("conversation.session.header.utilities", () => {
		    try {
		      return ctx.slots.register(
		        { name: "conversation.session.header.utilities", id: SEAT_ID, order: 100, locale: NS },
		        RestartButton
		      );
		    } catch {
		      return () => {
		      };
		    }
		  });
		  ctx.slots.inject("settings.plugins.tab", () => {
		    try {
		      return ctx.slots.register(
		        {
		          name: "settings.plugins.tab",
		          id: SETTINGS_ID,
		          order: 40,
		          locale: NS,
		          label: () => ctx.locale.bind(NS)("settings.title")
		        },
		        SettingsPanel
		      );
		    } catch {
		      return () => {
		      };
		    }
		  });
		}

		return module.exports;
	}
});
