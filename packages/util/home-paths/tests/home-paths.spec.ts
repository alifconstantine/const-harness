import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CONST_HOME_DIR_NAME,
  CONST_HOME_ENV,
  DEFAULT_CONST_HOME_DISPLAY,
  DEFAULT_DSH_HOME_DISPLAY,
  DSH_HOME_DIR_NAME,
  DSH_HOME_ENV,
  canonicalizeWatchPath,
  constDefaultWorkspacePath,
  constHomeDisplay,
  constHomePath,
  constModelsGgufPath,
  constSessionArtifactsPath,
  constSessionScratchPath,
  constSessionSnapshotsPath,
  defaultConstHome,
  defaultDshHome,
  dshHomeDisplay,
  dshHomePath,
  ensureConstDirectories,
  expandHomePath,
  resolveConstHome,
  resolveDshHome,
} from '@deepseek-ai/dsh-home-paths'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('const and dsh path helpers', () => {
  it('owns the shared default home directory names and displays', () => {
    expect(CONST_HOME_DIR_NAME).toBe('.const')
    expect(DEFAULT_CONST_HOME_DISPLAY).toBe('~/.const')
    expect(CONST_HOME_ENV).toBe('CONST_HOME')
    expect(defaultConstHome()).toBe(join(homedir(), '.const'))

    expect(DSH_HOME_DIR_NAME).toBe('.const')
    expect(DEFAULT_DSH_HOME_DISPLAY).toBe('~/.const')
    expect(DSH_HOME_ENV).toBe('DSH_HOME')
  })

  it('expands tilde paths without changing non-tilde paths', () => {
    expect(expandHomePath('~')).toBe(homedir())
    expect(expandHomePath('~/.const')).toBe(join(homedir(), '.const'))
    expect(expandHomePath('~\\.const')).toBe(join(homedir(), '.const'))
    expect(expandHomePath('/tmp/.const')).toBe('/tmp/.const')
    expect(expandHomePath('~other/.const')).toBe('~other/.const')
  })

  it('resolves explicit path before CONST_HOME, DSH_HOME, and default', () => {
    const envConstHome = join(homedir(), 'env-const')
    const envDshHome = join(homedir(), 'env-dsh')

    expect(resolveConstHome('/tmp/explicit-const', { CONST_HOME: '~/env-const' })).toBe(resolve('/tmp/explicit-const'))
    expect(resolveConstHome(undefined, { CONST_HOME: '~/env-const', DSH_HOME: '~/env-dsh' })).toBe(envConstHome)
    expect(resolveConstHome(undefined, { DSH_HOME: '~/env-dsh' })).toBe(envDshHome)
    expect(resolveConstHome(undefined, {})).toBe(defaultConstHome())

    expect(resolveDshHome('/tmp/explicit-dsh', { DSH_HOME: '~/env-dsh' })).toBe(resolve('/tmp/explicit-dsh'))
    expect(resolveDshHome(undefined, { DSH_HOME: '~/env-dsh' })).toBe(envDshHome)
  })

  it('treats an empty or whitespace-only env as unset', () => {
    expect(resolveConstHome(undefined, { CONST_HOME: '', DSH_HOME: '' })).toBe(defaultConstHome())
    expect(resolveConstHome(undefined, { CONST_HOME: '   ', DSH_HOME: '   ' })).toBe(defaultConstHome())
    expect(resolveDshHome(undefined, { DSH_HOME: '' })).toBe(defaultDshHome())
  })

  it('joins child segments onto the resolved home', () => {
    vi.stubEnv('CONST_HOME', '~/env-const')
    expect(constHomePath()).toBe(join(homedir(), 'env-const'))
    expect(constHomePath('sessions', 'abc')).toBe(join(homedir(), 'env-const', 'sessions', 'abc'))
    expect(dshHomePath('sessions', 'abc')).toBe(join(homedir(), 'env-const', 'sessions', 'abc'))
  })

  it('provides dedicated paths for workspace and session scratchpad', () => {
    const customHome = '/tmp/my-const'
    expect(constDefaultWorkspacePath(customHome)).toBe(resolve(customHome, 'workspace', 'default'))
    expect(constSessionScratchPath('session-123', customHome)).toBe(resolve(customHome, 'sessions', 'session-123', 'scratch'))
    expect(constSessionArtifactsPath('session-123', customHome)).toBe(resolve(customHome, 'sessions', 'session-123', 'artifacts'))
    expect(constSessionSnapshotsPath('session-123', customHome)).toBe(resolve(customHome, 'sessions', 'session-123', 'snapshots'))
    expect(constModelsGgufPath(customHome)).toBe(resolve(customHome, 'models', 'gguf'))
  })

  it('creates standard const directories when ensureConstDirectories is called', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'const-dirs-test-'))
    try {
      await ensureConstDirectories(tempDir)
      const expectedSubdirs = [
        'index', 'conversations', 'sessions', 'snapshots',
        'workspace/default', 'models/gguf', 'config/rules', 'config/certs',
        'runtime/venv', 'runtime/browser-profiles', 'runtime/mcp', 'profiles',
      ]
      for (const subdir of expectedSubdirs) {
        expect((await realpath(join(tempDir, subdir)))).toBeDefined()
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true })
    }
  })

  it('labels a resolved home by whether it is the default root', () => {
    expect(constHomeDisplay(resolve(defaultConstHome()))).toBe('~/.const')
    expect(dshHomeDisplay(resolve(defaultDshHome()))).toBe('~/.const')
    expect(constHomeDisplay('/some/other/root')).toBe('$CONST_HOME')
    expect(dshHomeDisplay('/some/other/root')).toBe('$CONST_HOME')
  })

  it('canonicalizes a watcher ancestor while preserving a missing suffix', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-watch-path-'))
    const target = join(root, 'target')
    const alias = join(root, 'alias')
    try {
      await mkdir(target)
      await symlink(target, alias, process.platform === 'win32' ? 'junction' : 'dir')
      await expect(canonicalizeWatchPath(join(alias, 'later', 'config.yml'))).resolves.toBe(
        join(await realpath(target), 'later', 'config.yml'),
      )
      const file = join(root, 'file')
      await writeFile(file, 'not a directory')
      await expect(canonicalizeWatchPath(join(file, 'child'))).rejects.toMatchObject({ code: 'ENOTDIR' })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
