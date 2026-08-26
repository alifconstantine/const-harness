// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { createRef } from 'react'
import type { ChatNodeStore, ConversationTimelineSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import { TurnTimelineNav } from '../src/client/chat/TurnTimelineNav.tsx'
import type { ChatNode } from '../src/client/contract/chat-nodes.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function makeMockStore(nodes: Record<string, ChatNode>): ChatNodeStore {
  return {
    get: (key: string) => nodes[key] as never,
    values: () => Object.values(nodes) as never,
  }
}

describe('TurnTimelineNav', () => {
  it('renders nothing when there are 0 turns', () => {
    const listRef = createRef<HTMLDivElement>()
    const store = makeMockStore({})
    const timeline: ConversationTimelineSnapshot = {
      turnOrder: [],
      turns: new Map(),
    }

    const { container } = render(
      <TurnTimelineNav
        order={[]}
        nodeStore={store}
        timeline={timeline}
        listRef={listRef}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders 1 dash when 1 turn is present', () => {
    const listRef = createRef<HTMLDivElement>()
    const store = makeMockStore({
      'user:1': {
        key: 'user:1',
        anchorSeq: 1,
        kind: 'user',
        visibility: 'visible',
        location: { kind: 'turn', turn: { turn: 1 } as never },
        data: { content: [{ type: 'text', text: 'Hello' }], time: 1000, source: null, seq: 1 },
      } as never,
    })
    const timeline: ConversationTimelineSnapshot = {
      turnOrder: [1],
      turns: new Map(),
    }

    const { container } = render(
      <TurnTimelineNav
        order={['user:1']}
        nodeStore={store}
        timeline={timeline}
        listRef={listRef}
      />,
    )
    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(1)
  })

  it('renders dashes for 2 or more turns and shows preview on hover', async () => {
    vi.useFakeTimers()
    const listRef = createRef<HTMLDivElement>()
    const store = makeMockStore({
      'user:1': {
        key: 'user:1',
        anchorSeq: 1,
        kind: 'user',
        visibility: 'visible',
        location: { kind: 'turn', turn: { turn: 1 } as never },
        data: { content: [{ type: 'text', text: 'First user prompt' }], time: 1000, source: null, seq: 1 },
      } as never,
      'assistant:2': {
        key: 'assistant:2',
        anchorSeq: 2,
        kind: 'assistant-step',
        visibility: 'visible',
        location: { kind: 'turn', turn: { turn: 1 } as never },
        data: { status: 'settled', turn: 1, step: 1, blocks: [{ kind: 'text', text: 'First assistant response' }], time: 2000 },
      } as never,
      'user:3': {
        key: 'user:3',
        anchorSeq: 3,
        kind: 'user',
        visibility: 'visible',
        location: { kind: 'turn', turn: { turn: 2 } as never },
        data: { content: [{ type: 'text', text: 'Second user prompt' }], time: 3000, source: null, seq: 3 },
      } as never,
      'assistant:4': {
        key: 'assistant:4',
        anchorSeq: 4,
        kind: 'assistant-step',
        visibility: 'visible',
        location: { kind: 'turn', turn: { turn: 2 } as never },
        data: { status: 'settled', turn: 2, step: 1, blocks: [{ kind: 'text', text: 'Second assistant reply' }], time: 4000 },
      } as never,
    })
    const timeline: ConversationTimelineSnapshot = {
      turnOrder: [1, 2],
      turns: new Map(),
    }

    const { container, queryByText } = render(
      <TurnTimelineNav
        order={['user:1', 'assistant:2', 'user:3', 'assistant:4']}
        nodeStore={store}
        timeline={timeline}
        listRef={listRef}
      />,
    )

    const buttons = container.querySelectorAll('button')
    expect(buttons.length).toBe(2)

    // Hover over the first turn item
    const itemWrapper = container.querySelectorAll('[class*="itemWrapper"]')[0]
    expect(itemWrapper).toBeDefined()
    if (itemWrapper) {
      fireEvent.pointerEnter(itemWrapper)
    }

    expect(queryByText('First user prompt')).not.toBeNull()
    expect(queryByText('First assistant response')).not.toBeNull()

    // Leave hover
    if (itemWrapper) {
      fireEvent.pointerLeave(itemWrapper)
    }
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(queryByText('First user prompt')).toBeNull()
  })

  it('scrolls into view when a dash button is clicked', () => {
    const listEl = document.createElement('div')
    const userRow1 = document.createElement('div')
    userRow1.dataset.chatAnchorKey = 'user:1'
    const scrollIntoViewMock1 = vi.fn()
    userRow1.scrollIntoView = scrollIntoViewMock1
    listEl.appendChild(userRow1)

    const listRef = { current: listEl }
    const store = makeMockStore({
      'user:1': {
        key: 'user:1',
        anchorSeq: 1,
        kind: 'user',
        visibility: 'visible',
        location: { kind: 'turn', turn: { turn: 1 } as never },
        data: { content: [{ type: 'text', text: 'Hello' }], time: 1000, source: null, seq: 1 },
      } as never,
      'user:2': {
        key: 'user:2',
        anchorSeq: 2,
        kind: 'user',
        visibility: 'visible',
        location: { kind: 'turn', turn: { turn: 2 } as never },
        data: { content: [{ type: 'text', text: 'World' }], time: 2000, source: null, seq: 2 },
      } as never,
    })
    const timeline: ConversationTimelineSnapshot = {
      turnOrder: [1, 2],
      turns: new Map(),
    }

    const { container } = render(
      <TurnTimelineNav
        order={['user:1', 'user:2']}
        nodeStore={store}
        timeline={timeline}
        listRef={listRef}
      />,
    )

    const buttons = container.querySelectorAll('button')
    fireEvent.click(buttons[0]!)
    expect(scrollIntoViewMock1).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })
})
