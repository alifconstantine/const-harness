/**
 * Cordis Snapshot Service providing shadow git snapshots and file rollback (ctx.snapshot).
 *
 * @module @deepseek-ai/dsh-fs-snapshot
 */

import { Context, Service } from '@deepseek-ai/cordis'
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
   */
  async capture(worktree: string, projectId?: string, signal?: AbortSignal): Promise<string> {
    const shadow = this.getShadow(worktree, projectId)
    return shadow.capture(signal)
  }

  /**
   * Compute structured file diffs between two snapshot tree IDs.
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
   */
  getTurnSnapshot(sessionId: string, turn: number): TurnSnapshotRecord | undefined {
    return this.turnSnapshots.get(sessionId)?.get(turn)
  }

  /**
   * Rollback the workspace to the exact state before a turn executed.
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
      const changedFiles = record.diffs.map(d => d.relativePath)
      await this.restore(worktree, record.beforeTreeId, {
        ...(changedFiles.length > 0 ? { paths: changedFiles } : {}),
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
  new SnapshotService(ctx)
}

export default SnapshotService
