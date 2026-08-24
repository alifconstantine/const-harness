// DetailsPanel: Companion side panel with Trajectory, Tool Details, and Tasks views.
// Multi-tab companion inspector in the third column.

import { Fragment, useId } from 'react'
import clsx from 'clsx'
import {
  CodeBlock, IconActivityOutline16, IconChecklistOutline16, IconTerminalOutline16,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { shallowEqual } from '@deepseek-ai/dsh-client-runtime/client'
import type {
  AssistantMessageNode, ConversationSnapshot, RunningToolCall, ToolCallBlock, ToolResultNode,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { TodoItem } from '@deepseek-ai/dsh-tool-todo/client'
import type { DetailsSlotProps } from '../contract/slots.ts'
import { findToolCall } from '../chat/tool-node-reader.ts'
import css from './DetailsPanel.module.css'

/** Full props composed by reference from the contract (automatic shares & injected share). */
export type DetailsPanelProps = DetailsSlotProps

interface CallMaterial {
  name: string
  argsRaw: string | null
  block: ToolCallBlock
}

function settledMaterial(node: ToolResultNode, callId: string): CallMaterial {
  return { name: node.call?.name ?? callId, argsRaw: node.call?.argsRaw ?? null, block: node }
}

function runningMaterial(call: RunningToolCall): CallMaterial {
  return { name: call.name, argsRaw: call.argsRaw, block: call }
}

function materialFor(s: ConversationSnapshot, callId: string): CallMaterial | null {
  const found = findToolCall(s, callId)
  if (found === undefined) return null
  return 'kind' in found ? settledMaterial(found, callId) : runningMaterial(found)
}

function pretty(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function rawResultText(block: ToolCallBlock): string {
  if (!('kind' in block)) return ''
  const parts = block.content.map(item => item.type === 'text' ? item.text : JSON.stringify(item, null, 2))
  if (parts.length === 0 && block.error !== undefined) parts.push(`${block.error.name}: ${block.error.code}`)
  return parts.join('\n')
}

function TaskStatusGlyph({ status }: { status: TodoItem['status'] }) {
  const id = useId()
  if (status === 'completed') {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: 'var(--dsw-alias-state-success-primary)' }}>
        <circle cx="7" cy="7" r="6.4" stroke="currentColor" strokeWidth="1.2" />
        <path d="M10 5L6 9L4 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (status === 'in_progress') {
    return (
      <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: 'var(--dsw-alias-state-business-primary)' }}>
        <defs>
          <linearGradient id={id} x1="2.5" y1="12" x2="10.5" y2="3.5" gradientUnits="userSpaceOnUse">
            <stop stopColor="currentColor" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="7" cy="7" r="6.4" stroke={`url(#${id})`} strokeWidth="1.2" />
      </svg>
    )
  }
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ color: 'var(--dsw-alias-label-tertiary)' }}>
      <circle cx="7" cy="7" r="6.4" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.4 2.4" />
    </svg>
  )
}

export function DetailsPanel({
  useSession, useSessions, sessionId, useStore, useProjection, renderSlot, closeDetails, actions, t,
}: DetailsPanelProps) {
  const companionTab = useStore(s => s.companionTab) ?? 'trajectory'
  const selection = useStore(s => s.selection)
  const sessionCwd = useSessions(list => list.byId[sessionId]?.cwd)
  const callId = selection?.callId
  const material = useSession(
    s => (callId === undefined ? null : materialFor(s, callId)),
    (a, b) => shallowEqual(a, b),
  )

  const sessionSnapshot = useSession(s => s)
  const todos = useProjection('todos')

  return (
    <div className={css.root}>
      <div className={css.header}>
        <div className={css.tabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={companionTab === 'trajectory'}
            className={clsx(css.tab, companionTab === 'trajectory' && css.tabActive)}
            onClick={() => { actions.setCompanionTab('trajectory') }}
          >
            <IconActivityOutline16 size={13} />
            <span>Trajectory</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={companionTab === 'details'}
            className={clsx(css.tab, companionTab === 'details' && css.tabActive)}
            onClick={() => { actions.setCompanionTab('details') }}
          >
            <IconTerminalOutline16 size={13} />
            <span>Details</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={companionTab === 'tasks'}
            className={clsx(css.tab, companionTab === 'tasks' && css.tabActive)}
            onClick={() => { actions.setCompanionTab('tasks') }}
          >
            <IconChecklistOutline16 size={13} />
            <span>Tasks</span>
            {todos && todos.length > 0 && <span>({todos.length})</span>}
          </button>
        </div>

        <button
          type="button"
          className={css.close}
          aria-label={t('details.close')}
          onClick={() => { closeDetails() }}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className={css.body}>
        {/* Tab 1: Trajectory */}
        {companionTab === 'trajectory' && (
          <div>
            <div className={css.trajectorySummary}>
              <span>Status: {sessionSnapshot.running ? '⚡ Running' : 'Idle'}</span>
              <span>{sessionSnapshot.turnTimings.size} Turns</span>
            </div>

            {sessionSnapshot.turnTimings.size === 0 && (
              <div className={css.empty}>No trajectory activity yet in this session.</div>
            )}

            {Array.from(sessionSnapshot.turnTimings.entries()).map(([turnSeq, timing]) => {
              const durationMs = timing.endTime ? timing.endTime - timing.startTime : undefined
              const durationStr = durationMs !== undefined
                ? durationMs > 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`
                : 'in progress…'

              const assistantNodes = sessionSnapshot.nodes.filter(
                (n): n is AssistantMessageNode => n.kind === 'assistant' && n.turn === turnSeq,
              )
              const toolCalls = assistantNodes.flatMap(n =>
                n.blocks.filter((b): b is { kind: 'tool-call'; callId: string; name: string; argsRaw: string } => b.kind === 'tool-call'),
              )

              return (
                <div key={turnSeq} className={css.turnCard}>
                  <div className={css.turnHeader}>
                    <span>Turn {turnSeq}</span>
                    <span>{durationStr}</span>
                  </div>
                  <div className={css.turnSteps}>
                    {toolCalls.map(call => (
                      <div
                        key={call.callId}
                        className={css.stepRow}
                        onClick={() => {
                          actions.select({ turnSeq, callId: call.callId, toolName: call.name })
                          actions.setCompanionTab('details')
                        }}
                      >
                        <span className={css.stepName}>⚡ {call.name}</span>
                        <span>inspect →</span>
                      </div>
                    ))}
                    {toolCalls.length === 0 && (
                      <span className={css.empty} style={{ padding: 4 }}>Turn recorded</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Tab 2: Details */}
        {companionTab === 'details' && (
          <div>
            {selection === null || callId === undefined ? (
              <div className={css.empty}>{t('details.empty')}</div>
            ) : material === null ? (
              <div className={css.empty}>{t('details.notInWindow')}</div>
            ) : (
              <>
                <div className={css.sectionLabel} style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                  Tool: {material.name}
                </div>
                {material.argsRaw !== null && (
                  <section className={css.section}>
                    <div className={css.sectionLabel}>{t('details.input')}</div>
                    <CodeBlock code={pretty(material.argsRaw)} lang="json" copyLabel={t('copy')} copiedLabel={t('copied')} />
                  </section>
                )}
                <section className={css.section}>
                  <div className={css.sectionLabel}>{t('details.output')}</div>
                  <Fragment key={callId}>
                    {renderSlot('conversation.details.tool', { block: material.block, cwd: sessionCwd }, {
                      fallback: 'kind' in material.block ? (
                        <pre className={css.code} data-error={material.block.isError || undefined}>
                          {rawResultText(material.block)}
                        </pre>
                      ) : (
                        <div className={css.empty}>{t('details.running')}</div>
                      ),
                    })}
                  </Fragment>
                </section>
              </>
            )}
          </div>
        )}

        {/* Tab 3: Tasks */}
        {companionTab === 'tasks' && (
          <div>
            {(!todos || todos.length === 0) ? (
              <div className={css.empty}>No active tasks or plan items for this session.</div>
            ) : (
              <ul className={css.taskList}>
                {todos.map((item, idx) => (
                  <li key={idx} className={css.taskItem} data-status={item.status}>
                    <span className={css.taskGlyph}>
                      <TaskStatusGlyph status={item.status} />
                    </span>
                    <span>{item.content}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
