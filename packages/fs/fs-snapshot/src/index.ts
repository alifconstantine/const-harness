/**
 * Cordis Snapshot Service providing shadow git snapshots and file rollback (ctx.snapshot).
 *
 * @module @deepseek-ai/dsh-fs-snapshot
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { ShadowGit, type FileDiffStat, type ShadowGitOptions } from './git-shadow.ts'

export type { FileDiffStat, ShadowGitOptions }
export { ShadowGit }

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** The Shadow Git Snapshot and Rollback Service. */
    snapshot: SnapshotService
  }
}

/** Record of a turn's snapshot boundary and diffs. */
export interface TurnSnapshotRecord {
  sessionId: string
  turn: number
  beforeTreeId: string
  afterTreeId: string
  diffs: FileDiffStat[]
  timestamp: number
}

/**
 * Snapshot Service for capturing worktree states and managing rollbacks.
 */
export class SnapshotService extends Service {
  private readonly shadowCache = new Map<string, ShadowGit>()
  private readonly turnSnapshots = new Map<string, Map<number, TurnSnapshotRecord>>()

  constructor(ctx: Context) {
    super(ctx, 'snapshot')
  }

  /**
   * Get or create a ShadowGit instance for a given workspace path.
   * @param worktree - target workspace path.
   * @param projectId - optional project identifier.
   * @returns the ShadowGit instance.
   */
  getShadow(worktree: string, projectId?: string): ShadowGit {
    const key = `${worktree}::${projectId ?? ''}`
    let shadow = this.shadowCache.get(key)
    if (!shadow) {
      shadow = new ShadowGit({
        worktree,
        ...(projectId !== undefined ? { projectId } : {}),
      })
      this.shadowCache.set(key, shadow)
    }
    return shadow
  }

  /**
   * Capture a snapshot of a worktree directory.
   * @param worktree - target workspace path.
   * @param projectId - optional project identifier.
   * @param signal - optional abort signal.
   * @returns the captured snapshot git tree ID.
   */
  async capture(worktree: string, projectId?: string, signal?: AbortSignal): Promise<string> {
    const shadow = this.getShadow(worktree, projectId)
    return shadow.capture(signal)
  }

  /**
   * Compute structured file diffs between two snapshot tree IDs.
   * @param worktree - target workspace path.
   * @param fromTree - base tree ID.
   * @param toTree - target tree ID.
   * @param options - diff options including context lines, project ID, and abort signal.
   * @returns array of file diff statistics.
   */
  async diff(
    worktree: string,
    fromTree: string,
    toTree: string,
    options?: { context?: number; projectId?: string; signal?: AbortSignal },
  ): Promise<FileDiffStat[]> {
    const shadow = this.getShadow(worktree, options?.projectId)
    return shadow.diff(fromTree, toTree, options)
  }

  /**
   * Restore files in a worktree from a snapshot tree ID.
   * @param worktree - target workspace path.
   * @param treeId - snapshot tree ID to restore from.
   * @param options - restore options including specific paths, project ID, and abort signal.
   * @returns completion promise.
   */
  async restore(
    worktree: string,
    treeId: string,
    options?: { paths?: readonly string[]; projectId?: string; signal?: AbortSignal },
  ): Promise<void> {
    const shadow = this.getShadow(worktree, options?.projectId)
    return shadow.restore(treeId, options?.paths, options?.signal)
  }

  /**
   * Record a completed turn's snapshot boundary.
   * @param record - turn snapshot record containing session ID, turn number, and tree IDs.
   */
  recordTurnSnapshot(record: TurnSnapshotRecord): void {
    let sessionMap = this.turnSnapshots.get(record.sessionId)
    if (!sessionMap) {
      sessionMap = new Map()
      this.turnSnapshots.set(record.sessionId, sessionMap)
    }
    sessionMap.set(record.turn, record)
  }

  /**
   * Retrieve snapshot metadata for a turn.
   * @param sessionId - session identifier.
   * @param turn - turn number.
   * @returns the snapshot record for the turn, or undefined if not found.
   */
  getTurnSnapshot(sessionId: string, turn: number): TurnSnapshotRecord | undefined {
    return this.turnSnapshots.get(sessionId)?.get(turn)
  }

  /**
   * Rollback the workspace to the exact state before a turn executed.
   * @param sessionId - session identifier.
   * @param turn - turn number to rollback.
   * @param worktree - workspace directory path.
   * @param projectId - optional project identifier.
   * @returns result indicating success, restored file paths, and optional error message.
   */
  async rollbackTurn(
    sessionId: string,
    turn: number,
    worktree: string,
    projectId?: string,
  ): Promise<{ success: boolean; restoredFiles: string[]; error?: string }> {
    const record = this.getTurnSnapshot(sessionId, turn)
    if (!record) {
      return { success: false, restoredFiles: [], error: `No snapshot found for turn ${turn}` }
    }

    try {
      await this.restore(worktree, record.beforeTreeId, {
        ...(projectId !== undefined ? { projectId } : {}),
      })
      return { success: true, restoredFiles: record.diffs.map(d => d.path) }
    } catch (err) {
      return {
        success: false,
        restoredFiles: [],
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }
}

export const name = 'fs-snapshot'

/** Apply the snapshot service to the Cordis context. */
export function apply(ctx: Context): void {
  const service = new SnapshotService(ctx)
  const pendingTurns = new Map<string, { beforeTreeId: string }>()

  ctx.on('session/event', (session: Session, event: SessionEvent) => {
    void (async () => {
      const sessionId = session.header.id
      const worktree = session.header.cwd ?? process.cwd()

      if (event.type === 'turn/start') {
        const data = event.data as { turn?: number }
        const turn = data.turn ?? 1
        try {
          const beforeTreeId = await service.capture(worktree)
          pendingTurns.set(`${sessionId}:${turn}`, { beforeTreeId })
        } catch {
          // fail-soft snapshot capture
        }
      } else if (event.type === 'turn/end') {
        const data = event.data as { turn?: number }
        const turn = data.turn ?? 1
        const key = `${sessionId}:${turn}`
        const pending = pendingTurns.get(key)
        if (pending) {
          pendingTurns.delete(key)
          try {
            const afterTreeId = await service.capture(worktree)
            const diffs = await service.diff(worktree, pending.beforeTreeId, afterTreeId)
            service.recordTurnSnapshot({
              sessionId,
              turn,
              beforeTreeId: pending.beforeTreeId,
              afterTreeId,
              diffs,
              timestamp: Date.now(),
            })
          } catch {
            // fail-soft snapshot diff calculation
          }
        }
      }
    })()
  })
}

export default SnapshotService
