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

  constructor(ctx: Context) {
    super(ctx, 'snapshot')
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

  private readonly pendingTurnSnapshots = new Map<string, string>()

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
  recordTurnSnapshot(record: TurnSnapshotRecord, worktree?: string, projectId?: string): void {
    let sessionMap = this.turnSnapshots.get(record.sessionId)
    if (!sessionMap) {
      sessionMap = new Map()
      this.turnSnapshots.set(record.sessionId, sessionMap)
    }
    sessionMap.set(record.turn, record)

    if (worktree) {
      const manifestFile = this.manifestPath(worktree, record.sessionId, projectId)
      const allRecords = Array.from(sessionMap.values())
      void (async () => {
        try {
          await mkdir(dirname(manifestFile), { recursive: true })
          await writeFile(manifestFile, JSON.stringify(allRecords, null, 2), 'utf8')
        } catch {
          // best-effort persistence
        }
      })()
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

    if (worktree) {
      try {
        const manifestFile = this.manifestPath(worktree, sessionId, projectId)
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
   * @param worktree - Workspace directory path.
   * @param projectId - Optional project identifier.
   * @returns Rollback result with list of restored files.
   */
  async rollbackTurn(
    sessionId: string,
    turn: number,
    worktree: string,
    projectId?: string,
  ): Promise<{ success: boolean; restoredFiles: string[]; error?: string }> {
    const record = await this.getTurnSnapshot(sessionId, turn, worktree, projectId)
    const beforeTreeId = record?.beforeTreeId ?? this.getPendingBeforeTree(sessionId, turn)
    if (!beforeTreeId) {
      return { success: false, restoredFiles: [], error: `No snapshot found for turn ${turn}` }
    }

    try {
      await this.restore(worktree, beforeTreeId, {
        ...(projectId !== undefined ? { projectId } : {}),
      })
      const restoredFiles = record?.diffs ? record.diffs.map(d => d.path) : []

      // Clean up in-memory records >= turn
      const sessionMap = this.turnSnapshots.get(sessionId)
      if (sessionMap) {
        for (const t of Array.from(sessionMap.keys())) {
          if (t >= turn) sessionMap.delete(t)
        }
      }
      // Update disk manifest
      const manifestFile = this.manifestPath(worktree, sessionId, projectId)
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
  const service = new SnapshotService(ctx)

  ctx.on('session/event', (session: Session, event: SessionEvent) => {
    void (async () => {
      const sessionId = session.header.id
      const worktree = session.header.cwd ?? process.cwd()

      if (event.type === 'turn/start') {
        const data = event.data as { turn?: number }
        const turn = data.turn ?? 1
        try {
          const beforeTreeId = await service.capture(worktree)
          service.setPendingBeforeTree(sessionId, turn, beforeTreeId)
        } catch (err: unknown) {
          ctx.logger.warn(`[fs-snapshot] failed to capture snapshot at start of ${sessionId} turn ${turn}: ${String(err)}`)
        }
      } else if (event.type === 'turn/end') {
        const data = event.data as { turn?: number }
        const turn = data.turn ?? 1
        const beforeTreeId = service.getPendingBeforeTree(sessionId, turn)
        if (beforeTreeId) {
          service.deletePendingBeforeTree(sessionId, turn)
          try {
            const afterTreeId = await service.capture(worktree)
            const diffs = await service.diff(worktree, beforeTreeId, afterTreeId)
            service.recordTurnSnapshot({
              sessionId,
              turn,
              beforeTreeId,
              afterTreeId,
              diffs,
              timestamp: Date.now(),
            }, worktree)
          } catch (err: unknown) {
            ctx.logger.warn(`[fs-snapshot] failed to compute diff for ${sessionId} turn ${turn}: ${String(err)}`)
          }
        }
      }
    })()
  })
}

export default SnapshotService
