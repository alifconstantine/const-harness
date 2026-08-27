import { describe, expect, it } from 'vitest'
import { Context } from '@const-ai/cordis'
import { createUserMessage } from '@const-ai/llm'
import SessionStore, { SessionId } from '@const-ai/session'
import type { SessionEvent, SessionHeader } from '@const-ai/session'
import {
  SessionPersistenceRevision, PersistenceCoordinator,
  type PersistenceBackend, type StoredPrefix,
} from '../src/index.ts'
import { meta } from './contract.ts'

class MockMemoryBackend implements PersistenceBackend<number> {
  readonly name = 'mock-memory-backend'
  readonly store = new Map<string, { meta: SessionHeader; events: SessionEvent[] }>()

  async loadStored(id: SessionId): Promise<StoredPrefix<number> | undefined> {
    const entry = this.store.get(id)
    if (!entry) return undefined
    return {
      meta: structuredClone(entry.meta),
      events: entry.events.map(e => structuredClone(e)),
      revision: SessionPersistenceRevision(JSON.stringify(entry)),
    }
  }

  async readStoredRevision(id: SessionId): Promise<SessionPersistenceRevision | undefined> {
    const entry = this.store.get(id)
    if (!entry) return undefined
    return SessionPersistenceRevision(JSON.stringify(entry))
  }

  async appendBatch(header: SessionHeader, events: readonly SessionEvent[], _isMaterialized: boolean): Promise<void> {
    const entry = this.store.get(header.id)
    if (!entry) {
      this.store.set(header.id, { meta: structuredClone(header), events: events.map(e => structuredClone(e)) })
    } else {
      entry.events.push(...events.map(e => structuredClone(e)))
    }
  }

  async commitRepair(): Promise<void> {
    return Promise.resolve()
  }

  async deleteStored(id: SessionId): Promise<void> {
    this.store.delete(id)
  }

  async list(): Promise<SessionHeader[]> {
    return Array.from(this.store.values()).map(e => structuredClone(e.meta))
  }
}

describe('PersistenceCoordinator.truncate', () => {
  it('rewrites stored log to a truncated event prefix', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    const backend = new MockMemoryBackend()
    const coordinator = new PersistenceCoordinator(ctx, backend)

    const sessionHeader = meta('test-trunc-session')
    await coordinator.create(sessionHeader)

    const events: SessionEvent[] = [
      { type: 'turn/start', seq: 0, time: 100, data: { turn: 1 } },
      { type: 'user/message', seq: 1, time: 101, surfaceOp: 'append', data: createUserMessage({ content: [{ type: 'text', text: 'turn 1' }], source: { kind: 'user' } }) },
      { type: 'turn/end', seq: 2, time: 102, data: { turn: 1, reason: { kind: 'completed' } } },
      { type: 'turn/start', seq: 3, time: 200, data: { turn: 2 } },
      { type: 'user/message', seq: 4, time: 201, surfaceOp: 'append', data: createUserMessage({ content: [{ type: 'text', text: 'turn 2' }], source: { kind: 'user' } }) },
      { type: 'turn/end', seq: 5, time: 202, data: { turn: 2, reason: { kind: 'completed' } } },
    ]

    await coordinator.append(sessionHeader.id, events)

    const loadedBefore = await coordinator.load(sessionHeader.id)
    expect(loadedBefore.events).toHaveLength(6)

    // Truncate to keep only turn 1 (first 3 events: seq 0, 1, 2)
    const eventsToKeep = events.slice(0, 3)
    await coordinator.truncate(sessionHeader.id, eventsToKeep)

    const loadedAfter = await coordinator.load(sessionHeader.id)
    expect(loadedAfter.events).toHaveLength(3)
    expect(loadedAfter.events.map(e => e.seq)).toEqual([0, 1, 2])
  })
})
