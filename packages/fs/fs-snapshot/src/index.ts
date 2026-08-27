/**
 * Cordis Snapshot Service providing shadow git snapshots and file rollback (ctx.snapshot).
 *
 * @module @const-ai/fs-snapshot
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Context, Service } from '@const-ai/cordis'
import type { Session, SessionEvent } from '@const-ai/session'
import { ShadowGit, type FileDiffStat, type ShadowGitOptions } from './git-shadow.ts'

export type { FileDiffStat, ShadowGitOptions }
export { ShadowGit }

declare module '@const-ai/cordis' {
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
  private readonly sessionQueues = new Map<string, Promise<void>>()
  private readonly sessionWorktrees = new Map<string, string>()
  private readonly pendingTurnSnapshots = new Map<string, string>()

  constructor(ctx: Context) {
    super(ctx, 'snapshot')

    ctx.on('session/event', (session: Session, event: SessionEvent) => {
      const sessionId = session.header.id
      const worktree = session.header.cwd ?? process.cwd()
      this.rememberSessionWorktree(sessionId, worktree)

      if (event.type === 'turn/start') {
        const data = event.data as { turn?: number }
        const turn = data.turn ?? 1
        this.queueSessionOp(sessionId, async () => {
          try {
            const beforeTreeId = await this.capture(worktree)
            this.setPendingBeforeTree(sessionId, turn, beforeTreeId)
          } catch (err: unknown) {
            ctx.logger.warn(`[fs-snapshot] failed to capture snapshot at start of ${sessionId} turn ${turn}: ${String(err)}`)
          }
        })
      } else if (event.type === 'turn/end') {
        const data = event.data as { turn?: number }
        const turn = data.turn ?? 1
        this.queueSessionOp(sessionId, async () => {
          const beforeTreeId = this.getPendingBeforeTree(sessionId, turn)
          if (beforeTreeId) {
            try {
              const afterTreeId = await this.capture(worktree)
              const diffs = await this.diff(worktree, beforeTreeId, afterTreeId)
              await this.recordTurnSnapshot({
                sessionId,
                turn,
                beforeTreeId,
                afterTreeId,
                diffs,
                timestamp: Date.now(),
              }, worktree)
              this.deletePendingBeforeTree(sessionId, turn)
            } catch (err: unknown) {
              ctx.logger.warn(`[fs-snapshot] failed to compute diff for ${sessionId} turn ${turn}: ${String(err)}`)
            }
          }
        })
      }
    })
  }

  /**
   * Remember workspace directory for a session.
   *
   * @param sessionId - Session identifier.
   * @param worktree - Workspace directory path.
   */
  rememberSessionWorktree(sessionId: string, worktree: string): void {
    this.sessionWorktrees.set(sessionId, worktree)
  }

  /**
   * Queue a serialized async operation for a session.
   *
   * @param sessionId - Session identifier.
   * @param op - Async operation callback.
   */
  queueSessionOp(sessionId: string, op: () => Promise<void>): void {
    const current = this.sessionQueues.get(sessionId) ?? Promise.resolve()
    const next = current.then(op, op)
    this.sessionQueues.set(sessionId, next)
  }

  /**
   * Flush any pending queued operations for a session.
   *
   * @param sessionId - Session identifier.
   */
  async flushSessionQueue(sessionId: string): Promise<void> {
    const current = this.sessionQueues.get(sessionId)
    if (current) {
      await current
    }
  }

  /**
   * Get or create a ShadowGit instance for a given workspace path.
   *
   * @param worktree - Workspace directory path.
   * @param projectId - Optional project identifier.
   * @returns ShadowGit instance.
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
   * Get path to the session snapshots manifest file on disk.
   */
  private manifestPath(worktree: string, sessionId: string, projectId?: string): string {
    const shadow = this.getShadow(worktree, projectId)
    const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_')
    return join(shadow.gitDir, 'sessions', `${safeSessionId}.json`)
  }

  /**
   * Capture a snapshot of a worktree directory.
   *
   * @param worktree - Workspace directory path.
   * @param projectId - Optional project identifier.
   * @param signal - Optional abort signal.
   * @returns Git tree sha of captured snapshot.
   */
  async capture(worktree: string, projectId?: string, signal?: AbortSignal): Promise<string> {
    const shadow = this.getShadow(worktree, projectId)
    return shadow.capture(signal)
  }

  /**
   * Compute structured file diffs between two snapshot tree IDs.
   *
   * @param worktree - Workspace directory path.
   * @param fromTree - Starting snapshot tree ID.
   * @param toTree - Target snapshot tree ID.
   * @param options - Optional diff configuration options.
   * @returns Array of file diff statistics.
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
   *
   * @param worktree - Workspace directory path.
   * @param treeId - Snapshot tree ID to restore from.
   * @param options - Optional restore options and path filtering.
   * @returns Resolves when files are restored.
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
   * Record a pending beforeTreeId for an in-flight turn.
   *
   * @param sessionId - Session identifier.
   * @param turn - Turn number.
   * @param beforeTreeId - Snapshot tree ID captured at turn start.
   */
  setPendingBeforeTree(sessionId: string, turn: number, beforeTreeId: string): void {
    this.pendingTurnSnapshots.set(`${sessionId}:${turn}`, beforeTreeId)
  }

  /**
   * Retrieve a pending beforeTreeId for a turn.
   *
   * @param sessionId - Session identifier.
   * @param turn - Turn number.
   * @returns Snapshot tree ID if found.
   */
  getPendingBeforeTree(sessionId: string, turn: number): string | undefined {
    return this.pendingTurnSnapshots.get(`${sessionId}:${turn}`)
  }

  /**
   * Delete a pending beforeTreeId record.
   *
   * @param sessionId - Session identifier.
   * @param turn - Turn number.
   */
  deletePendingBeforeTree(sessionId: string, turn: number): void {
    this.pendingTurnSnapshots.delete(`${sessionId}:${turn}`)
  }

  /**
   * Record a completed turn's snapshot boundary and persist to disk.
   *
   * @param record - Turn snapshot record to store.
   * @param worktree - Workspace directory path.
   * @param projectId - Optional project identifier.
   */
  async recordTurnSnapshot(record: TurnSnapshotRecord, worktree?: string, projectId?: string): Promise<void> {
    let sessionMap = this.turnSnapshots.get(record.sessionId)
    if (!sessionMap) {
      sessionMap = new Map()
      this.turnSnapshots.set(record.sessionId, sessionMap)
    }
    sessionMap.set(record.turn, record)

    if (worktree) {
      this.rememberSessionWorktree(record.sessionId, worktree)
      const manifestFile = this.manifestPath(worktree, record.sessionId, projectId)
      const allRecords = Array.from(sessionMap.values())
      try {
        await mkdir(dirname(manifestFile), { recursive: true })
        await writeFile(manifestFile, JSON.stringify(allRecords, null, 2), 'utf8')
      } catch {
        // best-effort persistence
      }
    }
  }

  /**
   * Retrieve snapshot metadata for a turn, falling back to disk manifest if needed.
   *
   * @param sessionId - Session identifier.
   * @param turn - Turn number.
   * @param worktree - Optional workspace directory to check disk manifest.
   * @param projectId - Optional project identifier.
   * @returns Turn snapshot record if found, undefined otherwise.
   */
  async getTurnSnapshot(
    sessionId: string,
    turn: number,
    worktree?: string,
    projectId?: string,
  ): Promise<TurnSnapshotRecord | undefined> {
    const memoryRecord = this.turnSnapshots.get(sessionId)?.get(turn)
    if (memoryRecord) return memoryRecord

    const resolvedWorktree = worktree ?? this.sessionWorktrees.get(sessionId)
    if (resolvedWorktree) {
      try {
        const manifestFile = this.manifestPath(resolvedWorktree, sessionId, projectId)
        const content = await readFile(manifestFile, 'utf8')
        const records = JSON.parse(content) as TurnSnapshotRecord[]
        let sessionMap = this.turnSnapshots.get(sessionId)
        if (!sessionMap) {
          sessionMap = new Map()
          this.turnSnapshots.set(sessionId, sessionMap)
        }
        for (const rec of records) {
          sessionMap.set(rec.turn, rec)
        }
        return sessionMap.get(turn)
      } catch {
        return undefined
      }
    }
    return undefined
  }

  /**
   * Rollback the workspace to the exact state before a turn executed.
   *
   * @param sessionId - Session identifier.
   * @param turn - Turn number to rollback.
   * @param worktree - Optional workspace directory path.
   * @param projectId - Optional project identifier.
   * @returns Rollback result with list of restored files.
   */
  async rollbackTurn(
    sessionId: string,
    turn: number,
    worktree?: string,
    projectId?: string,
  ): Promise<{ success: boolean; restoredFiles: string[]; error?: string }> {
    // Flush any pending queue operations for this session (e.g. in-flight turn capture/diff)
    await this.flushSessionQueue(sessionId)

    const resolvedWorktree = worktree ?? this.sessionWorktrees.get(sessionId) ?? process.cwd()
    const record = await this.getTurnSnapshot(sessionId, turn, resolvedWorktree, projectId)
    const beforeTreeId = record?.beforeTreeId ?? this.getPendingBeforeTree(sessionId, turn)
    if (!beforeTreeId) {
      return { success: false, restoredFiles: [], error: `No snapshot found for turn ${turn}` }
    }

    try {
      // Gather all affected file paths from turn snapshots >= turn
      const sessionMap = this.turnSnapshots.get(sessionId)
      const rolledBackDiffPaths = new Set<string>()
      if (sessionMap) {
        for (const [t, rec] of sessionMap.entries()) {
          if (t >= turn) {
            for (const d of rec.diffs) {
              rolledBackDiffPaths.add(d.path)
            }
          }
        }
      }
      if (record) {
        for (const d of record.diffs) {
          rolledBackDiffPaths.add(d.path)
        }
      }

      await this.restore(resolvedWorktree, beforeTreeId, {
        ...(projectId !== undefined ? { projectId } : {}),
      })
      const restoredFiles = Array.from(rolledBackDiffPaths)

      // Clean up in-memory records >= turn
      if (sessionMap) {
        for (const t of Array.from(sessionMap.keys())) {
          if (t >= turn) sessionMap.delete(t)
        }
      }
      // Update disk manifest
      const manifestFile = this.manifestPath(resolvedWorktree, sessionId, projectId)
      const remainingRecords = Array.from(sessionMap?.values() ?? [])
      await writeFile(manifestFile, JSON.stringify(remainingRecords, null, 2), 'utf8').catch(() => {})

      return { success: true, restoredFiles }
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
  void new SnapshotService(ctx)
}

export default SnapshotService
