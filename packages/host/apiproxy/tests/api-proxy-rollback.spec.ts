import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import SnapshotService from '@const-ai/fs-snapshot'
import { describe, expect, it, vi } from 'vitest'
import { Context } from '@const-ai/cordis'
import AgentRegistry from '@const-ai/agent'
import type { Agent, AgentHandle, CreateAgentOptions } from '@const-ai/agent'
import { createUserMessage } from '@const-ai/llm'
import SessionStore, { SessionId } from '@const-ai/session'
import SystemPrompt from '@const-ai/system-prompt'
import UserQuestionService from '@const-ai/user-questions'
import type { RpcRequest } from '@const-ai/host-apiproxy/api/rpc'
import { RpcId } from '@const-ai/host-apiproxy/api/rpc'
import { createApiProxy } from '@const-ai/host-apiproxy'

const sid = (id: string): SessionId => id as SessionId

let nextRpc = 1
function request<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`rollback-${String(nextRpc++)}`), payload }
}

async function createTestContext(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt, { persona: '' })
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(UserQuestionService)

  ctx.provide('snapshot', {
    rollbackTurn: vi.fn().mockResolvedValue({ success: true, restoredFiles: ['file.txt'] }),
  } as never)

  ctx.provide('sessionPersistence', {
    truncate: vi.fn().mockResolvedValue(undefined),
  } as never)

  ctx.provide('workspaceRegistry', { list: () => [] } as never)

  ctx.agents.setFactory({
    createAgent: async (ownerCtx: Context, options: CreateAgentOptions): Promise<AgentHandle> => {
      const session = ctx.sessions.create(options.sessionId, {
        ...options.seed === undefined ? {} : { seed: [...options.seed] },
        ...options.meta === undefined ? {} : { meta: options.meta },
      })
      const agent = {
        id: session.id,
        session,
        status: 'idle',
        cancel: vi.fn(),
      } as unknown as Agent
      const agentCtx = ownerCtx.extend({ agent })
      Object.assign(agent, { ctx: agentCtx })
      await options.setup?.(agentCtx)
      ctx.agents.register(agent)
      return { agent, dispose: () => Promise.resolve() }
    },
    resume: () => Promise.reject(new Error('not implemented')),
  })

  return ctx
}

describe('api-proxy rollbackTurn', () => {
  it('truncates in-memory session and invokes snapshot rollback non-destructively', async () => {
    const ctx = await createTestContext()
    const handle = await ctx.agents.create({
      sessionId: sid('session-roll-1'),
      meta: { cwd: '/test-workspace' },
    })

    const session = handle.agent.session
    session.append('turn/start', { turn: 1 })
    session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'turn 1 prompt' }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })
    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

    session.append('turn/start', { turn: 2 })
    session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'turn 2 prompt' }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })
    session.append('turn/end', { turn: 2, reason: { kind: 'completed' } })

    expect(session.events).toHaveLength(6)

    const proxy = createApiProxy(ctx, {
      defaultModelSelection: () => ({ provider: 'default-provider', model: 'default-model' }),
      cwd: '/tmp',
    })
    const res = await proxy.sessions.rollbackTurn(request({
      sessionId: sid('session-roll-1'),
      turn: 2,
    }))

    expect(res.result.ok).toBe(true)
    if (res.result.ok) {
      expect(res.result.value.userPrompt).toBe('turn 2 prompt')
      expect(res.result.value.restoredFiles).toEqual(['file.txt'])
    }

    // Live session must still be attached and truncated to turn 1
    expect(ctx.sessions.get(sid('session-roll-1'))).toBe(session)
    expect(session.events).toHaveLength(3)
    expect(session.events[session.events.length - 1]?.type).toBe('turn/end')

    // Snapshot and Persistence truncate must have been called
    const snapshot = ctx.get('snapshot') as unknown as { rollbackTurn: ReturnType<typeof vi.fn> }
    expect(snapshot.rollbackTurn).toHaveBeenCalledWith('session-roll-1', 2, '/test-workspace')

    const persistence = ctx.get('sessionPersistence') as unknown as { truncate: ReturnType<typeof vi.fn> }
    expect(persistence.truncate).toHaveBeenCalledWith(sid('session-roll-1'), session.events)
  })

  it('performs end-to-end file rollback across multiple turns with real SnapshotService', async () => {
    const testDir = await mkdtemp(join(tmpdir(), 'const-apiproxy-roll-'))

    try {
      const ctx = new Context()
      await ctx.plugin(SessionStore)
      await ctx.plugin(SystemPrompt, { persona: '' })
      await ctx.plugin(AgentRegistry)
      await ctx.plugin(UserQuestionService)
      await ctx.plugin(SnapshotService)

      ctx.provide('sessionPersistence', {
        truncate: vi.fn().mockResolvedValue(undefined),
      } as never)
      ctx.provide('workspaceRegistry', { list: () => [] } as never)

      ctx.agents.setFactory({
        createAgent: async (ownerCtx: Context, options: CreateAgentOptions): Promise<AgentHandle> => {
          const session = ctx.sessions.create(options.sessionId, {
            ...options.seed === undefined ? {} : { seed: [...options.seed] },
            ...options.meta === undefined ? {} : { meta: options.meta },
          })
          const agent = {
            id: session.id,
            session,
            status: 'idle',
            cancel: vi.fn(),
          } as unknown as Agent
          const agentCtx = ownerCtx.extend({ agent })
          Object.assign(agent, { ctx: agentCtx })
          await options.setup?.(agentCtx)
          ctx.agents.register(agent)
          return { agent, dispose: () => Promise.resolve() }
        },
        resume: () => Promise.reject(new Error('not implemented')),
      })

      const handle = await ctx.agents.create({
        sessionId: sid('session-e2e-roll'),
        meta: { cwd: testDir },
      })
      const session = handle.agent.session
      const snapshot = ctx.get('snapshot') as SnapshotService
      expect(snapshot).toBeInstanceOf(SnapshotService)

      // Turn 1: create hello.html
      session.append('turn/start', { turn: 1 })
      await snapshot.flushSessionQueue('session-e2e-roll')
      await writeFile(join(testDir, 'hello.html'), '<h1>Version 1</h1>', 'utf8')
      session.append('user/message', createUserMessage({
        content: [{ type: 'text', text: 'buat hello.html' }],
        source: { kind: 'user' },
      }), { surfaceOp: 'append' })
      session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
      await snapshot.flushSessionQueue('session-e2e-roll')

      // Turn 2: update hello.html to Version 2 and create new-page.html
      session.append('turn/start', { turn: 2 })
      await snapshot.flushSessionQueue('session-e2e-roll')
      await writeFile(join(testDir, 'hello.html'), '<h1>Version 2 Const</h1>', 'utf8')
      await writeFile(join(testDir, 'new-page.html'), '<p>New Page</p>', 'utf8')
      session.append('user/message', createUserMessage({
        content: [{ type: 'text', text: 'ganti namanya jadi Const' }],
        source: { kind: 'user' },
      }), { surfaceOp: 'append' })
      session.append('turn/end', { turn: 2, reason: { kind: 'completed' } })
      await snapshot.flushSessionQueue('session-e2e-roll')

      const proxy = createApiProxy(ctx, {
        defaultModelSelection: () => ({ provider: 'default-provider', model: 'default-model' }),
        cwd: testDir,
      })

      // Rollback Turn 2
      const res = await proxy.sessions.rollbackTurn(request({
        sessionId: sid('session-e2e-roll'),
        turn: 2,
      }))

      expect(res.result.ok).toBe(true)
      if (res.result.ok) {
        expect(res.result.value.userPrompt).toBe('ganti namanya jadi Const')
      }

      // Check filesystem: hello.html must be restored to Version 1, and new-page.html must be gone!
      const content = await readFile(join(testDir, 'hello.html'), 'utf8')
      expect(content).toBe('<h1>Version 1</h1>')

      expect(existsSync(join(testDir, 'new-page.html'))).toBe(false)
    } finally {
      await rm(testDir, { recursive: true, force: true }).catch(() => {})
    }
  })
})
