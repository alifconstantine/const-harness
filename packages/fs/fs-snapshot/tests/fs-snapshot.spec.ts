import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile, readFile, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@const-ai/cordis'
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

    await service.recordTurnSnapshot({
      sessionId: 'session-123',
      turn: 1,
      beforeTreeId: beforeTree,
      afterTreeId: afterTree,
      diffs,
      timestamp: Date.now(),
    }, testDir, 'test-proj')

    // Verify turn snapshot lookup
    const record = await service.getTurnSnapshot('session-123', 1, testDir, 'test-proj')
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

  it('handles event-driven turn/start and turn/end with sequential queue rollback', async () => {
    const ctx = new Context()
    applySnapshot(ctx)

    const service = ctx.get('snapshot')
    if (!service) throw new Error('snapshot service missing')

    await writeFile(join(testDir, 'script.js'), 'console.log("v1")\n', 'utf8')

    const fakeSession = {
      header: {
        id: 'session-evt-1',
        cwd: testDir,
      },
    }

    // Turn 1 start
    ctx.emit('session/event', fakeSession as never, {
      type: 'turn/start',
      seq: 1,
      time: Date.now(),
      data: { turn: 1 },
    } as never)

    await service.flushSessionQueue('session-evt-1')

    // Turn 1 file modification
    await writeFile(join(testDir, 'script.js'), 'console.log("v2")\n', 'utf8')
    await writeFile(join(testDir, 'extra.js'), 'console.log("extra")\n', 'utf8')

    // Turn 1 end
    ctx.emit('session/event', fakeSession as never, {
      type: 'turn/end',
      seq: 2,
      time: Date.now(),
      data: { turn: 1 },
    } as never)

    // Immediate rollback awaits queue automatically
    const rollbackRes = await service.rollbackTurn('session-evt-1', 1)
    expect(rollbackRes.success).toBe(true)

    const restoredContent = await readFile(join(testDir, 'script.js'), 'utf8')
    expect(restoredContent).toBe('console.log("v1")\n')
  })

  it('deletes newly created files on turn rollback', async () => {
    const shadow = new ShadowGit({
      worktree: testDir,
      gitDir: shadowGitDir,
    })

    await writeFile(join(testDir, 'base.txt'), 'base\n', 'utf8')
    const treeBefore = await shadow.capture()

    await writeFile(join(testDir, 'created-during-turn.ts'), 'console.log("hi")\n', 'utf8')
    const treeAfter = await shadow.capture()

    const diffs = await shadow.diff(treeBefore, treeAfter)
    expect(diffs).toHaveLength(1)
    expect(diffs[0]?.status).toBe('added')

    // Rollback
    await shadow.restore(treeBefore, ['created-during-turn.ts'])
    const files = await shadow.files(treeBefore)
    expect(files).toEqual(['base.txt'])
  })

  it('registers invariant companion correctly', async () => {
    const registered: string[] = []
    const ctx = new Context()
    ctx.provide('invariants')
    ctx.set('invariants', {
      register: (pkg: string) => { registered.push(pkg); return () => {} },
    } as never)
    const dispose = await applyInvariant(ctx)
    expect(registered).toEqual(['@const-ai/fs-snapshot'])
    expect(dispose).toBeTypeOf('function')
    dispose()
  })

  it('works when loaded directly as a Cordis Service plugin via ctx.plugin(SnapshotService)', async () => {
    const ctx = new Context()
    await ctx.plugin(SnapshotService)

    const service = ctx.get('snapshot')
    expect(service).toBeInstanceOf(SnapshotService)
    if (!service) throw new Error('snapshot service missing')

    await writeFile(join(testDir, 'plugin-test.txt'), 'version A\n', 'utf8')

    const fakeSession = {
      header: {
        id: 'session-plugin-1',
        cwd: testDir,
      },
    }

    ctx.emit('session/event', fakeSession as never, {
      type: 'turn/start',
      seq: 1,
      time: Date.now(),
      data: { turn: 1 },
    } as never)

    await service.flushSessionQueue('session-plugin-1')

    await writeFile(join(testDir, 'plugin-test.txt'), 'version B modified\n', 'utf8')

    ctx.emit('session/event', fakeSession as never, {
      type: 'turn/end',
      seq: 2,
      time: Date.now(),
      data: { turn: 1 },
    } as never)

    const rollbackRes = await service.rollbackTurn('session-plugin-1', 1)
    expect(rollbackRes.success).toBe(true)

    const restoredContent = await readFile(join(testDir, 'plugin-test.txt'), 'utf8')
    expect(restoredContent).toBe('version A\n')
  })
})
