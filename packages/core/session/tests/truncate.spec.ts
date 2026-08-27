import { describe, expect, it } from 'vitest'
import { createUserMessage, createMessage } from '@const-ai/llm'
import { Session, SessionId } from '@const-ai/session'

describe('Session.truncate', () => {
  it('truncates log events and resets surface/derived message caches correctly', () => {
    const session = Session.create(SessionId('trunc-1'))
    session.append('turn/start', { turn: 1 })
    session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'turn 1 prompt' }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })
    session.append('assistant/message', {
      turn: 1,
      step: 1,
      message: createMessage({
        role: 'assistant',
        content: [{ type: 'text', text: 'turn 1 reply' }],
        source: { kind: 'model', provider: 'mock', model: 'mock' },
      }),
    }, { surfaceOp: 'append' })
    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

    session.append('turn/start', { turn: 2 })
    session.append('user/message', createUserMessage({
      content: [{ type: 'text', text: 'turn 2 prompt' }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })
    session.append('assistant/message', {
      turn: 2,
      step: 1,
      message: createMessage({
        role: 'assistant',
        content: [{ type: 'text', text: 'turn 2 reply' }],
        source: { kind: 'model', provider: 'mock', model: 'mock' },
      }),
    }, { surfaceOp: 'append' })
    session.append('turn/end', { turn: 2, reason: { kind: 'completed' } })

    expect(session.events).toHaveLength(8)
    const messagesBefore = session.deriveMessages()
    expect(messagesBefore).toHaveLength(4)

    // Truncate back to before turn 2 started (seq 4 is turn/start for turn 2)
    session.truncate(4)

    expect(session.events).toHaveLength(4)
    const messagesAfter = session.deriveMessages()
    expect(messagesAfter).toHaveLength(2)
    expect(messagesAfter[0]?.content[0]).toMatchObject({ text: 'turn 1 prompt' })
    expect(messagesAfter[1]?.content[0]).toMatchObject({ text: 'turn 1 reply' })
  })

  it('rejects out of bounds sequence targets', () => {
    const session = Session.create(SessionId('trunc-2'))
    session.append('turn/start', { turn: 1 })
    expect(() => { session.truncate(-1) }).toThrow('invalid truncate target seq')
    expect(() => { session.truncate(10) }).toThrow('invalid truncate target seq')
  })
})
