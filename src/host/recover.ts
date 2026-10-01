/**
 * Replay interrupted work after a restart.
 *
 * The pass runs once per boot, a few seconds after the host has settled: the
 * task board performs its own boot recovery (settling the runs the restart
 * killed), and racing it would queue a run for a card that is still being
 * reconciled.
 *
 * The breaker is the part worth reading twice. An item that fails
 * `maxAttempts` boots in a row is dropped rather than retried forever, so a
 * task that takes the application down on start cannot turn this plugin into a
 * restart loop — the failure mode that would make it worse than useless.
 */
import type { AgentHandle, AgentsService, GoalsService, HostContext } from '../types.ts'
import { sameOriginHeaders } from './http.ts'
import { selfBaseUrl } from './probe.ts'
import type { PluginSettings } from './settings.ts'
import type { RecoveryItem } from './snapshot.ts'

/** One recovery attempt's outcome, as the settings page reports it. */
export interface RecoveryOutcome {
  kind: RecoveryItem['kind']
  key: string
  label: string
  status: 'recovered' | 'failed' | 'skipped' | 'given-up'
  error?: string
}

/** What one pass over the snapshot produced. */
export interface RecoveryReport {
  startedAt: number
  finishedAt: number
  attempted: number
  recovered: number
  failed: number
  skipped: number
  givenUp: number
  outcomes: RecoveryOutcome[]
  /** Items that must stay queued for a later boot. */
  remaining: RecoveryItem[]
}

/** One board action must not outlive this. */
const RECOVER_TIMEOUT_MS = 15_000

/** How long the pass waits for a session's live agent to appear. */
const AGENT_WAIT_MS = 45_000

/**
 * Ask the board to run one card again.
 *
 * The envelope is exactly `{requestId, action, initiator}` because the board's
 * parser rejects any other key set, and `action` is exactly `{kind, taskId}`
 * for the same reason.
 * @param item - the snapshot item naming the card.
 */
async function recoverTaskBoard(item: RecoveryItem): Promise<void> {
  const base = selfBaseUrl()
  if (base === undefined) {
    throw new Error('DSH_WEB_URL is unavailable, so the task board cannot be reached')
  }
  const taskId = typeof item.data.taskId === 'string' ? item.data.taskId : ''
  if (taskId === '') throw new Error('snapshot item carries no taskId')

  const controller = new AbortController()
  const timer = setTimeout(() => { controller.abort() }, RECOVER_TIMEOUT_MS)
  try {
    const response = await fetch(`${base}/api/task-board/action`, {
      method: 'POST',
      headers: { ...sameOriginHeaders(base), 'content-type': 'application/json' },
      body: JSON.stringify({
        requestId: `one-click-restart-${Date.now().toString(36)}-${taskId}`.slice(0, 200),
        action: { kind: 'run', taskId },
        initiator: 'dsh-one-click-restart',
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`task board answered HTTP ${response.status}${detail === '' ? '' : `: ${detail.slice(0, 200)}`}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Wait for a session's live agent.
 *
 * Recovery runs on a timer after boot, and a session the user has not opened
 * yet has no live agent at all — so asking once and giving up would report a
 * failure that is really just an ordering artefact of the restart.
 * @param agents - the agent registry.
 * @param sessionId - the session being resumed.
 * @param timeoutMs - how long to keep asking.
 * @returns the live agent, or undefined when it never appeared.
 */
async function waitForAgent(
  agents: AgentsService,
  sessionId: string,
  timeoutMs: number,
): Promise<AgentHandle | undefined> {
  const deadline = Date.now() + timeoutMs
  for (;;) {
    let agent: AgentHandle | undefined
    try {
      agent = agents.get(sessionId)
    } catch {
      agent = undefined
    }
    if (agent !== undefined) return agent
    if (Date.now() >= deadline) return undefined
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

/**
 * Rearm the goal a session was working on.
 *
 * Resuming is what restores automatic continuation: the goal's own round
 * driver takes it from there, which is precisely the "pick up where it left
 * off" behaviour a restart is supposed to produce.
 * @param ctx - host context carrying the agent and goal services.
 * @param item - the snapshot item naming the session and goal.
 */
async function recoverGoal(ctx: HostContext, item: RecoveryItem): Promise<void> {
  const agents = ctx.get<AgentsService>('agents')
  const goals = ctx.get<GoalsService>('goals')
  if (agents === undefined || goals === undefined) {
    throw new Error('this deployment serves no goals service')
  }
  const sessionId = typeof item.data.sessionId === 'string' ? item.data.sessionId : ''
  if (sessionId === '') throw new Error('snapshot item carries no sessionId')
  const agent = await waitForAgent(agents, sessionId, AGENT_WAIT_MS)
  if (agent === undefined) {
    throw new Error(`session ${sessionId} has no live agent`)
  }

  let goalId = typeof item.data.goalId === 'string' ? item.data.goalId : ''
  let revision = typeof item.data.revision === 'number' ? item.data.revision : undefined
  if (goalId === '' || revision === undefined) {
    // A snapshot written by an older build — or taken before this session's
    // agent existed — may not carry the goal identity. Ask the service for the
    // current one rather than failing a recovery that is perfectly possible.
    const current = goals.get(agent)
    if (current === undefined) throw new Error('this session carries no goal to resume')
    goalId = current.id
    revision = current.revision
  }

  // Revisions are durable, so a captured value is still the expected one. A
  // mismatch means something else changed the goal in the meantime, and letting
  // that throw is the honest answer.
  goals.resume(agent, { id: goalId, revision })
}

/**
 * Run one recovery pass.
 * @param ctx - host context, for the services a kind needs.
 * @param items - items to attempt (already filtered by the recovery scope).
 * @param settings - supplies the breaker threshold.
 * @returns a report plus the items that must stay queued.
 */
export async function runRecovery(
  ctx: HostContext,
  items: readonly RecoveryItem[],
  settings: PluginSettings,
): Promise<RecoveryReport> {
  const startedAt = Date.now()
  const outcomes: RecoveryOutcome[] = []
  const remaining: RecoveryItem[] = []

  for (const item of items) {
    let failure: string | undefined
    let skipped = false
    try {
      switch (item.kind) {
        case 'task-board':
          await recoverTaskBoard(item)
          break
        case 'goal':
          await recoverGoal(ctx, item)
          break
        case 'turn':
          // Carried out by the page: it is the only half that can type into the
          // composer, and it does so only when the user left the switch on. The
          // item stays queued so the page can still see it — dropping it here
          // would remove the very record the page reads.
          outcomes.push({ kind: item.kind, key: item.key, label: item.label, status: 'skipped' })
          remaining.push(item)
          continue
        default:
          // Background jobs are recorded but not replayed yet.
          skipped = true
      }
    } catch (caught) {
      failure = caught instanceof Error ? caught.message : String(caught)
    }

    if (skipped) {
      outcomes.push({ kind: item.kind, key: item.key, label: item.label, status: 'skipped' })
      continue
    }
    if (failure === undefined) {
      outcomes.push({ kind: item.kind, key: item.key, label: item.label, status: 'recovered' })
      continue
    }

    const attempts = item.attempts + 1
    if (attempts >= settings.maxAttempts) {
      outcomes.push({ kind: item.kind, key: item.key, label: item.label, status: 'given-up', error: failure })
      continue
    }
    outcomes.push({ kind: item.kind, key: item.key, label: item.label, status: 'failed', error: failure })
    remaining.push({ ...item, attempts, lastAttemptAt: Date.now(), lastError: failure })
  }

  const countOf = (status: RecoveryOutcome['status']): number => outcomes.filter(outcome => outcome.status === status).length
  return {
    startedAt,
    finishedAt: Date.now(),
    attempted: outcomes.length,
    recovered: countOf('recovered'),
    failed: countOf('failed'),
    skipped: countOf('skipped'),
    givenUp: countOf('given-up'),
    outcomes,
    remaining,
  }
}
