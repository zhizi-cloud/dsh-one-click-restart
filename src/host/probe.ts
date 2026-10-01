/**
 * Discover what is currently running, so the next boot can resume it.
 *
 * This runs on a cadence while everything is healthy — never at restart time —
 * because a host whose event loop is blocked cannot answer a probe. The last
 * good answer is what the next boot replays.
 *
 * Two sources, for two different reasons:
 *
 *  - the task board is a *separate plugin* with no public service, so its own
 *    HTTP route family is the only honest way in. It is reached over the
 *    loopback URL the host itself publishes in `DSH_WEB_URL`;
 *  - live goals come straight from the host context, with no network hop.
 */
import type { AgentsService, GoalsService, GoalView, HostContext, SessionEventLike, SessionHandle, SessionsService } from '../types.ts'
import { sameOriginHeaders } from './http.ts'
import type { RecoverySeed } from './snapshot.ts'

/**
 * The loopback base URL of this host's own HTTP surface.
 *
 * `DSH_WEB_URL` is injected into every dsh process, so it is authoritative
 * about the port actually in use. Without it we simply probe nothing rather
 * than guess a port and hammer whatever happens to answer.
 */
export function selfBaseUrl(): string | undefined {
  const raw = process.env.DSH_WEB_URL
  if (typeof raw !== 'string' || raw.trim() === '') return undefined
  return raw.trim().replace(/\/+$/, '')
}

/** One probe must not outlive this. */
const PROBE_TIMEOUT_MS = 4000

/** Task-board route family, owned by the task-board plugin. */
const TASK_BOARD_STATE = '/api/task-board/state'

/** Only the fields of a board task that this plugin reads. */
interface BoardTask {
  id?: unknown
  title?: unknown
  status?: unknown
}

/**
 * Read the tasks the board currently reports as running.
 *
 * Only `running` is taken: a card sitting in `todo` is work the user queued
 * deliberately and did not start, and re-running it on boot would be doing
 * something they never asked for.
 * @returns one seed per running task; empty when the board is absent.
 */
export async function probeTaskBoard(): Promise<RecoverySeed[]> {
  const base = selfBaseUrl()
  if (base === undefined) return []
  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, PROBE_TIMEOUT_MS)
  try {
    const response = await fetch(`${base}${TASK_BOARD_STATE}`, {
      headers: sameOriginHeaders(base),
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return []
    const snapshot = await response.json() as { tasks?: unknown }
    if (!Array.isArray(snapshot.tasks)) return []
    const seeds: RecoverySeed[] = []
    for (const entry of snapshot.tasks) {
      if (typeof entry !== 'object' || entry === null) continue
      const task = entry as BoardTask
      if (task.status !== 'running') continue
      if (typeof task.id !== 'string' || task.id === '') continue
      seeds.push({
        kind: 'task-board',
        key: `task-board:${task.id}`,
        label: typeof task.title === 'string' && task.title !== '' ? task.title : task.id,
        data: { taskId: task.id },
      })
    }
    return seeds
  } catch {
    // An absent board, a board mounted elsewhere, or a merely slow one is not
    // worth surfacing: it contributes no seeds this round.
    return []
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Live goals, read from the host's own service registry.
 *
 * A goal is disarmed when its session is resumed, so recording the session id
 * is what lets the next boot rearm it.
 * @param ctx - host plugin context.
 * @returns one seed per session carrying a live goal.
 */
export function probeGoals(ctx: HostContext): RecoverySeed[] {
  const agents = ctx.get<AgentsService>('agents')
  const goals = ctx.get<GoalsService>('goals')
  if (agents === undefined || goals === undefined) return []
  const seeds: RecoverySeed[] = []
  for (const agent of agents.list()) {
    let goal: GoalView | undefined
    try {
      goal = goals.get(agent)
    } catch {
      // Not the registry's live instance any more.
      continue
    }
    if (goal === undefined) continue
    // Only an active goal is an interruption worth undoing. Paused, blocked and
    // complete are decisions — the user's or policy's — and rearming them would
    // override that decision rather than repair a restart.
    if (goal.phase !== 'active') continue
    seeds.push({
      kind: 'goal',
      key: `goal:${agent.id}`,
      label: goal.objective !== '' ? goal.objective : agent.id,
      // The reference is what the resume call needs; the objective is only for
      // the settings page to render.
      data: { sessionId: agent.id, goalId: goal.id, revision: goal.revision },
    })
  }
  return seeds
}

/** How many trailing events are inspected when looking for an open turn. */
const TURN_SCAN_WINDOW = 2000

/**
 * Whether a session's most recent turn opened and never closed.
 *
 * This is the honest form of the question the plugin actually needs answered.
 *
 * An earlier version asked "is the session alive?", which is a different
 * question and was true for every open session — so the page typed "continue"
 * into the composer after every restart, overwriting whatever the user was
 * writing. `turn/start` with no matching `turn/end` is instead a recorded fact:
 * the process was killed while that turn was in flight.
 * @param session - the live session to inspect.
 * @returns true when the last turn boundary is an opening one.
 */
function hasOpenTurn(session: SessionHandle): boolean {
  const end = typeof session.seq === 'number' ? session.seq : 0
  const from = Math.max(0, end - TURN_SCAN_WINDOW)
  let events: readonly SessionEventLike[]
  try {
    events = session.snapshotEvents(from)
  } catch {
    return false
  }
  // Walk backwards: the answer sits at the nearest turn boundary, so this stops
  // as soon as it finds one instead of scanning the whole log.
  for (let i = events.length - 1; i >= 0; i--) {
    const type = events[i]?.type
    if (type === 'turn/end') return false
    if (type === 'turn/start') return true
  }
  return false
}

/**
 * Sessions whose last turn was cut off mid-flight.
 *
 * Only these are worth offering a continue to. A session that closed its turn
 * is idle, however recently it was used, and a session that never opened one
 * has nothing to resume.
 * @param ctx - host plugin context.
 * @returns one seed per interrupted session.
 */
export function probeSessions(ctx: HostContext): RecoverySeed[] {
  const sessions = ctx.get<SessionsService>('sessions')
  if (sessions === undefined) return []
  const seeds: RecoverySeed[] = []
  for (const session of sessions.list()) {
    if (!hasOpenTurn(session)) continue
    seeds.push({
      kind: 'turn',
      key: `turn:${session.id}`,
      label: session.id,
      data: { sessionId: session.id },
    })
  }
  return seeds
}

/** Everything currently worth resuming. */
export async function probeAll(ctx: HostContext): Promise<RecoverySeed[]> {
  const board = await probeTaskBoard()
  return [...board, ...probeGoals(ctx), ...probeSessions(ctx)]
}
