/**
 * Shared filesystem path helpers for Const Harness user data.
 *
 * @module @deepseek-ai/dsh-home-paths
 */

import { mkdir, opendir, realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

/** Directory name for the default Const Harness home under the OS home. */
export const CONST_HOME_DIR_NAME = '.const'

/** Stable user-facing display form for the default Const Harness home. */
export const DEFAULT_CONST_HOME_DISPLAY = `~/${CONST_HOME_DIR_NAME}`

/** Environment variable that overrides the default Const Harness home. */
export const CONST_HOME_ENV = 'CONST_HOME'

/** Directory name for the default DeepSeek Harness home under the OS home. */
export const DSH_HOME_DIR_NAME = '.dsh'

/** Stable user-facing display form for the default DeepSeek Harness home. */
export const DEFAULT_DSH_HOME_DISPLAY = `~/${DSH_HOME_DIR_NAME}`

/** Environment variable that overrides the default DeepSeek Harness home. */
export const DSH_HOME_ENV = 'DSH_HOME'

/**
 * Give a native filesystem watcher one canonical spelling of a path, even
 * when its final components do not exist yet. The deepest existing ancestor
 * is resolved through {@link realpath}; when a suffix is missing, that
 * ancestor is also proved to be an enumerable directory before the suffix is
 * restored. This prevents Windows from treating a regular-file ancestor as
 * ordinary absence, and prevents short-name aliases from being mixed with
 * long paths emitted by the native watcher backend.
 * @param path - Watch target or root, resolved against the current directory.
 * @returns the target with its existing ancestor canonicalized.
 * @throws when ancestor traversal encounters an error other than absence, or
 * the existing ancestor of a missing suffix is not an enumerable directory.
 */
export async function canonicalizeWatchPath(path: string): Promise<string> {
  let current = resolve(path)
  const missing: string[] = []
  while (true) {
    try {
      const canonical = await realpath(current)
      if (missing.length > 0) {
        // A Windows file-as-parent probe reports ENOENT. Opening the resolved
        // ancestor preserves the cross-platform directory requirement.
        const directory = await opendir(canonical)
        await directory.close()
      }
      return join(canonical, ...missing.reverse())
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      const parent = dirname(current)
      /* v8 ignore next -- a filesystem root exists, so traversal resolves before this guard */
      if (parent === current) throw error
      missing.push(basename(current))
      current = parent
    }
  }
}

/**
 * Resolve the default Const Harness home using Node's platform path rules.
 * @returns the absolute default const harness home path.
 */
export function defaultConstHome(): string {
  return join(homedir(), CONST_HOME_DIR_NAME)
}

/**
 * Resolve the default DeepSeek Harness home using Node's platform path rules.
 * @returns the absolute default harness home path.
 */
export function defaultDshHome(): string {
  return join(homedir(), DSH_HOME_DIR_NAME)
}

/**
 * Expand supported tilde prefixes against the operating-system home.
 * @param path - configured path that may begin with `~`, `~/`, or `~\`.
 * @returns the expanded path, or the original value when no supported prefix is present.
 */
export function expandHomePath(path: string): string {
  if (path === '~') return homedir()
  if (path.startsWith('~/') || path.startsWith('~\\')) return join(homedir(), path.slice(2))
  return path
}

/**
 * Resolve the single-root Const Harness home.
 *
 * Precedence, highest first: an explicit configured path, `$CONST_HOME`,
 * `$DSH_HOME`, then `~/.const`. The harness keeps all user data under one root.
 * An empty or whitespace-only environment variable is treated as unset.
 * @param configured - explicit harness-home override, which has highest precedence.
 * @param env - environment mapping used to read `CONST_HOME` or `DSH_HOME`.
 * @returns the normalized absolute harness home path.
 */
export function resolveConstHome(configured?: string, env: Record<string, string | undefined> = process.env): string {
  const fromConst = env[CONST_HOME_ENV]
  const fromDsh = env[DSH_HOME_ENV]
  const selectedEnv = fromConst !== undefined && fromConst.trim().length > 0
    ? fromConst
    : fromDsh !== undefined && fromDsh.trim().length > 0
      ? fromDsh
      : defaultConstHome()
  const selected = configured ?? selectedEnv
  return resolve(expandHomePath(selected))
}

/**
 * Resolve the single-root DeepSeek Harness home (backward-compatible).
 * @param configured - explicit harness-home override, which has highest precedence.
 * @param env - environment mapping used to read `DSH_HOME` or `CONST_HOME`.
 * @returns the normalized absolute harness home path.
 */
export function resolveDshHome(configured?: string, env: Record<string, string | undefined> = process.env): string {
  const fromDsh = env[DSH_HOME_ENV]
  const fromConst = env[CONST_HOME_ENV]
  const selectedEnv = fromDsh !== undefined && fromDsh.trim().length > 0
    ? fromDsh
    : fromConst !== undefined && fromConst.trim().length > 0
      ? fromConst
      : defaultDshHome()
  const selected = configured ?? selectedEnv
  return resolve(expandHomePath(selected))
}

/**
 * Join path segments onto the resolved Const Harness home.
 * @param segments - path segments appended to the Harness home; an empty list returns the home itself.
 * @returns the normalized absolute joined path.
 */
export function constHomePath(...segments: string[]): string {
  return join(resolveConstHome(), ...segments)
}

/**
 * Join path segments onto the resolved DeepSeek Harness home.
 * @param segments - path segments appended to the Harness home; an empty list returns the home itself.
 * @returns the normalized absolute joined path.
 */
export function dshHomePath(...segments: string[]): string {
  return join(resolveDshHome(), ...segments)
}

/**
 * Describe a resolved harness home symbolically for user-facing display.
 * @param resolvedHome - the absolute path returned by {@link resolveConstHome}.
 * @returns `~/.const` for the default home, otherwise `$CONST_HOME`.
 */
export function constHomeDisplay(resolvedHome: string): string {
  return resolvedHome === resolve(defaultConstHome()) ? DEFAULT_CONST_HOME_DISPLAY : `$${CONST_HOME_ENV}`
}

/**
 * Describe a resolved harness home symbolically for user-facing display.
 *
 * It never returns an absolute machine path: the default home is labelled
 * `~/.dsh`, and any configured home is labelled `$DSH_HOME`.
 * @param resolvedHome - the absolute path returned by {@link resolveDshHome}.
 * @returns `~/.dsh` for the default home, otherwise `$DSH_HOME`.
 */
export function dshHomeDisplay(resolvedHome: string): string {
  return resolvedHome === resolve(defaultDshHome()) ? DEFAULT_DSH_HOME_DISPLAY : `$${DSH_HOME_ENV}`
}

/**
 * Resolve the default global workspace path (`~/.const/workspace/default`).
 * @param home - optional explicit home path.
 * @returns the absolute default workspace path.
 */
export function constDefaultWorkspacePath(home?: string): string {
  return resolve(home ?? resolveConstHome(), 'workspace', 'default')
}

/**
 * Resolve the dedicated scratchpad path for a specific session (`~/.const/sessions/<id>/scratch`).
 * @param sessionId - the session ID.
 * @param home - optional explicit home path.
 * @returns the absolute session scratchpad path.
 */
export function constSessionScratchPath(sessionId: string, home?: string): string {
  return resolve(home ?? resolveConstHome(), 'sessions', sessionId, 'scratch')
}

/**
 * Resolve the dedicated artifacts path for a specific session (`~/.const/sessions/<id>/artifacts`).
 * @param sessionId - the session ID.
 * @param home - optional explicit home path.
 * @returns the absolute session artifacts path.
 */
export function constSessionArtifactsPath(sessionId: string, home?: string): string {
  return resolve(home ?? resolveConstHome(), 'sessions', sessionId, 'artifacts')
}

/**
 * Resolve the dedicated snapshots path for a specific session (`~/.const/sessions/<id>/snapshots`).
 * @param sessionId - the session ID.
 * @param home - optional explicit home path.
 * @returns the absolute session snapshots path.
 */
export function constSessionSnapshotsPath(sessionId: string, home?: string): string {
  return resolve(home ?? resolveConstHome(), 'sessions', sessionId, 'snapshots')
}

/**
 * Resolve the local GGUF models path (`~/.const/models/gguf`).
 * @param home - optional explicit home path.
 * @returns the absolute GGUF models path.
 */
export function constModelsGgufPath(home?: string): string {
  return resolve(home ?? resolveConstHome(), 'models', 'gguf')
}

/**
 * Ensure all standard Const Harness storage directories exist on disk.
 * @param home - optional explicit home path.
 */
export async function ensureConstDirectories(home?: string): Promise<void> {
  const root = home ?? resolveConstHome()
  const standardDirs = [
    join(root, 'index'),
    join(root, 'conversations'),
    join(root, 'sessions'),
    join(root, 'snapshots'),
    join(root, 'workspace', 'default'),
    join(root, 'models', 'gguf'),
    join(root, 'config', 'rules'),
    join(root, 'config', 'certs'),
    join(root, 'runtime', 'venv'),
    join(root, 'runtime', 'browser-profiles'),
    join(root, 'runtime', 'mcp'),
    join(root, 'profiles'),
  ]
  await Promise.all(standardDirs.map(dir => mkdir(dir, { recursive: true })))
}
