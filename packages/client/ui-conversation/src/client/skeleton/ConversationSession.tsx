/** Strict per-session header/body content inserted into the resident conversation layout. */

import { useEffect, useSyncExternalStore } from 'react'
import clsx from 'clsx'
import {
  IconFolderClose16, IconPanelRightOutline16, IconTerminalOutline16, Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SessionId, SessionListState, SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import type {
  ConversationSessionHeaderSlotProps, ConversationSessionSlotProps,
} from '../contract/slots.ts'
import type { ViewTab } from '../contract/views.ts'
import { SessionHeaderMenu } from './SessionHeaderMenu.tsx'
import css from './ConversationRoot.module.css'

/** Full props composed from the strict session body contract. */
export type ConversationSessionProps = ConversationSessionSlotProps

/** Full props composed from the strict session header contract. */
export type ConversationSessionHeaderProps = ConversationSessionHeaderSlotProps

interface Breadcrumb {
  readonly id: SessionId
  readonly displayTitle: string
}

const DEFAULT_VIEW_ID = 'chat'

function workspaceTitleOf(cwd: string): string {
  return cwd.replace(/[/\\]+$/, '').split(/[/\\]/).pop() ?? ''
}

/** Resolve by id and keep stale persisted selections on the stable Chat fallback. */
function resolveActiveView(tabs: readonly ViewTab[], selectedId: string | null): ViewTab | undefined {
  const requestedId = selectedId ?? DEFAULT_VIEW_ID
  return tabs.find(view => view.id === requestedId)
    ?? tabs.find(view => view.id === DEFAULT_VIEW_ID)
}

function deriveAncestry(list: SessionListState, id: SessionId): readonly Breadcrumb[] {
  const chain: Breadcrumb[] = []
  const seen = new Set<SessionId>()
  let cursor: SessionId | undefined = id
  while (cursor !== undefined) {
    if (seen.has(cursor)) break
    seen.add(cursor)
    const summary: SessionSummary | undefined = list.byId[cursor]
    if (summary === undefined) break
    chain.unshift({ id: summary.id, displayTitle: summary.displayTitle })
    if (summary.origin !== 'subagent') break
    cursor = summary.parentId
  }
  return chain
}

function equalBreadcrumbs(a: readonly Breadcrumb[], b: readonly Breadcrumb[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.id !== b[i]?.id || a[i]?.displayTitle !== b[i]?.displayTitle) return false
  }
  return true
}

/**
 * Renders Session header chrome above the resident conversation scrollport.
 * @param props - Strict Session store, view ledger, navigation, render, and locale shares.
 * @returns the hidden blank-session header or visible title and tabs.
 */
export function ConversationSessionHeader({
  sessionId, useSession, useSessions, useWorkspaces, useStore, actions,
  renderSlot, views, open, toggleDetails, openCompanionTab, openPath, downloadLog, t,
}: ConversationSessionHeaderProps) {
  useSyncExternalStore(views.subscribe, views.version)
  const tabs = views.list()
  const selectedId = useStore(s => s.view)
  const companionTab = useStore(s => s.companionTab)
  const active = resolveActiveView(tabs, selectedId)
  const ancestry = useSessions(s => deriveAncestry(s, sessionId), equalBreadcrumbs)
  const sessionSummary = useSessions(s => s.byId[sessionId])
  const sessionCwd = useSessions(s => s.byId[sessionId]?.cwd)
  const sessionWorkspace = useWorkspaces(w => w.items.find(item => item.sessionIds.includes(sessionId)))
  const composerPhase = useSession(s => s.composerPhase)
  const blank = useSession(s => s.blank)
  const hideChrome = blank && composerPhase === 'blank'

  const isOutsideProject = sessionWorkspace === undefined
  const projectTitle = sessionWorkspace?.title
    ?? (isOutsideProject
      ? (sessionCwd ? workspaceTitleOf(sessionCwd) : 'Default')
      : '')

  return (
    <header
      className={clsx(css.header, hideChrome && css.headerHidden)}
      aria-hidden={hideChrome || undefined}
    >
      {!hideChrome && (
        <>
          <div className={css.titleRow}>
            <div className={css.titleCluster}>
              <nav className={css.crumbs} aria-label={t('session.hierarchy')}>
                {ancestry.map((crumb, idx) => {

                  const current = idx === ancestry.length - 1
                  return (
                    <span key={crumb.id} className={css.crumbSeg}>
                      {idx > 0 && <span className={css.crumbDivider}>/</span>}
                      <button
                        type="button"
                        disabled={current}
                        className={clsx(css.crumb, current && css.crumbCurrent)}
                        onClick={() => { if (!current) open(crumb.id) }}
                      >
                        {crumb.displayTitle}
                      </button>
                    </span>
                  )
                })}
              </nav>

              {projectTitle && (
                <div className={css.projectBadge} title={`Project: ${projectTitle}`}>
                  <IconFolderClose16 size={13} className={css.projectBadgeIcon} />
                  <span className={css.projectBadgeText}>{projectTitle}</span>
                </div>
              )}

              <SessionHeaderMenu
                sessionId={sessionId}
                displayTitle={sessionSummary?.displayTitle ?? sessionId}
                cwd={sessionCwd}
                onRename={async (newTitle) => {
                  const session = (actions as unknown as { renameSession?: (title: string) => Promise<unknown> }).renameSession
                  if (session) await session(newTitle)
                }}
                onOpenTrajectory={() => {
                  actions.setCompanionTab('trajectory')
                  openCompanionTab?.('trajectory')
                }}
                onExportLog={() => {
                  downloadLog?.(sessionId)
                }}
                onOpenPath={(path) => {
                  openPath?.(path)
                }}
              />

              <div className={css.headerActions}>
                {renderSlot('conversation.session.header.actions', {})}
              </div>
            </div>
            <div className={css.headerUtilities}>
              {renderSlot('conversation.session.header.utilities', {})}
              <Tooltip label="Terminal" delayMs={300} side="bottom">
                <button
                  type="button"
                  className={clsx(css.utilityBtn, companionTab === 'terminal' && css.utilityBtnActive)}
                  aria-label="Terminal"
                  onClick={() => {
                    actions.setCompanionTab('terminal')
                    openCompanionTab?.('terminal')
                  }}
                >
                  <IconTerminalOutline16 size={15} />
                </button>
              </Tooltip>
              <Tooltip label="Toggle Side Panel" delayMs={300} side="bottom">
                <button
                  type="button"
                  className={css.utilityBtn}
                  aria-label="Toggle Side Panel"
                  onClick={() => {
                    toggleDetails?.()
                  }}
                >
                  <IconPanelRightOutline16 size={15} />
                </button>
              </Tooltip>
            </div>
          </div>
          {tabs.length > 1 && (
            <div className={css.tabs} role="tablist">
              {tabs.map(viewTab => (
                <button
                  key={viewTab.id}
                  type="button"
                  role="tab"
                  aria-selected={viewTab.id === active?.id}
                  className={clsx(css.tab, viewTab.id === active?.id && css.tabActive)}
                  onClick={() => { actions.setView(viewTab.id) }}
                >
                  {viewTab.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </header>
  )
}

/**
 * Renders the active Session view inside the resident scrollport and keeps
 * the input draft mirrored while blank Hero chrome is visible.
 * @param props - Strict Session input/store, view ledger, and render shares.
 * @returns the active view area, or null while the Session remains blank.
 */
export function ConversationSession({
  sessionId, useSession, useInput, inputActions, useStore, actions,
  renderSlot, views, bindDraftMirror, releaseSessionImages,
}: ConversationSessionProps) {
  useSyncExternalStore(views.subscribe, views.version)
  const tabs = views.list()
  const selectedId = useStore(s => s.view)
  const active = resolveActiveView(tabs, selectedId)
  const composerPhase = useSession(s => s.composerPhase)
  const blank = useSession(s => s.blank)
  const inputState = useInput(s => s)
  const storedDraft = useStore(s => s.draft)
  // `?? null`: persisted snapshots from before the inspect field rehydrate without it.
  const inspect = useStore(s => s.inspect ?? null)

  useEffect(() => {
    if (inputState.draft === '' && storedDraft !== '') inputActions.setDraft(storedDraft)
    const unmirror = bindDraftMirror(actions.setDraft)
    return () => { unmirror() }
    // Mount-only (deps pinned to inputActions): later store writes come from
    // the machine mirror, not this seed effect.
  }, [inputActions])

  useEffect(() => () => {
    releaseSessionImages(sessionId)
  }, [releaseSessionImages, sessionId])

  if (blank && composerPhase === 'blank') return null
  return (
    <div className={css.viewArea}>
      {active !== undefined && renderSlot('conversation.view', {
        inspect,
        onInspectDone: () => { actions.setInspect(null) },
      }, { only: active.id })}
    </div>
  )
}
