/**
 * The dsh surfaces this package touches, declared locally.
 *
 * We deliberately do NOT take a devDependency on the published
 * `@deepseek-ai/*` packages. Their registry graph references internal packages
 * that were never published — installing anything that reaches
 * `dsh-client-connection` fails on `@deepseek-ai/dsh-user-interaction` (404) —
 * so that chain cannot be installed at all, and a package that cannot install
 * cannot be built.
 *
 * Declaring only the members we actually call keeps the source honest about
 * its surface and keeps the package free of that broken chain. Every signature
 * below is transcribed from the live service contract the running host
 * exposes, so the shapes match the runtime that loads us.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { ComponentType } from 'react'

/* ------------------------------------------------------------------- host */

/** One exact HTTP route registered on the host web server. */
export interface WebRoute {
  readonly kind: 'exact'
  readonly path: string
  readonly handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
}

/** The host web-server service (`ctx.webServer`). */
export interface WebServerService {
  register(route: WebRoute): () => void
}

/** An agent handle as `ctx.agents.list()` returns it. */
export interface AgentHandle {
  readonly id: string
}

/** `ctx.agents`. */
export interface AgentsService {
  list(): AgentHandle[]
  get(id: string): AgentHandle | undefined
}

/** Goal phase, exactly as the goal service defines it. */
export type GoalPhase = 'active' | 'paused' | 'blocked' | 'complete'

/**
 * Goal state as `ctx.goals.get()` returns it.
 *
 * `id` + `revision` form the optimistic-concurrency reference every mutating
 * call requires, and are exactly what a restart snapshot must carry in order
 * to rearm the goal on the next boot.
 */
export interface GoalView {
  readonly id: string
  readonly revision: number
  readonly objective: string
  readonly phase: GoalPhase
  readonly roundsStarted: number
  readonly maxGoalRounds: number
  readonly activation: 'armed' | 'disarmed'
}

/** `ctx.goals`. */
export interface GoalsService {
  /** Throws when the agent is not the registry's live instance. */
  get(agent: AgentHandle): GoalView | undefined
  /** Resume and arm a stopped goal, or rearm an active one after a session-start edge. */
  resume(agent: AgentHandle, ref: { readonly id: string; readonly revision: number }): GoalView
}

/** One committed session event, as far as this plugin needs to read it. */
export interface SessionEventLike {
  readonly type: string
}

/**
 * A live session, as far as this plugin needs to read it.
 *
 * `snapshotEvents` is the engine's own log, and it is what makes an honest
 * "was this interrupted?" answer possible at all: a turn that opened and never
 * closed is a recorded fact, whereas "the session is open" is not.
 */
export interface SessionHandle {
  readonly id: string
  /** Last committed event offset. */
  readonly seq: number
  snapshotEvents(fromSeq?: number, toSeqExclusive?: number): readonly SessionEventLike[]
}

/** `ctx.sessions` — the in-memory session store. */
export interface SessionsService {
  list(): SessionHandle[]
  get(id: string): SessionHandle | undefined
}

/**
 * The host plugin context. Cordis injects the context; only the members this
 * package calls are declared.
 */
export interface HostContext {
  readonly webServer: WebServerService
  /** Register a disposer that runs when the plugin unloads. */
  effect(callback: () => (() => void) | void, name?: string): () => void
  /** Optional service lookup: absent services return undefined. */
  get<T = unknown>(name: string): T | undefined
}

/* ----------------------------------------------------------------- client */

/** Options accepted by `ctx.slots.register`. */
export interface SlotRegistration {
  readonly name: string
  readonly id: string
  readonly order?: number
  /** Dictionary namespace used for the occupant's accessible name. */
  readonly locale?: string
  /**
   * Display text where the owner projects one (nav rows, tabs).
   *
   * A list-slot owner — the Plugins settings section among them — renders this
   * as the tab's visible text. Registering without it produces a tab that is
   * present but unreadable, which looks exactly like the page not being there.
   * A thunk is re-read on every projection, so localized text follows the
   * active locale without re-registering.
   */
  readonly label?: string | (() => string)
}

/** The client slot service (`ctx.slots`). */
export interface SlotsService {
  /**
   * Register one occupant. The owner composes the component's props (standard
   * hooks, plus `t` when `locale` names a namespace), so the component type
   * cannot be pinned to an empty prop bag.
   */
  register(options: SlotRegistration, component: ComponentType<any>): () => void
  inject(key: string, callback: () => (() => void) | void): () => void
}

/** The client locale service (`ctx.locale`). */
export interface LocaleService {
  register(ns: string, dicts: Record<string, Record<string, string>>): () => void
  bind(ns: string): (key: string, vars?: Record<string, unknown>) => string
  getLocale(): { id: string }
  subscribe(fn: () => void): () => void
}

/** The client plugin context. */
export interface ClientContext {
  readonly slots: SlotsService
  readonly locale: LocaleService
  effect(callback: () => (() => void) | void, name?: string): () => void
  get<T = unknown>(name: string): T | undefined
}
