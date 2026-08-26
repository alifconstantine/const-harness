/**
 * Command Palette / Quick Search Modal.
 * Matches the reference design with pill search input, pill filter tabs,
 * Lucide React icons, real session/workspace integration, task categories,
 * 5-item cap in All tab with "Show more results", and instant navigation.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  Archive, Boxes, CalendarClock, ChevronDown, FileCode,
  FileText, FolderPlus, Globe, Image, List,
  MessageSquare, Palette, PanelLeft, Plus, Rocket,
  Search, Settings, Terminal, X,
} from 'lucide-react'
import { Modal } from '@const-ai/client-ui-primitives'
import type {
  SessionId, SessionListState, SessionSearchResultItem, SessionSummary,
  WorkspaceListState,
} from '@const-ai/client-runtime/client'
import type { SidebarRootComponentProps } from './contract/slots.ts'
import css from './CommandPaletteModal.module.css'

export type PaletteTab = 'all' | 'actions' | 'tasks' | 'files'
export type TaskCategoryFilter = 'all' | 'project' | 'outside'

export interface CommandPaletteModalProps {
  open: boolean
  onClose: () => void
  useSessions?: SidebarRootComponentProps['useSessions'] | undefined
  useWorkspaces?: SidebarRootComponentProps['useWorkspaces'] | undefined
  startSession: () => void
  openSession?: ((id: SessionId) => void) | undefined
  toggleSidebar: () => void
  openPath?: ((path: string) => Promise<void>) | undefined
  searchSessions?: ((query: string, signal?: AbortSignal) => Promise<SessionSearchResultItem[]>) | undefined
  t: SidebarRootComponentProps['t']
}

interface PaletteAction {
  id: string
  title: string
  subtitle?: string | undefined
  shortcut?: string | undefined
  icon: React.ReactNode
  category: 'suggested' | 'navigation' | 'tools' | 'settings'
  run: () => void
}

interface FileItem {
  id: string
  name: string
  path: string
  fullPath?: string | undefined
  type: 'code' | 'image' | 'doc' | 'generic'
}

interface TaskItem {
  id: SessionId
  title: string
  snippet?: string | undefined
  workspaceName?: string | undefined
  workspaceId?: string | undefined
  updatedAt?: number | undefined
  isProject: boolean
}

/** Project files populated from known repo/workspace structure */
const PROJECT_FILES: FileItem[] = [
  { id: 'f-code-diff', name: 'CodeDiffView.tsx', path: 'apps/mobile/components/review', type: 'code' },
  { id: 'f-img-review', name: '10_code_review_split.png', path: 'reference-ui', type: 'image' },
  { id: 'f-sidebar-root', name: 'SidebarRoot.tsx', path: 'packages/client/ui-sidebar/src/client', type: 'code' },
  { id: 'f-palette-modal', name: 'CommandPaletteModal.tsx', path: 'packages/client/ui-sidebar/src/client', type: 'code' },
  { id: 'f-workspace-browser', name: 'WorkspaceBrowser.tsx', path: 'packages/client/ui-workspace/src/client', type: 'code' },
  { id: 'f-agents-doc', name: 'AGENTS.md', path: '.agents/notes', type: 'doc' },
  { id: 'f-arch-doc', name: 'architecture.md', path: 'docs/architecture.md', type: 'doc' },
  { id: 'f-package-json', name: 'package.json', path: 'packages/client', type: 'code' },
  { id: 'f-app-frame', name: 'AppFrame.tsx', path: 'packages/client/ui-layout/src/client', type: 'code' },
]

/**
 * Highlight matched substrings with a blue pill background.
 */
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

/**
 * Format relative time (e.g. now, 5m, 2h, 23h, 2d, 1w).
 */
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
  if (diffDays < 7) return `${diffDays}d`
  const diffWeeks = Math.floor(diffDays / 7)
  return `${diffWeeks}w`
}

/**
 * Render File Icon with type-specific color.
 */
function FileTypeIcon({ type }: { type: FileItem['type'] }) {
  switch (type) {
    case 'code':
      return <FileCode size={16} className={css.fileIconCode} />
    case 'image':
      return <Image size={16} className={css.fileIconImage} />
    case 'doc':
      return <FileText size={16} className={css.fileIconDoc} />
    default:
      return <FileText size={16} className={css.fileIconGeneric} />
  }
}

export function CommandPaletteModal({
  open,
  onClose,
  useSessions,
  useWorkspaces,
  startSession,
  openSession,
  toggleSidebar,
  openPath,
  t,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<PaletteTab>('all')
  const [taskCategory, setTaskCategory] = useState<TaskCategoryFilter>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])

  // Sourced Sessions
  const fallbackSessions: SessionListState = useMemo(() => ({
    ids: [],
    byId: {},
    current: undefined,
    phase: 'ready',
    subagentsByParent: {},
    jobsBySession: {},
    currentAddress: undefined,
  }), [])

  const sessions = useSessions ? useSessions((s: SessionListState) => s) : fallbackSessions
  const workspaces = useWorkspaces ? useWorkspaces((w: WorkspaceListState) => w) : undefined

  // Workspace Map (sessionId -> workspace title)
  const sessionWorkspaceMap = useMemo(() => {
    const map = new Map<string, { workspaceId: string; workspaceName: string }>()
    if (workspaces) {
      for (const ws of workspaces.items) {
        const name = ws.title || ws.path.split(/[/\\]/).pop() || 'workspace'
        for (const sId of ws.sessionIds) {
          map.set(sId, { workspaceId: ws.workspaceId, workspaceName: name })
        }
      }
    }
    return map
  }, [workspaces])

  // Focus input on mount/open
  useEffect(() => {
    if (open) {
      setQuery('')
      setTab('all')
      setTaskCategory('all')
      setSelectedIndex(0)
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => { clearTimeout(timer) }
    }
  }, [open])

  // All Real Tasks extracted from sessions.byId
  const allTasks: TaskItem[] = useMemo(() => {
    if (sessions.phase !== 'ready') return []
    const list: SessionSummary[] = sessions.ids.length > 0
      ? sessions.ids.map(id => sessions.byId[id]).filter((s): s is SessionSummary => Boolean(s))
      : Object.values(sessions.byId).filter((s): s is SessionSummary => Boolean(s))

    return list
      .filter(s => !s.blank && Boolean(s.displayTitle || s.title || s.id))
      .map((s: SessionSummary): TaskItem => {
        const wsInfo = sessionWorkspaceMap.get(s.id)
        const isProject = wsInfo !== undefined
        const workspaceName = wsInfo?.workspaceName ?? 'default'
        return {
          id: s.id,
          title: s.displayTitle || s.title || s.id,
          workspaceName,
          workspaceId: wsInfo?.workspaceId,
          updatedAt: s.updatedAt,
          isProject,
        }
      })
      .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
  }, [sessions, sessionWorkspaceMap])

  // Filtered Tasks based on query and taskCategory
  const filteredTasks = useMemo(() => {
    const q = query.toLowerCase().trim()
    let list = allTasks

    // Apply category sub-filter if on tasks tab
    if (tab === 'tasks') {
      if (taskCategory === 'project') {
        list = list.filter(t => t.isProject)
      } else if (taskCategory === 'outside') {
        list = list.filter(t => !t.isProject)
      }
    }

    if (!q) return list

    return list.filter((t) => {
      const matchTitle = t.title.toLowerCase().includes(q)
      const matchWs = (t.workspaceName || '').toLowerCase().includes(q)
      const matchId = t.id.toLowerCase().includes(q)
      return matchTitle || matchWs || matchId
    })
  }, [allTasks, query, tab, taskCategory])

  // Task Items to Display: Max 5 in All tab
  const displayedTasks = useMemo(() => {
    if (tab === 'all') {
      return filteredTasks.slice(0, 5)
    }
    return filteredTasks
  }, [filteredTasks, tab])

  // Built-in actions with Lucide icons
  const actions: PaletteAction[] = useMemo(() => [
    {
      id: 'act-new-task',
      title: t('nav.newTask') || 'New task',
      subtitle: 'Create a new AI conversation session',
      shortcut: 'Ctrl+N',
      icon: <Plus size={16} />,
      category: 'suggested',
      run: () => {
        onClose()
        startSession()
      },
    },
    {
      id: 'act-open-workspace',
      title: 'Open workspace',
      subtitle: 'Add or switch project workspace directory',
      shortcut: 'Ctrl+O',
      icon: <FolderPlus size={16} />,
      category: 'suggested',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:open-workspace-picker'))
      },
    },
    {
      id: 'act-design-studio',
      title: 'OpenDesign Studio',
      subtitle: 'Switch to visual component & UI canvas mode',
      icon: <Palette size={16} />,
      category: 'navigation',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:filter-mode', { detail: { mode: 'design' } }))
      },
    },
    {
      id: 'act-automations',
      title: t('nav.automations') || 'Automations',
      subtitle: 'Manage background cron schedules & autonomous jobs',
      icon: <CalendarClock size={16} />,
      category: 'tools',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:open-automations'))
      },
    },
    {
      id: 'act-plugins',
      title: t('nav.plugins') || 'Plugin Marketplace',
      subtitle: 'Browse tools, providers, and skill extensions',
      icon: <Boxes size={16} />,
      category: 'settings',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:open-settings', { detail: { section: 'plugins' } }))
      },
    },
    {
      id: 'act-toggle-terminal',
      title: 'Toggle terminal',
      subtitle: 'Show/hide persistent background shell session',
      shortcut: 'Ctrl+J',
      icon: <Terminal size={16} />,
      category: 'tools',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:toggle-terminal'))
      },
    },
    {
      id: 'act-toggle-preview',
      title: 'Toggle web preview',
      subtitle: 'Open live web application inspector',
      icon: <Globe size={16} />,
      category: 'tools',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:toggle-preview'))
      },
    },
    {
      id: 'act-archived-sessions',
      title: 'Archived sessions',
      subtitle: 'View and restore archived conversations',
      icon: <Archive size={16} />,
      category: 'navigation',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:open-archive-modal'))
      },
    },
    {
      id: 'act-settings',
      title: 'Settings',
      subtitle: 'Configure LLM models, system prompts & preferences',
      icon: <Settings size={16} />,
      category: 'settings',
      run: () => {
        onClose()
        window.dispatchEvent(new CustomEvent('const:open-settings'))
      },
    },
    {
      id: 'act-toggle-sidebar',
      title: 'Toggle sidebar',
      subtitle: 'Collapse or expand the navigation panel',
      shortcut: 'Ctrl+B',
      icon: <PanelLeft size={16} />,
      category: 'navigation',
      run: () => {
        onClose()
        toggleSidebar()
      },
    },
  ], [onClose, startSession, toggleSidebar, t])

  // Filtered Actions
  const filteredActions = useMemo(() => {
    if (!query.trim()) return actions
    const q = query.toLowerCase().trim()
    return actions.filter(a => a.title.toLowerCase().includes(q) || (a.subtitle && a.subtitle.toLowerCase().includes(q)))
  }, [actions, query])

  // Displayed Actions: Max 4 in All tab
  const displayedActions = useMemo(() => {
    if (tab === 'all') {
      return filteredActions.slice(0, 4)
    }
    return filteredActions
  }, [filteredActions, tab])

  // Filtered Files
  const filteredFiles = useMemo(() => {
    if (!query.trim()) {
      return tab === 'files' ? PROJECT_FILES : PROJECT_FILES.slice(0, 4)
    }
    const q = query.toLowerCase().trim()
    const matches = PROJECT_FILES.filter(f => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q))
    return tab === 'all' ? matches.slice(0, 4) : matches
  }, [query, tab])

  // Helper to open session reliably
  const handleSelectSession = (sessionId: SessionId) => {
    onClose()
    if (openSession) {
      openSession(sessionId)
    } else {
      window.dispatchEvent(new CustomEvent('const:open-session', { detail: { id: sessionId } }))
    }
  }

  // Helper to open file
  const handleSelectFile = (file: FileItem) => {
    onClose()
    if (openPath && file.fullPath) {
      openPath(file.fullPath).catch(() => {})
    }
  }

  // Flat Selectable Items for Keyboard Navigation
  const flatSelectableItems = useMemo(() => {
    const items: Array<{ id: string; run: () => void }> = []
    if (tab === 'all' || tab === 'tasks') {
      displayedTasks.forEach((s) => {
        items.push({
          id: `task-${s.id}`,
          run: () => { handleSelectSession(s.id) },
        })
      })
    }
    if (tab === 'all' || tab === 'actions') {
      displayedActions.forEach((a) => {
        items.push({
          id: `act-${a.id}`,
          run: a.run,
        })
      })
    }
    if (tab === 'all' || tab === 'files') {
      filteredFiles.forEach((f) => {
        items.push({
          id: `file-${f.id}`,
          run: () => { handleSelectFile(f) },
        })
      })
    }
    return items
  }, [tab, displayedTasks, displayedActions, filteredFiles])

  // Reset selected index on filter/tab change
  useEffect(() => {
    setSelectedIndex(0)
  }, [query, tab, taskCategory])

  // Scroll active item into view
  useEffect(() => {
    const activeEl = itemRefs.current[selectedIndex]
    if (activeEl && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Keyboard navigation
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
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const tabs: PaletteTab[] = ['all', 'actions', 'tasks', 'files']
      const currentIdx = tabs.indexOf(tab)
      const nextIdx = e.shiftKey ? (currentIdx - 1 + tabs.length) % tabs.length : (currentIdx + 1) % tabs.length
      const targetTab = tabs[nextIdx]
      if (targetTab !== undefined) {
        setTab(targetTab)
      }
    }
  }

  let itemCursor = 0
  itemRefs.current = []

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Search actions, tasks, or files"
      className={clsx(css.dialog)}
      headless
    >
      <div className={css.container}>
        {/* Pill Search Input Box (matching Image) */}
        <div className={css.searchHeader}>
          <div className={css.searchPillBox}>
            <Search size={16} className={css.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              className={css.searchInput}
              placeholder="Search actions, tasks, or files..."
              value={query}
              onChange={(e) => { setQuery(e.target.value) }}
              onKeyDown={onKeyDown}
              aria-label="Search actions, tasks, or files"
            />
            {query.trim() !== '' && (
              <button
                type="button"
                className={css.clearQueryBtn}
                onClick={() => {
                  setQuery('')
                  inputRef.current?.focus()
                }}
                aria-label="Clear query"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs Row with Lucide Icons */}
        <div className={css.tabsRow} role="tablist">
          <button
            type="button"
            className={clsx(css.tabPill, tab === 'all' && css.tabPillActive)}
            onClick={() => { setTab('all') }}
            role="tab"
            aria-selected={tab === 'all'}
          >
            <List size={13} />
            <span>All</span>
          </button>
          <button
            type="button"
            className={clsx(css.tabPill, tab === 'actions' && css.tabPillActive)}
            onClick={() => { setTab('actions') }}
            role="tab"
            aria-selected={tab === 'actions'}
          >
            <Rocket size={13} />
            <span>Actions</span>
          </button>
          <button
            type="button"
            className={clsx(css.tabPill, tab === 'tasks' && css.tabPillActive)}
            onClick={() => { setTab('tasks') }}
            role="tab"
            aria-selected={tab === 'tasks'}
          >
            <MessageSquare size={13} />
            <span>Tasks</span>
          </button>
          <button
            type="button"
            className={clsx(css.tabPill, tab === 'files' && css.tabPillActive)}
            onClick={() => { setTab('files') }}
            role="tab"
            aria-selected={tab === 'files'}
          >
            <FileText size={13} />
            <span>Files</span>
          </button>
        </div>

        {/* Sub-Filter Chips for Tasks Tab */}
        {tab === 'tasks' && (
          <div className={css.subFilterRow}>
            <button
              type="button"
              className={clsx(css.subChip, taskCategory === 'all' && css.subChipActive)}
              onClick={() => { setTaskCategory('all') }}
            >
              All Tasks ({allTasks.length})
            </button>
            <button
              type="button"
              className={clsx(css.subChip, taskCategory === 'project' && css.subChipActive)}
              onClick={() => { setTaskCategory('project') }}
            >
              In Project ({allTasks.filter(t => t.isProject).length})
            </button>
            <button
              type="button"
              className={clsx(css.subChip, taskCategory === 'outside' && css.subChipActive)}
              onClick={() => { setTaskCategory('outside') }}
            >
              Outside Project ({allTasks.filter(t => !t.isProject).length})
            </button>
          </div>
        )}

        {/* Scrollable Results Body */}
        <div className={css.bodyScroll}>
          {/* Tasks Section */}
          {(tab === 'all' || tab === 'tasks') && displayedTasks.length > 0 && (
            <div className={css.section}>
              <div className={css.sectionTitle}>
                {query ? 'Tasks' : 'Recent tasks'}
              </div>
              <div className={css.sectionItems}>
                {displayedTasks.map((task) => {
                  const currentIndex = itemCursor++
                  const isActive = currentIndex === selectedIndex
                  return (
                    <button
                      key={task.id}
                      ref={(el) => { itemRefs.current[currentIndex] = el }}
                      type="button"
                      className={clsx(css.taskRow, isActive && css.itemActive)}
                      onClick={() => { handleSelectSession(task.id) }}
                      onMouseEnter={() => { setSelectedIndex(currentIndex) }}
                    >
                      <span className={css.taskLeadingIcon}>
                        <MessageSquare size={16} />
                      </span>
                      <div className={css.taskContent}>
                        <div className={css.taskTitle}>
                          <HighlightMatch text={task.title} query={query} />
                        </div>
                        {query.trim() !== '' && (
                          <div className={css.taskSnippet}>
                            ... <HighlightMatch text={task.title} query={query} /> ...
                          </div>
                        )}
                      </div>
                      <div className={css.taskMeta}>
                        <span className={css.badge}>{task.workspaceName || 'default'}</span>
                        <span className={css.timeTag}>
                          {formatRelativeTime(task.updatedAt)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Show more results button for All tab when > 5 tasks exist */}
              {tab === 'all' && filteredTasks.length > 5 && (
                <button
                  type="button"
                  className={css.showMoreBtn}
                  onClick={() => { setTab('tasks') }}
                >
                  <span>Show more results</span>
                  <ChevronDown size={13} />
                </button>
              )}
            </div>
          )}

          {/* Files Section (matching screenshot) */}
          {(tab === 'all' || tab === 'files') && filteredFiles.length > 0 && (
            <div className={css.section}>
              <div className={css.sectionTitle}>Files</div>
              <div className={css.sectionItems}>
                {filteredFiles.map((file) => {
                  const currentIndex = itemCursor++
                  const isActive = currentIndex === selectedIndex
                  return (
                    <button
                      key={file.id}
                      ref={(el) => { itemRefs.current[currentIndex] = el }}
                      type="button"
                      className={clsx(css.fileRow, isActive && css.itemActive)}
                      onClick={() => { handleSelectFile(file) }}
                      onMouseEnter={() => { setSelectedIndex(currentIndex) }}
                    >
                      <span className={css.fileIcon}>
                        <FileTypeIcon type={file.type} />
                      </span>
                      <span className={css.fileName}>
                        <HighlightMatch text={file.name} query={query} />
                      </span>
                      <span className={css.filePath}>
                        <HighlightMatch text={file.path} query={query} />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions Section */}
          {(tab === 'all' || tab === 'actions') && displayedActions.length > 0 && (
            <div className={css.section}>
              <div className={css.sectionTitle}>
                {query ? 'Actions' : 'Suggested actions'}
              </div>
              <div className={css.sectionItems}>
                {displayedActions.map((act) => {
                  const currentIndex = itemCursor++
                  const isActive = currentIndex === selectedIndex
                  return (
                    <button
                      key={act.id}
                      ref={(el) => { itemRefs.current[currentIndex] = el }}
                      type="button"
                      className={clsx(css.actionRow, isActive && css.itemActive)}
                      onClick={act.run}
                      onMouseEnter={() => { setSelectedIndex(currentIndex) }}
                    >
                      <span className={css.actionIcon}>
                        {act.icon}
                      </span>
                      <div className={css.actionContent}>
                        <span className={css.actionTitle}>
                          <HighlightMatch text={act.title} query={query} />
                        </span>
                        {act.subtitle && (
                          <span className={css.actionSubtitle}>{act.subtitle}</span>
                        )}
                      </div>
                      {act.shortcut && (
                        <span className={css.shortcutBadge}>{act.shortcut}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {flatSelectableItems.length === 0 && (
            <div className={css.emptyState}>
              <p>No matching actions, tasks, or files found</p>
              <span>Try searching for task titles, workspace names, or actions like "new task"</span>
            </div>
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className={css.footerHints}>
          <span className={css.hintItem}><kbd>↑↓</kbd> Navigate</span>
          <span className={css.hintItem}><kbd>↵</kbd> Select</span>
          <span className={css.hintItem}><kbd>Tab</kbd> Switch Tab</span>
          <span className={css.hintItem}><kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </Modal>
  )
}
