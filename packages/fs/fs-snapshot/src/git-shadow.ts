/**
 * Low-level Shadow Git Repository engine for capturing file snapshots,
 * calculating structured diffs, and restoring files without polluting
 * the user's primary project repository.
 *
 * @module @deepseek-ai/dsh-fs-snapshot/git-shadow
 */

import { createHash, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { constHomePath } from '@deepseek-ai/dsh-home-paths'

/** Per-file diff metadata and statistics produced by comparing snapshots. */
export interface FileDiffStat {
  /** Absolute path on disk. */
  path: string
  /** Project-relative path. */
  relativePath: string
  /** Change classification. */
  status: 'added' | 'deleted' | 'modified'
  /** Lines added (+). */
  additions: number
  /** Lines removed (-). */
  deletions: number
  /** Optional unified diff hunk text. */
  patch?: string
}

export interface ShadowGitOptions {
  /** Target workspace / project worktree directory. */
  worktree: string
  /** Optional project identifier for directory bucketing. */
  projectId?: string
  /** Optional explicit shadow git directory override. */
  gitDir?: string
}

/**
 * Execute a git command against the isolated shadow repository.
 */
function runGit(
  args: readonly string[],
  options: {
    cwd: string
    env?: NodeJS.ProcessEnv
    signal?: AbortSignal
  },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    execFile(
      'git',
      args,
      {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        signal: options.signal,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error !== null) {
          const failure = Object.assign(new Error(error.message, { cause: error }), {
            code: error.code,
            stdout,
            stderr,
          })
          rejectPromise(failure)
          return
        }
        resolvePromise({ stdout, stderr })
      },
    )
  })
}

/**
 * Shadow Git Repository instance managing snapshots for a single worktree.
 */
export class ShadowGit {
  readonly worktree: string
  readonly gitDir: string

  constructor(options: ShadowGitOptions) {
    this.worktree = resolve(options.worktree)
    if (options.gitDir !== undefined) {
      this.gitDir = resolve(options.gitDir)
    } else {
      // Deterministic location outside user repo: ~/.const/snapshots/<projectKey>/<worktreeHash>
      const hash = createHash('sha256').update(this.worktree).digest('hex').slice(0, 16)
      const projectKey = options.projectId ? options.projectId.replace(/[^a-zA-Z0-9_-]/g, '_') : 'default'
      this.gitDir = constHomePath('snapshots', projectKey, hash)
    }
  }

  /**
   * Ensure the shadow git repository is initialized and seeded from primary repo if available.
   */
  async ensureRepo(signal?: AbortSignal): Promise<void> {
    if (!existsSync(join(this.gitDir, 'HEAD'))) {
      await mkdir(this.gitDir, { recursive: true })
      try {
        await runGit(['init', '--bare', this.gitDir], {
          cwd: this.worktree,
          ...(signal !== undefined ? { signal } : {}),
        })
      } catch (err: unknown) {
        if (!existsSync(join(this.gitDir, 'HEAD'))) {
          throw err
        }
      }
    }

    // Seed alternates from primary .git repository if it exists to share object storage
    const primaryGitDir = join(this.worktree, '.git')
    const primaryObjects = join(primaryGitDir, 'objects')
    if (existsSync(primaryObjects)) {
      const alternatesFile = join(this.gitDir, 'objects', 'info', 'alternates')
      if (!existsSync(alternatesFile)) {
        await mkdir(join(this.gitDir, 'objects', 'info'), { recursive: true })
        await writeFile(alternatesFile, `${primaryObjects}\n`, 'utf8').catch(() => {})
      }
    }

    // Copy primary .git/info/exclude or .gitignore to shadow repo info/exclude
    const primaryExclude = join(primaryGitDir, 'info', 'exclude')
    const shadowExclude = join(this.gitDir, 'info', 'exclude')
    if (existsSync(primaryExclude) && !existsSync(shadowExclude)) {
      await mkdir(join(this.gitDir, 'info'), { recursive: true })
      const excludeContent = await readFile(primaryExclude, 'utf8').catch(() => '')
      if (excludeContent) {
        await writeFile(shadowExclude, excludeContent, 'utf8').catch(() => {})
      }
    }
  }

  /**
   * Helper to execute git command targeting this shadow git repository and worktree.
   */
  private exec(
    args: readonly string[],
    extraEnv?: NodeJS.ProcessEnv,
    signal?: AbortSignal,
  ): Promise<{ stdout: string; stderr: string }> {
    return runGit(
      ['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', `--git-dir=${this.gitDir}`, `--work-tree=${this.worktree}`, ...args],
      {
        cwd: this.worktree,
        ...(extraEnv !== undefined ? { env: extraEnv } : {}),
        ...(signal !== undefined ? { signal } : {}),
      },
    )
  }

  /**
   * Capture the current state of the workspace as an immutable Git Tree object.
   * Returns the 40-character tree SHA (`treeId`).
   */
  async capture(signal?: AbortSignal): Promise<string> {
    await this.ensureRepo(signal)
    const tempIndex = join(this.gitDir, `index-${randomUUID()}`)

    try {
      // 1. Stage all files into the temporary index file respecting ignore rules
      await this.exec(
        ['add', '-A', '--', '.'],
        { GIT_INDEX_FILE: tempIndex },
        signal,
      )

      // 2. Write the tree object from the staged index
      const { stdout } = await this.exec(
        ['write-tree'],
        { GIT_INDEX_FILE: tempIndex },
        signal,
      )

      const treeId = stdout.trim()
      if (!/^[0-9a-f]{40}$/.test(treeId)) {
        throw new Error(`Invalid git write-tree output: ${stdout}`)
      }
      return treeId
    } finally {
      await rm(tempIndex, { force: true }).catch(() => {})
    }
  }

  /**
   * Compute structured file diffs between two snapshot tree IDs.
   */
  async diff(
    fromTree: string,
    toTree: string,
    options?: { context?: number; signal?: AbortSignal },
  ): Promise<FileDiffStat[]> {
    await this.ensureRepo(options?.signal)

    // Run diff-tree with numstat and raw status
    const { stdout: numstatOut } = await this.exec(
      ['diff-tree', '-r', '--numstat', fromTree, toTree],
      undefined,
      options?.signal,
    )

    // Run diff-tree with full patch
    const contextLines = options?.context ?? 3
    const { stdout: patchOut } = await this.exec(
      ['diff-tree', '-r', `-U${contextLines}`, '--patch', fromTree, toTree],
      undefined,
      options?.signal,
    )

    const patchMap = parseDiffPatches(patchOut)
    const diffs: FileDiffStat[] = []

    for (const line of numstatOut.trim().split('\n')) {
      if (!line.trim()) continue
      const parts = line.split('\t')
      if (parts.length < 3) continue
      const addStr = parts[0] ?? ''
      const delStr = parts[1] ?? ''
      const relPath = parts.slice(2).join('\t')

      const additions = addStr === '-' ? 0 : Number.parseInt(addStr, 10) || 0
      const deletions = delStr === '-' ? 0 : Number.parseInt(delStr, 10) || 0

      let status: 'added' | 'deleted' | 'modified' = 'modified'
      if (additions > 0 && deletions === 0 && !patchOut.includes(`--- a/${relPath}`)) {
        status = 'added'
      } else if (deletions > 0 && additions === 0 && !patchOut.includes(`+++ b/${relPath}`)) {
        status = 'deleted'
      }

      const patch = patchMap.get(relPath)
      diffs.push({
        path: isAbsolute(relPath) ? relPath : resolve(this.worktree, relPath),
        relativePath: relPath,
        status,
        additions,
        deletions,
        ...(patch !== undefined ? { patch } : {}),
      })
    }

    return diffs
  }

  /**
   * Restore files in the worktree from a given snapshot tree ID.
   * If `paths` is omitted or empty, restores all changed files from the tree.
   * Files that were created after treeId (i.e. did not exist in treeId) are deleted.
   */
  async restore(
    treeId: string,
    paths?: readonly string[],
    signal?: AbortSignal,
  ): Promise<void> {
    await this.ensureRepo(signal)
    const tempIndex = join(this.gitDir, `index-restore-${randomUUID()}`)

    try {
      // 1. Read the target tree into a temporary index
      await this.exec(
        ['read-tree', treeId],
        { GIT_INDEX_FILE: tempIndex },
        signal,
      )

      // 2. Get list of files present in treeId
      const existingInTree = new Set(await this.files(treeId, signal))

      if (paths && paths.length > 0) {
        const checkoutList: string[] = []
        for (const p of paths) {
          const rel = relative(this.worktree, resolve(this.worktree, p)).replaceAll('\\', '/')
          const fullPath = resolve(this.worktree, rel)
          if (existingInTree.has(rel)) {
            checkoutList.push(rel)
          } else {
            // File did not exist in the snapshot tree -> delete from worktree
            await rm(fullPath, { force: true, recursive: true }).catch(() => {})
          }
        }

        if (checkoutList.length > 0) {
          await this.exec(
            ['checkout-index', '-f', '--', ...checkoutList],
            { GIT_INDEX_FILE: tempIndex },
            signal,
          )
        }
      } else {
        // Full restore: find all current workspace files, delete any not in tree, and checkout all
        const currentTree = await this.capture(signal).catch(() => undefined)
        if (currentTree !== undefined) {
          const currentFiles = await this.files(currentTree, signal)
          for (const cur of currentFiles) {
            if (!existingInTree.has(cur)) {
              const fullPath = resolve(this.worktree, cur)
              await rm(fullPath, { force: true, recursive: true }).catch(() => {})
            }
          }
        }

        await this.exec(
          ['checkout-index', '-a', '-f'],
          { GIT_INDEX_FILE: tempIndex },
          signal,
        )
      }
    } finally {
      await rm(tempIndex, { force: true }).catch(() => {})
    }
  }

  /**
   * List all files in a captured tree.
   */
  async files(treeId: string, signal?: AbortSignal): Promise<string[]> {
    await this.ensureRepo(signal)
    const { stdout } = await this.exec(
      ['ls-tree', '-r', '--name-only', treeId],
      undefined,
      signal,
    )
    return stdout.trim().split('\n').filter(Boolean)
  }
}

/**
 * Split unified diff output into per-file patch strings.
 */
function parseDiffPatches(diffOutput: string): Map<string, string> {
  const patches = new Map<string, string>()
  const chunks = diffOutput.split(/^diff --git /m)

  for (const chunk of chunks) {
    if (!chunk.trim()) continue
    const headerMatch = chunk.match(/^a\/(.*?)\s+b\/(.*?)(?:\n|$)/)
    if (headerMatch && headerMatch[2] !== undefined) {
      const relPath = headerMatch[2]
      patches.set(relPath, `diff --git ${chunk}`)
    }
  }

  return patches
}
