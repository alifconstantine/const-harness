// @vitest-environment jsdom
/**
 * ui-deliverables browser half: tests for File Change Summary, additions/deletions,
 * Review diff modal, and produced file mentions.
 */
import { Context } from '@const-ai/cordis'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ConversationNodeAssembler,
} from '@const-ai/client-runtime/client'
import type {
  ConversationEventInput, ConversationLocationDataStore, ConversationNodeDefinition,
  ConversationTimelineSnapshot, ConversationTurnDataMap, ConversationViewDefinition,
  ConversationViewNode, ToolResultNode, TurnLocation,
} from '@const-ai/client-runtime/client'
import type { TurnTailOwnerProps } from '@const-ai/client-ui-conversation/client'
import { makeTranslate } from '@const-ai/client-test-runtime'
import { FileIcon } from '../src/client/FileIcon.tsx'
import { DiffReviewModal } from '../src/client/DiffReviewModal.tsx'
import { ProducedFiles } from '../src/client/ProducedFiles.tsx'
import {
  basename, dirname, truncatePath, deliverablesDefinition, producedFileMentions,
  producedForClosing, selectProducedFiles, type DeliverablesTurnData, type ProducedFileItem,
} from '../src/client/turn-deliverables.ts'
import { apply as applyPlugin } from '../src/client/index.ts'
import { apply as applyInvariant } from '../src/invariant.ts'
import { en } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

class TestTurnDataStore implements ConversationLocationDataStore<ConversationTurnDataMap> {
  private readonly values = new Map<string, unknown>()

  get<Key extends Extract<keyof ConversationTurnDataMap, string>>(
    key: Key,
  ): Readonly<ConversationTurnDataMap[Key]> | undefined {
    return this.values.get(key) as Readonly<ConversationTurnDataMap[Key]> | undefined
  }

  set<Key extends Extract<keyof ConversationTurnDataMap, string>>(
    key: Key,
    value: ConversationTurnDataMap[Key],
  ): void {
    this.values.set(key, value)
  }
}

const turnLocation = (turn: number, deliverables?: DeliverablesTurnData): TurnLocation => {
  const data = new TestTurnDataStore()
  if (deliverables !== undefined) data.set('deliverables', deliverables)
  return { turn, start: undefined, end: undefined, status: 'closed', steps: [], data }
}

const item = (
  seq: number,
  path: string,
  add = 2,
  del = 1,
  status: 'added' | 'deleted' | 'modified' = 'modified',
  diffs?: readonly { path: string; oldText: string | null; newText: string }[],
): ProducedFileItem => ({
  seq,
  path,
  additions: add,
  deletions: del,
  status,
  diffs: diffs ?? [{ path, oldText: 'old line\n', newText: 'new line 1\nnew line 2\n' }],
})

const produced = (...items: ProducedFileItem[]): DeliverablesTurnData => ({
  produced: items,
})

function tailOwner(
  data: DeliverablesTurnData | undefined,
  seq: number,
  openFile: (path: string) => void = () => {},
  turn = 1,
): TurnTailOwnerProps {
  return { seq, openFile, turn: turnLocation(turn, data) }
}

interface TimelineSnapshot {
  readonly timeline: ConversationTimelineSnapshot
}

class TestEventDefinitions {
  entries(): readonly ConversationNodeDefinition[] { return [deliverablesDefinition] }
  fallbackEntry(): ConversationNodeDefinition | undefined { return undefined }
}

const timelineViewDefinition: ConversationViewDefinition<ConversationViewNode, TimelineSnapshot> = {
  target: 'test',
  create: () => {
    let current: TimelineSnapshot = { timeline: { turnOrder: [], turns: new Map() } }
    return {
      empty: current,
      replace: (input) => {
        current = { timeline: input.timeline }
        return current
      },
      apply: (input) => {
        current = { timeline: input.timeline }
        return current
      },
    }
  },
}

class TestViewDefinitions {
  entries(): readonly ConversationViewDefinition[] { return [timelineViewDefinition] }
}

function at(seq: number, type: string, data: Record<string, unknown> = {}): ConversationEventInput {
  return {
    event: {
      seq,
      time: 1_700_000_000_000 + seq,
      type,
      data,
    } as unknown as ConversationEventInput['event'],
    view: undefined,
  }
}

function call(
  seq: number,
  callId: string,
  view: ToolResultNode['callView'] = null,
): ConversationEventInput {
  return {
    event: {
      seq,
      time: 1_700_000_000_000 + seq,
      type: 'tool/call',
      data: { turn: 1, step: 1, callId, name: 'write', arguments: '{}' },
    } as unknown as ConversationEventInput['event'],
    view: view === null ? undefined : { for: 'call', view },
  }
}

function result(seq: number, callId: string, isError = false): ConversationEventInput {
  return {
    event: {
      seq,
      time: 1_700_000_000_000 + seq,
      type: 'tool/result',
      surfaceOp: 'append',
      data: {
        turn: 1,
        message: {
          id: String(seq),
          role: 'tool',
          source: { callId },
          content: [{ type: 'text', text: 'ok', isError }],
        },
      },
    } as unknown as ConversationEventInput['event'],
    view: undefined,
  }
}

function diff(...paths: string[]): ToolResultNode['callView'] {
  return {
    card: 'diff',
    title: 'Write',
    diffs: paths.map(path => ({ path, oldText: 'old\n', newText: 'new 1\nnew 2\n' })),
    locations: paths.map(path => ({ path })),
  }
}

function edit(path: string): ToolResultNode['callView'] {
  return { card: 'generic', title: 'Edit', kind: 'edit', locations: [{ path }] }
}

function assembler(events: readonly ConversationEventInput[]): ConversationNodeAssembler {
  const assemblerInstance = new ConversationNodeAssembler(
    new TestEventDefinitions(),
    new TestViewDefinitions(),
  )
  assemblerInstance.replaceWindow(events, false)
  assemblerInstance.flush()
  return assemblerInstance
}

function deliverablesOf(value: ConversationNodeAssembler, turn = 1): Readonly<DeliverablesTurnData> | undefined {
  const snapshot = value.snapshot('test') as TimelineSnapshot
  return snapshot.timeline.turns.get(turn)?.data.get('deliverables')
}

describe('produced-file Turn data & diff stats', () => {
  it('deduplicates paths in first-seen order and stops at the closing Assistant seq', () => {
    const data = produced(
      item(3, 'out/index.html', 10, 2),
      item(4, 'out/app.css', 5, 1),
      item(4, 'out/index.html', 10, 2),
      item(8, 'after.txt', 1, 0),
    )
    const closing = producedForClosing(data, 6)
    expect(closing.map(c => c.path)).toEqual(['out/index.html', 'out/app.css'])
    expect(selectProducedFiles(tailOwner(data, 6))?.map(c => c.path)).toEqual(['out/index.html', 'out/app.css'])
    expect(producedForClosing(undefined)).toEqual([])
    expect(selectProducedFiles(tailOwner(undefined, 9, () => {}, 2))).toBeNull()
  })

  it('folds successful diff and generic-edit calls with line stats', () => {
    const value = assembler([
      at(1, 'turn/start', { turn: 1 }),
      call(2, 'write', diff('out/index.html', 'out/app.css')),
      result(3, 'write'),
      call(4, 'edit', edit('notes.md')),
      result(5, 'edit'),
      call(6, 'read', { card: 'generic', title: 'Read', locations: [{ path: 'input.txt' }] }),
      result(7, 'read'),
      call(8, 'failed', diff('fail.txt')),
      result(9, 'failed', true),
    ])

    const closing = producedForClosing(deliverablesOf(value))
    expect(closing.map(c => c.path)).toEqual(['out/index.html', 'out/app.css', 'notes.md'])
    expect(closing[0]?.additions).toBeGreaterThanOrEqual(1)
  })

  it('rejects an invalid start match and preserves state for an unrelated update', () => {
    const startEvent = at(1, 'turn/start', { turn: 1 })
    const startMatch = {
      id: '1',
      role: 'start' as const,
      event: startEvent.event,
      definition: deliverablesDefinition,
      view: undefined,
      location: { kind: 'turn', turn: turnLocation(1) } as never,
    }
    const emptyContext: Parameters<typeof deliverablesDefinition.start>[0] = {
      key: 'deliverables:1',
      kind: 'deliverables',
      id: '1',
      matches: [startMatch],
      start: startMatch,
      state: undefined,
      current: new Map(),
    }
    const reader: Parameters<typeof deliverablesDefinition.start>[2] = { previous: () => undefined }
    const state = deliverablesDefinition.start(emptyContext, startMatch, reader)
    const unrelatedMatch = {
      id: '1',
      role: 'update' as const,
      event: at(2, 'turn/end', { turn: 1 }).event,
      definition: deliverablesDefinition,
      view: undefined,
      location: { kind: 'turn', turn: turnLocation(1) } as never,
    }
    const context: Parameters<typeof deliverablesDefinition.update>[0] = { ...emptyContext, state }

    expect(() => deliverablesDefinition.start(emptyContext, unrelatedMatch, reader))
      .toThrow('deliverables start requires turn/start')
    expect(deliverablesDefinition.update(context, unrelatedMatch)).toBe(state)
  })
})

describe('FileIcon Component', () => {
  it('renders appropriate icons and badges across file extensions', () => {
    const { container: tsxContainer } = render(<FileIcon filename="App.tsx" />)
    expect(tsxContainer.querySelector('svg')).toBeTruthy()

    const { container: tsContainer } = render(<FileIcon filename="util.ts" />)
    expect(tsContainer.textContent).toBe('TS')

    const { container: jsContainer } = render(<FileIcon filename="bundle.js" />)
    expect(jsContainer.textContent).toBe('JS')

    const { container: pyContainer } = render(<FileIcon filename="script.py" />)
    expect(pyContainer.textContent).toBe('PY')

    const { container: jsonContainer } = render(<FileIcon filename="package.json" />)
    expect(jsonContainer.textContent).toContain('{}')

    const { container: cssContainer } = render(<FileIcon filename="style.css" />)
    expect(cssContainer.textContent).toBe('CSS')

    const { container: otherContainer } = render(<FileIcon filename="README.txt" />)
    expect(otherContainer.querySelector('svg')).toBeTruthy()
  })
})

describe('DiffReviewModal Component', () => {
  it('renders file rail, diff content, allows switching files, and opens file in editor', () => {
    const files = [
      item(1, '/repo/src/EmptyHero.tsx', 2, 2),
      item(2, '/repo/src/FishLogo.tsx', 3, 1, 'modified', []),
    ]
    const openFile = vi.fn()
    const onClose = vi.fn()

    const view = render(
      <DiffReviewModal
        open={true}
        onClose={onClose}
        files={files}
        openFile={openFile}
        totalAdditions={5}
        totalDeletions={3}
      />,
    )

    expect(view.getByText('2 files changed')).toBeTruthy()
    expect(view.getByText('EmptyHero.tsx')).toBeTruthy()
    expect(view.getByText('FishLogo.tsx')).toBeTruthy()

    // Switch to second file
    fireEvent.click(view.getByText('FishLogo.tsx'))
    expect(view.getByText('/repo/src/FishLogo.tsx')).toBeTruthy()

    // Click Open in Editor
    fireEvent.click(view.getByRole('button', { name: 'Open in Editor' }))
    expect(openFile).toHaveBeenCalledWith('/repo/src/FishLogo.tsx')
  })

  it('renders null when closed', () => {
    const view = render(
      <DiffReviewModal
        open={false}
        onClose={() => {}}
        files={[]}
        openFile={() => {}}
        totalAdditions={0}
        totalDeletions={0}
      />,
    )
    expect(view.container.firstChild).toBeNull()
  })
})

describe('ProducedFiles Component & Review Modal', () => {
  const t = makeTranslate(en)
  const capability = (canOpenPath = true) => ({
    isLoopback: true,
    useHostDescription: <R,>(
      selector: (d: {
        version: string
        cwd: string
        provider?: string
        model?: string
        attachedSessions: number
        canOpenPath: boolean
      } | undefined) => R,
    ) =>
      selector({
        version: '1.0.0',
        cwd: '/workspace',
        attachedSessions: 1,
        canOpenPath,
      }),
  })

  it('renders summary bar with file count, additions/deletions stats, and file rows', () => {
    const files = [
      item(1, '/repo/src/EmptyHero.tsx', 2, 2),
      item(2, '/repo/src/FishLogo.tsx', 3, 1),
    ]
    const openFile = vi.fn()

    const view = render(
      <ProducedFiles
        matched={files}
        openFile={openFile}
        {...capability(true)}
        t={t}
      />,
    )

    // Summary bar text
    expect(view.getByText('2 files changed')).toBeTruthy()
    expect(view.getByText('+5')).toBeTruthy()
    expect(view.getByText('-3')).toBeTruthy()

    // File rows
    expect(view.getByText('EmptyHero.tsx')).toBeTruthy()
    expect(view.getByText('FishLogo.tsx')).toBeTruthy()

    // Toggle collapse
    fireEvent.click(view.getByText('2 files changed'))
    expect(view.queryByText('EmptyHero.tsx')).toBeNull()

    // Toggle expand
    fireEvent.click(view.getByText('2 files changed'))
    expect(view.getByText('EmptyHero.tsx')).toBeTruthy()

    // Click Open button opens file
    const openBtn = view.getByRole('button', { name: 'Open EmptyHero.tsx' })
    fireEvent.click(openBtn)
    expect(openFile).toHaveBeenCalledWith('/repo/src/EmptyHero.tsx')

    // Click Review button opens modal
    const reviewButton = view.getByRole('button', { name: 'Review EmptyHero.tsx' })
    fireEvent.click(reviewButton)
    expect(view.getByRole('dialog')).toBeTruthy()
    expect(view.getByText('Review Changes')).toBeTruthy()
  })

  it('handles single file change and empty file list', () => {
    const view = render(
      <ProducedFiles
        matched={[item(1, '/repo/src/single.ts', 1, 0)]}
        openFile={() => {}}
        {...capability(true)}
        t={t}
      />,
    )
    expect(view.getByText('1 file changed')).toBeTruthy()

    view.rerender(
      <ProducedFiles
        matched={[]}
        openFile={() => {}}
        {...capability(true)}
        t={t}
      />,
    )
    expect(view.container.firstChild).toBeNull()
  })
})

describe('producedFileMentions resolver & path helpers', () => {
  const label = (path: string) => `Open ${path}`

  it('resolves exact paths and unique basenames; ambiguity stays unresolved', () => {
    const opened: string[] = []
    const resolver = producedFileMentions(
      ['out/index.html', 'a/style.css', 'b/style.css'],
      (path) => { opened.push(path) },
      label,
    )
    const byBasename = resolver.resolve('index.html')
    expect(byBasename?.label).toBe('Open out/index.html')
    expect(byBasename?.title).toBe('out/index.html')
    byBasename?.open()
    expect(opened).toEqual(['out/index.html'])
    expect(resolver.resolve('style.css')).toBeUndefined()
  })

  it('path helpers extract directory and truncate long paths', () => {
    expect(basename('/a/b/c.ts')).toBe('c.ts')
    expect(dirname('/a/b/c.ts')).toBe('/a/b')
    expect(truncatePath('/very/long/nested/path/to/some/deep/directory/file.ts', 25).startsWith('...')).toBe(true)
    expect(truncatePath('/short/path.ts', 50)).toBe('/short/path.ts')
  })
})

describe('Plugin Registration & Package shells', () => {
  it('registers slot injection and chatFileMentions on context', () => {
    const ctx = new Context()
    const registeredSlots: unknown[] = []
    const registeredEvents: unknown[] = []
    const registeredLocales: unknown[] = []

    ctx.provide('connection')
    ctx.set('connection', { isLoopback: true, hostDescription: () => ({}) } as never)
    ctx.provide('conversationEvents')
    ctx.set('conversationEvents', { register: (e: unknown) => { registeredEvents.push(e); return () => {} } })
    ctx.provide('locale')
    ctx.set('locale', {
      register: (ns: string, _dicts: unknown) => { registeredLocales.push(ns); return () => {} },
      bind: () => (k: string) => k,
    })
    ctx.provide('slots')
    ctx.set('slots', {
      inject: (slot: string, fn: () => void) => { registeredSlots.push(slot); fn() },
      register: (options: unknown, comp: unknown) => ({ options, comp }),
    })

    applyPlugin(ctx)

    expect(registeredEvents).toHaveLength(1)
    expect(registeredLocales).toContain('deliverables')
    expect(registeredSlots).toContain('conversation.chat.turnTail')

    const mentions = ctx.get('chatFileMentions')
    expect(mentions).toBeDefined()
    expect(mentions?.forClosing(tailOwner(undefined, 1))).toBeUndefined()

    const turnData = produced(item(1, '/test/a.ts'))
    const resolver = mentions?.forClosing(tailOwner(turnData, 1))
    expect(resolver).toBeDefined()
  })

  it('the invariant companion registers ownership', async () => {
    const registered: string[] = []
    const ctx = new Context()
    ctx.provide('invariants')
    ctx.set('invariants', {
      register: (pkg: string) => { registered.push(pkg); return () => {} },
    } as never)
    const dispose = await applyInvariant(ctx)
    expect(registered).toEqual(['@const-ai/client-ui-deliverables'])
    expect(dispose).toBeTypeOf('function')
    dispose()
  })
})
