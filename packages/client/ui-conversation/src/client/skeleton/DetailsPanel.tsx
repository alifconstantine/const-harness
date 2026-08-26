// DetailsPanel: Multi-tab companion inspector in the third column.
// Supports Chooser state, dynamic tabs (Terminal, Trajectory, Details, Review, Browser, Tasks),
// and persistent tool call inspection.

import { Fragment, useEffect, useId, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  CodeBlock,
  IconActivityOutline16,
  IconChecklistOutline16,
  IconCheckOutline14,
  IconChevronDownOutline14,
  IconCloseFill14,
  IconFileOutline16,
  IconGlobeOutline16,
  IconNewChatOutline16,
  IconPlusOutline16,
  IconRefreshOutline14,
  IconSearchOutline16,
  IconTerminalOutline16,
  Menu,
  type MenuEntry,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { shallowEqual } from '@deepseek-ai/dsh-client-runtime/client'
import type {
  AssistantMessageNode, ConversationSnapshot, RunningToolCall, ToolCallBlock, ToolResultNode,
} from '@deepseek-ai/dsh-client-runtime/client'
import type { TodoItem } from '@deepseek-ai/dsh-tool-todo/client'
import type { DetailsSlotProps } from '../contract/slots.ts'
import type { CompanionTabId } from '../contract/views.ts'
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

function IconDoubleChevronDown14({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} className={className} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.5 3.5L7 7L10.5 3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3.5 7.5L7 11L10.5 7.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

interface TabMeta {
  id: CompanionTabId
  label: string
  icon: React.ReactNode
}

export function DetailsPanel({
  useSession, useSessions, sessionId, useStore, useProjection, renderSlot, closeDetails: _closeDetails, actions, t,
}: DetailsPanelProps) {
  const companionTab = useStore(s => s.companionTab)
  const selection = useStore(s => s.selection)
  const sessionCwd = useSessions(list => list.byId[sessionId]?.cwd)
  const callId = selection?.callId
  const material = useSession(
    s => (callId === undefined ? null : materialFor(s, callId)),
    (a, b) => shallowEqual(a, b),
  )

  const sessionSnapshot = useSession(s => s)
  const todos = useProjection('todos')

  // Open tabs set in the side panel
  const [openTabs, setOpenTabs] = useState<CompanionTabId[]>(() => {
    return companionTab ? [companionTab] : []
  })

  const [plusMenuOpen, setPlusMenuOpen] = useState(false)
  const [searchMenuOpen, setSearchMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchMenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Synchronize store tab with open tabs
  useEffect(() => {
    if (companionTab && !openTabs.includes(companionTab)) {
      setOpenTabs(prev => [...prev, companionTab])
    }
  }, [companionTab, openTabs])

  // Handle outside clicks and escape key for search tab dropdown
  useEffect(() => {
    if (!searchMenuOpen) {
      setSearchQuery('')
      return
    }
    const handleDown = (e: MouseEvent) => {
      if (searchMenuRef.current && !searchMenuRef.current.contains(e.target as Node)) {
        setSearchMenuOpen(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSearchMenuOpen(false)
    }
    document.addEventListener('mousedown', handleDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [searchMenuOpen])

  const activeTab = companionTab && openTabs.includes(companionTab)
    ? companionTab
    : (openTabs.length > 0 ? openTabs[0] : null)

  const handleOpenTab = (tabId: CompanionTabId) => {
    if (!openTabs.includes(tabId)) {
      setOpenTabs(prev => [...prev, tabId])
    }
    actions.setCompanionTab(tabId)
  }

  const handleCloseTab = (tabId: CompanionTabId, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const remaining = openTabs.filter(id => id !== tabId)
    setOpenTabs(remaining)
    if (activeTab === tabId) {
      const nextTab = remaining.at(-1) ?? null
      actions.setCompanionTab(nextTab as never)
    }
  }

  const tabMetas: Record<CompanionTabId, TabMeta> = {
    'side-conversation': {
      id: 'side-conversation',
      label: 'Side conversation',
      icon: <IconNewChatOutline16 size={13} />,
    },
    trajectory: {
      id: 'trajectory',
      label: 'Trajectory',
      icon: <IconActivityOutline16 size={13} />,
    },
    review: {
      id: 'review',
      label: 'Review',
      icon: <IconFileOutline16 size={13} />,
    },
    terminal: {
      id: 'terminal',
      label: sessionCwd ? sessionCwd.split(/[/\\]/).pop() || 'Terminal' : 'Terminal',
      icon: <IconTerminalOutline16 size={13} />,
    },
    browser: {
      id: 'browser',
      label: 'Browser',
      icon: <IconGlobeOutline16 size={13} />,
    },
    details: {
      id: 'details',
      label: 'Details',
      icon: <IconTerminalOutline16 size={13} />,
    },
    tasks: {
      id: 'tasks',
      label: 'Tasks',
      icon: <IconChecklistOutline16 size={13} />,
    },
  }

  const allAvailableTabs: readonly TabMeta[] = Object.values(tabMetas)

  const plusMenuItems: readonly MenuEntry[] = [
    { id: 'side-conversation', label: 'Side conversation', icon: <IconNewChatOutline16 size={14} /> },
    { id: 'trajectory', label: 'Trajectory', icon: <IconActivityOutline16 size={14} /> },
    { id: 'review', label: 'Review', icon: <IconFileOutline16 size={14} /> },
    { id: 'terminal', label: 'Terminal', icon: <IconTerminalOutline16 size={14} /> },
    { id: 'browser', label: 'Browser', icon: <IconGlobeOutline16 size={14} /> },
  ]

  const searchTabDropdown = (
    <div className={css.searchDropdownContainer} ref={searchMenuRef}>
      <button
        type="button"
        className={clsx(css.collapseBtn, searchMenuOpen && css.collapseBtnActive)}
        aria-label="Search tabs"
        title="Search tab"
        onClick={() => {
          setSearchMenuOpen(prev => !prev)
          setTimeout(() => { searchInputRef.current?.focus() }, 50)
        }}
      >
        <IconDoubleChevronDown14 size={14} />
      </button>

      {searchMenuOpen && (
        <div className={css.tabSearchMenu} role="menu">
          <div className={css.tabSearchInputWrap}>
            <IconSearchOutline16 size={13} className={css.tabSearchIcon} />
            <input
              ref={searchInputRef}
              type="text"
              className={css.tabSearchInput}
              placeholder="Search tab..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value) }}
              autoFocus
            />
          </div>
          <div className={css.tabSearchList}>
            {allAvailableTabs
              .filter(tab => tab.label.toLowerCase().includes(searchQuery.toLowerCase()))
              .map((tab) => {
                const isActive = activeTab === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    className={clsx(css.tabSearchItem, isActive && css.tabSearchItemActive)}
                    onClick={() => {
                      handleOpenTab(tab.id)
                      setSearchMenuOpen(false)
                    }}
                  >
                    <span className={css.tabSearchItemIcon}>{tab.icon}</span>
                    <span className={css.tabSearchItemLabel}>{tab.label}</span>
                    {isActive && <IconCheckOutline14 size={12} className={css.tabSearchCheck} />}
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )

  // Chooser State (Image 5) when no tabs are active
  if (openTabs.length === 0 || activeTab === null) {
    return (
      <div className={css.root}>
        <div className={css.topBar}>
          {searchTabDropdown}
        </div>

        <div className={css.chooserContainer}>
          <div className={css.chooserTitle}>Open tab</div>
          <div className={css.chooserSubtitle}>Choose a tab to open in the side pane.</div>

          <div className={css.chooserGrid}>
            <button
              type="button"
              className={css.chooserCard}
              onClick={() => { handleOpenTab('side-conversation') }}
            >
              <span className={css.chooserCardIcon}><IconNewChatOutline16 size={16} /></span>
              <span>Side conversation</span>
            </button>

            <button
              type="button"
              className={css.chooserCard}
              onClick={() => { handleOpenTab('trajectory') }}
            >
              <span className={css.chooserCardIcon}><IconActivityOutline16 size={16} /></span>
              <span>Trajectory</span>
            </button>

            <button
              type="button"
              className={css.chooserCard}
              onClick={() => { handleOpenTab('review') }}
            >
              <span className={css.chooserCardIcon}><IconFileOutline16 size={16} /></span>
              <span>Review</span>
            </button>

            <button
              type="button"
              className={css.chooserCard}
              onClick={() => { handleOpenTab('terminal') }}
            >
              <span className={css.chooserCardIcon}><IconTerminalOutline16 size={16} /></span>
              <span>Terminal</span>
            </button>

            <button
              type="button"
              className={css.chooserCard}
              onClick={() => { handleOpenTab('browser') }}
            >
              <span className={css.chooserCardIcon}><IconGlobeOutline16 size={16} /></span>
              <span>Browser</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={css.root}>
      {/* Top Tab Bar (Image 1 & 2) */}
      <div className={css.topBar}>
        {searchTabDropdown}

        <div className={css.tabList} role="tablist">
          {openTabs.map((tabId) => {
            const meta = tabMetas[tabId] || { id: tabId, label: tabId, icon: null }
            const isActive = tabId === activeTab
            return (
              <div
                key={tabId}
                role="tab"
                aria-selected={isActive}
                className={clsx(css.tabPill, isActive && css.tabPillActive)}
                onClick={() => { actions.setCompanionTab(tabId) }}
              >
                {meta.icon}
                <span className={css.tabPillLabel}>{meta.label}</span>
                <button
                  type="button"
                  className={css.tabCloseBtn}
                  aria-label={`Close ${meta.label}`}
                  onClick={(e) => { handleCloseTab(tabId, e) }}
                >
                  <IconCloseFill14 size={10} />
                </button>
              </div>
            )
          })}
        </div>

        <Menu
          open={plusMenuOpen}
          anchor={(
            <button
              type="button"
              className={css.addTabBtn}
              aria-label="Add Tab"
              title="Open tab"
              onClick={() => { setPlusMenuOpen(p => !p) }}
            >
              <IconPlusOutline16 size={14} />
            </button>
          )}
          items={plusMenuItems}
          onSelect={(tabId) => {
            handleOpenTab(tabId)
            setPlusMenuOpen(false)
          }}
          onClose={() => { setPlusMenuOpen(false) }}
          side="bottom"
          align="start"
        />
      </div>

      {/* Active Tab View Body */}
      {activeTab === 'terminal' ? (
        <div className={css.bodyFill}>
          <div className={css.terminalView}>
            <div className={css.terminalHeader}>
              Windows PowerShell{'\n'}
              Copyright (C) Microsoft Corporation. All rights reserved.{'\n\n'}
              Install the latest PowerShell for new features and improvements!{' '}
              <a
                href="https://aka.ms/PSWindows"
                target="_blank"
                rel="noreferrer"
                className={css.terminalLink}
              >
                https://aka.ms/PSWindows
              </a>
            </div>

            <div className={css.terminalPromptLine}>
              <span className={css.terminalPromptText}>
                PS {sessionCwd || 'D:\\Code\\Clone\\deepseek-harness'}&gt;
              </span>
              <span className={css.terminalCursor} />
            </div>
          </div>
        </div>
      ) : activeTab === 'review' ? (
        <div className={css.bodyFill}>
          <div className={css.reviewToolbar}>
            <div className={css.reviewFilterBtn}>
              <span>Unstaged</span>
              <IconChevronDownOutline14 size={12} />
            </div>
            <button
              type="button"
              className={css.reviewRefreshBtn}
              onClick={() => {}}
              aria-label="Refresh"
            >
              <IconRefreshOutline14 size={13} />
              <span>Refresh</span>
            </button>
          </div>
          <div className={css.reviewEmptyState}>
            <IconFileOutline16 size={32} className={css.reviewEmptyIcon} />
            <div className={css.reviewEmptyTitle}>This workspace is not inside a Git repository</div>
            <div className={css.reviewEmptySubtitle}>
              Open a Git repository directory and this pane will show changes scoped to the current workspace.
            </div>
          </div>
        </div>
      ) : activeTab === 'browser' ? (
        <div className={css.bodyFill}>
          <div className={css.browserView}>
            <div className={css.browserAddressBar}>
              <span style={{ color: 'var(--dsw-alias-label-tertiary)', display: 'inline-flex' }}>
                <IconGlobeOutline16 size={14} />
              </span>
              <input
                type="text"
                className={css.browserUrlInput}
                defaultValue="http://localhost:3000"
                readOnly
              />
            </div>
            <div className={css.browserContent}>
              Web Browser Preview (Static preview for active workspace)
            </div>
          </div>
        </div>
      ) : activeTab === 'side-conversation' ? (
        <div className={css.body}>
          <div className={css.empty}>Side conversation is ready for quick questions and scratchpad notes.</div>
        </div>
      ) : activeTab === 'trajectory' ? (
        <div className={css.bodyFill}>
          {renderSlot('conversation.details.trajectory', {
            inspect: null,
            onInspectDone: () => {},
          }, {
            fallback: (
              <div className={css.body}>
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
                              handleOpenTab('details')
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
            ),
          })}
        </div>


      ) : activeTab === 'details' ? (
        <div className={css.body}>
          {selection === null || callId === undefined ? (
            <div className={css.empty}>{t('details.empty')}</div>
          ) : material === null ? (
            <div>
              <div className={css.sectionLabel}>{selection.toolName ?? t('details.title')}</div>
              <div className={css.empty}>{t('details.notInWindow')}</div>
            </div>
          ) : (
            <>
              <div className={css.sectionLabel} style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                {material.name}
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
      ) : activeTab === 'tasks' ? (
        <div className={css.body}>
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
      ) : null}
    </div>
  )
}
