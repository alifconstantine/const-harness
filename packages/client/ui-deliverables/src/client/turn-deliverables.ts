/**
 * Turn-scoped produced-file Definition and readers with additions/deletions diff stats.
 * Client-only and model-free: the vocabulary is the mutation tools' own follow-along
 * `locations` and `diffs`, never the closing prose.
 */
import type {
  ConversationNodeDefinition, ToolResultNode,
} from '@deepseek-ai/dsh-client-runtime/client'
import { isAppendSurfaceEvent } from '@deepseek-ai/dsh-client-runtime/client'
import type { MarkdownFileMentions } from '@deepseek-ai/dsh-client-ui-primitives'
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'

export interface ProducedFileItem {
  readonly seq: number
  readonly path: string
  readonly additions: number
  readonly deletions: number
  readonly status: 'added' | 'deleted' | 'modified'
  readonly diffs?: readonly { path: string; oldText: string | null; newText: string }[]
}

/** Immutable produced-file facts published against one Turn. */
export interface DeliverablesTurnData {
  readonly produced: readonly ProducedFileItem[]
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  interface ConversationTurnDataMap {
    /** Successful mutation paths and diff stats accumulated in this Turn. */
    deliverables: DeliverablesTurnData
  }
}

interface DeliverablesState extends DeliverablesTurnData {
  readonly turn: number
  readonly calls: ReadonlyMap<string, ToolResultNode['callView']>
}

/**
 * Compute line additions and deletions from diff hunks.
 */
function computeDiffStats(
  diffs: readonly { path: string; oldText: string | null; newText: string }[] | undefined,
): { additions: number; deletions: number; status: 'added' | 'deleted' | 'modified' } {
  if (!diffs || diffs.length === 0) {
    return { additions: 1, deletions: 0, status: 'modified' }
  }

  let additions = 0
  let deletions = 0
  let isAddOnly = true
  let isDeleteOnly = true

  for (const diff of diffs) {
    if (diff.oldText === null) {
      const lines = diff.newText ? diff.newText.split('\n').length : 0
      additions += lines
      isDeleteOnly = false
    } else {
      const oldLines = diff.oldText.split('\n')
      const newLines = diff.newText.split('\n')
      const oldSet = new Set(oldLines)
      const newSet = new Set(newLines)
      let added = 0
      let removed = 0
      for (const line of newLines) {
        if (!oldSet.has(line)) added++
      }
      for (const line of oldLines) {
        if (!newSet.has(line)) removed++
      }
      if (added === 0 && removed === 0 && diff.oldText !== diff.newText) {
        added = Math.max(1, newLines.length)
        removed = Math.max(1, oldLines.length)
      }
      additions += added
      deletions += removed
      if (added > 0) isDeleteOnly = false
      if (removed > 0) isAddOnly = false
    }
  }

  const status = isAddOnly && deletions === 0
    ? 'added'
    : isDeleteOnly && additions === 0
      ? 'deleted'
      : 'modified'

  return { additions, deletions, status }
}

/**
 * Extract produced file entries with diff stats from a call view.
 */
function producedEntries(view: ToolResultNode['callView'], seq: number): readonly ProducedFileItem[] {
  if (view === null) return []
  if (view.card === 'diff') {
    const locations = (view.locations ?? []).map(l => l.path)
    const diffs = view.diffs as readonly { path: string; oldText: string | null; newText: string }[]
    const diffMap = new Map<string, { path: string; oldText: string | null; newText: string }[]>()
    for (const d of diffs) {
      const list = diffMap.get(d.path) ?? []
      list.push(d)
      diffMap.set(d.path, list)
    }

    const paths = Array.from(new Set([...locations, ...diffMap.keys()]))
    return paths.map((path) => {
      const fileDiffs = diffMap.get(path)
      const stats = computeDiffStats(fileDiffs)
      return {
        seq,
        path,
        additions: stats.additions,
        deletions: stats.deletions,
        status: stats.status,
        ...(fileDiffs !== undefined ? { diffs: fileDiffs } : {}),
      }
    })
  }

  if (view.card === 'generic' && view.kind === 'edit') {
    return (view.locations ?? []).map(location => ({
      seq,
      path: location.path,
      additions: 1,
      deletions: 1,
      status: 'modified',
    }))
  }

  return []
}

/**
 * Files produced by one Turn data value for the closing assistant seq.
 */
export function producedForClosing(
  data: Readonly<DeliverablesTurnData> | undefined,
  seq = Number.POSITIVE_INFINITY,
): readonly ProducedFileItem[] {
  if (data === undefined) return []
  const items: ProducedFileItem[] = []
  const seen = new Set<string>()
  for (const produced of data.produced) {
    if (produced.seq > seq || seen.has(produced.path)) continue
    seen.add(produced.path)
    items.push(produced)
  }
  return items
}

/**
 * Claim the turn-tail chain only when its closing turn produced files.
 */
export function selectProducedFiles(owner: TurnTailOwnerProps): readonly ProducedFileItem[] | null {
  const items = producedForClosing(owner.turn.data.get('deliverables'), owner.seq)
  return items.length === 0 ? null : items
}

/** Turn-local successful mutation accumulator; it publishes no view Node. */
export const deliverablesDefinition: ConversationNodeDefinition<DeliverablesState> = {
  kind: 'deliverables',
  match: (event) => {
    if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' }
    if (event.type === 'tool/call') return { id: String(event.data.turn), role: 'update' }
    if (event.type === 'tool/result' && isAppendSurfaceEvent(event)) {
      return { id: String(event.data.turn), role: 'update' }
    }
    return null
  },
  start: (_context, match) => {
    if (match.event.type !== 'turn/start') throw new Error('deliverables start requires turn/start')
    return { turn: match.event.data.turn, calls: new Map(), produced: [] }
  },
  update: (context, match) => {
    if (match.event.type === 'tool/call') {
      const calls = new Map(context.state.calls)
      calls.set(
        String(match.event.data.callId),
        match.view?.for === 'call' ? match.view.view : null,
      )
      return { ...context.state, calls }
    }
    if (match.event.type !== 'tool/result') return context.state
    const result = match.event.data.message.content[0]
    if (result.isError === true) return context.state
    const callId = String(match.event.data.message.source.callId)
    const entries = producedEntries(context.state.calls.get(callId) ?? null, match.event.seq)
    return entries.length === 0
      ? context.state
      : { ...context.state, produced: [...context.state.produced, ...entries] }
  },
  buildLocationData: (context, scope) => scope !== 'turn' || context.state === undefined
    ? null
    : {
      kind: 'turn',
      turn: context.state.turn,
      key: 'deliverables',
      value: { produced: context.state.produced },
    },
}

/**
 * Trailing path segment, the part that identifies the file at a glance.
 */
export function basename(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? path : path.slice(at + 1)
}

/**
 * Directory path segment for display.
 */
export function dirname(path: string): string {
  const at = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'))
  return at === -1 ? '' : path.slice(0, at)
}

/**
 * Truncate long directory path with ellipsis in front.
 */
export function truncatePath(path: string, maxLength = 55): string {
  if (path.length <= maxLength) return path
  return '...' + path.slice(path.length - maxLength + 3)
}

/**
 * File-mention vocabulary over one turn's produced paths.
 */
export function producedFileMentions(
  paths: readonly string[],
  openFile: (path: string) => void,
  label: (path: string) => string,
): MarkdownFileMentions {
  return {
    resolve(value) {
      const path = paths.includes(value) ? value : onlyPathWithBasename(paths, value)
      if (path === undefined) return undefined
      return { open: () => { openFile(path) }, label: label(path), title: path }
    },
  }
}

function onlyPathWithBasename(paths: readonly string[], value: string): string | undefined {
  const matches = paths.filter(path => basename(path) === value)
  return matches.length === 1 ? matches[0] : undefined
}
