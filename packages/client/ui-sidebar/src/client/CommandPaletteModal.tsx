/**
 * Command Palette / Quick Search Modal (Image 2 and Image 3 reference).
 * Opened via Search top nav item or Ctrl+K / Cmd+K.
 * Features tabs: All, Actions, Tasks, Files, with full keyboard navigation and instant search.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  IconAutomationsOutline16, IconFileOutline16, IconGlobeOutline16,
  IconMarketplaceOutline16, IconNewChatOutline16, IconPanelLeftOutline16,
  IconProjectAddOutline16, IconRocketOutline16, IconSearchOutline16,
  IconSettingsOutline16, IconTerminalOutline16, Modal,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import type { SidebarRootComponentProps } from './contract/slots.ts'
import css from './CommandPaletteModal.module.css'

export type PaletteTab = 'all' | 'actions' | 'tasks' | 'files'

export interface CommandPaletteModalProps {
  open: boolean
  onClose: () => void
  useSessions?: SidebarRootComponentProps['useSessions']
  useWorkspaces?: SidebarRootComponentProps['useWorkspaces']
  startSession: () => void
  toggleSidebar: () => void
  t: SidebarRootComponentProps['t']
}

interface PaletteAction {
  id: string
  title: string
  shortcut?: string
  icon: React.ReactNode
  category: 'suggested' | 'panels' | 'automations' | 'plugins'
  run: () => void
}

interface FileItem {
  id: string
  name: string
  path: string
}

const SAMPLE_FILES: FileItem[] = [
  { id: 'f1', name: 'AGENTS.md', path: '.agents/notes' },
  { id: 'f2', name: 'AGENTS.md', path: '.agents/notes/archived' },
  { id: 'f3', name: 'architecture.md', path: 'docs/architecture.md' },
  { id: 'f4', name: 'cordis-primer.md', path: 'docs/cordis-primer.md' },
  { id: 'f5', name: 'cookbook.md', path: 'docs/cookbook' },
  { id: 'f6', name: 'package.json', path: 'packages/client' },
  { id: 'f7', name: 'README.md', path: 'root' },
  { id: 'f8', name: 'SidebarRoot.tsx', path: 'packages/client/ui-sidebar' },
  { id: 'f9', name: 'WorkspaceBrowser.tsx', path: 'packages/client/ui-workspace' },
]

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>
  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()
  const index = lowerText.indexOf(lowerQuery)
  if (index === -1) return <>{text}</>

  const before = text.slice(0, index)
  const match = text.slice(index, index + lowerQuery.length)
  const after = text.slice(index + lowerQuery.length)

  return (
    <>
      {before}
      <mark className={css.mark}>{match}</mark>
      {after}
    </>
  )
}

function formatRelativeTime(ts: number | undefined): string {
  if (!ts) return ''
  const diffMs = Date.now() - ts
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d`
}

export function CommandPaletteModal({
  open,
  onClose,
  useSessions,
  startSession,
  toggleSidebar,
  t,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<PaletteTab>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  let sessions: SessionListState = {
    ids: [],
    byId: {},
    current: undefined,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }
  try {
    if (useSessions) {
      sessions = useSessions((s: SessionListState) => s) ?? sessions
    }
  } catch {
    // Harness test stubs that throw
  }

  // Focus input on mount/open
  useEffect(() => {
    if (open) {
      setQuery('')
      setTab('all')
      setSelectedIndex(0)
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => { clearTimeout(timer) }
    }
  }, [open])

  // Recent tasks
  const recentTasks = useMemo(() => {
    if (!sessions || sessions.phase !== 'ready' || !sessions.byId) return []
    const rawList: SessionSummary[] = sessions.ids && sessions.ids.length > 0
      ? sessions.ids.map(id => sessions.byId[id]).filter((s): s is SessionSummary => Boolean(s))
      : Object.values(sessions.byId).filter((s): s is SessionSummary => Boolean(s))
    return rawList
      .filter((s: SessionSummary) => !s.blank && Boolean(s.displayTitle || s.title))
      .sort((a: SessionSummary, b: SessionSummary) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
      .slice(0, 10)
  }, [sessions])

  // Built-in actions
  const actions: PaletteAction[] = useMemo(() => [
    {
      id: 'act-new-task',
      title: t('nav.newTask') || 'New task',
      shortcut: 'Ctrl+N',
      icon: <IconNewChatOutline16 size={16} />,
      category: 'suggested',
      run: () => {
        onClose()
        startSession()
      },
    },
    {
      id: 'act-open-workspace',
      title: 'Open workspace',
      shortcut: 'Ctrl+O',
      icon: <IconProjectAddOutline16 size={16} />,
      category: 'suggested',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:open-workspace-picker'))
      },
    },
    {
      id: 'act-settings',
      title: 'Settings',
      icon: <IconSettingsOutline16 size={16} />,
      category: 'suggested',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:open-settings'))
      },
    },
    {
      id: 'act-toggle-sidebar',
      title: 'Toggle sidebar',
      shortcut: 'Ctrl+B',
      icon: <IconPanelLeftOutline16 size={16} />,
      category: 'panels',
      run: () => {
        onClose()
        toggleSidebar()
      },
    },
    {
      id: 'act-toggle-terminal',
      title: 'Toggle terminal',
      shortcut: 'Ctrl+J',
      icon: <IconTerminalOutline16 size={16} />,
      category: 'panels',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:toggle-terminal'))
      },
    },
    {
      id: 'act-toggle-preview',
      title: 'Toggle preview',
      icon: <IconGlobeOutline16 size={16} />,
      category: 'panels',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:toggle-preview'))
      },
    },
    {
      id: 'act-automations',
      title: t('nav.automations') || 'Automations',
      icon: <IconAutomationsOutline16 size={16} />,
      category: 'automations',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:open-automations'))
      },
    },
    {
      id: 'act-plugins',
      title: t('nav.plugins') || 'Plugin Marketplace',
      icon: <IconMarketplaceOutline16 size={16} />,
      category: 'plugins',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:open-settings', { detail: { section: 'plugins' } }))
      },
    },
  ], [onClose, startSession, toggleSidebar, t])

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    if (!query.trim()) return recentTasks
    const q = query.toLowerCase()
    return recentTasks.filter((s) => {
      const title = (s.displayTitle || s.title || '').toLowerCase()
      return title.includes(q)
    })
  }, [recentTasks, query])

  // Filtered actions
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions
    const q = query.toLowerCase()
    return actions.filter(a => a.title.toLowerCase().includes(q))
  }, [actions, query])

  // Filtered files
  const filteredFiles = useMemo(() => {
    if (!query.trim()) return SAMPLE_FILES.slice(0, 5)
    const q = query.toLowerCase()
    return SAMPLE_FILES.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
  }, [query])

  // Flat selectable items for keyboard navigation
  const flatSelectableItems = useMemo(() => {
    const items: Array<{ id: string; run: () => void }> = []
    if (tab === 'all' || tab === 'tasks') {
      filteredTasks.forEach((s) => {
        items.push({
          id: s.id,
          run: () => {
            onClose()
            window.dispatchEvent(new CustomEvent('const:open-session', { detail: { id: s.id } }))
          },
        })
      })
    }
    if (tab === 'all' || tab === 'actions') {
      filteredActions.forEach((a) => {
        items.push({ id: a.id, run: a.run })
      })
    }
    if (tab === 'all' || tab === 'files') {
      filteredFiles.forEach((f) => {
        items.push({
          id: f.id,
          run: () => {
            onClose()
          },
        })
      })
    }
    return items
  }, [tab, filteredTasks, filteredActions, filteredFiles, onClose])

  // Reset selection index when list changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, tab])

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (flatSelectableItems.length > 0 ? (prev + 1) % flatSelectableItems.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (flatSelectableItems.length > 0 ? (prev - 1 + flatSelectableItems.length) % flatSelectableItems.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (flatSelectableItems[selectedIndex]) {
        flatSelectableItems[selectedIndex].run()
      }
    }
  }

  let itemCursor = 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Search actions, tasks, or files"
      className={clsx(css.dialog)}
      headless
    >
      <div className={css.container}>
        {/* Search header row */}
        <div className={css.searchHeader}>
          <IconSearchOutline16 size={18} className={css.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            className={css.searchInput}
            placeholder="Search actions, tasks, or files"
            value={query}
            onChange={(e) => { setQuery(e.target.value) }}
            onKeyDown={onKeyDown}
            aria-label="Search actions, tasks, or files"
          />
          <button
            type="button"
            className={css.escButton}
            onClick={onClose}
            aria-label="Close"
          >
            Esc
          </button>
        </div>

        {/* Filter tabs row */}
        <div className={css.tabsRow} role="tablist">
          <button
            type="button"
            className={clsx(css.tabButton, tab === 'all' && css.tabButtonActive)}
            onClick={() => { setTab('all') }}
            role="tab"
            aria-selected={tab === 'all'}
          >
            <span>All</span>
          </button>
          <button
            type="button"
            className={clsx(css.tabButton, tab === 'actions' && css.tabButtonActive)}
            onClick={() => { setTab('actions') }}
            role="tab"
            aria-selected={tab === 'actions'}
          >
            <IconRocketOutline16 size={13} />
            <span>Actions</span>
          </button>
          <button
            type="button"
            className={clsx(css.tabButton, tab === 'tasks' && css.tabButtonActive)}
            onClick={() => { setTab('tasks') }}
            role="tab"
            aria-selected={tab === 'tasks'}
          >
            <IconNewChatOutline16 size={13} />
            <span>Tasks</span>
          </button>
          <button
            type="button"
            className={clsx(css.tabButton, tab === 'files' && css.tabButtonActive)}
            onClick={() => { setTab('files') }}
            role="tab"
            aria-selected={tab === 'files'}
          >
            <IconFileOutline16 size={13} />
            <span>Files</span>
          </button>
        </div>

        {/* Scrollable results body */}
        <div className={css.bodyScroll}>
          {/* Tasks section */}
          {(tab === 'all' || tab === 'tasks') && filteredTasks.length > 0 && (
            <div className={css.section}>
              <div className={css.sectionTitle}>
                {query ? 'Tasks' : 'Recent tasks'}
              </div>
              {filteredTasks.map((task) => {
                const currentIndex = itemCursor++
                const isActive = currentIndex === selectedIndex
                return (
                  <button
                    key={task.id}
                    type="button"
                    className={clsx(css.itemRow, isActive && css.itemRowActive)}
                    onClick={() => {
                      onClose()
                      window.dispatchEvent(new CustomEvent('const:open-session', { detail: { id: task.id } }))
                    }}
                    onMouseEnter={() => { setSelectedIndex(currentIndex) }}
                  >
                    <span className={css.itemIcon}>
                      <IconNewChatOutline16 size={16} />
                    </span>
                    <span className={css.itemText}>
                      <HighlightMatch text={task.displayTitle || task.title || task.id} query={query} />
                    </span>
                    <span className={css.badge}>default</span>
                    <span className={css.timeTag}>
                      {formatRelativeTime(task.updatedAt)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Actions section */}
          {(tab === 'all' || tab === 'actions') && filteredActions.length > 0 && (
            <div className={css.section}>
              <div className={css.sectionTitle}>
                {query ? 'Actions' : 'Suggested'}
              </div>
              {filteredActions.map((act) => {
                const currentIndex = itemCursor++
                const isActive = currentIndex === selectedIndex
                return (
                  <button
                    key={act.id}
                    type="button"
                    className={clsx(css.itemRow, isActive && css.itemRowActive)}
                    onClick={act.run}
                    onMouseEnter={() => { setSelectedIndex(currentIndex) }}
                  >
                    <span className={css.itemIcon}>
                      {act.icon}
                    </span>
                    <span className={css.itemText}>
                      <HighlightMatch text={act.title} query={query} />
                    </span>
                    {act.shortcut && (
                      <span className={css.shortcut}>{act.shortcut}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Files section */}
          {(tab === 'all' || tab === 'files') && filteredFiles.length > 0 && (
            <div className={css.section}>
              <div className={css.sectionTitle}>Files</div>
              {filteredFiles.map((file) => {
                const currentIndex = itemCursor++
                const isActive = currentIndex === selectedIndex
                return (
                  <button
                    key={file.id}
                    type="button"
                    className={clsx(css.itemRow, isActive && css.itemRowActive)}
                    onClick={onClose}
                    onMouseEnter={() => { setSelectedIndex(currentIndex) }}
                  >
                    <span className={css.itemIcon}>
                      <IconFileOutline16 size={16} />
                    </span>
                    <span className={css.itemText}>
                      <HighlightMatch text={file.name} query={query} />
                    </span>
                    <span className={css.itemSubtext}>
                      <HighlightMatch text={file.path} query={query} />
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {flatSelectableItems.length === 0 && (
            <div className={css.emptyState}>
              No matching actions, tasks, or files found
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
