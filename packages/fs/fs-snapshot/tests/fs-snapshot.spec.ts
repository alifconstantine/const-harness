import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import { apply as applySnapshot, SnapshotService, ShadowGit } from '../src/index.ts'
import { apply as applyInvariant } from '../src/invariant.ts'

describe('fs-snapshot engine & service', () => {
  let testDir: string
  let shadowGitDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'const-worktree-test-'))
    shadowGitDir = await mkdtemp(join(tmpdir(), 'const-shadow-git-test-'))
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true }).catch(() => {})
    await rm(shadowGitDir, { recursive: true, force: true }).catch(() => {})
  })

  it('captures git tree, computes diffs with additions and deletions, and restores files', async () => {
    const shadow = new ShadowGit({
      worktree: testDir,
      gitDir: shadowGitDir,
    })

    // 1. Initial file
    await writeFile(join(testDir, 'hello.txt'), 'line 1\nline 2\n', 'utf8')
    const tree1 = await shadow.capture()
    expect(tree1).toMatch(/^[0-9a-f]{40}$/)

    // 2. Modify file and add new file
    await writeFile(join(testDir, 'hello.txt'), 'line 1\nline 2 modified\nline 3\n', 'utf8')
    await writeFile(join(testDir, 'new-file.ts'), 'export const x = 42\n', 'utf8')
    const tree2 = await shadow.capture()
    expect(tree2).not.toBe(tree1)

    // 3. Check diff
    const diffs = await shadow.diff(tree1, tree2)
    expect(diffs).toHaveLength(2)

    const helloDiff = diffs.find(d => d.relativePath === 'hello.txt')
    expect(helloDiff).toBeDefined()
    expect(helloDiff?.status).toBe('modified')
    expect(helloDiff?.additions).toBeGreaterThanOrEqual(1)

    const newDiff = diffs.find(d => d.relativePath === 'new-file.ts')
    expect(newDiff).toBeDefined()
    expect(newDiff?.status).toBe('added')
    expect(newDiff?.additions).toBe(1)

    // Test list files
    const fileList = await shadow.files(tree2)
    expect(fileList).toContain('hello.txt')
    expect(fileList).toContain('new-file.ts')

    // 4. Restore hello.txt to tree1
    await shadow.restore(tree1, ['hello.txt'])
    const content = await readFile(join(testDir, 'hello.txt'), 'utf8')
    expect(content).toBe('line 1\nline 2\n')

    // 5. Restore all files to tree1
    await shadow.restore(tree1)
    const allFiles = await shadow.files(tree1)
    expect(allFiles).toEqual(['hello.txt'])
  })

  it('detects deleted files properly', async () => {
    const shadow = new ShadowGit({
      worktree: testDir,
      gitDir: shadowGitDir,
    })

    await writeFile(join(testDir, 'temp.txt'), 'temporary file\n', 'utf8')
    const tree1 = await shadow.capture()

    await unlink(join(testDir, 'temp.txt'))
    const tree2 = await shadow.capture()

    const diffs = await shadow.diff(tree1, tree2)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]?.status).toBe('deleted')
    expect(diffs[0]?.deletions).toBe(1)
  })

  it('integrates with Cordis SnapshotService to record and rollback turns', async () => {
    const ctx = new Context()
    applySnapshot(ctx)

    const service = ctx.get('snapshot')
    expect(service).toBeInstanceOf(SnapshotService)
    if (!service) throw new Error('snapshot service missing')

    // File setup
    await writeFile(join(testDir, 'app.tsx'), 'const App = () => <div>Hello</div>\n', 'utf8')
    const beforeTree = await service.capture(testDir, 'test-proj')

    // Mutate file during turn 1
    await writeFile(join(testDir, 'app.tsx'), 'const App = () => <div>Hello World Updated</div>\n', 'utf8')
    const afterTree = await service.capture(testDir, 'test-proj')

    const diffs = await service.diff(testDir, beforeTree, afterTree, { projectId: 'test-proj' })
    expect(diffs).toHaveLength(1)

    service.recordTurnSnapshot({
      sessionId: 'session-123',
      turn: 1,
      beforeTreeId: beforeTree,
      afterTreeId: afterTree,
      diffs,
      timestamp: Date.now(),
    })

    // Verify turn snapshot lookup
    const record = service.getTurnSnapshot('session-123', 1)
    expect(record?.turn).toBe(1)
    expect(record?.diffs[0]?.relativePath).toBe('app.tsx')

    // Non-existent turn rollback failure
    const badRollback = await service.rollbackTurn('session-123', 999, testDir, 'test-proj')
    expect(badRollback.success).toBe(false)
    expect(badRollback.error).toContain('No snapshot found')

    // Rollback turn
    const rollback = await service.rollbackTurn('session-123', 1, testDir, 'test-proj')
    expect(rollback.success).toBe(true)

    const rolledBackContent = await readFile(join(testDir, 'app.tsx'), 'utf8')
    expect(rolledBackContent).toBe('const App = () => <div>Hello</div>\n')
  })

  it('registers invariant companion correctly', async () => {
    const registered: string[] = []
    const ctx = new Context()
    ctx.provide('invariants')
    ctx.set('invariants', {
      register: (pkg: string) => { registered.push(pkg); return () => {} },
    } as never)
    const dispose = await applyInvariant(ctx)
    expect(registered).toEqual(['@deepseek-ai/dsh-fs-snapshot'])
    expect(dispose).toBeTypeOf('function')
    dispose()
  })
})
