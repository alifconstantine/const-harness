/**
 * Sidebar shell: column geometry only. Collapse is a slide plus crossfade:
 * content freezes at its expanded width (inline style) and fades out in place
 * while the sliding column (AppFrame grid tracks) clips it — nothing reflows
 * mid-slide. At settle the wide-only content unmounts and the four upper
 * controls enter the 56px rail from the same horizontal offset (one icon each,
 * same top-down order) on one fade that ends with the slide. The bottom-pinned
 * settings control only fades. The workspace/session browsing region between
 * the New Session button and the foot is the `sidebar.workspaces` registrant's,
 * and the foot holds `sidebar.settings` plus `sidebar.footer.action`; the shell
 * hands them the wide flag (plus an expand request callback for the browser).
 *
 * The column also owns whether the scroll regions nested in it draw a
 * scrollbar at all: the shell tracks the pointer and rebinds ui-theme's
 * scrollbar indirection away while it is elsewhere, so a list the user is not
 * pointing at carries no bar.
 */
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  BrandWordmark, ConstLogo,
  IconAutomationsOutline16, IconDesignOutline16,
  IconNewChatOutline16, IconPanelLeftOutline16, IconSearchOutline16,
  Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { SidebarRootComponentProps } from './contract/slots.ts'
import { CommandPaletteModal } from './CommandPaletteModal.tsx'
import css from './SidebarRoot.module.css'

/** Wide-content unmount delay; matches the 150ms wide-content fade-out. */
const COLLAPSE_SETTLE_MS = 150

/**
 * How long the column's scrollbars stay drawn after the pointer leaves it.
 * The bar is a pointer affordance here, and hiding it on the leave event
 * itself makes it blink out while the pointer is only crossing the column's
 * edge — on the way to the conversation, or around a portalled menu.
 */
const SCROLLBAR_LINGER_MS = 2000

/**
 * Render the sidebar column shell.
 * @param props - composed slot props (runtime share + injected callbacks, contract/slots.ts).
 * @returns the sidebar element tree.
 */
export function SidebarRoot({
  collapsed,
  width,
  useSessions,
  useWorkspaces,
  startSession,
  openSession,
  toggleSidebar,
  openPath,
  searchSessions,
  t,
  renderSlot,
}: SidebarRootComponentProps) {
  // Wide content stays mounted while the collapse animates (fading via
  // .collapsed .wide), unmounts at settle, and remounts right away on expand.
  const [settled, setSettled] = useState(collapsed)
  useEffect(() => {
    if (!collapsed) { setSettled(false); return }
    const timer = window.setTimeout(() => { setSettled(true) }, COLLAPSE_SETTLE_MS)
    return () => { window.clearTimeout(timer) }
  }, [collapsed])
  const wide = !collapsed || !settled

  const newTaskTooltip = t('nav.newTask')

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [automationsActive, setAutomationsActive] = useState(false)

  useEffect(() => {
    const handleState = (e: Event) => {
      const custom = e as CustomEvent<{ active: boolean }>
      setAutomationsActive(custom.detail.active)
    }
    const handleOpen = () => { setAutomationsActive(true) }
    const handleClose = () => { setAutomationsActive(false) }

    window.addEventListener('const:automations-state', handleState)
    window.addEventListener('const:open-automations', handleOpen)
    window.addEventListener('const:close-automations', handleClose)
    return () => {
      window.removeEventListener('const:automations-state', handleState)
      window.removeEventListener('const:open-automations', handleOpen)
      window.removeEventListener('const:close-automations', handleClose)
    }
  }, [])

  useEffect(() => {
    const handleOpen = () => { setCommandPaletteOpen(true) }
    const handleOpenSession = (e: Event) => {
      const custom = e as CustomEvent<{ id: string }>
      if (custom.detail.id) {
        openSession(custom.detail.id as never)
      }
    }
    window.addEventListener('const:open-command-palette', handleOpen)
    window.addEventListener('const:open-session', handleOpenSession)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(v => !v)
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        startSession()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('const:open-command-palette', handleOpen)
      window.removeEventListener('const:open-session', handleOpenSession)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [openSession, startSession])

  // Freeze the content at its expanded width while it fades out (collapsed
  // && wide): the sliding column then clips it instead of reflowing it. The
  // rail layout (.collapsed styles) only applies once the fade settles.
  const lastWideWidth = useRef(width)
  if (!collapsed) lastWideWidth.current = width

  // Rail-in only crossfades a live collapse: a refresh straight into the
  // collapsed state renders the rail statically (no delay-hidden icons).
  const everWide = useRef(!collapsed)
  if (!collapsed) everWide.current = true

  // Scrollbars in the column follow the pointer (.quietBars rebinds them
  // away): drawn while it is inside, and for SCROLLBAR_LINGER_MS after it
  // leaves. A pointer that returns within that window cancels the pending
  // hide rather than restarting from a hidden bar.
  const column = useRef<HTMLDivElement>(null)
  const [pointerInside, setPointerInside] = useState(false)
  const lingerTimer = useRef<number | undefined>(undefined)
  const armLinger = (): void => {
    if (lingerTimer.current !== undefined) return
    lingerTimer.current = window.setTimeout(() => {
      lingerTimer.current = undefined
      setPointerInside(false)
    }, SCROLLBAR_LINGER_MS)
  }
  const cancelLinger = (): void => {
    window.clearTimeout(lingerTimer.current)
    lingerTimer.current = undefined
  }
  // Leaving is decided by the column's BOX, not by DOM containment, and only
  // while the bars are drawn. ui-settings renders its full-viewport panel as a
  // fixed-position DESCENDANT of this column, so a pointer moved onto that
  // panel — or onto the conversation once it closes — fires no `pointerleave`
  // here, and the bars would stay drawn over a column nobody is pointing at.
  // The element's own leave stays as the one signal geometry cannot give: a
  // pointer that leaves the window emits no further moves.
  useEffect(() => {
    if (!pointerInside) return
    const onMove = (event: PointerEvent): void => {
      const rect = column.current?.getBoundingClientRect()
      /* v8 ignore next -- the listener only exists while the column is mounted and revealed. */
      if (rect === undefined) return
      const inside = event.clientX >= rect.left && event.clientX < rect.right
        && event.clientY >= rect.top && event.clientY < rect.bottom
      if (inside) cancelLinger()
      else armLinger()
    }
    document.addEventListener('pointermove', onMove)
    return () => {
      document.removeEventListener('pointermove', onMove)
      cancelLinger()
    }
  }, [pointerInside])

  return (
    <div
      ref={column}
      className={clsx(
        css.root, !wide && css.collapsed, !wide && everWide.current && css.railIn,
        collapsed && wide && css.fading, !pointerInside && css.quietBars,
      )}
      style={wide ? { width: collapsed ? lastWideWidth.current : width } : undefined}
      onPointerEnter={() => {
        cancelLinger()
        setPointerInside(true)
      }}
      onPointerLeave={() => { armLinger() }}
    >
      <div className={css.logoRow}>
        {/* Expanded, the wordmark doubles as a New Session shortcut; the
            collapsed rail's logo is the expand toggle below instead. */}
        {wide && (
          <button
            type="button"
            className={clsx(css.brand, css.wide)}
            aria-label={t('session.new.label')}
            onClick={() => { startSession() }}
          >
            <BrandWordmark />
          </button>
        )}

        <div className={css.logoActions}>
          {/* Expanded: Search icon button sits next to the collapse sidebar button */}
          {wide && (
            <Tooltip label={t('nav.search')} side="bottom" delayMs={300}>
              <button
                type="button"
                className={clsx(css.iconButton, css.searchButton)}
                aria-label={t('nav.search')}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('const:open-command-palette'))
                }}
              >
                <IconSearchOutline16 size={16} />
              </button>
            </Tooltip>
          )}

          {/* Rail resting state is the whale mark; hovering swaps in the panel
              icon (the expand affordance, figma sidebar-hover flow). */}
          <Tooltip label={collapsed ? t('toggle.open') : t('toggle.collapse')} side={wide ? 'bottom' : 'right'} delayMs={300}>
            <button
              type="button"
              className={clsx(css.iconButton, css.toggle)}
              aria-label={collapsed ? t('toggle.open') : t('toggle.collapse')}
              onClick={() => { toggleSidebar() }}
            >
              {!wide && <ConstLogo className={css.railFish} size={24} />}
              {/* Rail icons render at 18 (figma rail spec); expanded keeps the glyph-native sizes. */}
              <IconPanelLeftOutline16 className={css.panelIcon} size={wide ? 16 : 18} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Top action navigation list matching requirement #1 and Image 1 */}
      <nav className={css.topNav} aria-label="Main Navigation">
        <Tooltip label={newTaskTooltip} side={wide ? 'bottom' : 'right'} delayMs={300}>
          <button
            type="button"
            className={clsx(css.navItem, css.newSession)}
            aria-label={t('nav.newTask')}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('const:close-automations'))
              startSession()
            }}
          >
            <IconNewChatOutline16 size={wide ? 16 : 18} />
            {wide && <span className={css.navLabel}>{t('nav.newTask')}</span>}
          </button>
        </Tooltip>

        {/* Feature Modules */}
        {/* Automations */}
        <Tooltip label={t('nav.automations')} side={wide ? 'bottom' : 'right'} delayMs={300}>
          <button
            type="button"
            className={clsx(css.navItem, automationsActive && css.active)}
            aria-label={t('nav.automations')}
            onClick={() => {
              if (automationsActive) {
                window.dispatchEvent(new CustomEvent('const:close-automations'))
              } else {
                window.dispatchEvent(new CustomEvent('const:open-automations'))
              }
            }}
          >
            <IconAutomationsOutline16 size={wide ? 16 : 18} />
            {wide && <span className={css.navLabel}>{t('nav.automations')}</span>}
          </button>
        </Tooltip>

        {/* Design (OpenDesign Studio) */}
        <Tooltip label={t('nav.design')} side={wide ? 'bottom' : 'right'} delayMs={300}>
          <button
            type="button"
            className={css.navItem}
            aria-label={t('nav.design')}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('const:filter-mode', { detail: { mode: 'design' } }))
            }}
          >
            <IconDesignOutline16 size={wide ? 16 : 18} />
            {wide && <span className={css.navLabel}>{t('nav.design')}</span>}
          </button>
        </Tooltip>
      </nav>

      {/* The browsing region fills the column between the controls and the
          foot in both states; its rail icon column rides the same slot. */}
      <div className={css.regionArea}>
        {renderSlot('sidebar.workspaces', {
          wide,
          expandSidebar: () => { if (collapsed) toggleSidebar() },
        })}
      </div>

      {/* Footer actions: settings trigger row in bottom */}
      <div className={css.footArea}>
        <div className={css.footerActions}>
          {renderSlot('sidebar.footer.action', { wide })}
        </div>
        <div className={css.settingsArea}>
          {renderSlot('sidebar.settings', { wide })}
        </div>
      </div>

      {commandPaletteOpen && (
        <CommandPaletteModal
          open={commandPaletteOpen}
          onClose={() => { setCommandPaletteOpen(false) }}
          useSessions={useSessions}
          useWorkspaces={useWorkspaces}
          startSession={startSession}
          openSession={openSession}
          toggleSidebar={toggleSidebar}
          openPath={openPath}
          searchSessions={searchSessions}
          t={t}
        />
      )}
    </div>
  )
}
